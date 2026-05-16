// ===== API: Music =====
API.uploadSong = function(formData) {
  return API.request('POST', '/music/upload', formData);
};

API.uploadMusicCover = function(file) {
  const formData = new FormData();
  formData.append('cover', file);
  return API.request('POST', '/music/upload-cover', formData);
};

API.getMySongs = function(search = '') {
  let url = '/music/songs';
  if (search) url += `?search=${encodeURIComponent(search)}`;
  return API.request('GET', url);
};

API.updateSong = function(songId, data) {
  return API.request('PUT', `/music/songs/${songId}`, data);
};

API.deleteSong = function(songId) {
  return API.request('DELETE', `/music/songs/${songId}`);
};

API.getMyPlaylists = function() {
  return API.request('GET', '/music/playlists');
};

API.createPlaylist = function(name) {
  return API.request('POST', '/music/playlists', { name });
};

API.updatePlaylist = function(playlistId, data) {
  return API.request('PUT', `/music/playlists/${playlistId}`, data);
};

API.deletePlaylist = function(playlistId) {
  return API.request('DELETE', `/music/playlists/${playlistId}`);
};

API.getPlaylist = function(playlistId) {
  return API.request('GET', `/music/playlists/${playlistId}`);
};

API.addToPlaylist = function(playlistId, songId) {
  return API.request('POST', `/music/playlists/${playlistId}/songs`, { song_id: songId });
};

API.batchAddToPlaylist = function(playlistId, songIds) {
  return API.request('POST', `/music/playlists/${playlistId}/songs`, { song_ids: songIds });
};

API.removeFromPlaylist = function(playlistId, songId) {
  return API.request('DELETE', `/music/playlists/${playlistId}/songs/${songId}`);
};

API.batchRemoveFromPlaylist = function(playlistId, songIds) {
  return API.request('DELETE', `/music/playlists/${playlistId}/songs`, { song_ids: songIds });
};

// Public Playlists
API.setPlaylistPublic = function(playlistId, isPublic) {
  return API.request('PUT', `/playlists/${playlistId}/public`, { is_public: isPublic });
};

API.getUserPublicPlaylists = function(userId) {
  return API.request('GET', `/users/${userId}/public-playlists`);
};

API.viewPublicPlaylist = function(playlistId) {
  return API.request('GET', `/playlists/${playlistId}/public-view`);
};

API.toggleCollectPlaylist = function(playlistId) {
  return API.request('POST', `/playlists/${playlistId}/collect`);
};

API.getCollectedPlaylists = function() {
  return API.request('GET', '/playlists/collected');
};
