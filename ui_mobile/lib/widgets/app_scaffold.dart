import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/playlists_provider.dart';
import '../providers/player_provider.dart';
import 'mini_player_bar.dart';

class AppScaffold extends StatefulWidget {
  final Widget child;

  const AppScaffold({super.key, required this.child});

  @override
  State<AppScaffold> createState() => _AppScaffoldState();
}

class _AppScaffoldState extends State<AppScaffold> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  static const _navItems = [
    _NavItem(path: '/', icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Home'),
    _NavItem(path: '/search', icon: Icons.search, activeIcon: Icons.search, label: 'Search'),
    _NavItem(
        path: '/library',
        icon: Icons.library_music_outlined,
        activeIcon: Icons.library_music,
        label: 'Library'),
    _NavItem(
        path: '/settings',
        icon: Icons.settings_outlined,
        activeIcon: Icons.settings,
        label: 'More'),
  ];

  int _selectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location == '/') return 0;
    if (location.startsWith('/search')) return 1;
    if (location.startsWith('/library')) return 2;
    return 3;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _selectedIndex(context);
    final auth = context.watch<AuthProvider>();
    final player = context.watch<PlayerProvider>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFF121212),
      drawer: _AppDrawer(onClose: () => _scaffoldKey.currentState?.closeDrawer()),
      body: widget.child,
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (player.hasQueue) const MiniPlayerBar(),
          NavigationBar(
            backgroundColor: const Color(0xFF121212),
            indicatorColor: Colors.transparent,
            selectedIndex: idx,
            onDestinationSelected: (i) {
              if (i == 3) {
                _scaffoldKey.currentState?.openDrawer();
              } else {
                context.go(_navItems[i].path);
              }
            },
            destinations: _navItems
                .map((item) => NavigationDestination(
                      icon: Icon(item.icon, color: const Color(0xFFa7a7a7)),
                      selectedIcon: Icon(item.activeIcon, color: Colors.white),
                      label: item.label,
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem(
      {required this.path,
      required this.icon,
      required this.activeIcon,
      required this.label});
}

class _AppDrawer extends StatelessWidget {
  final VoidCallback onClose;

  const _AppDrawer({required this.onClose});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final playlists = context.watch<PlaylistsProvider>();

    return Drawer(
      backgroundColor: const Color(0xFF121212),
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // User card
            if (user != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: const Color(0xFF1db954),
                      child: Text(
                        user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                        style: const TextStyle(
                            color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.name,
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                          if (user.isAdmin)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1db954),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('Admin',
                                  style: TextStyle(
                                      color: Colors.black,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold)),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            const Divider(color: Colors.white12),
            _DrawerTile(Icons.music_note_outlined, 'All Songs', '/songs', onClose),
            _DrawerTile(Icons.radio, 'Radio', '/radio', onClose),
            _DrawerTile(Icons.bookmark_outline, 'Bookmarks', '/bookmarks', onClose),
            _DrawerTile(Icons.favorite_outline, 'Liked Songs', '/liked', onClose),
            _DrawerTile(Icons.share_outlined, 'Shares', '/shares', onClose),
            if (user?.isAdmin == true)
              _DrawerTile(Icons.upload_file, 'Upload', '/upload', onClose),
            const Divider(color: Colors.white12),
            // Playlists
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 4),
              child: Row(
                children: [
                  const Text('Playlists',
                      style: TextStyle(
                          color: Color(0xFFa7a7a7), fontSize: 12, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.add, color: Color(0xFFa7a7a7), size: 18),
                    onPressed: () => _createPlaylist(context),
                  ),
                ],
              ),
            ),
            ...playlists.playlists.map((pl) => ListTile(
                  dense: true,
                  leading: const Icon(Icons.queue_music, color: Color(0xFFa7a7a7), size: 20),
                  title: Text(pl.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 13)),
                  onTap: () {
                    onClose();
                    context.push('/playlist/${pl.id}');
                  },
                )),
            const Divider(color: Colors.white12),
            ListTile(
              leading: const Icon(Icons.logout, color: Color(0xFFa7a7a7), size: 20),
              title: const Text('Logout',
                  style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 13)),
              onTap: () async {
                onClose();
                await auth.logout();
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _createPlaylist(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final playlistsProvider = context.read<PlaylistsProvider>();
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF282828),
        title: const Text('New Playlist', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Playlist name',
            hintStyle: TextStyle(color: Color(0xFFa7a7a7)),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, controller.text),
              child: const Text('Create', style: TextStyle(color: Color(0xFF1db954)))),
        ],
      ),
    );
    if (name != null && name.isNotEmpty) {
      final subsonic = auth.subsonicClient;
      if (subsonic != null) {
        await playlistsProvider.create(subsonic, name);
      }
    }
  }
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String path;
  final VoidCallback onClose;

  const _DrawerTile(this.icon, this.label, this.path, this.onClose);

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFFa7a7a7), size: 22),
      title: Text(label, style: const TextStyle(color: Colors.white, fontSize: 14)),
      onTap: () {
        onClose();
        context.go(path);
      },
    );
  }
}
