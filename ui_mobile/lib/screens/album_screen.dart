import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../providers/server_config_provider.dart';
import '../widgets/cover_art.dart';
import '../widgets/song_tile.dart';
import '../widgets/star_rating.dart';
import '../widgets/collapsible_text.dart';

class AlbumScreen extends StatefulWidget {
  final String id;
  const AlbumScreen({super.key, required this.id});

  @override
  State<AlbumScreen> createState() => _AlbumScreenState();
}

class _AlbumScreenState extends State<AlbumScreen> {
  Album? _album;
  bool _loading = true;
  bool _isStarred = false;

  @override
  void initState() {
    super.initState();
    _loadAlbum();
  }

  Future<void> _loadAlbum() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    try {
      final album = await subsonic.getAlbum(widget.id);
      if (!mounted) return;
      setState(() {
        _album = album;
        _isStarred = album.starred;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleStar() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null || _album == null) return;
    setState(() => _isStarred = !_isStarred);
    try {
      if (_isStarred) {
        await subsonic.star(_album!.id);
      } else {
        await subsonic.unstar(_album!.id);
      }
    } catch (_) {
      setState(() => _isStarred = !_isStarred);
    }
  }

  Future<void> _playAll() async {
    if (_album == null || _album!.songs.isEmpty) return;
    final player = context.read<PlayerProvider>();
    await player.playQueue(_album!.songs);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFF121212),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF1db954))),
      );
    }
    if (_album == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF121212),
        appBar: AppBar(backgroundColor: const Color(0xFF121212)),
        body: const Center(
            child: Text('Album not found',
                style: TextStyle(color: Colors.white))),
      );
    }

    final album = _album!;
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    final coverUrl = subsonic?.getCoverArtUrl(album.coverArt, size: 400) ?? '';
    final config = context.read<ServerConfigProvider>().config;

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: const Color(0xFF121212),
            expandedHeight: 300,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (coverUrl.isNotEmpty)
                    Image.network(coverUrl, fit: BoxFit.cover)
                  else
                    Container(color: const Color(0xFF282828)),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Color(0xFF121212)],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                icon: Icon(_isStarred ? Icons.favorite : Icons.favorite_border,
                    color: _isStarred ? const Color(0xFF1db954) : Colors.white),
                onPressed: _toggleStar,
              ),
              if (config.enableDownloads && subsonic != null)
                IconButton(
                  icon: const Icon(Icons.download_outlined, color: Colors.white),
                  onPressed: () {/* TODO: bulk download */},
                ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: Colors.white),
                color: const Color(0xFF282828),
                onSelected: (v) async {
                  if (v == 'share' && subsonic != null) {
                    await subsonic.createShare([album.id]);
                  }
                },
                itemBuilder: (_) => [
                  if (config.enableSharing)
                    const PopupMenuItem(value: 'share', child: Text('Share')),
                ],
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(album.name,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  GestureDetector(
                    onTap: () => context.push('/artist/${album.artistId}'),
                    child: Text(album.artist,
                        style: const TextStyle(
                            color: Color(0xFF1db954), fontSize: 16)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    [
                      if (album.year != null) '${album.year}',
                      '${album.songCount} songs',
                    ].join(' · '),
                    style: const TextStyle(
                        color: Color(0xFFa7a7a7), fontSize: 13),
                  ),
                  if (album.comment != null && album.comment!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    CollapsibleText(text: album.comment!),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: _playAll,
                        icon: const Icon(Icons.play_arrow, color: Colors.black),
                        label: const Text('Play',
                            style: TextStyle(
                                color: Colors.black, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1db954),
                          shape: const StadiumBorder(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () async {
                          final player = context.read<PlayerProvider>();
                          for (final s in album.songs) {
                            await player.addToQueue(s);
                          }
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Added to queue')),
                          );
                        },
                        icon: const Icon(Icons.add, color: Colors.white, size: 18),
                        label: const Text('Add to queue',
                            style: TextStyle(color: Colors.white)),
                        style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.white38)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) => SongTile(
                song: album.songs[i],
                index: i,
                showCover: false,
                showArtist: false,
                onTap: () {
                  context.read<PlayerProvider>().playQueue(album.songs, index: i);
                },
              ),
              childCount: album.songs.length,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}
