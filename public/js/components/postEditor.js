// Post editor component: create/edit posts
var ComponentsPostEditor = {
  renderCreatePost: function(category) { this.editorMode = 'create'; this.editorPostId = null; this.editorBlocks = []; this._editorCategory = category === 'chat' ? 'chat' : category === 'job' ? 'job' : 'work'; this._renderEditor(category === 'chat' ? '发布帖子' : '发布新作品', null, this._editorCategory); },

  _blockLabel: function(type) { return type === 'text' ? '📝 文本' : type === 'image' ? '🖼 图片' : type === 'video' ? '🎬 视频' : type === 'code' ? '💻 代码' : '📎 附件'; },

  renderEditPost: async function(postId) { this.editorMode = 'edit'; this.editorPostId = postId; this._deletedBlockIds = []; this.renderLoading(); try { var d = await API.getPost(postId); this.editorBlocks = (d.blocks || []).map(function(b) { return { _id: b.id, type: b.type, value: b.value || '', label: b.label || '', file_id: b.file_id || null, file_url: b.file_url || null, allow_preview: !!b.allow_preview, show_in_toc: !!b.show_in_toc, attachment_file_id: b.attachment_file_id || null, attachment_name: b.attachment_name || '', attachment_size: b.attachment_size || 0, min_level_view: b.min_level_view || 0, unlock_points: b.unlock_points || 0, download_points: b.download_points || 0, _tempId: Date.now() + '_' + Math.random().toString(36).substr(2, 5) }; }); this._renderEditor('编辑作品', d.post); } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },

  _renderEditor: function(title, post, category) {
    var isEdit = !!post, self = this;
    var cat = category || (post ? post.category : 'work');
    var coverUrl = post && post.cover_url ? post.cover_url : '';
    var coverName = coverUrl ? '已有封面' : '未选择';
    var coverStyle = coverUrl ? '' : ' style="display:none;"';
    var coverImg = coverUrl ? '<img src="' + post.cover_url + '">' : '';
    var catGroupStyle = (cat === 'chat' || cat === 'job') ? '' : ' style="display:none;"';
    var editorHtml = '<div class="page-fade-in"><div class="editor-page"><div class="editor-page-header"><h1>' + escapeHtml(title) + '</h1></div><div class="editor-card"><div class="edit-layout"><div class="edit-main">' +
      '<div class="form-group"><label class="form-label">标题 <span style="color:var(--error);">*</span></label><input class="form-input" id="editor-title" value="' + escapeHtml(post ? post.title : '') + '" placeholder="输入作品标题..."></div>' +
      '<div class="form-group"><label class="form-label">简介</label><textarea class="form-textarea" id="editor-desc" rows="2" placeholder="简要描述">' + escapeHtml(post ? (post.description || '') : '') + '</textarea></div>' +
      '<div style="margin:24px 0 12px;font-size:13px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:8px;">📝 内容块 <span style="font-weight:400;color:var(--text-muted);font-size:12px;">' + (self.editorBlocks.length || 0) + ' 个块</span></div>' +
      '<div class="blocks-list" id="editor-blocks-list">' + self._renderEditorBlocks() + '</div>' +
      '<div class="add-block-bar"><button class="add-block-btn" data-type="text">➕ 文本</button><button class="add-block-btn" data-type="image">🖼 图片</button><button class="add-block-btn" data-type="video">🎬 视频</button><button class="add-block-btn" data-type="code">💻 代码</button><button class="add-block-btn" data-type="file">📎 附件</button></div>' +
      '<div class="editor-footer" style="display:flex;gap:10px;justify-content:flex-end;margin-top:28px;padding-top:24px;border-top:1px solid var(--border);"><button class="btn btn-primary" id="editor-save-btn">💾 ' + (isEdit ? '保存修改' : '发布') + '</button><button class="btn btn-outline" id="editor-cancel-btn">取消</button></div></div><div class="edit-sidebar">' +
      '<div class="edit-sidebar-card"><h4>🖼 封面</h4><div id="editor-cover-preview" class="cover-preview-box" style="width:100%;height:80px;margin-bottom:8px;' + (coverUrl ? '' : 'display:flex;') + '">' + coverImg + (coverUrl ? '' : '📄') + '</div><div class="cover-actions" style="margin-top:0;"><button class="btn btn-sm btn-outline" id="editor-upload-cover-btn" style="width:100%;justify-content:center;">📁 选择图片</button><input type="file" id="editor-cover-file" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;"><button class="btn btn-sm btn-outline" id="editor-remove-cover-btn"' + coverStyle + ' style="width:100%;justify-content:center;color:var(--error);">✕ 移除</button></div></div>' +
      '<div class="edit-sidebar-card"><h4>🏷️ 标签</h4><div class="tag-input-wrap" style="display:flex;gap:6px;margin-bottom:8px;"><input class="form-input form-input-sm" id="editor-tag-input" type="text" placeholder="添加标签..." value="" style="flex:1;"><button class="btn btn-sm btn-outline" id="editor-add-tag-btn" style="padding:7px 12px;">➕</button></div><div class="tag-chips" id="editor-tag-chips"></div></div>' +
      '<div class="edit-sidebar-card" id="editor-job-panel" style="display:' + (cat === 'job' ? 'block' : 'none') + ';"><h4>📍 职位信息</h4>' +
      // Card-based location type selector
      '<div style="margin-bottom:10px;"><div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">工作方式</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
      '<div class="job-loc-option' + (post && post.job_location_type === 'remote' ? ' active' : '') + '" data-loc="remote" style="padding:10px 12px;border:1px solid ' + (post && post.job_location_type === 'remote' ? 'var(--primary)' : 'var(--border)') + ';border-radius:8px;background:' + (post && post.job_location_type === 'remote' ? 'var(--bg-active)' : 'var(--bg-input)') + ';cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;"><span style="font-size:16px;">🏠</span><div><div style="font-weight:600;">远程</div><div style="font-size:10px;color:var(--text-muted);">完全远程办公</div></div></div>' +
      '<div class="job-loc-option' + (post && post.job_location_type === 'office' ? ' active' : '') + '" data-loc="office" style="padding:10px 12px;border:1px solid ' + (post && post.job_location_type === 'office' ? 'var(--primary)' : 'var(--border)') + ';border-radius:8px;background:' + (post && post.job_location_type === 'office' ? 'var(--bg-active)' : 'var(--bg-input)') + ';cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;"><span style="font-size:16px;">🏢</span><div><div style="font-weight:600;">坐班</div><div style="font-size:10px;color:var(--text-muted);">公司现场办公</div></div></div>' +
      '<div class="job-loc-option' + (post && post.job_location_type === 'hybrid' ? ' active' : '') + '" data-loc="hybrid" style="padding:10px 12px;border:1px solid ' + (post && post.job_location_type === 'hybrid' ? 'var(--primary)' : 'var(--border)') + ';border-radius:8px;background:' + (post && post.job_location_type === 'hybrid' ? 'var(--bg-active)' : 'var(--bg-input)') + ';cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;"><span style="font-size:16px;">🔄</span><div><div style="font-weight:600;">混合</div><div style="font-size:10px;color:var(--text-muted);">远程+坐班结合</div></div></div>' +
      '<div class="job-loc-option' + (!post || !post.job_location_type ? ' active' : '') + '" data-loc="" style="padding:10px 12px;border:1px solid ' + (!post || !post.job_location_type ? 'var(--primary)' : 'var(--border)') + ';border-radius:8px;background:' + (!post || !post.job_location_type ? 'var(--bg-active)' : 'var(--bg-input)') + ';cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;"><span style="font-size:16px;">🌍</span><div><div style="font-weight:600;">不限</div><div style="font-size:10px;color:var(--text-muted);">地点不限</div></div></div>' +
      '</div></div>' +
      // Hidden select for actual value storage
      '<input type="hidden" id="editor-job-type" value="' + (post && post.job_location_type ? post.job_location_type : '') + '">' +
      // City + detail
      '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
      '<input id="editor-job-city" class="form-input" type="text" placeholder="城市" value="' + escapeHtml(post && post.job_location_city ? post.job_location_city : '') + '" style="flex:1;">' +
      '<input id="editor-job-detail" class="form-input" type="text" placeholder="详细地址（可选）" value="' + escapeHtml(post && post.job_location_detail ? post.job_location_detail : '') + '" style="flex:1.5;"></div>' +
      // Work type + salary
      '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
      '<select id="editor-job-worktype" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;outline:none;">' +
      '<option value="">工作性质</option><option value="fulltime"' + (post && post.job_type === 'fulltime' ? ' selected' : '') + '>全职</option><option value="parttime"' + (post && post.job_type === 'parttime' ? ' selected' : '') + '>兼职</option><option value="intern"' + (post && post.job_type === 'intern' ? ' selected' : '') + '>实习</option><option value="project"' + (post && post.job_type === 'project' ? ' selected' : '') + '>项目</option></select></div>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
      '<input id="editor-job-salary-min" class="form-input" type="number" placeholder="薪资下限" value="' + (post && post.job_salary_min ? post.job_salary_min : '') + '" style="flex:1;">' +
      '<span style="color:var(--text-muted);font-size:12px;">-</span>' +
      '<input id="editor-job-salary-max" class="form-input" type="number" placeholder="薪资上限" value="' + (post && post.job_salary_max ? post.job_salary_max : '') + '" style="flex:1;">' +
      '<span style="color:var(--text-muted);font-size:12px;">元/月</span></div></div>' +
      '<div class="edit-sidebar-card"' + catGroupStyle + '><h4>📂 分类</h4><select class="form-input" id="editor-category" style="font-size:13px;"><option value="work"' + (cat === 'work' ? ' selected' : '') + '>📂 作品区</option><option value="job"' + (cat === 'job' ? ' selected' : '') + '>💼 求职招聘</option><option value="chat"' + (cat === 'chat' ? ' selected' : '') + '>💬 聊天区</option></select></div>' +
      '</div></div></div></div></div>';
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
      var typeName = b.label || Components._blockLabel(b.type);
      h += '<div class="block-wrap" data-index="' + i + '">' +
        '<div class="block-bar"><input class="editor-block-label" data-index="' + i + '" value="' + escapeHtml(typeName) + '" style="background:none;border:none;color:var(--text);font-size:12px;font-weight:600;font-family:inherit;outline:none;flex:1;min-width:0;padding:2px 6px;border-radius:4px;transition:background .15s;" onfocus="this.style.background=\'rgba(255,255,255,0.05)\'" onblur="this.style.background=\'none\'">' +
        '<div class="block-actions" style="display:flex;gap:4px;">' +
        '<button class="btn btn-sm btn-outline btn-icon editor-move-up-btn" data-index="' + i + '"' + (i === 0 ? ' disabled' : '') + ' style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:14px;">↑</button>' +
        '<button class="btn btn-sm btn-outline btn-icon editor-move-down-btn" data-index="' + i + '"' + (i === this.editorBlocks.length - 1 ? ' disabled' : '') + ' style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:14px;">↓</button>' +
        '<button class="btn btn-sm btn-outline btn-icon editor-remove-block-btn" data-index="' + i + '" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--error);">✕</button></div></div>' +
        '<div class="block-body">' + this._renderEditorBlockContent(b, i) + '</div></div>';
    }
    return h;
  },

  _renderEditorBlockContent: function(b, i) {
    var previewCb = '<label style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;margin-top:6px;"><input type="checkbox" class="editor-allow-preview" data-index="' + i + '"' + (b.allow_preview ? ' checked' : '') + '> 允许普通用户预览</label>';
    var tocCb = '<label style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;margin-top:4px;"><input type="checkbox" class="editor-show-in-toc" data-index="' + i + '"' + (b.show_in_toc ? ' checked' : '') + '> 📑 添加到目录</label>';
    if (b.type === 'text') {
      return '<textarea class="form-textarea editor-block-input" data-index="' + i + '" rows="4" placeholder="输入文本内容..." style="font-family:inherit;">' + escapeHtml(b.value || '') + '</textarea>' + previewCb + tocCb;
    } else if (b.type === 'image') {
      var preview = b.file_url ? '<div style="margin-bottom:8px;"><img src="' + b.file_url + '" style="max-width:200px;max-height:150px;border-radius:6px;object-fit:cover;"></div>' : '';
      return '<div>' + preview + '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-sm btn-outline editor-upload-btn" data-index="' + i + '">📁 选择图片</button><input type="file" class="editor-file-input" data-index="' + i + '" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;"><input class="form-input editor-block-url" data-index="' + i + '" type="text" placeholder="或输入图片URL" value="' + escapeHtml(b.value || '') + '" style="flex:1;">' + previewCb + '</div>' + tocCb + '</div>';
    } else if (b.type === 'video') {
      var vPreview = b.file_url ? '<div style="margin-bottom:8px;"><video controls style="max-width:300px;max-height:150px;"><source src="' + b.file_url + '"></video></div>' : '';
      return '<div>' + vPreview + '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-sm btn-outline editor-upload-btn" data-index="' + i + '">📁 选择视频</button><input type="file" class="editor-file-input" data-index="' + i + '" accept="video/mp4,video/webm,video/ogg" style="display:none;"><input class="form-input editor-block-url" data-index="' + i + '" type="text" placeholder="或输入视频URL" value="' + escapeHtml(b.value || '') + '" style="flex:1;"></div>' + previewCb + tocCb + '</div>';
    } else if (b.type === 'code') {
      return '<div><div class="form-group" style="margin-bottom:4px;"><select class="form-input editor-code-lang" data-index="' + i + '" style="width:150px;font-size:13px;"><option value="">自动检测</option><option value="javascript"' + (b.language === 'javascript' ? ' selected' : '') + '>JavaScript</option><option value="python"' + (b.language === 'python' ? ' selected' : '') + '>Python</option><option value="html"' + (b.language === 'html' ? ' selected' : '') + '>HTML</option><option value="css"' + (b.language === 'css' ? ' selected' : '') + '>CSS</option><option value="json"' + (b.language === 'json' ? ' selected' : '') + '>JSON</option><option value="bash"' + (b.language === 'bash' ? ' selected' : '') + '>Bash</option></select></div><textarea class="form-textarea editor-block-input code-input" data-index="' + i + '" rows="6" placeholder="输入代码..." style="font-family:monospace;">' + escapeHtml(b.value || '') + '</textarea>' + previewCb + tocCb + '</div>';
    } else if (b.type === 'file') {
      var fileName = b.attachment_name || '';
      var fileSize = b.attachment_size ? formatFileSize(b.attachment_size) : '';
      var hasFile = !!b.attachment_file_id;
      var fileInfo = hasFile ? '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;display:flex;align-items:center;gap:8px;"><span>📎 ' + escapeHtml(fileName) + (fileSize ? ' (' + fileSize + ')' : '') + '</span><button class="btn btn-sm btn-outline editor-remove-attach-btn" data-index="' + i + '" style="color:var(--error);font-size:12px;padding:2px 8px;" title="移除附件">✕</button></div>' : '';
      return '<div>' + fileInfo + previewCb + tocCb + 
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
        '<input type="number" class="editor-download-points" data-index="' + i + '" value="' + (b.download_points || 0) + '" min="0"></div></div></div></div>';
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
    document.getElementById('editor-cancel-btn').addEventListener('click', function() { if (isEdit) { Router.navigate('#/posts/' + post.id); } else { var dest = '#/works'; var ecat = self._editorCategory; if (ecat === 'chat') dest = '#/chats'; else if (ecat === 'job') dest = '#/jobs'; Router.navigate(dest); } });
    // Toggle job panel when category changes
    var catSelect = document.getElementById('editor-category');
    if (catSelect) {
      catSelect.addEventListener('change', function() {
        var panel = document.getElementById('editor-job-panel');
        if (panel) panel.style.display = this.value === 'job' ? 'block' : 'none';
      });
    }
    // Card-based location type selector
    document.querySelectorAll('.job-loc-option').forEach(function(card) {
      card.addEventListener('click', function() {
        document.querySelectorAll('.job-loc-option').forEach(function(c) {
          c.style.border = '1px solid var(--border)';
          c.style.background = 'var(--bg-input)';
        });
        this.style.border = '1px solid var(--primary)';
        this.style.background = 'var(--bg-active)';
        var hidden = document.getElementById('editor-job-type');
        if (hidden) hidden.value = this.dataset.loc;
      });
    });
    document.querySelectorAll('.add-block-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        playClickSound();
        var type = this.dataset.type;
        self.editorBlocks.push({ type: type, value: '', label: '', file_id: null, file_url: null, allow_preview: true, show_in_toc: false, _tempId: Date.now() + '_' + Math.random().toString(36).substr(2, 5) });
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
        previewDiv.innerHTML = '<img src="' + result.file.url + '" style="width:100%;height:100%;object-fit:cover;">';
        document.getElementById('editor-remove-cover-btn').style.display = '';
      } catch (err) { showToast(err.message, 'error'); }
    });
    document.getElementById('editor-remove-cover-btn').addEventListener('click', function() {
      coverFileId = null;
      var pv = document.getElementById('editor-cover-preview');
      pv.style.display = 'flex';
      pv.innerHTML = '📄';
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
          label: b.label || b.type, show_in_toc: !!b.show_in_toc, attachment_file_id: b.attachment_file_id || null, attachment_name: b.attachment_name || '',
          attachment_size: b.attachment_size || 0, min_level_view: b.min_level_view || 0,
          unlock_points: b.unlock_points || 0, download_points: b.download_points || 0 };
        if (b._id) ob.id = b._id; return ob;
      });
      self._disableButton(btn, '发布中...');
      try {
        var data = { title: title, description: desc, tags: tags, category: category, blocks: blocks };
        if (coverFileId) data.cover_file_id = coverFileId;
        // Collect job-specific fields (safe fallback if panel is hidden)
        var jt = document.getElementById('editor-job-type');
        var jwt = document.getElementById('editor-job-worktype');
        var jc = document.getElementById('editor-job-city');
        var jd = document.getElementById('editor-job-detail');
        var jsmn = document.getElementById('editor-job-salary-min');
        var jsmx = document.getElementById('editor-job-salary-max');
        if (jt) data.job_location_type = jt.value || null;
        if (jwt) data.job_type = jwt.value || null;
        if (jc) data.job_location_city = jc.value.trim() || null;
        if (jd) data.job_location_detail = jd.value.trim() || null;
        if (jsmn) data.job_salary_min = jsmn.value ? parseInt(jsmn.value) || null : null;
        if (jsmx) data.job_salary_max = jsmx.value ? parseInt(jsmx.value) || null : null;
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
    document.querySelectorAll('.editor-block-label').forEach(function(el) {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].label = el.value.trim();
    });
    document.querySelectorAll('.editor-show-in-toc').forEach(function(el) {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].show_in_toc = el.checked;
    });
  }
};
