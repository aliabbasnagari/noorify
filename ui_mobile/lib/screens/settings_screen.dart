import 'package:flutter/material.dart' hide RepeatMode;
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';
import '../providers/server_config_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final config = context.watch<ServerConfigProvider>().config;
    final player = context.watch<PlayerProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: const Text('Settings',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        children: [
          // User section
          if (user != null) ...[
            _SectionHeader('Account'),
            ListTile(
              leading: CircleAvatar(
                backgroundColor: const Color(0xFF1db954),
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                      color: Colors.black, fontWeight: FontWeight.bold),
                ),
              ),
              title: Text(user.name,
                  style: const TextStyle(color: Colors.white)),
              subtitle: Text(user.username,
                  style: const TextStyle(color: Color(0xFFa7a7a7))),
              trailing: user.isAdmin
                  ? Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1db954),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('Admin',
                          style: TextStyle(
                              color: Colors.black,
                              fontSize: 11,
                              fontWeight: FontWeight.bold)),
                    )
                  : null,
            ),
            const Divider(color: Colors.white12),
          ],

          // Playback section
          _SectionHeader('Playback'),
          ListTile(
            leading: const Icon(Icons.volume_up, color: Color(0xFFa7a7a7)),
            title: const Text('Volume',
                style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: Slider(
              value: player.volume,
              onChanged: player.setVolume,
              activeColor: const Color(0xFF1db954),
              inactiveColor: const Color(0xFF282828),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.shuffle, color: Color(0xFFa7a7a7)),
            title: const Text('Shuffle',
                style: TextStyle(color: Colors.white, fontSize: 14)),
            trailing: Switch(
              value: player.shuffleActive,
              activeColor: const Color(0xFF1db954),
              onChanged: (_) => player.toggleShuffle(),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.repeat, color: Color(0xFFa7a7a7)),
            title: const Text('Repeat',
                style: TextStyle(color: Colors.white, fontSize: 14)),
            trailing: _RepeatButton(),
          ),
          const Divider(color: Colors.white12),

          // Server section
          _SectionHeader('Server'),
          ListTile(
            leading: const Icon(Icons.dns_outlined, color: Color(0xFFa7a7a7)),
            title: const Text('Server URL',
                style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: Text(user?.serverUrl ?? '-',
                style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
          ),
          if (config.enableDownloads)
            ListTile(
              leading: const Icon(Icons.download_outlined,
                  color: Color(0xFFa7a7a7)),
              title: const Text('Downloads',
                  style: TextStyle(color: Colors.white, fontSize: 14)),
              subtitle: const Text('Enabled by server',
                  style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
            ),
          const Divider(color: Colors.white12),

          // Admin section
          if (user?.isAdmin == true) ...[
            _SectionHeader('Admin'),
            ListTile(
              leading: const Icon(Icons.scanner, color: Color(0xFFa7a7a7)),
              title: const Text('Scan Library',
                  style: TextStyle(color: Colors.white, fontSize: 14)),
              onTap: () async {
                final subsonic = auth.subsonicClient;
                if (subsonic == null) return;
                try {
                  await subsonic.startScan();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Library scan started')),
                    );
                  }
                } catch (_) {}
              },
            ),
            ListTile(
              leading: const Icon(Icons.upload_file, color: Color(0xFFa7a7a7)),
              title: const Text('Upload Music',
                  style: TextStyle(color: Colors.white, fontSize: 14)),
              onTap: () => context.go('/upload'),
            ),
            const Divider(color: Colors.white12),
          ],

          // Logout
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout',
                style: TextStyle(color: Colors.red, fontSize: 14)),
            onTap: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: const Color(0xFF282828),
                  title: const Text('Logout',
                      style: TextStyle(color: Colors.white)),
                  content: const Text('Are you sure you want to log out?',
                      style: TextStyle(color: Color(0xFFa7a7a7))),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel')),
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Logout',
                            style: TextStyle(color: Colors.red))),
                  ],
                ),
              );
              if (confirmed == true && context.mounted) {
                await auth.logout();
              }
            },
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

class _RepeatButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final (icon, color, label) = switch (player.repeatMode) {
      RepeatMode.off => (Icons.repeat, const Color(0xFFa7a7a7), 'Off'),
      RepeatMode.all => (Icons.repeat, const Color(0xFF1db954), 'All'),
      RepeatMode.one => (Icons.repeat_one, const Color(0xFF1db954), 'One'),
    };
    return TextButton.icon(
      onPressed: player.cycleRepeat,
      icon: Icon(icon, color: color, size: 20),
      label: Text(label, style: TextStyle(color: color, fontSize: 12)),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(title,
          style: const TextStyle(
              color: Color(0xFFa7a7a7),
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5)),
    );
  }
}
