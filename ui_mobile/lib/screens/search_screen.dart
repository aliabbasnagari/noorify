import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../widgets/album_card.dart';
import '../widgets/artist_card.dart';
import '../widgets/cover_art.dart';
import '../widgets/song_tile.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';
  List<Artist> _artists = [];
  List<Album> _albums = [];
  List<Song> _songs = [];
  List<Genre> _genres = [];
  bool _searching = false;
  bool _genresLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadGenres();
  }

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _loadGenres() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    try {
      _genres = await subsonic.getGenres();
      _genres.sort((a, b) => b.songCount.compareTo(a.songCount));
      if (mounted) setState(() => _genresLoaded = true);
    } catch (_) {}
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _query = value;
    if (value.isEmpty) {
      setState(() {
        _artists = [];
        _albums = [];
        _songs = [];
        _searching = false;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(value));
  }

  Future<void> _search(String query) async {
    if (!mounted) return;
    setState(() => _searching = true);
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    try {
      final result = await subsonic.search(query);
      if (!mounted || _query != query) return;
      setState(() {
        _artists = (result['artist'] ?? []).cast<Artist>();
        _albums = (result['album'] ?? []).cast<Album>();
        _songs = (result['song'] ?? []).cast<Song>();
        _searching = false;
      });
    } catch (_) {
      if (mounted) setState(() => _searching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasResults = _artists.isNotEmpty || _albums.isNotEmpty || _songs.isNotEmpty;
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: TextField(
          controller: _controller,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Artists, albums, songs...',
            hintStyle: const TextStyle(color: Color(0xFFa7a7a7)),
            border: InputBorder.none,
            suffixIcon: _controller.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: Color(0xFFa7a7a7)),
                    onPressed: () {
                      _controller.clear();
                      _onQueryChanged('');
                    },
                  )
                : null,
          ),
          onChanged: _onQueryChanged,
        ),
      ),
      body: _searching
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : _query.isEmpty
              ? _GenresView(genres: _genres)
              : !hasResults
                  ? const Center(
                      child: Text('No results',
                          style: TextStyle(color: Color(0xFFa7a7a7))))
                  : ListView(
                      children: [
                        if (_artists.isNotEmpty) ...[
                          _SectionHeader('Artists'),
                          SizedBox(
                            height: 160,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _artists.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 16),
                              itemBuilder: (_, i) =>
                                  ArtistCard(artist: _artists[i]),
                            ),
                          ),
                        ],
                        if (_albums.isNotEmpty) ...[
                          _SectionHeader('Albums'),
                          SizedBox(
                            height: 210,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _albums.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 12),
                              itemBuilder: (_, i) =>
                                  AlbumCard(album: _albums[i]),
                            ),
                          ),
                        ],
                        if (_songs.isNotEmpty) ...[
                          _SectionHeader('Songs'),
                          ..._songs.asMap().entries.map(
                                (e) => SongTile(
                                  song: e.value,
                                  showAlbum: true,
                                  onTap: () => context
                                      .read<PlayerProvider>()
                                      .playQueue(_songs, index: e.key),
                                ),
                              ),
                        ],
                        const SizedBox(height: 80),
                      ],
                    ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(title,
          style: const TextStyle(
              color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
    );
  }
}

class _GenresView extends StatelessWidget {
  final List<Genre> genres;
  const _GenresView({required this.genres});

  static const _colors = [
    Color(0xFF1db954), Color(0xFF509BF5), Color(0xFFE91E63),
    Color(0xFFFF6B35), Color(0xFF9C27B0), Color(0xFF00BCD4),
    Color(0xFF8BC34A), Color(0xFFFF9800), Color(0xFF607D8B),
    Color(0xFFE53935), Color(0xFF3F51B5), Color(0xFF009688),
  ];

  @override
  Widget build(BuildContext context) {
    if (genres.isEmpty) {
      return const Center(
          child: Text('Browse genres', style: TextStyle(color: Color(0xFFa7a7a7))));
    }
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Browse genres',
              style: TextStyle(
                  color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 2.5,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: genres.length,
              itemBuilder: (context, i) {
                final genre = genres[i];
                final color = _colors[i % _colors.length];
                return GestureDetector(
                  onTap: () => context.push('/genre/${genre.value}'),
                  child: Container(
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(genre.value,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14)),
                        Text('${genre.songCount} songs',
                            style: const TextStyle(
                                color: Colors.white70, fontSize: 11)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
