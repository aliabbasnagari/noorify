import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/song_tile.dart';

class GenreScreen extends StatefulWidget {
  final String genre;
  const GenreScreen({super.key, required this.genre});

  @override
  State<GenreScreen> createState() => _GenreScreenState();
}

class _GenreScreenState extends State<GenreScreen> {
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
      final songs = await subsonic.getSongsByGenre(widget.genre, count: 200);
      if (!mounted) return;
      setState(() {
        _songs = songs;
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
        title: Text(widget.genre,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold)),
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
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : _songs.isEmpty
              ? const Center(
                  child: Text('No songs in this genre',
                      style: TextStyle(color: Color(0xFFa7a7a7))))
              : ListView.builder(
                  itemCount: _songs.length,
                  itemBuilder: (context, i) => SongTile(
                    song: _songs[i],
                    showAlbum: true,
                    onTap: () => context
                        .read<PlayerProvider>()
                        .playQueue(_songs, index: i),
                  ),
                ),
    );
  }
}
