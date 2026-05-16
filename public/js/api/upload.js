// ===== API: Upload =====
API.uploadFile = function(file) {
  const formData = new FormData();
  formData.append('file', file);
  return API.request('POST', '/upload', formData);
};

API.uploadAttachment = function(file) {
  const formData = new FormData();
  formData.append('file', file);
  return API.request('POST', '/upload/attachment', formData);
};
