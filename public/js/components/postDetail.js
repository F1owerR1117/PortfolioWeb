// Post detail component: detail view, comments, reactions
var ComponentsPostDetail = {
  renderPostDetail: async function(postId) {
    this.renderLoading();
    try {
      var d = await API.getPost(postId), post = d.post, blocks = d.blocks, isAdmin = App.user && App.user.role === 'admin';
      this._currentPostAuthorId = post.created_by;
      var tags = (post.tags || '').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="post-detail"><div class="post-detail-cover" style="' + (post.cover_url ? "background-image:url('" + post.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (post.cover_url ? '' : '📄') + '</div><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;"><div><h1 class="post-detail-title">' + escapeHtml(post.title) + '</h1><div class="post-detail-meta">作者：<a href="#/users/' + post.created_by + '" class="user-link">' + escapeHtml(post.author) + '</a>' + this._renderLevelBadge((post.author_level || 1)) + ' · ' + formatDate(post.created_at) + (post.updated_at !== post.created_at ? '（编辑于 ' + formatDate(post.updated_at) + '）' : '') + ' · 👁 ' + (post.views || 0) + ' 次浏览</div>' + (tags.length ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">' + tags.map(function(t) { return '<span class="tag-chip" style="cursor:default;">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '') + '</div>' + (isAdmin ? '<div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;"><button class="btn btn-outline btn-sm" id="edit-post-btn">✏ 编辑</button><button class="btn btn-danger btn-sm" id="delete-post-btn">🗑 删除</button><button class="btn btn-sm ' + (post.is_sticky ? 'btn-primary' : 'btn-outline') + '" id="sticky-toggle-btn">📌 ' + (post.is_sticky ? '已置顶' : '置顶') + '</button><button class="btn btn-sm ' + (post.is_featured ? 'btn-primary' : 'btn-outline') + '" id="featured-toggle-btn">⭐ ' + (post.is_featured ? '已精华' : '精华') + '</button><button class="btn btn-sm ' + (post.is_locked ? 'btn-primary' : 'btn-outline') + '" id="lock-toggle-btn">🔒 ' + (post.is_locked ? '已锁定' : '锁定') + '</button></div>' : '') + '</div>' +
        '<div class="reaction-bar" id="reaction-bar" data-post-id="' + post.id + '"><button class="reaction-btn like-btn' + (d.user_reaction === 'like' ? ' active' : '') + '" data-type="like">👍 <span id="like-count">' + (post.like_count || 0) + '</span></button><button class="reaction-btn dislike-btn' + (d.user_reaction === 'dislike' ? ' active' : '') + '" data-type="dislike">👎 <span id="dislike-count">' + (post.dislike_count || 0) + '</span></button><button id="bookmark-btn" style="background:none;border:none;cursor:pointer;font-size:18px;padding:4px 8px;border-radius:6px;position:relative;" title="收藏">📖</button><button id="report-post-btn" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px 8px;border-radius:6px;color:var(--text-light);">🚩</button></div>' +
        (post.is_featured ? '<div class="featured-badge">⭐ 精华帖</div>' : '') + (post.description ? '<p class="post-detail-desc">' + escapeHtml(post.description) + '</p>' : '') +
        '<div class="content-blocks" id="content-blocks">' + (blocks.length === 0 ? '<div class="empty-state"><p>暂无内容</p></div>' : '') + '</div>' +
        '<div class="comments-section" id="comments-section"><h2 class="comments-title">💬 评论</h2>' + (post.is_locked ? '<div style="padding:12px 16px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-secondary);margin-bottom:16px;">🔒 该帖子已被锁定，无法回复</div>' : '<div class="comment-form-wrap"><textarea class="form-textarea" id="comment-input" placeholder="写下你的评论..." rows="3"></textarea><button class="btn btn-primary" id="submit-comment-btn">发布评论</button></div>') + '<div class="comments-list" id="comments-list"><div class="loading-screen" style="padding:40px;"><div class="spinner"></div><p>加载评论中...</p></div></div></div></div></div>';
      var bc = document.getElementById('content-blocks');
      blocks.forEach(function(b) {
        var el = document.createElement('div'); el.className = 'content-block';

        // Attachment block rendering
        if (b.attachment_file_id) {
          var attachName = escapeHtml(b.attachment_name || '附件');
          var attachSize = b.attachment_size ? formatFileSize(b.attachment_size) : '';
          var status = b.attachment_status || 'ready';
          var msg = b.attachment_msg || '';
          var downloadUrl = b.attachment_download_url || '';

          var actionsHtml = '';
          if (status === 'level_locked') {
            actionsHtml = '<div style="padding:12px;text-align:center;color:var(--text-secondary);">🔒 ' + escapeHtml(msg) + '</div>';
          } else if (status === 'unlock_required') {
            actionsHtml = '<div style="padding:12px;text-align:center;"><button class="btn btn-primary btn-sm attach-unlock-btn" data-block-id="' + b.id + '" data-post-id="' + post.id + '">🔓 ' + escapeHtml(msg) + '</button></div>';
          } else if (status === 'download_required') {
            actionsHtml = '<div style="padding:12px;text-align:center;"><button class="btn btn-primary btn-sm attach-download-btn" data-block-id="' + b.id + '" data-post-id="' + post.id + '">⬇ ' + escapeHtml(msg) + '</button></div>';
          } else if (status === 'ready') {
            actionsHtml = '<div style="padding:12px;text-align:center;"><a href="' + downloadUrl + '" class="btn btn-primary btn-sm" download>⬇ 下载附件</a></div>';
          }

          el.innerHTML = '<div class="content-block-label">📎 附件</div>' +
            '<div style="border:1px solid var(--border);border-radius:8px;margin-top:8px;overflow:hidden;">' +
            '<div style="padding:12px;display:flex;align-items:center;gap:12px;background:var(--bg-card);">' +
            '<span style="font-size:32px;">📎</span>' +
            '<div style="flex:1;"><div style="font-weight:600;">' + attachName + '</div>' +
            '<div style="font-size:13px;color:var(--text-secondary);">' + attachSize + '</div></div></div>' +
            actionsHtml + '</div>';
          bc.appendChild(el);
          return;
        }

        var h = '<div class="content-block-label">' + (b.type === 'text' ? '📝 文本' : b.type === 'image' ? '🖼 图片' : b.type === 'video' ? '🎬 视频' : b.type === 'file' ? '📎 附件' : '💻 代码') + '</div>';
        if (b.type === 'text') h += '<div class="text-content">' + escapeHtml(b.value) + '</div>';
        else if (b.type === 'image') h += (b.file_url || b.value) ? '<img src="' + (b.file_url || b.value) + '" alt="图片">' : '<span style="color:var(--text-light)">图片不可用</span>';
        else if (b.type === 'video') h += (b.file_url || b.value) ? '<video controls><source src="' + (b.file_url || b.value) + '"' + (b.file_mime_type ? ' type="' + b.file_mime_type + '"' : '') + '></video>' : '<span style="color:var(--text-light)">视频不可用</span>';
        else if (b.type === 'file') h += '<div style="padding:12px;text-align:center;color:var(--text-secondary);">📎 附件（未上传文件）</div>';
        else h += '<pre><code class="' + Components._detectCodeLang(b.value) + '">' + escapeHtml(b.value || '') + '</code></pre>';
        el.innerHTML = h; bc.appendChild(el);
      });
      // Bind attachment purchase buttons
      bc.addEventListener('click', async function(e) {
        var unlockBtn = e.target.closest('.attach-unlock-btn');
        var downloadBtn = e.target.closest('.attach-download-btn');
        if (unlockBtn) {
          playClickSound();
          var blockId = parseInt(unlockBtn.dataset.blockId);
          var postId = parseInt(unlockBtn.dataset.postId);
          if (isNaN(blockId) || isNaN(postId)) return;
          try {
            await API.purchaseBlock(postId, blockId, 'unlock');
            showToast('解锁成功', 'success');
            Components.renderPostDetail(postId);
          } catch (err) { showToast(err.message, 'error'); }
          return;
        }
        if (downloadBtn) {
          playClickSound();
          var blockId2 = parseInt(downloadBtn.dataset.blockId);
          var postId2 = parseInt(downloadBtn.dataset.postId);
          if (isNaN(blockId2) || isNaN(postId2)) return;
          try {
            await API.purchaseBlock(postId2, blockId2, 'download');
            showToast('下载权限已购买', 'success');
            Components.renderPostDetail(postId2);
          } catch (err) { showToast(err.message, 'error'); }
          return;
        }
      });

      if (blocks.some(function(b) { return b.type === 'code'; })) loadHighlightJs().then(function() { document.querySelectorAll('pre code').forEach(function(el) { if (window.hljs) hljs.highlightElement(el); }); Components._applyCollapse(); }); else this._applyCollapse();
      if (isAdmin) {
        document.getElementById('edit-post-btn').addEventListener('click', function() { Router.navigate('#/edit/' + post.id); });
        document.getElementById('delete-post-btn').addEventListener('click', async function() { if (!(await showConfirm('确定删除？'))) return; var b = document.getElementById('delete-post-btn'); b.disabled = true; b.textContent = '删除中...'; try { await API.deletePost(post.id); showToast('已删除', 'success'); var navTo = post.category === 'chat' ? '#/chats' : '#/works'; Router.navigate(navTo); } catch (err) { showToast(err.message, 'error'); b.disabled = false; b.textContent = '🗑 删除'; } });
      }
      this._bindReactionBar(postId);
      if (isAdmin) this._bindStatusToggles(postId);
      var _updateBmBtn = function(bookmarked) {
        var b = document.getElementById('bookmark-btn'); if (!b) return;
        b.textContent = bookmarked ? '📑' : '📖'; b.title = bookmarked ? '已收藏，点击管理' : '点击收藏';
      };
      API.checkBookmark(post.id).then(function(c) { _updateBmBtn((c.collection_ids||[]).length > 0); }).catch(function(){});
      document.getElementById('bookmark-btn')?.addEventListener('click', async function() { try { playClickSound(); var cols = (await API.getBookmarkCollections()).collections || []; var check = await API.checkBookmark(post.id); var sel = new Set((check.collection_ids || []).map(Number)); var ov = document.createElement('div'); ov.className = 'custom-modal-overlay'; ov.innerHTML = '<div class="custom-modal-dialog" style="max-width:420px;padding:20px 0;"><div style="padding:0 24px 16px;border-bottom:1px solid var(--border);"><div style="font-size:17px;font-weight:700;">📌 管理收藏</div></div><div style="padding:8px 0;max-height:320px;overflow-y:auto;">' + (cols.length ? cols.map(function(c) { var s = sel.has(c.id); return '<div class="picker-col-item" data-id="' + c.id + '" data-selected="' + (s ? '1' : '0') + '" style="padding:12px 24px;cursor:pointer;display:flex;align-items:center;gap:12px;"><span style="font-size:18px;width:24px;text-align:center;">' + (s ? '☑' : '☐') + '</span><div><div style="font-weight:600;font-size:14px;">' + escapeHtml(c.name) + '</div><div style="font-size:12px;color:var(--text-secondary);">' + (c.count || 0) + ' 个收藏</div></div></div>'; }).join('') : '<div style="padding:20px;text-align:center;color:var(--text-secondary);">暂无收藏夹，点击下方新建</div>') + '</div><div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:space-between;"><button class="btn btn-sm btn-outline" id="picker-new-col-btn">✚ 新建</button><div><button class="btn btn-sm btn-outline" id="picker-cancel-btn">取消</button><button class="btn btn-sm btn-primary" id="picker-confirm-btn" style="margin-left:8px;">保存</button></div></div></div>'; document.body.appendChild(ov); requestAnimationFrame(function(){ ov.classList.add('visible'); }); var cp = function(){ ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }; ov.querySelectorAll('.picker-col-item').forEach(function(it) { it.addEventListener('click', function() { var s = it.dataset.selected === '1'; it.dataset.selected = s ? '0' : '1'; it.style.borderLeft = s ? '' : '3px solid var(--primary)'; it.querySelector('span:first-child').textContent = s ? '☐' : '☑'; }); }); document.getElementById('picker-confirm-btn').addEventListener('click', async function() { var changed = 0, errors = 0; this.disabled = true; for (var i = 0; i < cols.length; i++) { var c = cols[i], el = ov.querySelector('.picker-col-item[data-id="' + c.id + '"]'); if (!el) continue; if ((el.dataset.selected === '1') !== sel.has(c.id)) { try { await API.toggleBookmark(post.id, c.id); changed++; } catch(e) { errors++; } } } cp(); if (errors > 0) showToast('部分操作失败（' + errors + ' 项），请重试', 'error'); else showToast(changed > 0 ? '已更新' : '未修改', 'success'); try { var c2 = await API.checkBookmark(post.id); _updateBmBtn((c2.collection_ids||[]).length > 0); } catch(e){} }); document.getElementById('picker-new-col-btn').addEventListener('click', async function() { var n = await showPrompt('新建收藏夹名称：', '', '我的收藏'); if (!n || !n.trim()) return; try { await API.createBookmarkCollection(n.trim()); showToast('已创建', 'success'); cp(); setTimeout(function() { document.getElementById('bookmark-btn').click(); }, 250); } catch(err) { showToast(err.message, 'error'); } }); document.getElementById('picker-cancel-btn').addEventListener('click', cp); ov.addEventListener('click', function(e) { if (e.target === ov) cp(); }); } catch(err) { showToast(err.message, 'error'); } });
      document.getElementById('report-post-btn')?.addEventListener('click', async function() { var r = await showPrompt('举报原因：', '', '违规内容'); if (!r || !r.trim()) return; try { await API.createReport('post', post.id, r.trim()); showToast('已提交', 'success'); } catch (err) { showToast(err.message, 'error'); } });
      await this._loadComments(postId); this._bindCommentForm(postId); this._bindCommentActions(postId);
      if (this._highlightCommentId) {
        var targetCommentId = this._highlightCommentId;
        setTimeout(function() {
          if (!Components._expandToComment(targetCommentId)) { Components._commentPage = 1; Components._loadComments(postId).then(function() { Components._expandToComment(targetCommentId); }); }
          Components._highlightCommentId = null;
        }, 100);
      }
    } catch (err) { showToast(err.message, 'error'); this.renderPostList(); }
  },

  _detectCodeLang: function(code) { if (!code) return ''; var t = code.trim(); if (/^</.test(t)) return 'html'; if (/^{/.test(t) || /^}$/.test(t)) return 'json'; if (/^(import |export |const |let |var |function |=>)/.test(t)) return 'javascript'; if (/^(def |import |from |class )/.test(t)) return 'python'; if (/^(@|body |.class|#id|<!DOCTYPE)/.test(t)) return 'css'; return ''; },

  _loadComments: async function(postId) { try { this._commentPage = 1; var d = await API.getComments(postId); this._renderComments(d.comments || [], postId); } catch (err) { var l = document.getElementById('comments-list'); if (l) l.innerHTML = '<div class="empty-state"><p>加载评论失败</p></div>'; } },

  _renderComments: function(comments, postId) {
    var list = document.getElementById('comments-list'); if (!list) return;
    if (comments.length === 0) { list.innerHTML = '<div class="empty-state" style="padding:20px;"><p style="font-size:14px;color:var(--text-light);">暂无评论</p></div>'; return; }
    var expandedSave = new Set(); list.querySelectorAll('.comment-nested').forEach(function(n) { if (n.style.display !== 'none') expandedSave.add(n.dataset.parent); });
    var userMap = {}, replies = {};
    comments.forEach(function(c) { userMap[c.id] = c.nickname || c.username; if (c.parent_id) { if (!replies[c.parent_id]) replies[c.parent_id] = []; replies[c.parent_id].push(c); } });
    Object.keys(replies).forEach(function(pid) { replies[pid].sort(function(a, b) { return a.created_at.localeCompare(b.created_at); }); });
    var topAll = comments.filter(function(c) { return !c.parent_id; }), totalPages = Math.ceil(topAll.length / this._commentPageSize) || 1;
    var pageTop = topAll.slice((this._commentPage - 1) * this._commentPageSize, this._commentPage * this._commentPageSize);
    function countAll(pid) { var t = (replies[pid] || []).length; (replies[pid] || []).forEach(function(k) { t += countAll(k.id); }); return t; }
    var html = '';
    var self = this;
    pageTop.forEach(function(top) { var rc = replies[top.id] ? countAll(top.id) : 0; html += self._renderCommentItem(top, App.user, postId, 0, null, rc); if (replies[top.id] && replies[top.id].length > 0) { var defDisplay = expandedSave.has(String(top.id)) ? '' : 'display:none;'; html += '<div class="comment-nested" data-parent="' + top.id + '" style="' + defDisplay + '">'; (function rt(pid, d) { (replies[pid] || []).forEach(function(ch) { var crc = replies[ch.id] ? countAll(ch.id) : 0; html += Components._renderCommentItem(ch, App.user, postId, d, userMap[ch.parent_id] || null, crc); rt(ch.id, d + 1); }); })(top.id, 1); html += '</div>'; } });
    if (totalPages > 1) { html += '<div style="display:flex;justify-content:center;gap:6px;padding:16px 0;flex-wrap:wrap;"><button class="btn btn-sm btn-outline" data-cp="prev"' + (this._commentPage <= 1 ? ' disabled' : '') + '>上一页</button>'; for (var i = 1; i <= totalPages; i++) html += '<button class="btn btn-sm ' + (i === this._commentPage ? 'btn-primary' : 'btn-outline') + '" data-cp="' + i + '">' + i + '</button>'; html += '<button class="btn btn-sm btn-outline" data-cp="next"' + (this._commentPage >= totalPages ? ' disabled' : '') + '>下一页</button></div>'; }
    list.innerHTML = html;
    expandedSave.forEach(function(pid) { var n = list.querySelector('.comment-nested[data-parent="' + pid + '"]'); var btn = list.querySelector('.toggle-nested-btn[data-parent="' + pid + '"]'); if (n) n.style.display = ''; if (btn && n) { var c = n.querySelectorAll('.comment').length; btn.textContent = '🐾 收起 ' + c + ' 条回复'; } });
    list.querySelectorAll('[data-cp]').forEach(function(b) { b.addEventListener('click', function() { var v = b.dataset.cp; if (v === 'prev' && Components._commentPage > 1) Components._commentPage--; else if (v === 'next' && Components._commentPage < totalPages) Components._commentPage++; else if (v !== 'prev' && v !== 'next') Components._commentPage = parseInt(v); else return; Components._renderComments(comments, postId); }); });
    list.querySelectorAll('.toggle-nested-btn').forEach(function(t) { t.addEventListener('click', function(e) { e.stopPropagation(); var n = list.querySelector('.comment-nested[data-parent="' + this.dataset.parent + '"]'); if (!n) return; var h = n.style.display === 'none'; n.style.display = h ? '' : 'none'; var c = n.querySelectorAll('.comment').length; this.textContent = h ? '🐾 收起 ' + c + ' 条回复' : '🐾 ' + c + ' 条回复'; }); });
    this._applyCollapse();
  },

  _renderCommentItem: function(comment, currentUser, postId, depth, replyToName, replyCount) {
    var canModify = currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin');
    var toggleBtn = replyCount > 0 ? '<button type="button" class="comment-action-btn toggle-nested-btn" data-parent="' + comment.id + '" style="cursor:pointer;">🐾 ' + replyCount + ' 条回复</button>' : '';
    return '<div class="comment' + (depth > 0 ? ' comment-reply' : '') + '" data-comment-id="' + comment.id + '" data-depth="' + depth + '"><div class="comment-avatar" data-user-id="' + comment.user_id + '" style="cursor:pointer;">' + (comment.avatar_url ? '<img src="' + escapeHtml(comment.avatar_url) + '" alt="头像">' : escapeHtml((comment.nickname || comment.username).charAt(0).toUpperCase())) + '</div><div class="comment-body"><div class="comment-header"><span class="comment-author" data-user-id="' + comment.user_id + '" style="cursor:pointer;">' + escapeHtml(comment.nickname || comment.username) + '</span>' + this._renderLevelBadge((comment.user_level || 1)) + '' + (replyToName ? '<span class="comment-reply-to">回复 @' + escapeHtml(replyToName) + '</span>' : '') + (comment.user_id === this._currentPostAuthorId ? '<span class="comment-author-badge">作者</span>' : '') + '<span class="comment-date">' + formatDate(comment.created_at) + '</span>' + (comment.updated_at !== comment.created_at ? '<span class="comment-edited">（已编辑）</span>' : '') + '</div><div class="comment-content">' + escapeHtml(comment.content) + '</div><div class="comment-actions"><button type="button" class="comment-action-btn reply-btn">回复</button>' + (canModify ? '<button type="button" class="comment-action-btn edit-btn">编辑</button><button type="button" class="comment-action-btn delete-btn">删除</button>' : '') + toggleBtn + '</div><div class="comment-edit-form" style="display:none;"><textarea class="form-textarea edit-textarea" rows="2">' + escapeHtml(comment.content) + '</textarea><div style="display:flex;gap:8px;margin-top:8px;"><button type="button" class="btn btn-primary btn-sm save-edit-btn">保存</button><button type="button" class="btn btn-outline btn-sm cancel-edit-btn">取消</button></div></div><div class="reply-form" style="display:none;"><textarea class="form-textarea reply-textarea" rows="2" placeholder="回复 ' + escapeHtml(comment.username) + '..."></textarea><div style="display:flex;gap:8px;margin-top:8px;"><button type="button" class="btn btn-primary btn-sm submit-reply-btn">回复</button><button type="button" class="btn btn-outline btn-sm cancel-reply-btn">取消</button></div></div></div></div>';
  },

  _bindCommentForm: function(postId) {
    var input = document.getElementById('comment-input'), btn = document.getElementById('submit-comment-btn');
    if (!input || !btn) return; var nb = btn.cloneNode(true); btn.parentNode.replaceChild(nb, btn);
    var self = this;
    var submit = async function() { var c = input.value.trim(); if (!c) { showToast('请输入评论', 'warning'); return; } if (self._isButtonDisabled(nb)) return; self._disableButton(nb, '发布中...'); try { var result = await API.createComment(postId, c); input.value = ''; showToast('已发布', 'success'); App.refreshLevel(); var newCommentId = result.comment ? result.comment.id : null; var d = await API.getComments(postId); self._renderComments(d.comments || [], postId); if (newCommentId) { setTimeout(function() { Components._expandToComment(newCommentId); }, 100); } } catch (err) { showToast(err.message, 'error'); } finally { self._enableButton(nb, '发布评论'); } };
    nb.addEventListener('click', submit);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } });
  },

  _bindCommentActions: function(postId) {
    var list = document.getElementById('comments-list');
    if (!list || list.dataset.commentsBound === 'true') return;
    list.dataset.commentsBound = 'true';
    var self = this;
    list.addEventListener('click', async function(e) {
      var pt = e.target.closest('[data-user-id]');
      if (pt && (pt.classList.contains('comment-avatar') || pt.classList.contains('comment-author'))) { playClickSound(); Router.navigate('#/users/' + pt.dataset.userId); return; }
      var ce = e.target.closest('.comment'); if (!ce) return; var cid = parseInt(ce.dataset.commentId); if (isNaN(cid)) return;
      if (e.target.classList.contains('reply-btn')) { playClickSound(); list.querySelectorAll('.reply-form').forEach(function(f) { f.style.display = 'none'; }); var rf = ce.querySelector('.reply-form'); if (rf) { rf.style.display = rf.style.display === 'none' ? 'block' : 'none'; if (rf.style.display === 'block') rf.querySelector('.reply-textarea').focus(); } return; }
      if (e.target.classList.contains('edit-btn')) { playClickSound(); list.querySelectorAll('.comment-edit-form').forEach(function(f) { f.style.display = 'none'; }); var ef = ce.querySelector('.comment-edit-form'), ct = ce.querySelector('.comment-content'); if (ef && ct) { ct.style.display = 'none'; ef.style.display = 'block'; ef.querySelector('.edit-textarea').focus(); } return; }
      if (e.target.classList.contains('delete-btn')) { if (!(await showConfirm('确定删除？'))) return; try { await API.deleteComment(cid); showToast('已删除', 'success'); var d = await API.getComments(postId); self._renderComments(d.comments || [], postId); } catch (err) { showToast(err.message, 'error'); } return; }
      if (e.target.classList.contains('save-edit-btn')) { var c = ce.querySelector('.comment-edit-form .edit-textarea').value.trim(); if (!c) { showToast('不能为空', 'warning'); return; } try { await API.updateComment(cid, c); showToast('已更新', 'success'); var d = await API.getComments(postId); self._renderComments(d.comments || [], postId); } catch (err) { showToast(err.message, 'error'); } return; }
      if (e.target.classList.contains('cancel-edit-btn')) { var ef = ce.querySelector('.comment-edit-form'), ct = ce.querySelector('.comment-content'); if (ef && ct) { ef.style.display = 'none'; ct.style.display = 'block'; } return; }
      if (e.target.classList.contains('submit-reply-btn')) { var c = ce.querySelector('.reply-form .reply-textarea').value.trim(); if (!c) { showToast('不能为空', 'warning'); return; } try { var r = await API.createComment(postId, c, cid); var nid = r.comment ? r.comment.id : null; showToast('回复成功', 'success'); App.refreshLevel(); var d = await API.getComments(postId); self._renderComments(d.comments || [], postId); if (nid) { setTimeout(function() { Components._expandToComment(nid); }, 100); } } catch (err) { showToast(err.message, 'error'); } return; }
      if (e.target.classList.contains('cancel-reply-btn')) { var rf = ce.querySelector('.reply-form'); if (rf) rf.style.display = 'none'; }
    });
  },

  _bindReactionBar: function(postId) {
    document.getElementById('reaction-bar')?.addEventListener('click', async function(e) {
      var btn = e.target.closest('.reaction-btn'); if (!btn) return; playClickSound();
      try { var r = await API.setReaction(postId, btn.classList.contains('active') ? null : btn.dataset.type); if (btn.dataset.type === 'like') App.refreshLevel(); document.getElementById('like-count').textContent = r.like_count; document.getElementById('dislike-count').textContent = r.dislike_count; document.querySelectorAll('.reaction-btn').forEach(function(b) { b.classList.remove('active'); }); if (r.type) document.querySelector('.reaction-btn[data-type="' + r.type + '"]').classList.add('active'); } catch (err) { showToast(err.message, 'error'); }
    });
  },

  _bindStatusToggles: function(postId) {
    document.getElementById('sticky-toggle-btn')?.addEventListener('click', async function() { try { await API.setPostStatus(postId, { sticky: !this.textContent.includes('已置顶') }); showToast('已更新', 'success'); Components.renderPostDetail(postId); } catch(err) { showToast(err.message, 'error'); } });
    document.getElementById('featured-toggle-btn')?.addEventListener('click', async function() { try { await API.setPostStatus(postId, { featured: !this.textContent.includes('已精华') }); showToast('已更新', 'success'); Components.renderPostDetail(postId); } catch(err) { showToast(err.message, 'error'); } });
    document.getElementById('lock-toggle-btn')?.addEventListener('click', async function() { try { await API.lockPost(postId, !this.textContent.includes('已锁定')); showToast('已更新', 'success'); Components.renderPostDetail(postId); } catch(err) { showToast(err.message, 'error'); } });
  },

  _expandToComment: function(commentId) {
    var el = document.querySelector('[data-comment-id="' + commentId + '"]');
    if (!el) return false;
    var p = el.parentElement;
    while (p) { if (p.classList.contains('comment-nested')) { p.style.display = ''; var pid = p.dataset.parent; var toggle = document.querySelector('.toggle-nested-btn[data-parent="' + pid + '"]'); if (toggle) { var count = p.querySelectorAll('.comment').length; toggle.textContent = '🐾 收起 ' + count + ' 条回复'; } } p = p.parentElement; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.background = 'rgba(37,99,235,0.08)'; setTimeout(function() { if (el) el.style.background = ''; }, 2000); return true;
  }
};
