// ===== API Core Module =====
const API = {
  _base: '/api',

  async request(method, path, bodyOrFormData = null) {
    const url = this._base + path;
    const opts = {
      method,
      credentials: 'include',
      headers: {}
    };

    if (bodyOrFormData instanceof FormData) {
      opts.body = bodyOrFormData;
    } else if (bodyOrFormData) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(bodyOrFormData);
    }

    const res = await fetch(url, opts);

    // Handle file download (binary)
    if (path.startsWith('/file/')) {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || '请求失败');
      }
      return res;
    }

    const data = await res.json().catch(() => ({ error: '服务器返回格式错误' }));

    if (!res.ok) {
      throw new Error(data.error || `请求失败 (${res.status})`);
    }

    return data;
  }
};
