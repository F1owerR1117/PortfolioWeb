// ===== API: Settings =====
API.getSoundSettings = function() {
  return API.request('GET', '/settings/sound');
};

API.updateSoundVolume = function(volume) {
  return API.request('PUT', '/settings/sound', { volume });
};

API.uploadSound = function(file) {
  const formData = new FormData();
  formData.append('sound_file', file);
  return API.request('POST', '/settings/sound/upload', formData);
};
