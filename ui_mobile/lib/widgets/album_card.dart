import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import 'cover_art.dart';

class AlbumCard extends StatelessWidget {
  final Album album;

  const AlbumCard({super.key, required this.album});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    final player = context.watch<PlayerProvider>();
    final coverUrl = subsonic?.getCoverArtUrl(album.coverArt, size: 300) ?? '';
    final isPlaying =
        player.currentTrack?.albumId == album.id && player.isPlaying;

    return GestureDetector(
      onTap: () => context.push('/album/${album.id}'),
      child: Container(
        width: 150,
        decoration: BoxDecoration(
          color: const Color(0xFF282828),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                  child: CoverArt(url: coverUrl, size: 150, borderRadius: 0),
                ),
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: _PlayButton(album: album, isPlaying: isPlaying),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
              child: Text(
                album.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Text(
                album.year != null ? '${album.year} · ${album.artist}' : album.artist,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlayButton extends StatefulWidget {
  final Album album;
  final bool isPlaying;
  const _PlayButton({required this.album, required this.isPlaying});

  @override
  State<_PlayButton> createState() => _PlayButtonState();
}

class _PlayButtonState extends State<_PlayButton> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final player = context.read<PlayerProvider>();
    final auth = context.read<AuthProvider>();
    return GestureDetector(
      onTap: () async {
        if (_loading) return;
        if (widget.isPlaying) {
          player.togglePlay();
          return;
        }
        setState(() => _loading = true);
        try {
          final subsonic = auth.subsonicClient!;
          final albumData = await subsonic.getAlbum(widget.album.id);
          if (albumData.songs.isNotEmpty) {
            await player.playQueue(albumData.songs);
          }
        } finally {
          if (mounted) setState(() => _loading = false);
        }
      },
      child: Container(
        width: 38,
        height: 38,
        decoration: const BoxDecoration(
          color: Color(0xFF1db954),
          shape: BoxShape.circle,
        ),
        child: _loading
            ? const Padding(
                padding: EdgeInsets.all(10),
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
              )
            : Icon(
                widget.isPlaying ? Icons.pause : Icons.play_arrow,
                color: Colors.black,
                size: 22,
              ),
      ),
    );
  }
}

class AlbumListTile extends StatelessWidget {
  final Album album;

  const AlbumListTile({super.key, required this.album});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final coverUrl = auth.subsonicClient?.getCoverArtUrl(album.coverArt, size: 100) ?? '';
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: CoverArt(url: coverUrl, size: 52),
      title: Text(album.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white, fontSize: 14)),
      subtitle: Text(
          album.year != null ? '${album.year} · ${album.artist}' : album.artist,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
      onTap: () => context.push('/album/${album.id}'),
    );
  }
}
