// ===== API: Admin =====
API.getAdminStats = function() {
  return API.request('GET', '/admin/stats');
};

API.getAdminReports = function(page = 1, limit = 20, status = 'pending') {
  return API.request('GET', `/admin/reports?page=${page}&limit=${limit}&status=${status}`);
};

API.resolveReport = function(id, status) {
  return API.request('PUT', `/admin/reports/${id}`, { status });
};

// User management
API.adminGetUsers = function(page = 1, limit = 20, search = '') {
  let url = `/admin/users?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return API.request('GET', url);
};

// Alias used in admin component
API.getAdminUsers = function(page = 1, limit = 20, search = '') {
  return API.adminGetUsers(page, limit, search);
};

API.adminBanUser = function(userId, isBanned, banDuration, banReason) {
  return API.request('PATCH', `/admin/users/${userId}/ban`, { isBanned, banDuration, banReason });
};

API.adminBatchDeletePosts = function(postIds) {
  return API.request('DELETE', '/admin/posts/batch', { postIds });
};

// Level config
API.getLevelConfig = function() {
  return API.request('GET', '/admin/levels/config');
};

API.updateLevelConfig = function(configs) {
  return API.request('PUT', '/admin/levels/config', { configs });
};

API.getLevelUsers = function(page = 1, limit = 20, search = '') {
  let url = `/admin/levels/users?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return API.request('GET', url);
};

API.updateUserLevel = function(userId, data) {
  return API.request('PUT', `/admin/levels/users/${userId}`, data);
};

// Admin Login Notices
API.getAdminLoginNotices = function(page, limit) {
  return API.request('GET', `/admin/login-notices?page=${page || 1}&limit=${limit || 20}`);
};

API.createLoginNotice = function(data) {
  return API.request('POST', '/admin/login-notices', data);
};

API.updateLoginNotice = function(id, data) {
  return API.request('PUT', `/admin/login-notices/${id}`, data);
};

API.deleteLoginNotice = function(id) {
  return API.request('DELETE', `/admin/login-notices/${id}`);
};

API.toggleLoginNoticeStatus = function(id) {
  return API.request('PATCH', `/admin/login-notices/${id}/status`);
};

// Admin Ads
API.getAdminAds = function(page, limit) {
  return API.request('GET', `/admin/ads?page=${page || 1}&limit=${limit || 20}`);
};

API.createAd = function(data) {
  return API.request('POST', '/admin/ads', data);
};

API.updateAd = function(id, data) {
  return API.request('PUT', `/admin/ads/${id}`, data);
};

API.deleteAd = function(id) {
  return API.request('DELETE', `/admin/ads/${id}`);
};

API.toggleAdStatus = function(id) {
  return API.request('PATCH', `/admin/ads/${id}/status`);
};

API.updateAdImage = function(id, fileId) {
  return API.request('POST', `/admin/ads/${id}/image`, { file_id: fileId });
};
