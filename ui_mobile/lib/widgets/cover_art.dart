import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class CoverArt extends StatelessWidget {
  final String? url;
  final double size;
  final double borderRadius;
  final IconData placeholderIcon;

  const CoverArt({
    super.key,
    this.url,
    this.size = 56,
    this.borderRadius = 4,
    this.placeholderIcon = Icons.music_note,
  });

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return _placeholder();
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: CachedNetworkImage(
        imageUrl: url!,
        width: size,
        height: size,
        fit: BoxFit.cover,
        placeholder: (context, url) => _shimmer(),
        errorWidget: (context, url, error) => _placeholder(),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF282828),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Icon(placeholderIcon, color: Colors.grey[600], size: size * 0.4),
    );
  }

  Widget _shimmer() {
    return Shimmer.fromColors(
      baseColor: const Color(0xFF282828),
      highlightColor: const Color(0xFF383838),
      child: Container(
        width: size,
        height: size,
        color: const Color(0xFF282828),
      ),
    );
  }
}
