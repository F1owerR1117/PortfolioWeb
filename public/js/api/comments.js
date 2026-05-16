// ===== API: Comments =====
API.getComments = function(postId) {
  return API.request('GET', `/posts/${postId}/comments`);
};

API.createComment = function(postId, content, parentId = null) {
  return API.request('POST', `/posts/${postId}/comments`, { content, parent_id: parentId });
};

API.updateComment = function(commentId, content) {
  return API.request('PUT', `/comments/${commentId}`, { content });
};

API.deleteComment = function(commentId) {
  return API.request('DELETE', `/comments/${commentId}`);
};
