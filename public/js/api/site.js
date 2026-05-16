// ===== API: Site & Users =====
API.getAbout = function() {
  return API.request('GET', '/site/about');
};

API.updateAbout = function(data) {
  return API.request('PUT', '/site/about', data);
};

// User profiles
API.getUserProfile = function(userId) {
  return API.request('GET', `/users/${userId}/profile`);
};

API.getUserPosts = function(userId, page = 1, limit = 9) {
  return API.request('GET', `/users/${userId}/posts?page=${page}&limit=${limit}`);
};

API.getUserStats = function(userId) {
  return API.request('GET', `/users/${userId}/stats`);
};

API.searchUsers = function(query) {
  return API.request('GET', `/users/search?q=${encodeURIComponent(query)}`);
};

// Avatar
API.uploadAvatar = function(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return API.request('POST', '/user/avatar', formData);
};

// Login Notices (public)
API.getLoginNotices = function() {
  return API.request('GET', '/login-notices');
};

API.markLoginNoticeViewed = function(noticeId) {
  return API.request('POST', `/login-notices/${noticeId}/view`);
};

// Level / Zone Access
API.getMyLevel = function() {
  return API.request('GET', '/levels/me');
};

API.checkZoneAccess = function(zone) {
  return API.request('GET', `/zone-access/${zone}`);
};

// Ads (public)
API.getAds = function() {
  return API.request('GET', '/ads');
};

API.recordAdClick = function(adId) {
  return API.request('POST', `/ads/${adId}/click`);
};
