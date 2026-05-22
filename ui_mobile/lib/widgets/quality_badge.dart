import 'package:flutter/material.dart';
import '../api/models.dart';

class QualityBadge extends StatelessWidget {
  final Song song;

  const QualityBadge({super.key, required this.song});

  @override
  Widget build(BuildContext context) {
    final suffix = song.suffix.toUpperCase();
    final isLossless = ['FLAC', 'WAV', 'AIFF', 'ALAC', 'APE', 'WV'].contains(suffix);
    final bitRate = song.bitRate;

    Color bgColor;
    String label;

    if (isLossless) {
      bgColor = const Color(0xFF1db954);
      label = suffix;
    } else if (bitRate != null && bitRate >= 320) {
      bgColor = Colors.blue[700]!;
      label = '${bitRate}k';
    } else if (bitRate != null && bitRate >= 192) {
      bgColor = Colors.blueGrey[700]!;
      label = '${bitRate}k';
    } else {
      bgColor = Colors.grey[700]!;
      label = bitRate != null ? '${bitRate}k' : suffix;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
      ),
    );
  }
}
