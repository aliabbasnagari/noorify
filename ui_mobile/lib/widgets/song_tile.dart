import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import 'cover_art.dart';
import 'quality_badge.dart';
import 'star_rating.dart';

class SongTile extends StatelessWidget {
  final Song song;
  final int? index;
  final bool showCover;
  final bool showAlbum;
  final bool showArtist;
  final bool showRating;
  final VoidCallback? onTap;
  final List<Widget>? trailing;

  const SongTile({
    super.key,
    required this.song,
    this.index,
    this.showCover = true,
    this.showAlbum = false,
    this.showArtist = true,
    this.showRating = false,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    final isCurrent = player.currentTrack?.id == song.id;
    final coverUrl = subsonic?.getCoverArtUrl(song.coverArt, size: 60) ?? '';

    return InkWell(
      onTap: onTap ??
          () {
            if (isCurrent) {
              player.togglePlay();
            } else {
              player.playTrack(song);
            }
          },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            if (index != null && !showCover)
              SizedBox(
                width: 32,
                child: Text(
                  '${index! + 1}',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isCurrent ? const Color(0xFF1db954) : Colors.grey[500],
                    fontSize: 14,
                  ),
                ),
              ),
            if (showCover)
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CoverArt(url: coverUrl, size: 44),
                    if (isCurrent)
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.black45,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Icon(
                          player.isPlaying ? Icons.pause : Icons.play_arrow,
                          color: const Color(0xFF1db954),
                          size: 22,
                        ),
                      ),
                  ],
                ),
              )
            else
              const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    song.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: isCurrent ? const Color(0xFF1db954) : Colors.white,
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                  Row(
                    children: [
                      if (showArtist)
                        Flexible(
                          child: GestureDetector(
                            onTap: () => context.push('/artist/${song.artistId}'),
                            child: Text(
                              song.artist,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12),
                            ),
                          ),
                        ),
                      if (showArtist && showAlbum)
                        const Text(' · ', style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
                      if (showAlbum)
                        Flexible(
                          child: GestureDetector(
                            onTap: () => context.push('/album/${song.albumId}'),
                            child: Text(
                              song.album,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12),
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (showRating)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: StarRating(rating: song.userRating, size: 14),
                    ),
                ],
              ),
            ),
            if (song.bitRate != null || song.suffix.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: QualityBadge(song: song),
              ),
            Text(
              song.durationFormatted,
              style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12),
            ),
            if (trailing != null)
              ...trailing!
            else
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: Color(0xFFa7a7a7), size: 18),
                color: const Color(0xFF282828),
                onSelected: (value) => _onMenuAction(context, value, player),
                itemBuilder: (ctx) => [
                  const PopupMenuItem(value: 'queue', child: Text('Add to queue')),
                  const PopupMenuItem(value: 'album', child: Text('Go to album')),
                  const PopupMenuItem(value: 'artist', child: Text('Go to artist')),
                ],
              ),
          ],
        ),
      ),
    );
  }

  void _onMenuAction(BuildContext context, String value, PlayerProvider player) {
    switch (value) {
      case 'queue':
        player.addToQueue(song);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Added "${song.title}" to queue'), duration: const Duration(seconds: 2)),
        );
      case 'album':
        context.push('/album/${song.albumId}');
      case 'artist':
        context.push('/artist/${song.artistId}');
    }
  }
}
