import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/models.dart';
import '../api/native_client.dart';
import '../api/subsonic_client.dart';

class AuthProvider extends ChangeNotifier {
  AuthInfo? _user;
  bool _isLoading = false;
  String? _error;

  AuthInfo? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  NativeClient? _nativeClient;
  SubsonicClient? _subsonicClient;

  NativeClient? get nativeClient => _nativeClient;
  SubsonicClient? get subsonicClient => _subsonicClient;

  Future<void> restoreAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString('nd:auth');
    if (json == null) return;
    try {
      final map = jsonDecode(json) as Map<String, dynamic>;
      _user = AuthInfo.fromJson(map, serverUrl: map['serverUrl'] as String? ?? '');
      _buildClients();
      notifyListeners();
    } catch (_) {
      await prefs.remove('nd:auth');
    }
  }

  void _buildClients() {
    if (_user == null) return;
    _nativeClient = NativeClient(serverUrl: _user!.serverUrl, token: _user!.token);
    _subsonicClient = SubsonicClient(
      serverUrl: _user!.serverUrl,
      username: _user!.username,
      subsonicToken: _user!.subsonicToken,
      subsonicSalt: _user!.subsonicSalt,
    );
  }

  Future<void> login(String serverUrl, String username, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final client = NativeClient(serverUrl: serverUrl);
      final info = await client.login(username, password);
      _user = info;
      _buildClients();
      await _saveAuth();
    } on ApiError catch (e) {
      _error = e.status == 401 ? 'Invalid username or password' : e.message;
    } catch (e) {
      _error = 'Could not connect to server';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createAdmin(String serverUrl, String username, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final client = NativeClient(serverUrl: serverUrl);
      final info = await client.createAdmin(username, password);
      _user = info;
      _buildClients();
      await _saveAuth();
    } on ApiError catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Could not connect to server';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _user = null;
    _nativeClient = null;
    _subsonicClient = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('nd:auth');
    notifyListeners();
  }

  Future<void> _saveAuth() async {
    if (_user == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('nd:auth', jsonEncode(_user!.toJson()));
  }
}
