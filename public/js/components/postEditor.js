// Post editor component: create/edit posts
var ComponentsPostEditor = {
  renderCreatePost: function(category) { this.editorMode = 'create'; this.editorPostId = null; this.editorBlocks = []; this._editorCategory = category === 'chat' ? 'chat' : 'work'; this._renderEditor(category === 'chat' ? '发布帖子' : '发布新作品', null, this._editorCategory); },

  renderEditPost: async function(postId) { this.editorMode = 'edit'; this.editorPostId = postId; this._deletedBlockIds = []; this.renderLoading(); try { var d = await API.getPost(postId); this.editorBlocks = (d.blocks || []).map(function(b) { return { _id: b.id, type: b.type, value: b.value || '', file_id: b.file_id || null, file_url: b.file_url || null, allow_preview: !!b.allow_preview, attachment_file_id: b.attachment_file_id || null, attachment_name: b.attachment_name || '', attachment_size: b.attachment_size || 0, min_level_view: b.min_level_view || 0, unlock_points: b.unlock_points || 0, download_points: b.download_points || 0, _tempId: Date.now() + '_' + Math.random().toString(36).substr(2, 5) }; }); this._renderEditor('编辑作品', d.post); } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },

  _renderEditor: function(title, post, category) {
    var isEdit = !!post, self = this;
    var cat = category || (post ? post.category : 'work');
    var editorHtml = '<div class="page-fade-in"><div class="editor-page"><div class="editor-page-header"><h1>' + escapeHtml(title) + '</h1></div><div class="editor-card">' +
      '<div class="form-group"><label class="form-label">标题 <span style="color:var(--error);">*</span></label><input class="form-input" id="editor-title" value="' + escapeHtml(post ? post.title : '') + '" placeholder="输入作品标题..."></div>' +
      '<div class="form-group"><label class="form-label">简介</label><textarea class="form-textarea" id="editor-desc" rows="2" placeholder="简要描述">' + escapeHtml(post ? (post.description || '') : '') + '</textarea></div>' +
      '<div class="form-group"><label class="form-label">标签</label><div class="tag-input-wrap"><input class="form-input" id="editor-tag-input" type="text" placeholder="输入标签后添加..." value=""><button class="btn btn-outline btn-sm" id="editor-add-tag-btn" style="padding:10px 20px;">添加</button></div><div class="tag-chips" id="editor-tag-chips"></div></div>' +
      '<div class="form-group" id="editor-cat-group" style="' + (cat === 'chat' ? '' : 'display:none;') + '"><label class="form-label">分类</label><select class="form-input form-select" id="editor-category"><option value="work"' + (cat === 'work' ? ' selected' : '') + '>📂 作品区</option><option value="chat"' + (cat === 'chat' ? ' selected' : '') + '>💬 聊天区</option></select></div>' +
      '<div class="form-group"><label class="form-label">封面图片</label><div class="cover-upload-row"><button class="btn btn-outline btn-sm" id="editor-upload-cover-btn">📁 选择图片</button><input type="file" id="editor-cover-file" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;"><span class="cover-name" id="editor-cover-name">' + (post && post.cover_url ? '已有封面' : '未选择') + '</span><button class="btn btn-outline btn-sm" id="editor-remove-cover-btn"' + (post && post.cover_url ? '' : ' style="display:none;"') + '>✕ 移除</button></div></div>' +
      '<div class="cover-preview" id="editor-cover-preview"' + (post && post.cover_url ? '' : ' style="display:none;"') + '>' + (post && post.cover_url ? '<img src="' + post.cover_url + '">' : '') + '</div>' +
      '<div style="margin:24px 0 16px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h3 style="font-size:16px;font-weight:600;">📝 内容块</h3></div><div id="editor-blocks-list">' + self._renderEditorBlocks() + '</div><div class="add-block-bar"><button class="add-block-btn" data-type="text">➕ 文本</button><button class="add-block-btn" data-type="image">🖼 图片</button><button class="add-block-btn" data-type="video">🎬 视频</button><button class="add-block-btn" data-type="code">💻 代码</button><button class="add-block-btn" data-type="file">📎 附件</button></div></div>' +
      '<div class="editor-actions"><button class="btn btn-primary" id="editor-save-btn">💾 ' + (isEdit ? '保存修改' : '发布') + '</button><button class="btn btn-outline" id="editor-cancel-btn">取消</button></div></div></div></div>';
    document.getElementById('app').innerHTML = editorHtml;
    this._initEditorTags(post);
    this._bindEditorEvents(isEdit, post);
  },

  _renderEditorBlocks: function() {
    if (!this.editorBlocks || this.editorBlocks.length === 0) {
      return '<div class="empty-state" style="padding:20px;"><p style="color:var(--text-light);font-size:14px;">暂无内容，点击上方按钮添加块</p></div>';
    }
    var h = '';
    for (var i = 0; i < this.editorBlocks.length; i++) {
      var b = this.editorBlocks[i];
      var typeName = b.type === 'text' ? '📝 文本' : b.type === 'image' ? '🖼 图片' : b.type === 'video' ? '🎬 视频' : b.type === 'code' ? '💻 代码' : '📎 附件';
      h += '<div class="editor-block-wrap" data-index="' + i + '">' +
        '<div class="editor-block-header"><span class="block-type-badge ' + b.type + '">' + typeName + '</span>' +
        '<div class="block-actions">' +
        '<button class="editor-move-up-btn" data-index="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="editor-move-down-btn" data-index="' + i + '"' + (i === this.editorBlocks.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button class="delete-btn editor-remove-block-btn" data-index="' + i + '">✕</button></div></div>' +
        this._renderEditorBlockContent(b, i) + '</div>';
    }
    return h;
  },

  _renderEditorBlockContent: function(b, i) {
    var previewCb = '<label style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;margin-top:6px;"><input type="checkbox" class="editor-allow-preview" data-index="' + i + '"' + (b.allow_preview ? ' checked' : '') + '> 允许普通用户预览</label>';
    if (b.type === 'text') {
      return '<textarea class="form-textarea editor-block-input" data-index="' + i + '" rows="4" placeholder="输入文本内容..." style="font-family:inherit;">' + escapeHtml(b.value || '') + '</textarea>' + previewCb;
    } else if (b.type === 'image') {
      var preview = b.file_url ? '<div style="margin-bottom:8px;"><img src="' + b.file_url + '" style="max-width:200px;max-height:150px;border-radius:6px;object-fit:cover;"></div>' : '';
      return '<div>' + preview + '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-sm btn-outline editor-upload-btn" data-index="' + i + '">📁 选择图片</button><input type="file" class="editor-file-input" data-index="' + i + '" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;"><input class="form-input editor-block-url" data-index="' + i + '" type="text" placeholder="或输入图片URL" value="' + escapeHtml(b.value || '') + '" style="flex:1;">' + previewCb + '</div></div>';
    } else if (b.type === 'video') {
      var vPreview = b.file_url ? '<div style="margin-bottom:8px;"><video controls style="max-width:300px;max-height:150px;"><source src="' + b.file_url + '"></video></div>' : '';
      return '<div>' + vPreview + '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-sm btn-outline editor-upload-btn" data-index="' + i + '">📁 选择视频</button><input type="file" class="editor-file-input" data-index="' + i + '" accept="video/mp4,video/webm,video/ogg" style="display:none;"><input class="form-input editor-block-url" data-index="' + i + '" type="text" placeholder="或输入视频URL" value="' + escapeHtml(b.value || '') + '" style="flex:1;"></div>' + previewCb + '</div>';
    } else if (b.type === 'code') {
      return '<div><div class="form-group" style="margin-bottom:4px;"><select class="form-input editor-code-lang" data-index="' + i + '" style="width:150px;font-size:13px;"><option value="">自动检测</option><option value="javascript"' + (b.language === 'javascript' ? ' selected' : '') + '>JavaScript</option><option value="python"' + (b.language === 'python' ? ' selected' : '') + '>Python</option><option value="html"' + (b.language === 'html' ? ' selected' : '') + '>HTML</option><option value="css"' + (b.language === 'css' ? ' selected' : '') + '>CSS</option><option value="json"' + (b.language === 'json' ? ' selected' : '') + '>JSON</option><option value="bash"' + (b.language === 'bash' ? ' selected' : '') + '>Bash</option></select></div><textarea class="form-textarea editor-block-input code-input" data-index="' + i + '" rows="6" placeholder="输入代码..." style="font-family:monospace;">' + escapeHtml(b.value || '') + '</textarea>' + previewCb + '</div>';
    } else if (b.type === 'file') {
      var fileName = b.attachment_name || '';
      var fileSize = b.attachment_size ? formatFileSize(b.attachment_size) : '';
      var hasFile = !!b.attachment_file_id;
      var fileInfo = hasFile ? '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;display:flex;align-items:center;gap:8px;"><span>📎 ' + escapeHtml(fileName) + (fileSize ? ' (' + fileSize + ')' : '') + '</span><button class="btn btn-sm btn-outline editor-remove-attach-btn" data-index="' + i + '" style="color:var(--error);font-size:12px;padding:2px 8px;" title="移除附件">✕</button></div>' : '';
      return '<div>' + fileInfo +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">' +
        '<button class="btn btn-sm btn-outline editor-attach-btn" data-index="' + i + '">' + (hasFile ? '🔄 替换附件' : '📁 上传附件') + '</button>' +
        '<input type="file" class="editor-attach-input" data-index="' + i + '" style="display:none;">' +
        '<span class="editor-attach-name" data-index="' + i + '" style="font-size:13px;color:var(--text-secondary);">' + (hasFile ? fileName : '未选择文件') + '</span></div>' +
        '<div class="editor-attach-settings"><div class="editor-attach-row">' +
        '<div class="editor-attach-field"><label>最低等级</label>' +
        '<input type="number" class="editor-min-level" data-index="' + i + '" value="' + (b.min_level_view || 0) + '" min="0"></div>' +
        '<div class="editor-attach-field"><label>积分解锁</label>' +
        '<input type="number" class="editor-unlock-points" data-index="' + i + '" value="' + (b.unlock_points || 0) + '" min="0"></div>' +
        '<div class="editor-attach-field"><label>积分下载</label>' +
        '<input type="number" class="editor-download-points" data-index="' + i + '" value="' + (b.download_points || 0) + '" min="0"></div></div></div>' + previewCb + '</div>';
    }
    return '';
  },

  _initEditorTags: function(post) {
    this._editorTags = [];
    if (post && post.tags) {
      this._editorTags = post.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
    }
    this._renderTagChips();
  },

  _renderTagChips: function() {
    var container = document.getElementById('editor-tag-chips');
    if (!container) return;
    var self = this;
    container.innerHTML = this._editorTags.map(function(t) {
      return '<span class="tag-chip-item">' + escapeHtml(t) + '<button class="tag-chip-remove" data-tag="' + escapeHtml(t) + '">×</button></span>';
    }).join('');
    container.querySelectorAll('.tag-chip-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tag = this.dataset.tag;
        self._editorTags = self._editorTags.filter(function(t) { return t !== tag; });
        self._renderTagChips();
      });
    });
  },

  _bindEditorEvents: function(isEdit, post) {
    var self = this, coverFileId = post ? (post.cover_file_id || null) : null;

    // Tag add
    document.getElementById('editor-add-tag-btn').addEventListener('click', function() {
      var input = document.getElementById('editor-tag-input');
      var tag = input.value.trim();
      if (!tag) { showToast('请输入标签名', 'warning'); return; }
      if (self._editorTags.indexOf(tag) !== -1) { showToast('标签已存在', 'warning'); return; }
      self._editorTags.push(tag);
      input.value = '';
      self._renderTagChips();
    });
    document.getElementById('editor-tag-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('editor-add-tag-btn').click(); }
    });
    document.getElementById('editor-cancel-btn').addEventListener('click', function() { Router.navigate(isEdit ? '#/posts/' + post.id : '#/works'); });
    document.querySelectorAll('.add-block-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        playClickSound();
        var type = this.dataset.type;
        self.editorBlocks.push({ type: type, value: '', file_id: null, file_url: null, allow_preview: true, _tempId: Date.now() + '_' + Math.random().toString(36).substr(2, 5) });
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    this._reBindEditorBlockEvents();
    document.getElementById('editor-upload-cover-btn').addEventListener('click', function() { document.getElementById('editor-cover-file').click(); });
    document.getElementById('editor-cover-file').addEventListener('change', async function() {
      var f = this.files && this.files[0];
      if (!f) return;
      try {
        var cropped = await openCropModal(f, 16/9);
        if (!cropped) return;
        var result = await API.uploadFile(new File([cropped], 'cover.jpg', { type: 'image/jpeg' }));
        coverFileId = result.file.id;
        var previewDiv = document.getElementById('editor-cover-preview');
        previewDiv.style.display = 'block';
        previewDiv.innerHTML = '<img src="' + result.file.url + '" style="max-width:200px;max-height:120px;border-radius:8px;object-fit:cover;">';
        document.getElementById('editor-cover-name').textContent = '已选择封面';
        document.getElementById('editor-remove-cover-btn').style.display = '';
      } catch (err) { showToast(err.message, 'error'); }
    });
    document.getElementById('editor-remove-cover-btn').addEventListener('click', function() {
      coverFileId = null;
      document.getElementById('editor-cover-preview').style.display = 'none';
      document.getElementById('editor-cover-preview').innerHTML = '';
      document.getElementById('editor-cover-name').textContent = '未选择';
      this.style.display = 'none';
    });
    document.getElementById('editor-save-btn').addEventListener('click', async function() {
      var btn = this;
      if (self._isButtonDisabled(btn)) return;
      var title = document.getElementById('editor-title').value.trim();
      if (!title) { showToast('请输入标题', 'warning'); document.getElementById('editor-title').focus(); return; }
      var desc = document.getElementById('editor-desc').value.trim();
      var tags = self._editorTags.join(',');
      var category = document.getElementById('editor-category') ? document.getElementById('editor-category').value : (post ? post.category : 'work');
      self._syncEditorBlocks();
      if (self.editorBlocks.length === 0) { showToast('请至少添加一个内容块', 'warning'); return; }
      // Validate file blocks have uploaded files
      for (var bi = 0; bi < self.editorBlocks.length; bi++) {
        if (self.editorBlocks[bi].type === 'file' && !self.editorBlocks[bi].attachment_file_id) {
          showToast('请为附件块上传文件', 'warning'); return;
        }
      }
      var blocks = self.editorBlocks.map(function(b) {
        var ob = { type: b.type, value: b.value || '', file_id: b.file_id || null, allow_preview: !!b.allow_preview,
          attachment_file_id: b.attachment_file_id || null, attachment_name: b.attachment_name || '',
          attachment_size: b.attachment_size || 0, min_level_view: b.min_level_view || 0,
          unlock_points: b.unlock_points || 0, download_points: b.download_points || 0 };
        if (b._id) ob.id = b._id; return ob;
      });
      self._disableButton(btn, '发布中...');
      try {
        var data = { title: title, description: desc, tags: tags, category: category, blocks: blocks };
        if (coverFileId) data.cover_file_id = coverFileId;
        if (isEdit) { data.deleted_block_ids = self._deletedBlockIds; await API.updatePost(post.id, data); showToast('已更新', 'success'); Router.navigate('#/posts/' + post.id); }
        else { var result = await API.createPost(data); showToast('已发布', 'success'); App.refreshLevel(); Router.navigate('#/posts/' + (result.postId || result.id || result.post?.id)); }
      } catch (err) { showToast(err.message, 'error'); }
      finally { self._enableButton(btn, isEdit ? '💾 保存修改' : '💾 发布'); }
    });
  },

  _reBindEditorBlockEvents: function() {
    var self = this;
    document.querySelectorAll('.editor-remove-block-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        if (isNaN(idx)) return;
        var removed = self.editorBlocks[idx];
        if (removed && removed._id) self._deletedBlockIds.push(removed._id);
        self.editorBlocks.splice(idx, 1);
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    document.querySelectorAll('.editor-move-up-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        if (idx <= 0) return;
        var tmp = self.editorBlocks[idx];
        self.editorBlocks[idx] = self.editorBlocks[idx - 1];
        self.editorBlocks[idx - 1] = tmp;
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    document.querySelectorAll('.editor-move-down-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        if (idx >= self.editorBlocks.length - 1) return;
        var tmp = self.editorBlocks[idx];
        self.editorBlocks[idx] = self.editorBlocks[idx + 1];
        self.editorBlocks[idx + 1] = tmp;
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    document.querySelectorAll('.editor-upload-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var fi = this.nextElementSibling;
        if (fi && fi.classList.contains('editor-file-input')) fi.click();
      });
    });
    document.querySelectorAll('.editor-file-input').forEach(function(input) {
      input.addEventListener('change', async function() {
        var f = this.files && this.files[0];
        if (!f) return;
        var idx = parseInt(this.dataset.index);
        if (isNaN(idx)) return;
        try {
          var result = await API.uploadFile(f);
          self.editorBlocks[idx].file_id = result.file.id;
          self.editorBlocks[idx].file_url = result.file.url;
          self.editorBlocks[idx].value = result.file.url;
          document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
          self._reBindEditorBlockEvents();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
    document.querySelectorAll('.editor-block-input').forEach(function(textarea) {
      textarea.addEventListener('input', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = this.value;
      });
    });
    document.querySelectorAll('.editor-block-url').forEach(function(input) {
      input.addEventListener('input', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = this.value;
      });
    });
    document.querySelectorAll('.editor-code-lang').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].language = this.value;
      });
    });
    document.querySelectorAll('.editor-allow-preview').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].allow_preview = this.checked;
      });
    });
    // Attachment block events
    document.querySelectorAll('.editor-attach-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        var input = document.querySelector('.editor-attach-input[data-index="' + idx + '"]');
        if (input) input.click();
      });
    });
    document.querySelectorAll('.editor-attach-input').forEach(function(input) {
      input.addEventListener('change', async function() {
        var f = this.files && this.files[0];
        if (!f) return;
        var idx = parseInt(this.dataset.index);
        if (isNaN(idx)) return;
        try {
          var result = await API.uploadAttachment(f);
          var block = self.editorBlocks[idx];
          block.attachment_file_id = result.file.id;
          block.attachment_name = result.file.original_name;
          block.attachment_size = result.file.size;
          document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
          self._reBindEditorBlockEvents();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
        document.querySelectorAll('.editor-remove-attach-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        if (isNaN(idx)) return;
        var block = self.editorBlocks[idx];
        if (block) {
          block.attachment_file_id = null;
          block.attachment_name = '';
          block.attachment_size = 0;
          document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
          self._reBindEditorBlockEvents();
        }
      });
    });
    document.querySelectorAll('.editor-min-level').forEach(function(input) {
      input.addEventListener('change', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].min_level_view = parseInt(this.value) || 0;
      });
    });
    document.querySelectorAll('.editor-unlock-points').forEach(function(input) {
      input.addEventListener('change', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].unlock_points = parseInt(this.value) || 0;
      });
    });
    document.querySelectorAll('.editor-download-points').forEach(function(input) {
      input.addEventListener('change', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].download_points = parseInt(this.value) || 0;
      });
    });
  },

  _syncEditorBlocks: function() {
    var self = this;
    document.querySelectorAll('.editor-block-input').forEach(function(el) {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = el.value;
    });
    document.querySelectorAll('.editor-block-url').forEach(function(el) {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = el.value;
    });
  }
};
