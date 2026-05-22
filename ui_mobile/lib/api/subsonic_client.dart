import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

const _clientName = 'NavidromeFlutter';
const _apiVersion = '1.16.1';

class SubsonicError implements Exception {
  final int code;
  final String message;
  SubsonicError(this.code, this.message);
  @override
  String toString() => 'SubsonicError($code): $message';
}

class SubsonicClient {
  final String serverUrl;
  final String username;
  final String subsonicToken;
  final String subsonicSalt;

  SubsonicClient({
    required this.serverUrl,
    required this.username,
    required this.subsonicToken,
    required this.subsonicSalt,
  });

  Uri _buildUri(String command, {String? id, Map<String, dynamic>? extra}) {
    final params = <String, dynamic>{
      'u': username,
      't': subsonicToken,
      's': subsonicSalt,
      'f': 'json',
      'v': _apiVersion,
      'c': _clientName,
    };
    if (id != null) params['id'] = id;
    if (extra != null) {
      for (final entry in extra.entries) {
        if (entry.value is List) {
          // multi-value params handled via queryParameters list below
        } else {
          params[entry.key] = entry.value.toString();
        }
      }
    }

    // Build URI manually to support multi-value params
    final base = Uri.parse('$serverUrl/rest/$command');
    final queryParts = <String>[];
    params.forEach((k, v) => queryParts.add('$k=${Uri.encodeQueryComponent(v.toString())}'));
    if (extra != null) {
      for (final entry in extra.entries) {
        if (entry.value is List) {
          for (final item in entry.value as List) {
            queryParts
                .add('${entry.key}=${Uri.encodeQueryComponent(item.toString())}');
          }
        }
      }
    }
    return Uri.parse('${base.scheme}://${base.host}:${base.port}${base.path}?${queryParts.join('&')}');
  }

  String buildUrl(String command, {String? id, Map<String, dynamic>? extra}) {
    return _buildUri(command, id: id, extra: extra).toString();
  }

  Future<Map<String, dynamic>> _fetch(String command,
      {String? id, Map<String, dynamic>? extra}) async {
    final uri = _buildUri(command, id: id, extra: extra);
    final res = await http.get(uri);
    if (res.statusCode != 200) {
      throw SubsonicError(res.statusCode, res.reasonPhrase ?? 'HTTP error');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final resp = body['subsonic-response'] as Map<String, dynamic>;
    if (resp['status'] == 'failed') {
      final err = resp['error'] as Map<String, dynamic>? ?? {};
      throw SubsonicError(err['code'] as int? ?? 0, err['message'] as String? ?? 'Subsonic error');
    }
    return resp;
  }

  // ─── URL helpers ───────────────────────────────────────────────────────────

  String getCoverArtUrl(String? id, {int size = 300}) {
    if (id == null || id.isEmpty) return '';
    return buildUrl('getCoverArt', id: id, extra: {'size': size});
  }

  String getStreamUrl(String songId) => buildUrl('stream', id: songId);

  String getDownloadUrl(String songId) => buildUrl('download', id: songId);

  String getAvatarUrl(String username) => buildUrl('getAvatar', extra: {'username': username});

  // ─── Albums ────────────────────────────────────────────────────────────────

  Future<List<Album>> getAlbumList(
    String type, {
    int size = 20,
    int offset = 0,
    Map<String, dynamic>? extra,
  }) async {
    final data = await _fetch('getAlbumList2',
        extra: {'type': type, 'size': size, 'offset': offset, ...?extra});
    final list = data['albumList2'] as Map<String, dynamic>?;
    final albums = list?['album'] as List<dynamic>? ?? [];
    return albums.map((e) => Album.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Album> getAlbum(String id) async {
    final data = await _fetch('getAlbum', id: id);
    return Album.fromJson(data['album'] as Map<String, dynamic>);
  }

  // ─── Artists ───────────────────────────────────────────────────────────────

  Future<List<Artist>> getArtists() async {
    final data = await _fetch('getArtists');
    final artists = data['artists'] as Map<String, dynamic>?;
    final indices = artists?['index'] as List<dynamic>? ?? [];
    final result = <Artist>[];
    for (final idx in indices) {
      final list = (idx as Map<String, dynamic>)['artist'] as List<dynamic>? ?? [];
      result.addAll(list.map((e) => Artist.fromJson(e as Map<String, dynamic>)));
    }
    return result;
  }

  Future<Artist> getArtist(String id) async {
    final data = await _fetch('getArtist', id: id);
    return Artist.fromJson(data['artist'] as Map<String, dynamic>);
  }

  Future<ArtistInfo> getArtistInfo(String id) async {
    final data = await _fetch('getArtistInfo2', id: id, extra: {'count': 5});
    return ArtistInfo.fromJson(data['artistInfo2'] as Map<String, dynamic>? ?? {});
  }

  // ─── Songs ─────────────────────────────────────────────────────────────────

  Future<Map<String, List<dynamic>>> getStarred() async {
    final data = await _fetch('getStarred2');
    final starred = data['starred2'] as Map<String, dynamic>? ?? {};
    return {
      'artist': starred['artist'] as List<dynamic>? ?? [],
      'album': starred['album'] as List<dynamic>? ?? [],
      'song': starred['song'] as List<dynamic>? ?? [],
    };
  }

  Future<void> star(String id) async => _fetch('star', extra: {'id': id});

  Future<void> unstar(String id) async => _fetch('unstar', extra: {'id': id});

  Future<void> setRating(String id, int rating) async =>
      _fetch('setRating', id: id, extra: {'rating': rating});

  Future<List<Song>> getRandomSongs({int size = 10, String? genre}) async {
    final data = await _fetch('getRandomSongs',
        extra: {'size': size, if (genre != null) 'genre': genre});
    final songs = (data['randomSongs'] as Map<String, dynamic>?)?['song'] as List<dynamic>? ?? [];
    return songs.map((e) => Song.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Song>> getSongsByGenre(String genre, {int count = 50, int offset = 0}) async {
    final data = await _fetch('getSongsByGenre',
        extra: {'genre': genre, 'count': count, 'offset': offset});
    final songs = (data['songsByGenre'] as Map<String, dynamic>?)?['song'] as List<dynamic>? ?? [];
    return songs.map((e) => Song.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Song>> getSimilarSongs(String id, {int count = 50}) async {
    final data = await _fetch('getSimilarSongs2', id: id, extra: {'count': count});
    final songs = (data['similarSongs2'] as Map<String, dynamic>?)?['song'] as List<dynamic>? ?? [];
    return songs.map((e) => Song.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Song>> getTopSongs(String artist, {int count = 50}) async {
    final data = await _fetch('getTopSongs', extra: {'artist': artist, 'count': count});
    final songs = (data['topSongs'] as Map<String, dynamic>?)?['song'] as List<dynamic>? ?? [];
    return songs.map((e) => Song.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ─── Genres ────────────────────────────────────────────────────────────────

  Future<List<Genre>> getGenres() async {
    final data = await _fetch('getGenres');
    final genres = (data['genres'] as Map<String, dynamic>?)?['genre'] as List<dynamic>? ?? [];
    return genres.map((e) => Genre.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ─── Playlists ─────────────────────────────────────────────────────────────

  Future<List<Playlist>> getPlaylists() async {
    final data = await _fetch('getPlaylists');
    final playlists =
        (data['playlists'] as Map<String, dynamic>?)?['playlist'] as List<dynamic>? ?? [];
    return playlists.map((e) => Playlist.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Playlist> getPlaylist(String id) async {
    final data = await _fetch('getPlaylist', id: id);
    return Playlist.fromJson(data['playlist'] as Map<String, dynamic>);
  }

  Future<Playlist> createPlaylist(String name) async {
    final data = await _fetch('createPlaylist', extra: {'name': name});
    return Playlist.fromJson(data['playlist'] as Map<String, dynamic>);
  }

  Future<void> deletePlaylist(String id) async =>
      _fetch('deletePlaylist', extra: {'id': id});

  Future<void> updatePlaylist(
    String playlistId, {
    String? name,
    String? comment,
    bool? isPublic,
    List<String>? songIdToAdd,
    List<int>? songIndexToRemove,
  }) async {
    await _fetch('updatePlaylist', extra: {
      'playlistId': playlistId,
      if (name != null) 'name': name,
      if (comment != null) 'comment': comment,
      if (isPublic != null) 'public': isPublic.toString(),
      if (songIdToAdd != null) 'songIdToAdd': songIdToAdd,
      if (songIndexToRemove != null)
        'songIndexToRemove': songIndexToRemove.map((e) => e.toString()).toList(),
    });
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> search(
    String query, {
    int artistCount = 3,
    int albumCount = 5,
    int songCount = 10,
  }) async {
    final data = await _fetch('search3', extra: {
      'query': query,
      'artistCount': artistCount,
      'albumCount': albumCount,
      'songCount': songCount,
    });
    final result = data['searchResult3'] as Map<String, dynamic>? ?? {};
    return {
      'artist': (result['artist'] as List<dynamic>? ?? [])
          .map((e) => Artist.fromJson(e as Map<String, dynamic>))
          .toList(),
      'album': (result['album'] as List<dynamic>? ?? [])
          .map((e) => Album.fromJson(e as Map<String, dynamic>))
          .toList(),
      'song': (result['song'] as List<dynamic>? ?? [])
          .map((e) => Song.fromJson(e as Map<String, dynamic>))
          .toList(),
    };
  }

  // ─── Scrobble ──────────────────────────────────────────────────────────────

  Future<void> scrobble(String id, {bool submission = true}) async {
    try {
      await _fetch('scrobble', extra: {'id': id, 'submission': submission.toString()});
    } catch (_) {}
  }

  // ─── Bookmarks ─────────────────────────────────────────────────────────────

  Future<List<Bookmark>> getBookmarks() async {
    final data = await _fetch('getBookmarks');
    final bookmarks =
        (data['bookmarks'] as Map<String, dynamic>?)?['bookmark'] as List<dynamic>? ?? [];
    return bookmarks.map((e) => Bookmark.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createBookmark(String id, int position, {String? comment}) async {
    await _fetch('createBookmark',
        id: id, extra: {'position': position, if (comment != null) 'comment': comment});
  }

  Future<void> deleteBookmark(String id) async =>
      _fetch('deleteBookmark', id: id);

  // ─── Radio ─────────────────────────────────────────────────────────────────

  Future<List<RadioStation>> getInternetRadioStations() async {
    final data = await _fetch('getInternetRadioStations');
    final stations =
        (data['internetRadioStations'] as Map<String, dynamic>?)?['internetRadioStation']
            as List<dynamic>? ??
            [];
    return stations.map((e) => RadioStation.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createInternetRadioStation(
      String name, String streamUrl, {String? homePageUrl}) async {
    await _fetch('createInternetRadioStation', extra: {
      'name': name,
      'streamUrl': streamUrl,
      if (homePageUrl != null) 'homePageUrl': homePageUrl,
    });
  }

  Future<void> updateInternetRadioStation(
      String id, String name, String streamUrl, {String? homePageUrl}) async {
    await _fetch('updateInternetRadioStation', id: id, extra: {
      'name': name,
      'streamUrl': streamUrl,
      if (homePageUrl != null) 'homePageUrl': homePageUrl,
    });
  }

  Future<void> deleteInternetRadioStation(String id) async =>
      _fetch('deleteInternetRadioStation', id: id);

  // ─── Shares ────────────────────────────────────────────────────────────────

  Future<List<Share>> getShares() async {
    final data = await _fetch('getShares');
    final shares = (data['shares'] as Map<String, dynamic>?)?['share'] as List<dynamic>? ?? [];
    return shares.map((e) => Share.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Share> createShare(
    List<String> ids, {
    String? description,
    String? expires,
    bool? downloadable,
  }) async {
    final data = await _fetch('createShare', extra: {
      'id': ids,
      if (description != null) 'description': description,
      if (expires != null) 'expires': expires,
      if (downloadable != null) 'downloadable': downloadable.toString(),
    });
    final shareList = (data['shares'] as Map<String, dynamic>?)?['share'] as List<dynamic>? ?? [];
    return Share.fromJson(shareList.first as Map<String, dynamic>);
  }

  Future<void> deleteShare(String id) async => _fetch('deleteShare', id: id);

  // ─── Play Queue ────────────────────────────────────────────────────────────

  Future<PlayQueue?> getPlayQueue() async {
    try {
      final data = await _fetch('getPlayQueue');
      final pq = data['playQueue'];
      if (pq == null) return null;
      return PlayQueue.fromJson(pq as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> savePlayQueue(List<String> ids, {String? currentId, int? position}) async {
    if (ids.isEmpty) return;
    try {
      await _fetch('savePlayQueue', extra: {
        'id': ids,
        if (currentId != null) 'current': currentId,
        if (position != null) 'position': position,
      });
    } catch (_) {}
  }

  // ─── Lyrics ────────────────────────────────────────────────────────────────

  Future<Lyrics?> getLyricsBySongId(String id) async {
    try {
      final data = await _fetch('getLyricsBySongId', id: id);
      final list = (data['lyricsList'] as Map<String, dynamic>?)?['structuredLyrics']
          as List<dynamic>?;
      if (list == null || list.isEmpty) return null;
      return Lyrics.fromJson(list.first as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ─── Scan ──────────────────────────────────────────────────────────────────

  Future<ScanStatus> getScanStatus() async {
    final data = await _fetch('getScanStatus');
    return ScanStatus.fromJson(data['scanStatus'] as Map<String, dynamic>? ?? {});
  }

  Future<ScanStatus> startScan() async {
    final data = await _fetch('startScan');
    return ScanStatus.fromJson(data['scanStatus'] as Map<String, dynamic>? ?? {});
  }
}
