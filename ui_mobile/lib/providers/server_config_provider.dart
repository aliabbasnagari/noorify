import 'package:flutter/foundation.dart';
import '../api/models.dart';
import '../api/native_client.dart';

class ServerConfigProvider extends ChangeNotifier {
  ServerConfig _config = const ServerConfig();
  bool _loaded = false;

  ServerConfig get config => _config;
  bool get loaded => _loaded;

  Future<void> load(NativeClient client) async {
    try {
      _config = await client.getServerStatus();
    } catch (_) {}
    _loaded = true;
    notifyListeners();
  }

  void reset() {
    _config = const ServerConfig();
    _loaded = false;
    notifyListeners();
  }
}
