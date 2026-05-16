// ===== API: Posts =====
API.getPosts = function(page = 1, limit = 9, category = '') {
  let url = `/posts?page=${page}&limit=${limit}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  return API.request('GET', url);
};

API.getPost = function(id) {
  return API.request('GET', `/posts/${id}`);
};

API.createPost = function(data) {
  return API.request('POST', '/posts', data);
};

API.updatePost = function(id, data) {
  return API.request('PUT', `/posts/${id}`, data);
};

API.deletePost = function(id) {
  return API.request('DELETE', `/posts/${id}`);
};

// Reactions
API.setReaction = function(postId, type) {
  return API.request('POST', `/posts/${postId}/reaction`, { type });
};

// Post status (sticky / featured) — admin only
API.setPostStatus = function(postId, data) {
  return API.request('PATCH', `/posts/${postId}/status`, data);
};

// Lock/unlock post
API.lockPost = function(postId, isLocked) {
  return API.request('PATCH', `/posts/${postId}/lock`, { isLocked });
};

// Attachment purchase
API.purchaseBlock = function(postId, blockId, type) {
  return API.request('POST', `/posts/${postId}/purchase`, { block_id: blockId, type });
};

API.downloadAttachmentUrl = function(postId, blockId) {
  return `/api/posts/${postId}/download/${blockId}`;
};
