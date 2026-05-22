// Data models for the Navidrome mobile client.
// Mirrors the TypeScript types in new-ui/src/lib/subsonic.ts and api.ts.

class AuthInfo {
  final String id;
  final String username;
  final String name;
  final bool isAdmin;
  final String token;
  final String subsonicSalt;
  final String subsonicToken;
  final String? avatar;
  final String serverUrl;

  const AuthInfo({
    required this.id,
    required this.username,
    required this.name,
    required this.isAdmin,
    required this.token,
    required this.subsonicSalt,
    required this.subsonicToken,
    this.avatar,
    required this.serverUrl,
  });

  factory AuthInfo.fromJson(Map<String, dynamic> json, {required String serverUrl}) {
    return AuthInfo(
      id: json['id'] as String? ?? '',
      username: json['username'] as String? ?? '',
      name: json['name'] as String? ?? '',
      isAdmin: json['isAdmin'] as bool? ?? false,
      token: json['token'] as String? ?? '',
      subsonicSalt: json['subsonicSalt'] as String? ?? '',
      subsonicToken: json['subsonicToken'] as String? ?? '',
      avatar: json['avatar'] as String?,
      serverUrl: serverUrl,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'name': name,
        'isAdmin': isAdmin,
        'token': token,
        'subsonicSalt': subsonicSalt,
        'subsonicToken': subsonicToken,
        if (avatar != null) 'avatar': avatar,
        'serverUrl': serverUrl,
      };
}

class ServerConfig {
  final bool firstTime;
  final bool enableSharing;
  final bool enableDownloads;
  final bool enableFavourites;
  final bool enableStarRating;
  final List<String> losslessFormats;

  const ServerConfig({
    this.firstTime = false,
    this.enableSharing = true,
    this.enableDownloads = true,
    this.enableFavourites = true,
    this.enableStarRating = true,
    this.losslessFormats = const [],
  });

  factory ServerConfig.fromJson(Map<String, dynamic> json) {
    return ServerConfig(
      firstTime: json['firstTime'] as bool? ?? false,
      enableSharing: json['enableSharing'] as bool? ?? true,
      enableDownloads: json['enableDownloads'] as bool? ?? true,
      enableFavourites: json['enableFavourites'] as bool? ?? true,
      enableStarRating: json['enableStarRating'] as bool? ?? true,
      losslessFormats: (json['losslessFormats'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }
}

class Song {
  final String id;
  final String title;
  final String album;
  final String albumId;
  final String artist;
  final String artistId;
  final int? track;
  final int? year;
  final String? genre;
  final String? coverArt;
  final int size;
  final String contentType;
  final String suffix;
  final int duration;
  final int? bitRate;
  final String path;
  final int? playCount;
  final bool starred;
  final int userRating;

  const Song({
    required this.id,
    required this.title,
    this.album = '',
    this.albumId = '',
    this.artist = '',
    this.artistId = '',
    this.track,
    this.year,
    this.genre,
    this.coverArt,
    this.size = 0,
    this.contentType = '',
    this.suffix = '',
    required this.duration,
    this.bitRate,
    this.path = '',
    this.playCount,
    this.starred = false,
    this.userRating = 0,
  });

  factory Song.fromJson(Map<String, dynamic> json) {
    return Song(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      album: json['album'] as String? ?? '',
      albumId: json['albumId'] as String? ?? '',
      artist: json['artist'] as String? ?? '',
      artistId: json['artistId'] as String? ?? '',
      track: json['track'] as int?,
      year: json['year'] as int?,
      genre: json['genre'] as String?,
      coverArt: json['coverArt'] as String?,
      size: json['size'] as int? ?? 0,
      contentType: json['contentType'] as String? ?? '',
      suffix: json['suffix'] as String? ?? '',
      duration: json['duration'] as int? ?? 0,
      bitRate: json['bitRate'] as int?,
      path: json['path'] as String? ?? '',
      playCount: json['playCount'] as int?,
      starred: json['starred'] != null,
      userRating: json['userRating'] as int? ?? 0,
    );
  }

  Song copyWith({bool? starred, int? userRating}) {
    return Song(
      id: id,
      title: title,
      album: album,
      albumId: albumId,
      artist: artist,
      artistId: artistId,
      track: track,
      year: year,
      genre: genre,
      coverArt: coverArt,
      size: size,
      contentType: contentType,
      suffix: suffix,
      duration: duration,
      bitRate: bitRate,
      path: path,
      playCount: playCount,
      starred: starred ?? this.starred,
      userRating: userRating ?? this.userRating,
    );
  }

  String get durationFormatted {
    final m = duration ~/ 60;
    final s = duration % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}

class Album {
  final String id;
  final String name;
  final String artist;
  final String artistId;
  final String? coverArt;
  final int songCount;
  final int duration;
  final int? year;
  final String? genre;
  final int? playCount;
  final bool starred;
  final String? comment;
  final String? musicBrainzId;
  final List<Song> songs;

  const Album({
    required this.id,
    required this.name,
    this.artist = '',
    this.artistId = '',
    this.coverArt,
    this.songCount = 0,
    this.duration = 0,
    this.year,
    this.genre,
    this.playCount,
    this.starred = false,
    this.comment,
    this.musicBrainzId,
    this.songs = const [],
  });

  factory Album.fromJson(Map<String, dynamic> json) {
    return Album(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      artist: json['artist'] as String? ?? '',
      artistId: json['artistId'] as String? ?? '',
      coverArt: json['coverArt'] as String?,
      songCount: json['songCount'] as int? ?? 0,
      duration: json['duration'] as int? ?? 0,
      year: json['year'] as int?,
      genre: json['genre'] as String?,
      playCount: json['playCount'] as int?,
      starred: json['starred'] != null,
      comment: json['comment'] as String?,
      musicBrainzId: json['musicBrainzId'] as String?,
      songs: (json['song'] as List<dynamic>?)
              ?.map((e) => Song.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class Artist {
  final String id;
  final String name;
  final int albumCount;
  final String? coverArt;
  final String? artistImageUrl;
  final List<Album> albums;

  const Artist({
    required this.id,
    required this.name,
    this.albumCount = 0,
    this.coverArt,
    this.artistImageUrl,
    this.albums = const [],
  });

  factory Artist.fromJson(Map<String, dynamic> json) {
    return Artist(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      albumCount: json['albumCount'] as int? ?? 0,
      coverArt: json['coverArt'] as String?,
      artistImageUrl: json['artistImageUrl'] as String?,
      albums: (json['album'] as List<dynamic>?)
              ?.map((e) => Album.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ArtistInfo {
  final String? biography;
  final String? musicBrainzId;
  final String? lastFmUrl;
  final String? smallImageUrl;
  final String? mediumImageUrl;
  final String? largeImageUrl;
  final List<Artist> similarArtists;

  const ArtistInfo({
    this.biography,
    this.musicBrainzId,
    this.lastFmUrl,
    this.smallImageUrl,
    this.mediumImageUrl,
    this.largeImageUrl,
    this.similarArtists = const [],
  });

  factory ArtistInfo.fromJson(Map<String, dynamic> json) {
    return ArtistInfo(
      biography: json['biography'] as String?,
      musicBrainzId: json['musicBrainzId'] as String?,
      lastFmUrl: json['lastFmUrl'] as String?,
      smallImageUrl: json['smallImageUrl'] as String?,
      mediumImageUrl: json['mediumImageUrl'] as String?,
      largeImageUrl: json['largeImageUrl'] as String?,
      similarArtists: (json['similarArtist'] as List<dynamic>?)
              ?.map((e) => Artist.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class Playlist {
  final String id;
  final String name;
  final String? comment;
  final String owner;
  final int songCount;
  final int duration;
  final String? coverArt;
  final bool isPublic;
  final String created;
  final String changed;
  final List<Song> songs;

  const Playlist({
    required this.id,
    required this.name,
    this.comment,
    this.owner = '',
    this.songCount = 0,
    this.duration = 0,
    this.coverArt,
    this.isPublic = false,
    this.created = '',
    this.changed = '',
    this.songs = const [],
  });

  factory Playlist.fromJson(Map<String, dynamic> json) {
    return Playlist(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      comment: json['comment'] as String?,
      owner: json['owner'] as String? ?? '',
      songCount: json['songCount'] as int? ?? 0,
      duration: json['duration'] as int? ?? 0,
      coverArt: json['coverArt'] as String?,
      isPublic: json['public'] as bool? ?? false,
      created: json['created'] as String? ?? '',
      changed: json['changed'] as String? ?? '',
      songs: (json['entry'] as List<dynamic>?)
              ?.map((e) => Song.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class Genre {
  final String value;
  final int songCount;
  final int albumCount;

  const Genre({
    required this.value,
    this.songCount = 0,
    this.albumCount = 0,
  });

  factory Genre.fromJson(Map<String, dynamic> json) {
    return Genre(
      value: json['value'] as String,
      songCount: json['songCount'] as int? ?? 0,
      albumCount: json['albumCount'] as int? ?? 0,
    );
  }
}

class Bookmark {
  final int position;
  final String username;
  final String? comment;
  final String created;
  final Song entry;

  const Bookmark({
    required this.position,
    this.username = '',
    this.comment,
    this.created = '',
    required this.entry,
  });

  factory Bookmark.fromJson(Map<String, dynamic> json) {
    return Bookmark(
      position: json['position'] as int? ?? 0,
      username: json['username'] as String? ?? '',
      comment: json['comment'] as String?,
      created: json['created'] as String? ?? '',
      entry: Song.fromJson(json['entry'] as Map<String, dynamic>),
    );
  }
}

class RadioStation {
  final String id;
  final String name;
  final String streamUrl;
  final String? homePageUrl;

  const RadioStation({
    required this.id,
    required this.name,
    required this.streamUrl,
    this.homePageUrl,
  });

  factory RadioStation.fromJson(Map<String, dynamic> json) {
    return RadioStation(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      streamUrl: json['streamUrl'] as String? ?? '',
      homePageUrl: json['homePageUrl'] as String?,
    );
  }
}

class Share {
  final String id;
  final String url;
  final String? description;
  final String username;
  final String created;
  final String? expires;
  final int visitCount;
  final bool downloadable;
  final List<Song> songs;

  const Share({
    required this.id,
    required this.url,
    this.description,
    this.username = '',
    this.created = '',
    this.expires,
    this.visitCount = 0,
    this.downloadable = false,
    this.songs = const [],
  });

  factory Share.fromJson(Map<String, dynamic> json) {
    return Share(
      id: json['id'] as String,
      url: json['url'] as String? ?? '',
      description: json['description'] as String?,
      username: json['username'] as String? ?? '',
      created: json['created'] as String? ?? '',
      expires: json['expires'] as String?,
      visitCount: json['visitCount'] as int? ?? 0,
      downloadable: json['downloadable'] as bool? ?? false,
      songs: (json['entry'] as List<dynamic>?)
              ?.map((e) => Song.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class LyricLine {
  final int start;
  final String value;
  const LyricLine({required this.start, required this.value});
}

class Lyrics {
  final String? artist;
  final String? title;
  final String? plainText;
  final bool synced;
  final List<LyricLine> lines;

  const Lyrics({
    this.artist,
    this.title,
    this.plainText,
    this.synced = false,
    this.lines = const [],
  });

  factory Lyrics.fromJson(Map<String, dynamic> json) {
    final rawLines =
        (json['line'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
    return Lyrics(
      artist: json['artist'] as String?,
      title: json['title'] as String?,
      plainText: json['value'] as String?,
      synced: json['synced'] as bool? ?? false,
      lines: rawLines
          .map((l) => LyricLine(
                start: l['start'] as int? ?? 0,
                value: l['value'] as String? ?? '',
              ))
          .toList(),
    );
  }
}

class PlayQueue {
  final List<Song> songs;
  final String? currentId;
  final int? position;

  const PlayQueue({
    this.songs = const [],
    this.currentId,
    this.position,
  });

  factory PlayQueue.fromJson(Map<String, dynamic> json) {
    return PlayQueue(
      songs: (json['entry'] as List<dynamic>?)
              ?.map((e) => Song.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      currentId: json['current'] as String?,
      position: json['position'] as int?,
    );
  }
}

class NativeUser {
  final String id;
  final String username;
  final String name;
  final String email;
  final bool isAdmin;
  final String? avatar;

  const NativeUser({
    required this.id,
    required this.username,
    required this.name,
    this.email = '',
    this.isAdmin = false,
    this.avatar,
  });

  factory NativeUser.fromJson(Map<String, dynamic> json) {
    return NativeUser(
      id: json['id'] as String,
      username: json['userName'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      isAdmin: json['isAdmin'] as bool? ?? false,
      avatar: json['avatar'] as String?,
    );
  }
}

class ScanStatus {
  final bool scanning;
  final int count;
  final String? lastScan;

  const ScanStatus({this.scanning = false, this.count = 0, this.lastScan});

  factory ScanStatus.fromJson(Map<String, dynamic> json) {
    return ScanStatus(
      scanning: json['scanning'] as bool? ?? false,
      count: json['count'] as int? ?? 0,
      lastScan: json['lastScan'] as String?,
    );
  }
}
