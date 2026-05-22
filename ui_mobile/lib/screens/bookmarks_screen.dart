import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/cover_art.dart';
import '../widgets/song_tile.dart';

class BookmarksScreen extends StatefulWidget {
  const BookmarksScreen({super.key});

  @override
  State<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends State<BookmarksScreen> {
  List<Bookmark> _bookmarks = [];
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
      final bookmarks = await subsonic.getBookmarks();
      if (!mounted) return;
      setState(() {
        _bookmarks = bookmarks;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deleteBookmark(Bookmark bm) async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    setState(() => _bookmarks.remove(bm));
    try {
      await subsonic.deleteBookmark(bm.entry.id);
    } catch (_) {
      await _load();
    }
  }

  String _formatPosition(int ms) {
    final s = ms ~/ 1000;
    final m = s ~/ 60;
    final h = m ~/ 60;
    if (h > 0) return '$h:${(m % 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
    return '$m:${(s % 60).toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: const Text('Bookmarks',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : _bookmarks.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.bookmark_outline,
                          color: Color(0xFFa7a7a7), size: 64),
                      SizedBox(height: 16),
                      Text('No bookmarks yet',
                          style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 16)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _bookmarks.length,
                  itemBuilder: (context, i) {
                    final bm = _bookmarks[i];
                    final auth = context.read<AuthProvider>();
                    final coverUrl =
                        auth.subsonicClient?.getCoverArtUrl(bm.entry.coverArt, size: 60) ?? '';
                    return Dismissible(
                      key: Key(bm.entry.id),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 16),
                        color: Colors.red,
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      onDismissed: (_) => _deleteBookmark(bm),
                      child: ListTile(
                        leading: CoverArt(url: coverUrl, size: 48),
                        title: Text(bm.entry.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white)),
                        subtitle: Text(
                            '${bm.entry.artist} · at ${_formatPosition(bm.position)}',
                            style: const TextStyle(
                                color: Color(0xFFa7a7a7), fontSize: 12)),
                        trailing: IconButton(
                          icon: const Icon(Icons.play_arrow,
                              color: Color(0xFF1db954)),
                          onPressed: () async {
                            final player = context.read<PlayerProvider>();
                            await player.playTrack(bm.entry);
                            await player.seek(Duration(milliseconds: bm.position));
                          },
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
