import 'package:flutter/foundation.dart';
import '../api/models.dart';
import '../api/subsonic_client.dart';

class PlaylistsProvider extends ChangeNotifier {
  List<Playlist> _playlists = [];
  bool _isLoading = false;

  List<Playlist> get playlists => _playlists;
  bool get isLoading => _isLoading;

  Future<void> load(SubsonicClient client) async {
    _isLoading = true;
    notifyListeners();
    try {
      _playlists = await client.getPlaylists();
    } catch (_) {}
    _isLoading = false;
    notifyListeners();
  }

  Future<Playlist?> create(SubsonicClient client, String name) async {
    try {
      final pl = await client.createPlaylist(name);
      _playlists = [pl, ..._playlists];
      notifyListeners();
      return pl;
    } catch (_) {
      return null;
    }
  }

  Future<void> delete(SubsonicClient client, String id) async {
    try {
      await client.deletePlaylist(id);
      _playlists = _playlists.where((p) => p.id != id).toList();
      notifyListeners();
    } catch (_) {}
  }

  void reset() {
    _playlists = [];
    notifyListeners();
  }
}
