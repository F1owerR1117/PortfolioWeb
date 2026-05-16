// ===== API: Reports =====
API.createReport = function(targetType, targetId, reason) {
  return API.request('POST', '/reports', { target_type: targetType, target_id: targetId, reason });
};
