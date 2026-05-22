import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import 'cover_art.dart';

class ArtistCard extends StatelessWidget {
  final Artist artist;

  const ArtistCard({super.key, required this.artist});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final coverUrl = auth.subsonicClient?.getCoverArtUrl(artist.coverArt, size: 200) ?? '';

    return GestureDetector(
      onTap: () => context.push('/artist/${artist.id}'),
      child: Column(
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF282828)),
            child: ClipOval(
              child: CoverArt(url: coverUrl, size: 120, borderRadius: 60),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: 120,
            child: Text(
              artist.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          Text(
            '${artist.albumCount} album${artist.albumCount != 1 ? 's' : ''}',
            style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class ArtistListTile extends StatelessWidget {
  final Artist artist;

  const ArtistListTile({super.key, required this.artist});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final coverUrl = auth.subsonicClient?.getCoverArtUrl(artist.coverArt, size: 60) ?? '';
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: ClipOval(child: CoverArt(url: coverUrl, size: 48, borderRadius: 24)),
      title: Text(artist.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white, fontSize: 14)),
      subtitle: Text('${artist.albumCount} albums',
          style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
      onTap: () => context.push('/artist/${artist.id}'),
    );
  }
}
