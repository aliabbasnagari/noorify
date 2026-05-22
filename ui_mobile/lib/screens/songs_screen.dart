import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/song_tile.dart';

class SongsScreen extends StatefulWidget {
  const SongsScreen({super.key});

  @override
  State<SongsScreen> createState() => _SongsScreenState();
}

class _SongsScreenState extends State<SongsScreen> {
  final List<Song> _songs = [];
  bool _loading = false;
  bool _hasMore = true;
  int _offset = 0;
  static const _pageSize = 100;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadMore();
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
              _scrollController.position.maxScrollExtent - 200 &&
          !_loading &&
          _hasMore) {
        _loadMore();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasMore) return;
    setState(() => _loading = true);
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    try {
      // Use alphabeticalByName album list + getAlbum to aggregate songs
      // More efficient: use getAlbumList to page through albums and collect songs
      // For all songs, we fetch alphabetical albums and collect their tracks
      final albums = await subsonic.getAlbumList('alphabeticalByName',
          size: 10, offset: _offset ~/ 10);
      final allSongs = <Song>[];
      for (final album in albums) {
        final full = await subsonic.getAlbum(album.id);
        allSongs.addAll(full.songs);
      }
      if (!mounted) return;
      setState(() {
        _songs.addAll(allSongs);
        _offset += _pageSize;
        _hasMore = albums.length == 10;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: const Text('Songs',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.play_circle_outline, color: Colors.white),
            onPressed: _songs.isEmpty
                ? null
                : () async {
                    final shuffled = List.of(_songs)..shuffle();
                    await context.read<PlayerProvider>().playQueue(shuffled);
                  },
            tooltip: 'Shuffle all',
          ),
        ],
      ),
      body: _songs.isEmpty && _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : ListView.builder(
              controller: _scrollController,
              itemCount: _songs.length + (_hasMore ? 1 : 0),
              itemBuilder: (context, i) {
                if (i >= _songs.length) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                        child: CircularProgressIndicator(
                            color: Color(0xFF1db954), strokeWidth: 2)),
                  );
                }
                return SongTile(
                  song: _songs[i],
                  showAlbum: true,
                  onTap: () =>
                      context.read<PlayerProvider>().playQueue(_songs, index: i),
                );
              },
            ),
    );
  }
}
