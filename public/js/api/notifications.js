// ===== API: Notifications =====
API.getNotifications = function() {
  return API.request('GET', '/notifications');
};

API.getUnreadCount = function() {
  return API.request('GET', '/notifications/unread-count');
};

API.markAsRead = function(id) {
  return API.request('PUT', `/notifications/${id}/read`);
};

API.markAllAsRead = function() {
  return API.request('PUT', '/notifications/read-all');
};
