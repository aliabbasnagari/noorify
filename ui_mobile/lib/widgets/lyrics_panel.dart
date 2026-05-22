import 'package:flutter/material.dart';
import '../api/models.dart';

class LyricsPanel extends StatelessWidget {
  final Lyrics? lyrics;
  final Duration currentPosition;

  const LyricsPanel({super.key, this.lyrics, required this.currentPosition});

  @override
  Widget build(BuildContext context) {
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
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[700],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 12),
                child: Row(
                  children: [
                    Text('Lyrics',
                        style: TextStyle(
                            color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Expanded(
                child: lyrics == null
                    ? const Center(
                        child: Text('No lyrics available',
                            style: TextStyle(color: Color(0xFFa7a7a7))))
                    : _LyricsContent(
                        lyrics: lyrics!,
                        currentPosition: currentPosition,
                        scrollController: scrollController,
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LyricsContent extends StatefulWidget {
  final Lyrics lyrics;
  final Duration currentPosition;
  final ScrollController scrollController;

  const _LyricsContent({
    required this.lyrics,
    required this.currentPosition,
    required this.scrollController,
  });

  @override
  State<_LyricsContent> createState() => _LyricsContentState();
}

class _LyricsContentState extends State<_LyricsContent> {
  int _currentLineIndex = -1;

  @override
  void didUpdateWidget(_LyricsContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.lyrics.synced && widget.lyrics.lines.isNotEmpty) {
      final posMs = widget.currentPosition.inMilliseconds;
      int idx = -1;
      for (int i = 0; i < widget.lyrics.lines.length; i++) {
        if (widget.lyrics.lines[i].start <= posMs) idx = i;
      }
      if (idx != _currentLineIndex) {
        setState(() => _currentLineIndex = idx);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.lyrics.synced && widget.lyrics.lines.isNotEmpty) {
      return ListView.builder(
        controller: widget.scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        itemCount: widget.lyrics.lines.length,
        itemBuilder: (context, i) {
          final isCurrent = i == _currentLineIndex;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Text(
              widget.lyrics.lines[i].value,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isCurrent ? Colors.white : Colors.grey[600],
                fontSize: isCurrent ? 17 : 14,
                fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                height: 1.5,
              ),
            ),
          );
        },
      );
    }

    // Plain text lyrics
    final text = widget.lyrics.plainText ?? '';
    return SingleChildScrollView(
      controller: widget.scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 14, height: 1.8),
      ),
    );
  }
}
