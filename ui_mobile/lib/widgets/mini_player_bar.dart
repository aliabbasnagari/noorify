import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import 'cover_art.dart';

class MiniPlayerBar extends StatelessWidget {
  const MiniPlayerBar({super.key});

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final auth = context.read<AuthProvider>();
    final track = player.currentTrack;

    if (track == null) return const SizedBox.shrink();

    final coverUrl = auth.subsonicClient?.getCoverArtUrl(track.coverArt, size: 100) ?? '';

    return GestureDetector(
      onTap: () => context.push('/now-playing'),
      child: Container(
        height: 64,
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFF282828),
          borderRadius: BorderRadius.circular(10),
          boxShadow: const [BoxShadow(blurRadius: 12, color: Colors.black45)],
        ),
        child: Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: [
                    CoverArt(url: coverUrl, size: 44, borderRadius: 6),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            track.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          Text(
                            track.artist,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: player.togglePlay,
                      icon: Icon(
                        player.isPlaying ? Icons.pause : Icons.play_arrow,
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
                    IconButton(
                      onPressed: player.next,
                      icon: const Icon(Icons.skip_next, color: Colors.white, size: 26),
                    ),
                  ],
                ),
              ),
            ),
            // Progress bar
            LinearProgressIndicator(
              value: player.currentDuration.inMilliseconds > 0
                  ? player.currentPosition.inMilliseconds /
                      player.currentDuration.inMilliseconds
                  : 0.0,
              backgroundColor: Colors.white12,
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1db954)),
              minHeight: 2,
            ),
          ],
        ),
      ),
    );
  }
}
