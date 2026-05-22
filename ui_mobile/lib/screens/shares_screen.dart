import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/song_tile.dart';

class SharesScreen extends StatefulWidget {
  const SharesScreen({super.key});

  @override
  State<SharesScreen> createState() => _SharesScreenState();
}

class _SharesScreenState extends State<SharesScreen> {
  List<Share> _shares = [];
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
      final shares = await subsonic.getShares();
      if (!mounted) return;
      setState(() {
        _shares = shares;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deleteShare(Share share) async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    setState(() => _shares.remove(share));
    try {
      await subsonic.deleteShare(share.id);
    } catch (_) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: const Text('Shares',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : _shares.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.share, color: Color(0xFFa7a7a7), size: 64),
                      SizedBox(height: 16),
                      Text('No shares yet',
                          style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 16)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _shares.length,
                  itemBuilder: (context, i) {
                    final share = _shares[i];
                    return ExpansionTile(
                      iconColor: Colors.white,
                      collapsedIconColor: const Color(0xFFa7a7a7),
                      title: Text(
                        share.description ?? '${share.songs.length} songs',
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                      ),
                      subtitle: Text(
                        '${share.visitCount} visits · by ${share.username}',
                        style: const TextStyle(
                            color: Color(0xFFa7a7a7), fontSize: 12),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.delete_outline,
                                color: Colors.red, size: 18),
                            onPressed: () => _deleteShare(share),
                          ),
                          const Icon(Icons.expand_more,
                              color: Color(0xFFa7a7a7)),
                        ],
                      ),
                      children: share.songs
                          .map((song) => SongTile(
                                song: song,
                                onTap: () => context
                                    .read<PlayerProvider>()
                                    .playQueue(share.songs,
                                        index: share.songs.indexOf(song)),
                              ))
                          .toList(),
                    );
                  },
                ),
    );
  }
}
