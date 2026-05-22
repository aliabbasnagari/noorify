import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../providers/playlists_provider.dart';
import '../widgets/cover_art.dart';
import '../widgets/song_tile.dart';

class PlaylistScreen extends StatefulWidget {
  final String id;
  const PlaylistScreen({super.key, required this.id});

  @override
  State<PlaylistScreen> createState() => _PlaylistScreenState();
}

class _PlaylistScreenState extends State<PlaylistScreen> {
  Playlist? _playlist;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPlaylist();
  }

  Future<void> _loadPlaylist() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    try {
      final pl = await subsonic.getPlaylist(widget.id);
      if (!mounted) return;
      setState(() {
        _playlist = pl;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _removeSong(int index) async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null || _playlist == null) return;
    final songs = List.of(_playlist!.songs);
    songs.removeAt(index);
    setState(() {
      _playlist = Playlist(
        id: _playlist!.id,
        name: _playlist!.name,
        comment: _playlist!.comment,
        owner: _playlist!.owner,
        songCount: songs.length,
        duration: songs.fold(0, (a, s) => a + s.duration),
        coverArt: _playlist!.coverArt,
        isPublic: _playlist!.isPublic,
        created: _playlist!.created,
        changed: _playlist!.changed,
        songs: songs,
      );
    });
    try {
      await subsonic.updatePlaylist(widget.id, songIndexToRemove: [index]);
    } catch (_) {
      await _loadPlaylist(); // revert on error
    }
  }

  Future<void> _showEditDialog() async {
    if (_playlist == null) return;
    final nameController = TextEditingController(text: _playlist!.name);
    final commentController = TextEditingController(text: _playlist!.comment ?? '');
    bool isPublic = _playlist!.isPublic;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF282828),
          title: const Text('Edit Playlist', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Name',
                  labelStyle: TextStyle(color: Color(0xFFa7a7a7)),
                ),
              ),
              TextField(
                controller: commentController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Description',
                  labelStyle: TextStyle(color: Color(0xFFa7a7a7)),
                ),
              ),
              Row(
                children: [
                  const Text('Public',
                      style: TextStyle(color: Color(0xFFa7a7a7))),
                  const Spacer(),
                  Switch(
                    value: isPublic,
                    activeColor: const Color(0xFF1db954),
                    onChanged: (v) => setDialogState(() => isPublic = v),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            TextButton(
              onPressed: () async {
                Navigator.pop(ctx);
                final auth = context.read<AuthProvider>();
                final subsonic = auth.subsonicClient;
                if (subsonic == null) return;
                await subsonic.updatePlaylist(
                  widget.id,
                  name: nameController.text,
                  comment: commentController.text,
                  isPublic: isPublic,
                );
                await _loadPlaylist();
              },
              child: const Text('Save',
                  style: TextStyle(color: Color(0xFF1db954))),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deletePlaylist() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF282828),
        title: const Text('Delete Playlist', style: TextStyle(color: Colors.white)),
        content: Text('Delete "${_playlist?.name}"?',
            style: const TextStyle(color: Color(0xFFa7a7a7))),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      final auth = context.read<AuthProvider>();
      final subsonic = auth.subsonicClient;
      if (subsonic != null) {
        await context.read<PlaylistsProvider>().delete(subsonic, widget.id);
      }
      if (mounted) context.pop();
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
    if (_playlist == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF121212),
        appBar: AppBar(backgroundColor: const Color(0xFF121212)),
        body: const Center(
            child: Text('Playlist not found', style: TextStyle(color: Colors.white))),
      );
    }

    final playlist = _playlist!;
    final auth = context.read<AuthProvider>();
    final coverUrl = auth.subsonicClient?.getCoverArtUrl(playlist.coverArt, size: 400) ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: const Color(0xFF121212),
            expandedHeight: 260,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(playlist.name,
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold)),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (coverUrl.isNotEmpty)
                    Image.network(coverUrl, fit: BoxFit.cover)
                  else
                    Container(
                      color: const Color(0xFF282828),
                      child: const Icon(Icons.queue_music,
                          color: Color(0xFF555555), size: 80),
                    ),
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
                  icon: const Icon(Icons.edit_outlined, color: Colors.white),
                  onPressed: _showEditDialog),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: Colors.white),
                color: const Color(0xFF282828),
                onSelected: (v) {
                  if (v == 'delete') _deletePlaylist();
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                      value: 'delete',
                      child: Text('Delete', style: TextStyle(color: Colors.red))),
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
                  Text('${playlist.songCount} songs · ${playlist.owner}',
                      style: const TextStyle(
                          color: Color(0xFFa7a7a7), fontSize: 13)),
                  if (playlist.comment != null && playlist.comment!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(playlist.comment!,
                        style: const TextStyle(
                            color: Color(0xFFa7a7a7), fontSize: 13)),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: playlist.songs.isEmpty
                            ? null
                            : () async {
                                await context
                                    .read<PlayerProvider>()
                                    .playQueue(playlist.songs);
                              },
                        icon: const Icon(Icons.play_arrow, color: Colors.black),
                        label: const Text('Play',
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
                        onPressed: playlist.songs.isEmpty
                            ? null
                            : () async {
                                final shuffled = List.of(playlist.songs)..shuffle();
                                await context
                                    .read<PlayerProvider>()
                                    .playQueue(shuffled);
                              },
                        icon: const Icon(Icons.shuffle, color: Colors.white, size: 18),
                        label: const Text('Shuffle',
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
              (context, i) {
                final song = playlist.songs[i];
                return Dismissible(
                  key: Key('${song.id}-$i'),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 16),
                    color: Colors.red,
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (_) => _removeSong(i),
                  child: SongTile(
                    song: song,
                    showAlbum: true,
                    onTap: () => context
                        .read<PlayerProvider>()
                        .playQueue(playlist.songs, index: i),
                  ),
                );
              },
              childCount: playlist.songs.length,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}
