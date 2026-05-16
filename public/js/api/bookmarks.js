// ===== API: Bookmarks =====
API.getBookmarkCollections = function() {
  return API.request('GET', '/bookmarks/collections');
};

API.createBookmarkCollection = function(name) {
  return API.request('POST', '/bookmarks/collections', { name });
};

API.deleteBookmarkCollection = function(id) {
  return API.request('DELETE', `/bookmarks/collections/${id}`);
};

API.getBookmarks = function(collectionId, page = 1) {
  let url = `/bookmarks?page=${page}`;
  if (collectionId) url += `&collection_id=${collectionId}`;
  return API.request('GET', url);
};

API.toggleBookmark = function(postId, collectionId) {
  return API.request('POST', '/bookmarks', { post_id: postId, collection_id: collectionId });
};

API.checkBookmark = function(postId) {
  return API.request('GET', `/bookmarks/check/${postId}`);
};

API.deleteBookmark = function(id) {
  return API.request('DELETE', `/bookmarks/${id}`);
};

API.batchDeleteBookmarks = function(ids) {
  return API.request('DELETE', '/bookmarks/batch', { ids });
};
