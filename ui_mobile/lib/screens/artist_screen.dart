import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/album_card.dart';
import '../widgets/artist_card.dart';
import '../widgets/collapsible_text.dart';
import '../widgets/cover_art.dart';
import '../widgets/song_tile.dart';

class ArtistScreen extends StatefulWidget {
  final String id;
  const ArtistScreen({super.key, required this.id});

  @override
  State<ArtistScreen> createState() => _ArtistScreenState();
}

class _ArtistScreenState extends State<ArtistScreen>
    with SingleTickerProviderStateMixin {
  Artist? _artist;
  ArtistInfo? _info;
  List<Song> _songs = [];
  bool _loading = true;
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    final native = auth.nativeClient;
    if (subsonic == null) return;

    try {
      final results = await Future.wait([
        subsonic.getArtist(widget.id),
        subsonic.getArtistInfo(widget.id),
        native?.getArtistSongs(widget.id) ?? Future.value(<Song>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _artist = results[0] as Artist;
        _info = results[1] as ArtistInfo;
        _songs = results[2] as List<Song>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFF121212),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF1db954))),
      );
    }
    if (_artist == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF121212),
        appBar: AppBar(backgroundColor: const Color(0xFF121212)),
        body: const Center(
            child: Text('Artist not found', style: TextStyle(color: Colors.white))),
      );
    }

    final artist = _artist!;
    final info = _info;
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    final heroImageUrl = info?.largeImageUrl ??
        info?.mediumImageUrl ??
        subsonic?.getCoverArtUrl(artist.coverArt, size: 600) ??
        '';

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          SliverAppBar(
            backgroundColor: const Color(0xFF121212),
            expandedHeight: 260,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(artist.name,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      shadows: [Shadow(blurRadius: 4, color: Colors.black)])),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (heroImageUrl.isNotEmpty)
                    Image.network(heroImageUrl, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            Container(color: const Color(0xFF282828)))
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
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: () async {
                          if (_songs.isNotEmpty) {
                            await context
                                .read<PlayerProvider>()
                                .playQueue(_songs);
                          }
                        },
                        icon: const Icon(Icons.play_arrow, color: Colors.black),
                        label: const Text('Play All',
                            style: TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1db954),
                          shape: const StadiumBorder(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () async {
                          if (_songs.isNotEmpty) {
                            final player = context.read<PlayerProvider>();
                            final shuffled = List.of(_songs)..shuffle();
                            await player.playQueue(shuffled);
                          }
                        },
                        icon: const Icon(Icons.shuffle, color: Colors.white, size: 18),
                        label: const Text('Shuffle',
                            style: TextStyle(color: Colors.white)),
                        style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.white38)),
                      ),
                    ],
                  ),
                  if (info?.biography != null && info!.biography!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    CollapsibleText(text: info.biography!),
                  ],
                  // External links
                  if (info?.lastFmUrl != null || info?.musicBrainzId != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          if (info?.lastFmUrl != null)
                            _LinkButton(
                                label: 'Last.fm',
                                url: info!.lastFmUrl!),
                          if (info?.musicBrainzId != null)
                            _LinkButton(
                                label: 'MusicBrainz',
                                url:
                                    'https://musicbrainz.org/artist/${info!.musicBrainzId}'),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabDelegate(
              TabBar(
                controller: _tabController,
                indicatorColor: const Color(0xFF1db954),
                labelColor: Colors.white,
                unselectedLabelColor: const Color(0xFFa7a7a7),
                tabs: const [Tab(text: 'Albums'), Tab(text: 'Songs'), Tab(text: 'Similar')],
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _AlbumsTab(albums: artist.albums),
            _SongsTab(songs: _songs),
            _SimilarTab(similarArtists: info?.similarArtists ?? []),
          ],
        ),
      ),
    );
  }
}

class _TabDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  _TabDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(color: const Color(0xFF121212), child: tabBar);
  }

  @override
  bool shouldRebuild(_TabDelegate oldDelegate) => false;
}

class _AlbumsTab extends StatelessWidget {
  final List<Album> albums;
  const _AlbumsTab({required this.albums});

  @override
  Widget build(BuildContext context) {
    if (albums.isEmpty) {
      return const Center(
          child: Text('No albums', style: TextStyle(color: Color(0xFFa7a7a7))));
    }
    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.75,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: albums.length,
      itemBuilder: (_, i) => AlbumCard(album: albums[i]),
    );
  }
}

class _SongsTab extends StatelessWidget {
  final List<Song> songs;
  const _SongsTab({required this.songs});

  @override
  Widget build(BuildContext context) {
    if (songs.isEmpty) {
      return const Center(
          child: Text('No songs', style: TextStyle(color: Color(0xFFa7a7a7))));
    }
    return ListView.builder(
      itemCount: songs.length,
      itemBuilder: (context, i) => SongTile(
        song: songs[i],
        showAlbum: true,
        onTap: () => context.read<PlayerProvider>().playQueue(songs, index: i),
      ),
    );
  }
}

class _SimilarTab extends StatelessWidget {
  final List<Artist> similarArtists;
  const _SimilarTab({required this.similarArtists});

  @override
  Widget build(BuildContext context) {
    if (similarArtists.isEmpty) {
      return const Center(
          child: Text('No similar artists', style: TextStyle(color: Color(0xFFa7a7a7))));
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 0.7,
        crossAxisSpacing: 12,
        mainAxisSpacing: 16,
      ),
      itemCount: similarArtists.length,
      itemBuilder: (_, i) => ArtistCard(artist: similarArtists[i]),
    );
  }
}

class _LinkButton extends StatelessWidget {
  final String label;
  final String url;
  const _LinkButton({required this.label, required this.url});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: OutlinedButton(
        onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.white24),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: Text(label,
            style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
      ),
    );
  }
}
