// Bookmarks component
var ComponentsBookmarks = {
  renderBookmarks: async function() {
    this.renderLoading();
    try {
      var cols = (await API.getBookmarkCollections()).collections || [];
      var curId = this._currentBookmarkColId;
      var bms = [], pag = {};
      if (curId) {
        var bd = await API.getBookmarks(curId);
        bms = bd.bookmarks || [];
        pag = bd.pagination || {};
      }

      var html = '<div class="page-fade-in"><div class="bm-page">';

      // Header
      html += '<div class="bm-header"><h1>📖 收藏夹</h1></div>';

      // Create collection bar
      html += '<div class="bm-create-bar">' +
        '<input class="form-input" id="new-col-name" type="text" placeholder="新建收藏集名称..." style="max-width:320px;">' +
        '<button class="btn btn-primary" id="create-col-btn">+ 创建</button>' +
        '</div>';

      // Collections
      if (cols.length === 0) {
        html += '<div class="bm-no-cols">暂无收藏集，创建一个吧</div>';
      } else {
        html += '<div class="bm-collections">';
        for (var i = 0; i < cols.length; i++) {
          html += this._renderCollectionCard(cols[i], curId, bms, pag);
        }
        html += '</div>';
      }

      html += '</div></div>';
      document.getElementById('app').innerHTML = html;

      // Bind: create collection
      document.getElementById('create-col-btn').addEventListener('click', async function() {
        var n = document.getElementById('new-col-name').value.trim();
        if (!n) { showToast('请输入名称', 'error'); return; }
        try {
          await API.createBookmarkCollection(n);
          showToast('已创建', 'success');
          Components.renderBookmarks();
        } catch(err) { showToast(err.message, 'error'); }
      });
      // Enter key also creates
      document.getElementById('new-col-name').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('create-col-btn').click();
      });

      // Bind: click collection card (except interactive elements)
      var self = this;
      document.querySelectorAll('.bm-card').forEach(function(card) {
        card.addEventListener('click', function(e) {
          // Don't trigger if clicking interactive child
          if (e.target.closest('.bm-card-action') || e.target.closest('.bm-item-del') || e.target.closest('.bm-item') || e.target.closest('.bm-card-actions') || e.target.closest('.bm-pagination') || e.target.closest('.bm-batch-bar') || e.target.closest('.bm-select-cb')) return;
          var id = parseInt(this.dataset.colId);
          if (id === Components._currentBookmarkColId) {
            // Toggle off
            Components._currentBookmarkColId = null;
          } else {
            Components._currentBookmarkColId = id;
          }
          Components.renderBookmarks();
        });
      });

      // Bind: delete collection
      document.querySelectorAll('.bm-del-col').forEach(function(btn) {
        btn.addEventListener('click', async function(e) {
          e.stopPropagation();
          var id = parseInt(this.dataset.colId);
          if (!(await showConfirm('确定删除此收藏集？'))) return;
          try {
            await API.deleteBookmarkCollection(id);
            if (Components._currentBookmarkColId === id) Components._currentBookmarkColId = null;
            showToast('已删除', 'success');
            Components.renderBookmarks();
          } catch(err) { showToast(err.message, 'error'); }
        });
      });

      // Bind: remove bookmark
      document.querySelectorAll('.bm-item-del').forEach(function(btn) {
        btn.addEventListener('click', async function(e) {
          e.stopPropagation();
          var bmId = parseInt(this.dataset.bmId);
          if (!(await showConfirm('确定删除此收藏？'))) return;
          try {
            await API.deleteBookmark(bmId);
            showToast('已取消收藏', 'success');
            Components.renderBookmarks();
          } catch(err) { showToast(err.message, 'error'); }
        });
      });

      // Bind: navigate to post on item row click
      document.querySelectorAll('.bm-item').forEach(function(row) {
        row.addEventListener('click', function(e) {
          if (e.target.closest('.bm-item-del') || e.target.closest('.bm-select-cb')) return;
          var pid = parseInt(this.dataset.pid);
          if (!isNaN(pid)) Router.navigate('#/posts/' + pid);
        });
      });

      // Bind: pagination
      document.querySelectorAll('[data-bm-page]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (this.disabled) return;
          var dir = this.dataset.bmPage;
          var cur = Components._bmPage || 1;
          var next = dir === 'prev' ? cur - 1 : cur + 1;
          if (next < 1) return;
          Components._bmPage = next;
          Components.renderBookmarks();
        });
      });

      // Bind: batch delete
      var batchBar = document.getElementById('bm-batch-bar');
      if (batchBar) {
        document.getElementById('select-all-bookmarks').addEventListener('change', function() {
          var checked = this.checked;
          document.querySelectorAll('.bookmark-select-checkbox').forEach(function(cb) { cb.checked = checked; });
          self._updateBmDelBtn();
        });
        document.querySelectorAll('.bookmark-select-checkbox').forEach(function(cb) {
          cb.addEventListener('change', self._updateBmDelBtn);
        });
        document.getElementById('delete-selected-bookmarks-btn').addEventListener('click', async function() {
          var sel = [];
          document.querySelectorAll('.bookmark-select-checkbox:checked').forEach(function(cb) { sel.push(parseInt(cb.dataset.bmId)); });
          if (sel.length === 0) return;
          if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 个收藏？'))) return;
          var btn = this; btn.disabled = true; btn.textContent = '删除中...';
          try {
            await API.batchDeleteBookmarks(sel);
            showToast('已删除 ' + sel.length + ' 个收藏', 'success');
            Components.renderBookmarks();
          } catch(err) { showToast(err.message, 'error'); }
          btn.disabled = false; btn.textContent = '🗑️ 删除选中';
        });
      }

    } catch (err) {
      showToast(err.message, 'error');
      Router.navigate('#/works');
    }
  },

  _renderCollectionCard: function(col, curId, bms, pag) {
    var isActive = col.id === curId;
    var count = col.count || 0;
    var previewCount = Math.min(count, 3);
    var p = '';

    if (!isActive) {
      // Preview thumbnails
      p = '<div class="bm-preview">';
      for (var i = 0; i < previewCount; i++) {
        p += '<span class="bm-preview-item">' + this._getPreviewEmoji(i) + '</span>';
      }
      if (count > 3) {
        p += '<span class="bm-preview-item more">+' + (count - 3) + '</span>';
      }
      p += '</div>';
    }

    // Card actions
    var actions = '<div class="bm-card-actions">' +
      '<button class="bm-card-action bm-del-col" data-col-id="' + col.id + '" title="删除收藏集">🗑</button>' +
      '</div>';

    // Name
    var name = escapeHtml(col.name);
    var desc = col.description ? escapeHtml(col.description) : (count > 0 ? '共 ' + count + ' 个项目' : '暂无项目');

    // Card body
    var html = '<div class="bm-card' + (isActive ? ' active' : '') + '" data-col-id="' + col.id + '">' +
      '<div class="bm-card-header">' +
      '<span class="bm-card-name">📂 ' + name + '</span>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<span class="bm-card-count">' + count + ' 个项目</span>' +
      actions +
      '</div></div>' +
      '<div class="bm-card-desc">' + desc + '</div>';

    if (!isActive) {
      html += p;
    }

    // Items list (only for active card)
    if (isActive) {
      if (bms.length === 0) {
        html += '<div class="bm-empty"><div class="bm-empty-icon">📭</div><div class="bm-empty-text">暂无收藏的帖子</div></div>';
      } else {
        // Batch bar
        html += '<div class="bm-batch-bar" id="bm-batch-bar">' +
          '<label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-bookmarks" class="bm-select-cb"> 全选</label>' +
          '<button class="btn btn-sm btn-danger" id="delete-selected-bookmarks-btn" disabled>🗑️ 删除选中 (<span id="selected-bookmarks-count">0</span>)</button>' +
          '</div>';

        // Items list
        html += '<div class="bm-items">';
        for (var i = 0; i < bms.length; i++) {
          var b = bms[i];
          var title = escapeHtml(b.post_title || '无标题');
          var author = escapeHtml(b.author || '');
          var dateStr = formatDate(b.created_at);
          var itemEmoji = this._getItemEmoji(b.post_title || '');
          html += '<div class="bm-item" data-pid="' + b.post_id + '">' +
            '<label class="post-select-wrap" style="display:flex;align-items:center;flex-shrink:0;" onclick="event.stopPropagation();">' +
            '<input type="checkbox" class="bookmark-select-checkbox bm-select-cb" data-bm-id="' + b.id + '">' +
            '</label>' +
            '<span class="bm-item-icon">' + itemEmoji + '</span>' +
            '<div class="bm-item-info">' +
            '<div class="bm-item-title">' + title + '</div>' +
            '<div class="bm-item-meta">' + author + (author && dateStr ? ' · ' : '') + dateStr + '</div>' +
            '</div>' +
            '<button class="bm-item-del" data-bm-id="' + b.id + '">×</button>' +
            '</div>';
        }
        html += '</div>';

        // Pagination
        if (pag.totalPages > 1) {
          html += '<div class="bm-pagination">' +
            '<button class="page-btn" data-bm-page="prev"' + (pag.page <= 1 ? ' disabled' : '') + '>← 上一页</button>' +
            '<span class="page-info">' + pag.page + ' / ' + pag.totalPages + '</span>' +
            '<button class="page-btn" data-bm-page="next"' + (pag.page >= pag.totalPages ? ' disabled' : '') + '>下一页 →</button>' +
            '</div>';
        }
      }
    }

    html += '</div>';
    return html;
  },

  _getPreviewEmoji: function(index) {
    var emojis = ['📄', '📝', '🎨', '⚛️', '🗄️', '📊', '📱', '🔧'];
    return emojis[index % emojis.length];
  },

  _getItemEmoji: function(title) {
    if (!title) return '📄';
    var lower = title.toLowerCase();
    if (lower.indexOf('设计') !== -1 || lower.indexOf('ui') !== -1 || lower.indexOf('ux') !== -1) return '🎨';
    if (lower.indexOf('react') !== -1 || lower.indexOf('组件') !== -1 || lower.indexOf('前端') !== -1) return '⚛️';
    if (lower.indexOf('数据') !== -1 || lower.indexOf('仪表盘') !== -1 || lower.indexOf('d3') !== -1) return '📊';
    if (lower.indexOf('node') !== -1 || lower.indexOf('后端') !== -1 || lower.indexOf('架构') !== -1) return '🗄️';
    if (lower.indexOf('移动') !== -1 || lower.indexOf('适配') !== -1) return '📱';
    if (lower.indexOf('品牌') !== -1 || lower.indexOf('视觉') !== -1) return '🎨';
    return '📄';
  },

  _updateBmDelBtn: function() {
    var c = document.querySelectorAll('.bookmark-select-checkbox:checked').length;
    var btn = document.getElementById('delete-selected-bookmarks-btn');
    var cnt = document.getElementById('selected-bookmarks-count');
    if (btn && cnt) { btn.disabled = c === 0; cnt.textContent = c; }
  }
};
