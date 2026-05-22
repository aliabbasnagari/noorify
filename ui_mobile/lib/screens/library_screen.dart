import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/playlists_provider.dart';
import '../widgets/album_card.dart';
import '../widgets/artist_card.dart';
import 'playlist_screen.dart';
import 'package:go_router/go_router.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _gridView = true;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  List<Album> _albums = [];
  List<Artist> _artists = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
    _tabController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        subsonic.getAlbumList('alphabeticalByName', size: 500),
        subsonic.getArtists(),
      ]);
      if (!mounted) return;
      setState(() {
        _albums = results[0] as List<Album>;
        _artists = results[1] as List<Artist>;
        _loading = false;
      });
      // Also load playlists
      final playlists = context.read<PlaylistsProvider>();
      await playlists.load(subsonic);
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
        title: const Text('Library',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: Icon(_gridView ? Icons.list : Icons.grid_view,
                color: Colors.white),
            onPressed: () => setState(() => _gridView = !_gridView),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF1db954),
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFFa7a7a7),
          tabs: const [
            Tab(text: 'Playlists'),
            Tab(text: 'Albums'),
            Tab(text: 'Artists'),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search...',
                hintStyle: const TextStyle(color: Color(0xFFa7a7a7)),
                prefixIcon: const Icon(Icons.search, color: Color(0xFFa7a7a7)),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Color(0xFFa7a7a7)),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFF282828),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFF1db954)))
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _PlaylistsTab(query: _searchQuery),
                      _AlbumsTab(
                          albums: _albums,
                          query: _searchQuery,
                          gridView: _gridView),
                      _ArtistsTab(
                          artists: _artists,
                          query: _searchQuery,
                          gridView: _gridView),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _PlaylistsTab extends StatelessWidget {
  final String query;
  const _PlaylistsTab({required this.query});

  @override
  Widget build(BuildContext context) {
    final playlists = context.watch<PlaylistsProvider>().playlists;
    final filtered = query.isEmpty
        ? playlists
        : playlists
            .where((p) => p.name.toLowerCase().contains(query.toLowerCase()))
            .toList();

    if (filtered.isEmpty) {
      return const Center(
          child: Text('No playlists', style: TextStyle(color: Color(0xFFa7a7a7))));
    }

    return ListView.builder(
      itemCount: filtered.length,
      itemBuilder: (context, i) {
        final pl = filtered[i];
        return ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFF282828),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Icon(Icons.queue_music,
                color: Color(0xFFa7a7a7), size: 28),
          ),
          title: Text(pl.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontSize: 14)),
          subtitle: Text('${pl.songCount} songs',
              style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
          onTap: () => context.push('/playlist/${pl.id}'),
        );
      },
    );
  }
}

class _AlbumsTab extends StatelessWidget {
  final List<Album> albums;
  final String query;
  final bool gridView;

  const _AlbumsTab(
      {required this.albums, required this.query, required this.gridView});

  @override
  Widget build(BuildContext context) {
    final filtered = query.isEmpty
        ? albums
        : albums
            .where((a) =>
                a.name.toLowerCase().contains(query.toLowerCase()) ||
                a.artist.toLowerCase().contains(query.toLowerCase()))
            .toList();

    if (filtered.isEmpty) {
      return const Center(
          child: Text('No albums', style: TextStyle(color: Color(0xFFa7a7a7))));
    }

    if (gridView) {
      return GridView.builder(
        padding: const EdgeInsets.all(8),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
        ),
        itemCount: filtered.length,
        itemBuilder: (_, i) => AlbumCard(album: filtered[i]),
      );
    }
    return ListView.builder(
      itemCount: filtered.length,
      itemBuilder: (_, i) => AlbumListTile(album: filtered[i]),
    );
  }
}

class _ArtistsTab extends StatelessWidget {
  final List<Artist> artists;
  final String query;
  final bool gridView;

  const _ArtistsTab(
      {required this.artists, required this.query, required this.gridView});

  @override
  Widget build(BuildContext context) {
    final filtered = query.isEmpty
        ? artists
        : artists
            .where((a) => a.name.toLowerCase().contains(query.toLowerCase()))
            .toList();

    if (filtered.isEmpty) {
      return const Center(
          child: Text('No artists', style: TextStyle(color: Color(0xFFa7a7a7))));
    }

    if (gridView) {
      return GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 0.7,
          crossAxisSpacing: 12,
          mainAxisSpacing: 16,
        ),
        itemCount: filtered.length,
        itemBuilder: (_, i) => ArtistCard(artist: filtered[i]),
      );
    }
    return ListView.builder(
      itemCount: filtered.length,
      itemBuilder: (_, i) => ArtistListTile(artist: filtered[i]),
    );
  }
}
