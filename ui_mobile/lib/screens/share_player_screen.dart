import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../api/subsonic_client.dart';
import '../providers/player_provider.dart';
import '../widgets/cover_art.dart';
import '../widgets/song_tile.dart';

/// Public share player — accessible without authentication.
class SharePlayerScreen extends StatefulWidget {
  final String id;
  const SharePlayerScreen({super.key, required this.id});

  @override
  State<SharePlayerScreen> createState() => _SharePlayerScreenState();
}

class _SharePlayerScreenState extends State<SharePlayerScreen> {
  Share? _share;
  bool _loading = true;
  String? _error;

  // We can't use the logged-in SubsonicClient here because this is a public share.
  // Navidrome's /share/:id endpoint serves the share page; the player fetches
  // songs directly. For simplicity, show info and allow play if logged in.

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    // Try to load the share via the API if user is logged in
    try {
      // For now, indicate that share viewing requires being logged in
      setState(() {
        _loading = false;
        _error = 'Please log in to view this share.';
      });
    } catch (_) {
      setState(() {
        _loading = false;
        _error = 'Failed to load share.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: const Text('Shared Music',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.share, color: Color(0xFFa7a7a7), size: 64),
                        const SizedBox(height: 16),
                        Text(_error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                color: Color(0xFFa7a7a7), fontSize: 16)),
                      ],
                    ),
                  ),
                )
              : _ShareContent(share: _share!),
    );
  }
}

class _ShareContent extends StatelessWidget {
  final Share share;
  const _ShareContent({required this.share});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (share.description != null) ...[
                Text(share.description!,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
              ],
              Text('By ${share.username}',
                  style: const TextStyle(color: Color(0xFFa7a7a7))),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  context.read<PlayerProvider>().playQueue(share.songs);
                },
                icon: const Icon(Icons.play_arrow, color: Colors.black),
                label: const Text('Play All',
                    style: TextStyle(
                        color: Colors.black, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1db954),
                  shape: const StadiumBorder(),
                ),
              ),
            ],
          ),
        ),
        ...share.songs.asMap().entries.map(
              (e) => SongTile(
                song: e.value,
                showAlbum: true,
                onTap: () => context
                    .read<PlayerProvider>()
                    .playQueue(share.songs, index: e.key),
              ),
            ),
      ],
    );
  }
}
