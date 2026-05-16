// ===== API: Tags =====
API.getTags = function(category) {
  let url = '/tags';
  if (category) url += `?category=${encodeURIComponent(category)}`;
  return API.request('GET', url);
};

API.createTag = function(name) {
  return API.request('POST', '/tags', { name });
};

API.deleteTag = function(id) {
  return API.request('DELETE', `/tags/${id}`);
};
