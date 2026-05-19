// admin-tags.js — extracted from admin.js
var ComponentsAdminTags = {
  renderTagManager: async function() { this._tagCategory = 'all'; this.renderLoading(); try { await this._renderTagList(); } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },
  _renderTagList: async function() {
    var app = document.getElementById('app'), isAdmin = App.user && App.user.role === 'admin';
    // Fetch tags per category for accurate counts
    var allTags = (await API.getTags('')).tags || [];
    var workTags = (await API.getTags('work')).tags || [];
    var chatTags = (await API.getTags('chat')).tags || [];
    var jobTags = (await API.getTags('job')).tags || [];
    var totalCount = allTags.length;
    var workCount = workTags.length;
    var chatCount = chatTags.length;
    var jobCount = jobTags.length;

    // Build filtered list based on active tab
    var self = this;
    var rawTags;
    if (this._tagCategory === 'all') rawTags = allTags;
    else if (this._tagCategory === 'work') rawTags = workTags;
    else if (this._tagCategory === 'chat') rawTags = chatTags;
    else if (this._tagCategory === 'job') rawTags = jobTags;
    else rawTags = allTags;

    function heatClass(count) { return count >= 10 ? 'hot' : count >= 5 ? 'warm' : 'cool'; }

    app.innerHTML = '<div class="page-fade-in"><div class="admin-page">' + Components._renderAdminNav('tags') +
      '<div style="display:grid;grid-template-columns:1fr 240px;gap:20px;align-items:start;"><div class="admin-card" style="margin:0;"><div class="admin-card-title">🏷️ 标签管理 <span style="font-size:12px;color:var(--text-secondary);font-weight:400;">共 ' + totalCount + ' 个</span></div>' +
      '<div class="tag-group-tabs"><button class="tag-group-tab ' + (this._tagCategory === 'all' ? 'active' : '') + '" data-tag-cat="all">📋 全部 · ' + totalCount + '</button><button class="tag-group-tab ' + (this._tagCategory === 'work' ? 'active' : '') + '" data-tag-cat="work">📂 作品区 · ' + workCount + '</button><button class="tag-group-tab ' + (this._tagCategory === 'chat' ? 'active' : '') + '" data-tag-cat="chat">💬 聊天区 · ' + chatCount + '</button><button class="tag-group-tab ' + (this._tagCategory === 'job' ? 'active' : '') + '" data-tag-cat="job">💼 求职招聘 · ' + jobCount + '</button></div>' +
      '<div style="position:relative;margin-bottom:14px;"><input class="search-input" id="tag-search" type="text" placeholder="搜索标签..." style="padding:9px 14px 9px 36px;"><span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:14px;opacity:.3;">🔍</span></div>' +
      '<div class="tag-list-wrap" id="tag-list">' + rawTags.map(function(t, i) {
        var hc = heatClass(t.count || 0);
        var cat, catLabel;
        if (self._tagCategory === 'job') { cat = 'job'; catLabel = '💼 求职招聘'; }
        else if (self._tagCategory === 'chat') { cat = 'chat'; catLabel = '💬 聊天区'; }
        else if (self._tagCategory === 'work') { cat = 'work'; catLabel = '📂 作品区'; }
        else { cat = 'all'; catLabel = ''; }
        return '<div class="tag-row" data-id="' + t.id + '" data-name="' + t.name + '"><div class="heat-bar ' + hc + '"></div><div class="tag-info"><div class="tag-name">' + escapeHtml(t.name) + '</div><div class="tag-count">' + (t.count || 0) + ' 帖</div></div>' + (catLabel ? '<span class="tag-cat-badge ' + cat + '">' + catLabel + '</span>' : '') + (isAdmin ? '<div class="tag-actions"><button class="tag-delete-btn" data-id="' + t.id + '" data-name="' + t.name + '" title="删除">🗑</button></div>' : '') + '</div>';
      }).join('') + '</div>' +
      '</div><div class="tag-sidebar"><div class="tag-sidebar-card"><h4>📊 标签统计</h4><div style="font-size:12px;color:var(--text-secondary);"><div style="display:flex;justify-content:space-between;padding:4px 0;">总标签 <span style="color:var(--text);font-weight:600;">' + totalCount + '</span></div><div style="display:flex;justify-content:space-between;padding:4px 0;">作品区 <span style="color:var(--primary);font-weight:600;">' + workCount + '</span></div><div style="display:flex;justify-content:space-between;padding:4px 0;">聊天区 <span style="color:#60a5fa;font-weight:600;">' + chatCount + '</span></div><div style="display:flex;justify-content:space-between;padding:4px 0;">求职招聘 <span style="color:#f59e0b;font-weight:600;">' + jobCount + '</span></div></div></div>' +
      '<div class="tag-sidebar-card"><h4>🔥 热度</h4><div style="display:flex;flex-direction:column;gap:4px;"><div style="display:flex;gap:6px;align-items:center;"><div style="width:8px;height:8px;border-radius:2px;background:var(--primary);"></div><span style="font-size:11px;color:var(--text-muted);">热 ≥10 帖</span></div><div style="display:flex;gap:6px;align-items:center;"><div style="width:8px;height:8px;border-radius:2px;background:#f59e0b;"></div><span style="font-size:11px;color:var(--text-muted);">中 5-9 帖</span></div><div style="display:flex;gap:6px;align-items:center;"><div style="width:8px;height:8px;border-radius:2px;background:#60a5fa;"></div><span style="font-size:11px;color:var(--text-muted);">冷 &lt;5 帖</span></div></div></div>' +
      '<div class="tag-sidebar-card"><h4>✚ 添加标签</h4><div style="display:flex;gap:6px;"><input id="new-tag-input" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;outline:none;" placeholder="标签名..."><button id="add-tag-btn" style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#a3e635,#65a30d);color:#0a0a0f;font-size:12px;font-weight:600;cursor:pointer;">添加</button></div></div></div></div></div>';
    var self = this;
    Components._bindAdminNav();
    document.querySelectorAll('.tag-group-tab').forEach(function(b) { b.addEventListener('click', function() { playClickSound(); self._tagCategory = this.dataset.tagCat; self._renderTagList(); }); });
    document.getElementById('add-tag-btn').addEventListener('click', async function() { var n = document.getElementById('new-tag-input').value.trim(); if (!n) { showToast('请输入标签名', 'error'); return; } try { await API.createTag(n); showToast('已添加', 'success'); self._renderTagList(); } catch (err) { showToast(err.message, 'error'); } });
    document.getElementById('new-tag-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('add-tag-btn').click(); });
    if (isAdmin) {
      document.querySelectorAll('.tag-delete-btn').forEach(function(b) { b.addEventListener('click', async function() { if (!(await showConfirm('确定删除标签「' + this.dataset.name + '」？'))) return; try { await API.deleteTag(parseInt(this.dataset.id)); showToast('已删除', 'success'); self._renderTagList(); } catch (err) { showToast(err.message, 'error'); } }); });
    }
  }
};
