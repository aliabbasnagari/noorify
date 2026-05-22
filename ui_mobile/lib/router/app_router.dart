import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/login_screen.dart';
import '../screens/home_screen.dart';
import '../screens/library_screen.dart';
import '../screens/album_screen.dart';
import '../screens/artist_screen.dart';
import '../screens/songs_screen.dart';
import '../screens/playlist_screen.dart';
import '../screens/search_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/bookmarks_screen.dart';
import '../screens/radio_screen.dart';
import '../screens/liked_songs_screen.dart';
import '../screens/shares_screen.dart';
import '../screens/genre_screen.dart';
import '../screens/upload_screen.dart';
import '../screens/now_playing_screen.dart';
import '../screens/share_player_screen.dart';
import '../widgets/app_scaffold.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final auth = context.read<AuthProvider>();
    final isLoggedIn = auth.isAuthenticated;
    final isLoginPage = state.uri.path.startsWith('/login');
    final isSharePage = state.uri.path.startsWith('/share/');
    if (isSharePage) return null;
    if (!isLoggedIn && !isLoginPage) return '/login';
    if (isLoggedIn && isLoginPage) return '/';
    return null;
  },
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/share/:id',
      builder: (context, state) => SharePlayerScreen(id: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/now-playing',
      builder: (context, state) => const NowPlayingScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) => AppScaffold(child: child),
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/search',
          builder: (context, state) => const SearchScreen(),
        ),
        GoRoute(
          path: '/library',
          builder: (context, state) => const LibraryScreen(),
        ),
        GoRoute(
          path: '/songs',
          builder: (context, state) => const SongsScreen(),
        ),
        GoRoute(
          path: '/radio',
          builder: (context, state) => const RadioScreen(),
        ),
        GoRoute(
          path: '/bookmarks',
          builder: (context, state) => const BookmarksScreen(),
        ),
        GoRoute(
          path: '/liked',
          builder: (context, state) => const LikedSongsScreen(),
        ),
        GoRoute(
          path: '/shares',
          builder: (context, state) => const SharesScreen(),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, state) => const SettingsScreen(),
        ),
        GoRoute(
          path: '/upload',
          builder: (context, state) => const UploadScreen(),
        ),
        GoRoute(
          path: '/album/:id',
          builder: (context, state) => AlbumScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/artist/:id',
          builder: (context, state) => ArtistScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/playlist/:id',
          builder: (context, state) => PlaylistScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/genre/:name',
          builder: (context, state) => GenreScreen(genre: state.pathParameters['name']!),
        ),
      ],
    ),
  ],
);
