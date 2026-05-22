import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

const _authHeader = 'X-ND-Authorization';
const _clientIdHeader = 'X-ND-Client-Unique-Id';
const _clientId = 'navidrome-flutter-app';

class ApiError implements Exception {
  final int status;
  final String message;
  ApiError(this.status, this.message);
  @override
  String toString() => 'ApiError($status): $message';
}

class NativeClient {
  final String serverUrl;
  String? _token;

  NativeClient({required this.serverUrl, String? token}) : _token = token;

  void updateToken(String token) => _token = token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        _clientIdHeader: _clientId,
        if (_token != null) _authHeader: 'Bearer $_token',
      };

  void _maybeRefreshToken(http.Response res) {
    final newToken = res.headers[_authHeader.toLowerCase()];
    if (newToken != null && newToken.isNotEmpty) {
      _token = newToken.replaceFirst(RegExp(r'^Bearer\s+', caseSensitive: false), '');
    }
  }

  Future<dynamic> _request(String method, String path, {dynamic body}) async {
    final uri = Uri.parse('$serverUrl$path');
    final http.Response res;
    switch (method) {
      case 'GET':
        res = await http.get(uri, headers: _headers);
      case 'POST':
        res = await http.post(uri,
            headers: _headers, body: body != null ? jsonEncode(body) : null);
      case 'PUT':
        res = await http.put(uri,
            headers: _headers, body: body != null ? jsonEncode(body) : null);
      case 'DELETE':
        res = await http.delete(uri, headers: _headers);
      default:
        throw ApiError(0, 'Unknown method: $method');
    }
    _maybeRefreshToken(res);
    if (res.statusCode == 204) return null;
    if (res.statusCode >= 400) {
      throw ApiError(res.statusCode, res.body.isNotEmpty ? res.body : res.reasonPhrase ?? '');
    }
    if (res.body.isEmpty) return null;
    return jsonDecode(res.body);
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  Future<AuthInfo> login(String username, String password) async {
    final data = await _request('POST', '/auth/login', body: {
      'username': username,
      'password': password,
    });
    final info = AuthInfo.fromJson(data as Map<String, dynamic>, serverUrl: serverUrl);
    _token = info.token;
    return info;
  }

  Future<AuthInfo> createAdmin(String username, String password) async {
    final data = await _request('POST', '/auth/createAdmin', body: {
      'username': username,
      'password': password,
    });
    final info = AuthInfo.fromJson(data as Map<String, dynamic>, serverUrl: serverUrl);
    _token = info.token;
    return info;
  }

  Future<ServerConfig> getServerStatus() async {
    final data = await _request('GET', '/auth/status');
    return ServerConfig.fromJson(data as Map<String, dynamic>? ?? {});
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  Future<List<NativeUser>> getUsers() async {
    final data = await _request('GET', '/api/user');
    return (data as List<dynamic>)
        .map((e) => NativeUser.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<NativeUser> getUser(String id) async {
    final data = await _request('GET', '/api/user/$id');
    return NativeUser.fromJson(data as Map<String, dynamic>);
  }

  Future<NativeUser> createUser(Map<String, dynamic> params) async {
    final data = await _request('POST', '/api/user', body: params);
    return NativeUser.fromJson(data as Map<String, dynamic>);
  }

  Future<NativeUser> updateUser(String id, Map<String, dynamic> params) async {
    final data = await _request('PUT', '/api/user/$id', body: params);
    return NativeUser.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteUser(String id) async => _request('DELETE', '/api/user/$id');

  // ─── Songs ─────────────────────────────────────────────────────────────────

  Future<List<Song>> getArtistSongs(String artistId) async {
    final data = await _request(
        'GET', '/api/song?_sort=album&_order=ASC&artist_id=$artistId&_end=500');
    return (data as List<dynamic>)
        .map((e) => Song.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ─── Image Upload ──────────────────────────────────────────────────────────

  Future<void> uploadArtistImage(String artistId, List<int> imageBytes, String filename) async {
    final uri = Uri.parse('$serverUrl/api/artist/$artistId/image');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll({
      _clientIdHeader: _clientId,
      if (_token != null) _authHeader: 'Bearer $_token',
    });
    request.files.add(http.MultipartFile.fromBytes('image', imageBytes, filename: filename));
    final streamed = await request.send();
    _maybeRefreshToken(await http.Response.fromStream(streamed));
  }

  Future<void> uploadPlaylistImage(
      String playlistId, List<int> imageBytes, String filename) async {
    final uri = Uri.parse('$serverUrl/api/playlist/$playlistId/image');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll({
      _clientIdHeader: _clientId,
      if (_token != null) _authHeader: 'Bearer $_token',
    });
    request.files.add(http.MultipartFile.fromBytes('image', imageBytes, filename: filename));
    final streamed = await request.send();
    _maybeRefreshToken(await http.Response.fromStream(streamed));
  }

  // ─── Library ───────────────────────────────────────────────────────────────

  Future<List<dynamic>> getLibraries() async {
    return (await _request('GET', '/api/library')) as List<dynamic>;
  }

  Future<dynamic> createLibrary(Map<String, dynamic> params) async {
    return _request('POST', '/api/library', body: params);
  }

  Future<void> deleteLibrary(String id) async => _request('DELETE', '/api/library/$id');

  // ─── Upload ────────────────────────────────────────────────────────────────

  Future<void> uploadFile(List<int> fileBytes, String filename) async {
    final uri = Uri.parse('$serverUrl/api/upload');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll({
      _clientIdHeader: _clientId,
      if (_token != null) _authHeader: 'Bearer $_token',
    });
    request.files.add(http.MultipartFile.fromBytes('file', fileBytes, filename: filename));
    await request.send();
  }
}
