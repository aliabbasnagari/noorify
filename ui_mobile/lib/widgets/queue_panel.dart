import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/player_provider.dart';
import 'cover_art.dart';
import 'song_tile.dart';

class QueuePanel extends StatelessWidget {
  const QueuePanel({super.key});

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final queue = player.queue;
    final current = player.currentIndex;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF121212),
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            children: [
              const _DragHandle(),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                child: Row(
                  children: [
                    const Text('Queue',
                        style: TextStyle(
                            color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Text('${queue.length} tracks',
                        style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
                  ],
                ),
              ),
              Expanded(
                child: queue.isEmpty
                    ? const Center(
                        child: Text('Queue is empty',
                            style: TextStyle(color: Color(0xFFa7a7a7))))
                    : ListView.builder(
                        controller: scrollController,
                        itemCount: queue.length,
                        itemBuilder: (context, index) {
                          final song = queue[index];
                          final isCurrent = index == current;
                          return Container(
                            color: isCurrent ? Colors.white.withAlpha(15) : null,
                            child: Row(
                              children: [
                                Expanded(
                                  child: SongTile(
                                    song: song,
                                    showCover: true,
                                    onTap: () => player.jumpToQueueIndex(index),
                                  ),
                                ),
                                if (!isCurrent)
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline,
                                        color: Color(0xFFa7a7a7), size: 18),
                                    onPressed: () => player.removeFromQueue(index),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 10),
        width: 36,
        height: 4,
        decoration: BoxDecoration(
          color: Colors.grey[700],
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}
