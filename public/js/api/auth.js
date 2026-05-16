// ===== API: Auth =====
API.register = function(username, password, role, adminSecret) {
  return API.request('POST', '/auth/register', { username, password, role, adminSecret });
};

API.login = function(username, password) {
  return API.request('POST', '/auth/login', { username, password });
};

API.logout = function() {
  return API.request('POST', '/auth/logout');
};

API.getMe = function() {
  return API.request('GET', '/auth/me');
};

API.changePassword = function(currentPassword, newPassword) {
  return API.request('PUT', '/auth/password', { currentPassword, newPassword });
};

API.getMyProfile = function() {
  return API.request('GET', '/auth/profile');
};

API.updateMyProfile = function(data) {
  return API.request('PUT', '/auth/profile', data);
};
