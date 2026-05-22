import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/player_provider.dart';
import 'providers/playlists_provider.dart';
import 'providers/server_config_provider.dart';
import 'router/app_router.dart';

class NavidromeApp extends StatelessWidget {
  const NavidromeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ServerConfigProvider()),
        ChangeNotifierProvider(create: (_) => PlaylistsProvider()),
        ChangeNotifierProvider(create: (_) => PlayerProvider()),
      ],
      child: const _AppWithListeners(),
    );
  }
}

/// Initializes auth and connects providers once auth state is available.
class _AppWithListeners extends StatefulWidget {
  const _AppWithListeners();

  @override
  State<_AppWithListeners> createState() => _AppWithListenersState();
}

class _AppWithListenersState extends State<_AppWithListeners> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    final auth = context.read<AuthProvider>();
    final config = context.read<ServerConfigProvider>();
    final playlists = context.read<PlaylistsProvider>();
    final player = context.read<PlayerProvider>();

    await auth.restoreAuth();
    await player.loadVolumePrefs();

    if (auth.isAuthenticated) {
      await config.load(auth.nativeClient!);
      player.attachClient(auth.subsonicClient!);
      await playlists.load(auth.subsonicClient!);
    }

    // React to future login/logout
    auth.addListener(() async {
      if (auth.isAuthenticated) {
        await config.load(auth.nativeClient!);
        player.attachClient(auth.subsonicClient!);
        await playlists.load(auth.subsonicClient!);
      } else {
        config.reset();
        playlists.reset();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Navidrome',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(),
      routerConfig: appRouter,
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF121212),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF1db954),
        secondary: Color(0xFF1db954),
        surface: Color(0xFF121212),
        onPrimary: Colors.black,
        onSurface: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF121212),
        foregroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: Color(0xFF121212),
        indicatorColor: Colors.transparent,
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(color: Colors.white, fontSize: 11),
        ),
      ),
      sliderTheme: const SliderThemeData(
        activeTrackColor: Color(0xFF1db954),
        inactiveTrackColor: Color(0xFF282828),
        thumbColor: Colors.white,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(Colors.white),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return const Color(0xFF1db954);
          return const Color(0xFF282828);
        }),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: Color(0xFF1db954),
      ),
      dividerColor: Colors.white12,
      textTheme: const TextTheme(
        bodyMedium: TextStyle(color: Colors.white),
        bodySmall: TextStyle(color: Color(0xFFa7a7a7)),
      ),
      useMaterial3: true,
    );
  }
}
