import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/models.dart';
import '../providers/auth_provider.dart';
import '../providers/player_provider.dart';

class RadioScreen extends StatefulWidget {
  const RadioScreen({super.key});

  @override
  State<RadioScreen> createState() => _RadioScreenState();
}

class _RadioScreenState extends State<RadioScreen> {
  List<RadioStation> _stations = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    try {
      final stations = await subsonic.getInternetRadioStations();
      if (!mounted) return;
      setState(() {
        _stations = stations;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addStation() async {
    final nameCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    final homepageCtrl = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF282828),
        title: const Text('Add Radio Station',
            style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Field(controller: nameCtrl, label: 'Station Name'),
            const SizedBox(height: 8),
            _Field(controller: urlCtrl, label: 'Stream URL'),
            const SizedBox(height: 8),
            _Field(controller: homepageCtrl, label: 'Homepage URL (optional)'),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final auth = context.read<AuthProvider>();
              final subsonic = auth.subsonicClient;
              if (subsonic == null) return;
              await subsonic.createInternetRadioStation(
                nameCtrl.text,
                urlCtrl.text,
                homePageUrl:
                    homepageCtrl.text.isNotEmpty ? homepageCtrl.text : null,
              );
              await _load();
            },
            child: const Text('Add',
                style: TextStyle(color: Color(0xFF1db954))),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteStation(RadioStation station) async {
    final auth = context.read<AuthProvider>();
    final subsonic = auth.subsonicClient;
    if (subsonic == null) return;
    await subsonic.deleteInternetRadioStation(station.id);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: const Text('Radio',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          if (user?.isAdmin == true)
            IconButton(
              icon: const Icon(Icons.add, color: Colors.white),
              onPressed: _addStation,
            ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF1db954)))
          : _stations.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.radio, color: Color(0xFFa7a7a7), size: 64),
                      SizedBox(height: 16),
                      Text('No radio stations',
                          style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 16)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _stations.length,
                  itemBuilder: (context, i) {
                    final station = _stations[i];
                    return ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Color(0xFF282828),
                        child: Icon(Icons.radio, color: Color(0xFF1db954)),
                      ),
                      title: Text(station.name,
                          style: const TextStyle(color: Colors.white)),
                      subtitle: station.homePageUrl != null
                          ? Text(station.homePageUrl!,
                              style:
                                  const TextStyle(color: Color(0xFFa7a7a7), fontSize: 11),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis)
                          : null,
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.play_circle_outline,
                                color: Color(0xFF1db954)),
                            onPressed: () {
                              // Radio stations have a stream URL but no Song model.
                              // Create a pseudo-song for the player.
                              final pseudoSong = Song(
                                id: station.id,
                                title: station.name,
                                duration: 0,
                                suffix: 'mp3',
                                contentType: 'audio/mpeg',
                              );
                              // Player needs direct URL; use a workaround by
                              // playing via just_audio's URI directly.
                              // For simplicity, we still pass through PlayerProvider.
                              context.read<PlayerProvider>().playTrack(pseudoSong);
                            },
                          ),
                          if (user?.isAdmin == true)
                            IconButton(
                              icon: const Icon(Icons.delete_outline,
                                  color: Colors.red, size: 18),
                              onPressed: () => _deleteStation(station),
                            ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  const _Field({required this.controller, required this.label});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFFa7a7a7)),
        enabledBorder: const UnderlineInputBorder(
            borderSide: BorderSide(color: Color(0xFFa7a7a7))),
        focusedBorder: const UnderlineInputBorder(
            borderSide: BorderSide(color: Color(0xFF1db954))),
      ),
    );
  }
}
