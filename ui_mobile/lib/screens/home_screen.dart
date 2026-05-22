import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/album_card.dart';
import '../widgets/song_tile.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Album> _recentAlbums = [];
  List<Album> _newestAlbums = [];
  List<Album> _frequentAlbums = [];
  List<Album> _randomAlbums = [];
  List<Song> _starredSongs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;

    try {
      final results = await Future.wait([
        subsonic.getAlbumList('recent', size: 12),
        subsonic.getAlbumList('newest', size: 12),
        subsonic.getAlbumList('frequent', size: 12),
        subsonic.getAlbumList('random', size: 12),
        subsonic.getStarred(),
      ]);
      if (!mounted) return;
      setState(() {
        _recentAlbums = results[0] as List<Album>;
        _newestAlbums = results[1] as List<Album>;
        _frequentAlbums = results[2] as List<Album>;
        _randomAlbums = results[3] as List<Album>;
        final starred = results[4] as Map<String, List<dynamic>>;
        _starredSongs = (starred['song'] ?? []).cast<Song>().take(8).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : RefreshIndicator(
              onRefresh: _loadData,
              color: const Color(0xFF1db954),
              child: CustomScrollView(
                slivers: [
                  SliverAppBar(
                    backgroundColor: const Color(0xFF121212),
                    pinned: true,
                    title: Text(
                      _greeting,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    actions: [
                      IconButton(
                        icon: const Icon(Icons.refresh, color: Colors.white),
                        onPressed: _loadData,
                      ),
                    ],
                  ),
                  SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_starredSongs.isNotEmpty) ...[
                          _SectionHeader('Liked Songs',
                              onMore: () => context.push('/liked')),
                          GridView.count(
                            crossAxisCount: 2,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            childAspectRatio: 3.5,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            mainAxisSpacing: 4,
                            crossAxisSpacing: 4,
                            children: _starredSongs.take(8).map((s) {
                              final auth2 = context.read<AuthProvider>();
                              final coverUrl =
                                  auth2.subsonicClient?.getCoverArtUrl(s.coverArt, size: 60) ?? '';
                              final player = context.read<PlayerProvider>();
                              return GestureDetector(
                                onTap: () => player.playTrack(s),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF282828),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Row(
                                    children: [
                                      if (coverUrl.isNotEmpty)
                                        ClipRRect(
                                          borderRadius: const BorderRadius.horizontal(
                                              left: Radius.circular(4)),
                                          child: Image.network(coverUrl,
                                              width: 50,
                                              height: double.infinity,
                                              fit: BoxFit.cover),
                                        ),
                                      Expanded(
                                        child: Padding(
                                          padding:
                                              const EdgeInsets.symmetric(horizontal: 8),
                                          child: Text(
                                            s.title,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 16),
                        ],
                        if (_recentAlbums.isNotEmpty)
                          _AlbumRow('Recently Played', _recentAlbums),
                        if (_newestAlbums.isNotEmpty)
                          _AlbumRow('Newly Added', _newestAlbums),
                        if (_frequentAlbums.isNotEmpty)
                          _AlbumRow('Most Played', _frequentAlbums),
                        if (_randomAlbums.isNotEmpty)
                          _AlbumRow('Discover', _randomAlbums),
                        const SizedBox(height: 80),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onMore;

  const _SectionHeader(this.title, {this.onMore});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
      child: Row(
        children: [
          Text(title,
              style: const TextStyle(
                  color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const Spacer(),
          if (onMore != null)
            TextButton(
              onPressed: onMore,
              child: const Text('See all',
                  style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
            ),
        ],
      ),
    );
  }
}

class _AlbumRow extends StatelessWidget {
  final String title;
  final List<Album> albums;

  const _AlbumRow(this.title, this.albums);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(title),
        SizedBox(
          height: 210,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: albums.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) => AlbumCard(album: albums[i]),
          ),
        ),
      ],
    );
  }
}
