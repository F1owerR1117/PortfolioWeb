// ===== API Module =====
const API = {
  _base: '/api',

  async request(method, path, bodyOrFormData = null) {
    const url = this._base + path;
    const opts = {
      method,
      credentials: 'include',
      headers: {}
    };

    if (bodyOrFormData instanceof FormData) {
      opts.body = bodyOrFormData;
      // Let browser set Content-Type with boundary
    } else if (bodyOrFormData) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(bodyOrFormData);
    }

    const res = await fetch(url, opts);

    // Handle file download (binary)
    if (path.startsWith('/file/')) {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || '请求失败');
      }
      return res;
    }

    const data = await res.json().catch(() => ({ error: '服务器返回格式错误' }));

    if (!res.ok) {
      throw new Error(data.error || `请求失败 (${res.status})`);
    }

    return data;
  },

  // Auth
  register(username, password, role, adminSecret) {
    return this.request('POST', '/auth/register', { username, password, role, adminSecret });
  },

  login(username, password) {
    return this.request('POST', '/auth/login', { username, password });
  },

  logout() {
    return this.request('POST', '/auth/logout');
  },

  getMe() {
    return this.request('GET', '/auth/me');
  },

  // Posts
  getPosts(page = 1, limit = 9, category = '') {
    let url = `/posts?page=${page}&limit=${limit}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return this.request('GET', url);
  },

  getPost(id) {
    return this.request('GET', `/posts/${id}`);
  },

  createPost(data) {
    return this.request('POST', '/posts', data);
  },

  updatePost(id, data) {
    return this.request('PUT', `/posts/${id}`, data);
  },

  deletePost(id) {
    return this.request('DELETE', `/posts/${id}`);
  },

  // Upload
  uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('POST', '/upload', formData);
  },

  // Comments
  getComments(postId) {
    return this.request('GET', `/posts/${postId}/comments`);
  },

  createComment(postId, content, parentId = null) {
    return this.request('POST', `/posts/${postId}/comments`, { content, parent_id: parentId });
  },

  updateComment(commentId, content) {
    return this.request('PUT', `/comments/${commentId}`, { content });
  },

  deleteComment(commentId) {
    return this.request('DELETE', `/comments/${commentId}`);
  },

  // Notifications
  getNotifications() {
    return this.request('GET', '/notifications');
  },

  getUnreadCount() {
    return this.request('GET', '/notifications/unread-count');
  },

  markAsRead(id) {
    return this.request('PUT', `/notifications/${id}/read`);
  },

  markAllAsRead() {
    return this.request('PUT', '/notifications/read-all');
  },

  // Sound Settings
  getSoundSettings() {
    return this.request('GET', '/settings/sound');
  },

  updateSoundVolume(volume) {
    return this.request('PUT', '/settings/sound', { volume });
  },

  uploadSound(file) {
    const formData = new FormData();
    formData.append('sound_file', file);
    return this.request('POST', '/settings/sound/upload', formData);
  },

  // Site Info
  getAbout() {
    return this.request('GET', '/site/about');
  },

  updateAbout(data) {
    return this.request('PUT', '/site/about', data);
  },

  // User Profile
  getMyProfile() {
    return this.request('GET', '/auth/profile');
  },

  updateMyProfile(data) {
    return this.request('PUT', '/auth/profile', data);
  },

  getUserProfile(userId) {
    return this.request('GET', `/users/${userId}/profile`);
  },

  getUserPosts(userId, page = 1, limit = 9) {
    return this.request('GET', `/users/${userId}/posts?page=${page}&limit=${limit}`);
  },

  getUserStats(userId) {
    return this.request('GET', `/users/${userId}/stats`);
  },

  // Friends
  sendFriendRequest(toUserId) {
    return this.request('POST', '/friend-request', { to_user_id: toUserId });
  },

  getFriendRequests() {
    return this.request('GET', '/friend-requests');
  },

  approveFriendRequest(id) {
    return this.request('POST', `/friend-request/${id}/approve`);
  },

  rejectFriendRequest(id) {
    return this.request('POST', `/friend-request/${id}/reject`);
  },

  getFriends() {
    return this.request('GET', '/friends');
  },

  removeFriend(id) {
    return this.request('DELETE', `/friends/${id}`);
  },

  getFriendshipStatus(userId) {
    return this.request('GET', `/friendship-status/${userId}`);
  },

  getFriendRequestCount() {
    return this.request('GET', '/friend-requests/count');
  },

  getFriendOnlineStatus() {
    return this.request('GET', '/friends/online');
  },

  // Messages
  getMessages(friendId) {
    return this.request('GET', `/messages/${friendId}`);
  },

  sendMessage(toUserId, content) {
    return this.request('POST', '/messages', { to_user_id: toUserId, content });
  },

  getUnreadMessageCount() {
    return this.request('GET', '/messages/unread/count');
  },

  // Auth - Password
  changePassword(currentPassword, newPassword) {
    return this.request('PUT', '/auth/password', { currentPassword, newPassword });
  },

  // Tags
  getTags(category) {
    let url = '/tags';
    if (category) url += `?category=${encodeURIComponent(category)}`;
    return this.request('GET', url);
  },

  createTag(name) {
    return this.request('POST', '/tags', { name });
  },

  deleteTag(id) {
    return this.request('DELETE', `/tags/${id}`);
  },

  // Reactions (like / dislike)
  setReaction(postId, type) {
    return this.request('POST', `/posts/${postId}/reaction`, { type });
  },

  // Post status (sticky / featured) — admin only
  setPostStatus(postId, data) {
    return this.request('PATCH', `/posts/${postId}/status`, data);
  },

  // Avatar
  uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request('POST', '/user/avatar', formData);
  },

  // Admin — User Management
  adminGetUsers(page = 1, limit = 20, search = '') {
    let url = `/admin/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.request('GET', url);
  },

  adminBanUser(userId, isBanned, banDuration, banReason) {
    return this.request('PATCH', `/admin/users/${userId}/ban`, { isBanned, banDuration, banReason });
  },

  // Admin — Batch delete posts
  adminBatchDeletePosts(postIds) {
    return this.request('DELETE', '/admin/posts/batch', { postIds });
  },

  // Admin — Lock/unlock post
  lockPost(postId, isLocked) {
    return this.request('PATCH', `/posts/${postId}/lock`, { isLocked });
  },

  // ===== Music =====
  uploadSong(formData) {
    return this.request('POST', '/music/upload', formData);
  },

  uploadMusicCover(file) {
    const formData = new FormData();
    formData.append('cover', file);
    return this.request('POST', '/music/upload-cover', formData);
  },

  getMySongs(search = '') {
    let url = '/music/songs';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    return this.request('GET', url);
  },

  updateSong(songId, data) {
    return this.request('PUT', `/music/songs/${songId}`, data);
  },

  deleteSong(songId) {
    return this.request('DELETE', `/music/songs/${songId}`);
  },

  getMyPlaylists() {
    return this.request('GET', '/music/playlists');
  },

  createPlaylist(name) {
    return this.request('POST', '/music/playlists', { name });
  },

  updatePlaylist(playlistId, data) {
    return this.request('PUT', `/music/playlists/${playlistId}`, data);
  },

  deletePlaylist(playlistId) {
    return this.request('DELETE', `/music/playlists/${playlistId}`);
  },

  getPlaylist(playlistId) {
    return this.request('GET', `/music/playlists/${playlistId}`);
  },

  addToPlaylist(playlistId, songId) {
    return this.request('POST', `/music/playlists/${playlistId}/songs`, { song_id: songId });
  },

  batchAddToPlaylist(playlistId, songIds) {
    return this.request('POST', `/music/playlists/${playlistId}/songs`, { song_ids: songIds });
  },

  removeFromPlaylist(playlistId, songId) {
    return this.request('DELETE', `/music/playlists/${playlistId}/songs/${songId}`);
  },

  batchRemoveFromPlaylist(playlistId, songIds) {
    return this.request('DELETE', `/music/playlists/${playlistId}/songs`, { song_ids: songIds });
  },

  // ===== Public Playlists =====
  setPlaylistPublic(playlistId, isPublic) {
    return this.request('PUT', `/playlists/${playlistId}/public`, { is_public: isPublic });
  },
  getUserPublicPlaylists(userId) {
    return this.request('GET', `/users/${userId}/public-playlists`);
  },
  searchUsers(query) {
    return this.request('GET', `/users/search?q=${encodeURIComponent(query)}`);
  },
  viewPublicPlaylist(playlistId) {
    return this.request('GET', `/playlists/${playlistId}/public-view`);
  },
  toggleCollectPlaylist(playlistId) {
    return this.request('POST', `/playlists/${playlistId}/collect`);
  },
  getCollectedPlaylists() {
    return this.request('GET', '/playlists/collected');
  },

  // ===== Bookmarks =====
  getBookmarkCollections() {
    return this.request('GET', '/bookmarks/collections');
  },
  createBookmarkCollection(name) {
    return this.request('POST', '/bookmarks/collections', { name });
  },
  deleteBookmarkCollection(id) {
    return this.request('DELETE', `/bookmarks/collections/${id}`);
  },
  getBookmarks(collectionId, page = 1) {
    let url = `/bookmarks?page=${page}`;
    if (collectionId) url += `&collection_id=${collectionId}`;
    return this.request('GET', url);
  },
  toggleBookmark(postId, collectionId) {
    return this.request('POST', '/bookmarks', { post_id: postId, collection_id: collectionId });
  },
  checkBookmark(postId) {
    return this.request('GET', `/bookmarks/check/${postId}`);
  },

  // ===== Reports =====
  createReport(targetType, targetId, reason) {
    return this.request('POST', '/reports', { target_type: targetType, target_id: targetId, reason });
  },

  // ===== Bookmarks =====
  deleteBookmark(id) {
    return this.request('DELETE', `/bookmarks/${id}`);
  },
  batchDeleteBookmarks(ids) {
    return this.request('DELETE', '/bookmarks/batch', { ids });
  },

  // ===== Admin =====
  getAdminStats() {
    return this.request('GET', '/admin/stats');
  },
  getAdminReports(page = 1, limit = 20, status = 'pending') {
    return this.request('GET', `/admin/reports?page=${page}&limit=${limit}&status=${status}`);
  },
  resolveReport(id, status) {
    return this.request('PUT', `/admin/reports/${id}`, { status });
  },

  // ===== Level System =====
  getMyLevel() {
    return this.request('GET', '/levels/me');
  },
  getLevelConfig() {
    return this.request('GET', '/admin/levels/config');
  },
  getAdminUsers(page = 1, limit = 20, search = '') {
    let url = `/admin/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.request('GET', url);
  },
  updateLevelConfig(configs) {
    return this.request('PUT', '/admin/levels/config', { configs });
  },
  getLevelUsers(page = 1, limit = 20, search = '') {
    let url = `/admin/levels/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.request('GET', url);
  },
  updateUserLevel(userId, data) {
    return this.request('PUT', `/admin/levels/users/${userId}`, data);
  },

  // ===== Zone Access =====
  checkZoneAccess(zone) {
    return this.request('GET', `/zone-access/${zone}`);
  },

  // ===== Login Notices =====
  getLoginNotices() {
    return this.request('GET', '/login-notices');
  },

  markLoginNoticeViewed(noticeId) {
    return this.request('POST', `/login-notices/${noticeId}/view`);
  },

  // Admin Login Notices
  getAdminLoginNotices(page, limit) {
    return this.request('GET', `/admin/login-notices?page=${page || 1}&limit=${limit || 20}`);
  },

  createLoginNotice(data) {
    return this.request('POST', '/admin/login-notices', data);
  },

  updateLoginNotice(id, data) {
    return this.request('PUT', `/admin/login-notices/${id}`, data);
  },

  deleteLoginNotice(id) {
    return this.request('DELETE', `/admin/login-notices/${id}`);
  },

  toggleLoginNoticeStatus(id) {
    return this.request('PATCH', `/admin/login-notices/${id}/status`);
  },

  // ===== Advertisement Bars =====
  getAds() {
    return this.request('GET', '/ads');
  },

  recordAdClick(adId) {
    return this.request('POST', `/ads/${adId}/click`);
  },

  getAdminAds(page, limit) {
    return this.request('GET', `/admin/ads?page=${page || 1}&limit=${limit || 20}`);
  },

  createAd(data) {
    return this.request('POST', '/admin/ads', data);
  },

  updateAd(id, data) {
    return this.request('PUT', `/admin/ads/${id}`, data);
  },

  deleteAd(id) {
    return this.request('DELETE', `/admin/ads/${id}`);
  },

  toggleAdStatus(id) {
    return this.request('PATCH', `/admin/ads/${id}/status`);
  },

  updateAdImage(id, fileId) {
    return this.request('POST', `/admin/ads/${id}/image`, { file_id: fileId });
  },

  // ===== Attachment System =====
  uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('POST', '/upload/attachment', formData);
  },

  purchaseBlock(postId, blockId, type) {
    return this.request('POST', `/posts/${postId}/purchase`, { block_id: blockId, type });
  },

  downloadAttachmentUrl(postId, blockId) {
    return `/api/posts/${postId}/download/${blockId}`;
  }
};
