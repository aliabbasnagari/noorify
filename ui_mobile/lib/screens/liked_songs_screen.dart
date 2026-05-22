import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/song_tile.dart';

class LikedSongsScreen extends StatefulWidget {
  const LikedSongsScreen({super.key});

  @override
  State<LikedSongsScreen> createState() => _LikedSongsScreenState();
}

class _LikedSongsScreenState extends State<LikedSongsScreen> {
  List<Song> _songs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    try {
      final starred = await subsonic.getStarred();
      if (!mounted) return;
      setState(() {
        _songs = (starred['song'] ?? []).cast<Song>();
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
        title: const Text('Liked Songs',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          if (_songs.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.shuffle, color: Colors.white),
              onPressed: () async {
                final shuffled = List.of(_songs)..shuffle();
                await context.read<PlayerProvider>().playQueue(shuffled);
              },
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : _songs.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.favorite_outline, color: Color(0xFFa7a7a7), size: 64),
                      SizedBox(height: 16),
                      Text('No liked songs yet',
                          style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 16)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _songs.length,
                  itemBuilder: (context, i) => SongTile(
                    song: _songs[i],
                    showAlbum: true,
                    onTap: () =>
                        context.read<PlayerProvider>().playQueue(_songs, index: i),
                  ),
                ),
    );
  }
}
