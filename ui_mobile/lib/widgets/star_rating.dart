import 'package:flutter/material.dart';

class StarRating extends StatelessWidget {
  final int rating;
  final ValueChanged<int>? onRating;
  final double size;
  final Color activeColor;

  const StarRating({
    super.key,
    required this.rating,
    this.onRating,
    this.size = 20,
    this.activeColor = const Color(0xFF1db954),
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final starValue = i + 1;
        return GestureDetector(
          onTap: onRating != null
              ? () => onRating!(rating == starValue ? 0 : starValue)
              : null,
          child: Icon(
            starValue <= rating ? Icons.star : Icons.star_border,
            size: size,
            color: starValue <= rating ? activeColor : Colors.grey[600],
          ),
        );
      }),
    );
  }
}
