import 'package:flutter/material.dart' hide RepeatMode;
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/cover_art.dart';
import '../widgets/lyrics_panel.dart';
import '../widgets/queue_panel.dart';
import '../widgets/star_rating.dart';

class NowPlayingScreen extends StatefulWidget {
  const NowPlayingScreen({super.key});

  @override
  State<NowPlayingScreen> createState() => _NowPlayingScreenState();
}

class _NowPlayingScreenState extends State<NowPlayingScreen> {
  Lyrics? _lyrics;
  bool _loadingLyrics = false;
  String? _lastLyricsSongId;

  Future<void> _loadLyrics(String songId) async {
    if (_lastLyricsSongId == songId) return;
    setState(() => _loadingLyrics = true);
    _lastLyricsSongId = songId;
    try {
      final auth = context.read<AuthProvider>();
      final subsonic = auth.subsonicClient;
      if (subsonic != null) {
        final lyrics = await subsonic.getLyricsBySongId(songId);
        if (mounted && _lastLyricsSongId == songId) {
          setState(() => _lyrics = lyrics);
        }
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingLyrics = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final auth = context.read<AuthProvider>();
    final track = player.currentTrack;

    if (track == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF121212),
        appBar: AppBar(backgroundColor: const Color(0xFF121212)),
        body: const Center(
          child: Text('Nothing playing', style: TextStyle(color: Colors.white)),
        ),
      );
    }

    final coverUrl = auth.subsonicClient?.getCoverArtUrl(track.coverArt, size: 600) ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white, size: 30),
          onPressed: () => context.pop(),
        ),
        centerTitle: true,
        title: Column(
          children: [
            const Text('NOW PLAYING',
                style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 11, letterSpacing: 1)),
            Text(track.album,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 13)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            onPressed: () => _showOptionsSheet(context, track, player),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const SizedBox(height: 16),

            // Album art
            Expanded(
              flex: 5,
              child: Center(
                child: AnimatedScale(
                  scale: player.isPlaying ? 1.0 : 0.9,
                  duration: const Duration(milliseconds: 300),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CoverArt(
                      url: coverUrl,
                      size: MediaQuery.of(context).size.width - 48,
                      borderRadius: 12,
                      placeholderIcon: Icons.album,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Track info + star
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(track.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      GestureDetector(
                        onTap: () {
                          context.pop();
                          context.push('/artist/${track.artistId}');
                        },
                        child: Text(track.artist,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Color(0xFFa7a7a7), fontSize: 14)),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(
                    player.isCurrentStarred ? Icons.favorite : Icons.favorite_border,
                    color: player.isCurrentStarred
                        ? const Color(0xFF1db954)
                        : Colors.white,
                    size: 26,
                  ),
                  onPressed: player.toggleStarCurrent,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Star rating
            StarRating(
              rating: player.currentRating,
              onRating: player.rateCurrentTrack,
              size: 22,
            ),
            const SizedBox(height: 16),

            // Progress bar
            Column(
              children: [
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    trackHeight: 3,
                    thumbShape:
                        const RoundSliderThumbShape(enabledThumbRadius: 6),
                    overlayShape:
                        const RoundSliderOverlayShape(overlayRadius: 14),
                    activeTrackColor: Colors.white,
                    inactiveTrackColor: Colors.white24,
                    thumbColor: Colors.white,
                    overlayColor: Colors.white24,
                  ),
                  child: Slider(
                    value: player.currentDuration.inMilliseconds > 0
                        ? (player.currentPosition.inMilliseconds /
                                player.currentDuration.inMilliseconds)
                            .clamp(0.0, 1.0)
                        : 0.0,
                    onChanged: (v) => player.seek(Duration(
                        milliseconds:
                            (v * player.currentDuration.inMilliseconds).round())),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_fmt(player.currentPosition),
                          style: const TextStyle(
                              color: Color(0xFFa7a7a7), fontSize: 12)),
                      Text(_fmt(player.currentDuration),
                          style: const TextStyle(
                              color: Color(0xFFa7a7a7), fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),

            // Main controls
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                IconButton(
                  icon: Icon(
                    Icons.shuffle,
                    color: player.shuffleActive
                        ? const Color(0xFF1db954)
                        : Colors.white,
                    size: 22,
                  ),
                  onPressed: player.toggleShuffle,
                ),
                IconButton(
                  icon: const Icon(Icons.skip_previous, color: Colors.white, size: 36),
                  onPressed: player.prev,
                ),
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: Icon(
                      player.isPlaying ? Icons.pause : Icons.play_arrow,
                      color: Colors.black,
                      size: 36,
                    ),
                    onPressed: player.togglePlay,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.skip_next, color: Colors.white, size: 36),
                  onPressed: player.next,
                ),
                IconButton(
                  icon: Icon(
                    player.repeatMode == RepeatMode.one
                        ? Icons.repeat_one
                        : Icons.repeat,
                    color: player.repeatMode != RepeatMode.off
                        ? const Color(0xFF1db954)
                        : Colors.white,
                    size: 22,
                  ),
                  onPressed: player.cycleRepeat,
                ),
              ],
            ),

            // Bottom toolbar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Volume
                Expanded(
                  child: Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          player.isMuted || player.volume == 0
                              ? Icons.volume_off
                              : Icons.volume_up,
                          color: const Color(0xFFa7a7a7),
                          size: 20,
                        ),
                        onPressed: player.toggleMute,
                      ),
                      Expanded(
                        child: SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            trackHeight: 2,
                            thumbShape: const RoundSliderThumbShape(
                                enabledThumbRadius: 5),
                            activeTrackColor: Colors.white,
                            inactiveTrackColor: Colors.white24,
                            thumbColor: Colors.white,
                            overlayColor: Colors.transparent,
                          ),
                          child: Slider(
                            value: player.volume,
                            onChanged: player.setVolume,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Queue button
                IconButton(
                  icon: const Icon(Icons.queue_music, color: Color(0xFFa7a7a7)),
                  onPressed: () => _showQueue(context),
                ),
                // Lyrics button
                IconButton(
                  icon: const Icon(Icons.lyrics_outlined,
                      color: Color(0xFFa7a7a7)),
                  onPressed: () {
                    _loadLyrics(track.id);
                    _showLyrics(context, player.currentPosition);
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showQueue(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const QueuePanel(),
    );
  }

  void _showLyrics(BuildContext context, Duration position) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LyricsPanel(lyrics: _lyrics, currentPosition: position),
    );
  }

  void _showOptionsSheet(
      BuildContext context, Song track, PlayerProvider player) {
    final auth = context.read<AuthProvider>();
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.album, color: Colors.white),
              title: const Text('Go to album', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                this.context.pop();
                this.context.push('/album/${track.albumId}');
              },
            ),
            ListTile(
              leading: const Icon(Icons.person, color: Colors.white),
              title: const Text('Go to artist', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                this.context.pop();
                this.context.push('/artist/${track.artistId}');
              },
            ),
            if (auth.subsonicClient != null)
              ListTile(
                leading: const Icon(Icons.download_outlined, color: Colors.white),
                title: const Text('Download', style: TextStyle(color: Colors.white)),
                onTap: () async {
                  Navigator.pop(context);
                  final url = auth.subsonicClient!.getDownloadUrl(track.id);
                  // Open download URL
                },
              ),
            ListTile(
              leading: const Icon(Icons.add_to_photos, color: Colors.white),
              title: const Text('Save queue as playlist',
                  style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                _saveQueueAsPlaylist(this.context, player);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _saveQueueAsPlaylist(BuildContext context, PlayerProvider player) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF282828),
        title: const Text('Save Queue as Playlist',
            style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
              hintText: 'Playlist name',
              hintStyle: TextStyle(color: Color(0xFFa7a7a7))),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, controller.text),
              child: const Text('Save',
                  style: TextStyle(color: Color(0xFF1db954)))),
        ],
      ),
    );
    if (name != null && name.isNotEmpty && context.mounted) {
      final auth = context.read<AuthProvider>();
      final subsonic = auth.subsonicClient;
      if (subsonic == null) return;
      final pl = await subsonic.createPlaylist(name);
      final ids = player.queue.map((s) => s.id).toList();
      await subsonic.updatePlaylist(pl.id, songIdToAdd: ids);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Saved "$name"')),
        );
      }
    }
  }

  String _fmt(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}
