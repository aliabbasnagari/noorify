import 'dart:async';
import 'package:audio_service/audio_service.dart';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/models.dart';
import '../api/subsonic_client.dart';

enum RepeatMode { off, all, one }

/// Converts a [Song] to an [AudioSource] using the Subsonic stream URL.
AudioSource _songToSource(Song song, SubsonicClient client) {
  return AudioSource.uri(
    Uri.parse(client.getStreamUrl(song.id)),
    tag: MediaItem(
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      artUri: song.coverArt != null
          ? Uri.parse(client.getCoverArtUrl(song.coverArt, size: 300))
          : null,
      duration: Duration(seconds: song.duration),
    ),
  );
}

class PlayerProvider extends ChangeNotifier {
  final AudioPlayer _player = AudioPlayer();
  SubsonicClient? _client;

  List<Song> _queue = [];
  int _currentIndex = 0;
  bool _shuffleActive = false;
  RepeatMode _repeatMode = RepeatMode.off;
  double _volume = 1.0;
  bool _isMuted = false;
  bool _isCurrentStarred = false;
  int _currentRating = 0;

  Duration _currentPosition = Duration.zero;
  Duration _currentDuration = Duration.zero;
  bool _isPlaying = false;
  bool _isBuffering = false;

  Timer? _saveQueueTimer;
  Timer? _scrobbleTimer;

  // Getters
  List<Song> get queue => _queue;
  int get currentIndex => _currentIndex;
  Song? get currentTrack => _queue.isNotEmpty ? _queue[_currentIndex] : null;
  bool get isPlaying => _isPlaying;
  bool get isBuffering => _isBuffering;
  bool get shuffleActive => _shuffleActive;
  RepeatMode get repeatMode => _repeatMode;
  double get volume => _isMuted ? 0.0 : _volume;
  bool get isMuted => _isMuted;
  bool get isCurrentStarred => _isCurrentStarred;
  int get currentRating => _currentRating;
  Duration get currentPosition => _currentPosition;
  Duration get currentDuration => _currentDuration;
  bool get hasQueue => _queue.isNotEmpty;

  void attachClient(SubsonicClient client) {
    _client = client;
    _setupListeners();
    _restoreQueue();
  }

  void _setupListeners() {
    _player.playerStateStream.listen((state) {
      _isPlaying = state.playing;
      _isBuffering = state.processingState == ProcessingState.buffering ||
          state.processingState == ProcessingState.loading;
      if (state.processingState == ProcessingState.completed) {
        _onTrackCompleted();
      }
      notifyListeners();
    });

    _player.positionStream.listen((pos) {
      _currentPosition = pos;
      notifyListeners();
    });

    _player.durationStream.listen((dur) {
      _currentDuration = dur ?? Duration.zero;
      notifyListeners();
    });
  }

  void _onTrackCompleted() {
    switch (_repeatMode) {
      case RepeatMode.one:
        _player.seek(Duration.zero);
        _player.play();
      case RepeatMode.all:
        next(wrap: true);
      case RepeatMode.off:
        if (_currentIndex < _queue.length - 1) {
          next();
        }
    }
  }

  // ─── Playback control ─────────────────────────────────────────────────────

  Future<void> playQueue(List<Song> songs, {int index = 0}) async {
    if (songs.isEmpty) return;
    _queue = List.of(songs);
    _currentIndex = index.clamp(0, songs.length - 1);
    await _loadAndPlay();
    _scheduleQueueSave();
    notifyListeners();
  }

  Future<void> playTrack(Song song) async {
    // Put single track in queue (or find it)
    final idx = _queue.indexWhere((s) => s.id == song.id);
    if (idx != -1) {
      _currentIndex = idx;
      await _loadAndPlay();
    } else {
      _queue = [song];
      _currentIndex = 0;
      await _loadAndPlay();
    }
    notifyListeners();
  }

  Future<void> addToQueue(Song song) async {
    _queue.add(song);
    notifyListeners();
    _scheduleQueueSave();
  }

  Future<void> removeFromQueue(int index) async {
    if (index < 0 || index >= _queue.length) return;
    _queue.removeAt(index);
    if (_currentIndex >= _queue.length) {
      _currentIndex = (_queue.length - 1).clamp(0, _queue.length);
    }
    notifyListeners();
    _scheduleQueueSave();
  }

  Future<void> _loadAndPlay() async {
    if (_client == null || _queue.isEmpty) return;
    final song = _queue[_currentIndex];
    _isCurrentStarred = song.starred;
    _currentRating = song.userRating;
    try {
      await _player.setAudioSource(_songToSource(song, _client!));
      await _player.setVolume(_isMuted ? 0.0 : _volume);
      await _player.play();
      _scheduleScrobble(song.id);
    } catch (_) {}
    notifyListeners();
  }

  void togglePlay() {
    if (_player.playing) {
      _player.pause();
    } else {
      _player.play();
    }
  }

  Future<void> next({bool wrap = false}) async {
    if (_queue.isEmpty) return;
    if (_currentIndex < _queue.length - 1) {
      _currentIndex++;
    } else if (wrap) {
      _currentIndex = 0;
    } else {
      return;
    }
    await _loadAndPlay();
    notifyListeners();
  }

  Future<void> prev() async {
    if (_queue.isEmpty) return;
    if (_currentPosition.inSeconds > 3) {
      await _player.seek(Duration.zero);
      return;
    }
    if (_currentIndex > 0) {
      _currentIndex--;
      await _loadAndPlay();
    }
    notifyListeners();
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  Future<void> jumpToQueueIndex(int index) async {
    if (index < 0 || index >= _queue.length) return;
    _currentIndex = index;
    await _loadAndPlay();
    notifyListeners();
  }

  void toggleShuffle() {
    _shuffleActive = !_shuffleActive;
    if (_shuffleActive) {
      // Shuffle queue keeping current track at index 0
      final current = _queue[_currentIndex];
      final rest = List.of(_queue)..removeAt(_currentIndex);
      rest.shuffle();
      _queue = [current, ...rest];
      _currentIndex = 0;
    }
    notifyListeners();
    _scheduleQueueSave();
  }

  void cycleRepeat() {
    switch (_repeatMode) {
      case RepeatMode.off:
        _repeatMode = RepeatMode.all;
      case RepeatMode.all:
        _repeatMode = RepeatMode.one;
      case RepeatMode.one:
        _repeatMode = RepeatMode.off;
    }
    notifyListeners();
  }

  void setVolume(double vol) {
    _volume = vol.clamp(0.0, 1.0);
    if (!_isMuted) _player.setVolume(_volume);
    _saveVolumePrefs();
    notifyListeners();
  }

  void toggleMute() {
    _isMuted = !_isMuted;
    _player.setVolume(_isMuted ? 0.0 : _volume);
    notifyListeners();
  }

  // ─── Star / Rate ──────────────────────────────────────────────────────────

  Future<void> toggleStarCurrent() async {
    if (_client == null || currentTrack == null) return;
    final song = currentTrack!;
    _isCurrentStarred = !_isCurrentStarred;
    notifyListeners();
    try {
      if (_isCurrentStarred) {
        await _client!.star(song.id);
      } else {
        await _client!.unstar(song.id);
      }
    } catch (_) {
      _isCurrentStarred = !_isCurrentStarred;
      notifyListeners();
    }
  }

  Future<void> rateCurrentTrack(int rating) async {
    if (_client == null || currentTrack == null) return;
    _currentRating = rating;
    notifyListeners();
    try {
      await _client!.setRating(currentTrack!.id, rating);
    } catch (_) {}
  }

  // ─── Queue persistence ────────────────────────────────────────────────────

  void _scheduleQueueSave() {
    _saveQueueTimer?.cancel();
    _saveQueueTimer = Timer(const Duration(seconds: 5), _saveQueue);
  }

  Future<void> _saveQueue() async {
    if (_client == null || _queue.isEmpty) return;
    try {
      await _client!.savePlayQueue(
        _queue.map((s) => s.id).toList(),
        currentId: currentTrack?.id,
        position: _currentPosition.inMilliseconds,
      );
    } catch (_) {}
  }

  Future<void> _restoreQueue() async {
    if (_client == null) return;
    try {
      final pq = await _client!.getPlayQueue();
      if (pq != null && pq.songs.isNotEmpty) {
        _queue = pq.songs;
        _currentIndex = pq.currentId != null
            ? _queue.indexWhere((s) => s.id == pq.currentId).clamp(0, _queue.length - 1)
            : 0;
        _isCurrentStarred = currentTrack?.starred ?? false;
        _currentRating = currentTrack?.userRating ?? 0;
        notifyListeners();
        // Load audio source without auto-play
        if (_client != null && _queue.isNotEmpty) {
          final song = _queue[_currentIndex];
          await _player.setAudioSource(_songToSource(song, _client!));
          if (pq.position != null) {
            await _player.seek(Duration(milliseconds: pq.position!));
          }
        }
      }
    } catch (_) {}
  }

  // ─── Scrobble ─────────────────────────────────────────────────────────────

  void _scheduleScrobble(String songId) {
    _scrobbleTimer?.cancel();
    _scrobbleTimer = Timer(const Duration(seconds: 4), () async {
      if (_client != null && currentTrack?.id == songId) {
        await _client!.scrobble(songId);
      }
    });
  }

  // ─── Volume persistence ───────────────────────────────────────────────────

  Future<void> loadVolumePrefs() async {
    final prefs = await SharedPreferences.getInstance();
    _volume = prefs.getDouble('nd:volume') ?? 1.0;
    _isMuted = prefs.getBool('nd:muted') ?? false;
    notifyListeners();
  }

  Future<void> _saveVolumePrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('nd:volume', _volume);
    await prefs.setBool('nd:muted', _isMuted);
  }

  @override
  void dispose() {
    _saveQueueTimer?.cancel();
    _scrobbleTimer?.cancel();
    _player.dispose();
    super.dispose();
  }
}
