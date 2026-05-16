// ===== API: Friends & Messages =====
API.sendFriendRequest = function(toUserId) {
  return API.request('POST', '/friend-request', { to_user_id: toUserId });
};

API.getFriendRequests = function() {
  return API.request('GET', '/friend-requests');
};

API.approveFriendRequest = function(id) {
  return API.request('POST', `/friend-request/${id}/approve`);
};

API.rejectFriendRequest = function(id) {
  return API.request('POST', `/friend-request/${id}/reject`);
};

API.getFriends = function() {
  return API.request('GET', '/friends');
};

API.removeFriend = function(id) {
  return API.request('DELETE', `/friends/${id}`);
};

API.getFriendshipStatus = function(userId) {
  return API.request('GET', `/friendship-status/${userId}`);
};

API.getFriendRequestCount = function() {
  return API.request('GET', '/friend-requests/count');
};

API.getFriendOnlineStatus = function() {
  return API.request('GET', '/friends/online');
};

// Messages
API.getMessages = function(friendId) {
  return API.request('GET', `/messages/${friendId}`);
};

API.sendMessage = function(toUserId, content) {
  return API.request('POST', '/messages', { to_user_id: toUserId, content });
};

API.getUnreadMessageCount = function() {
  return API.request('GET', '/messages/unread/count');
};
