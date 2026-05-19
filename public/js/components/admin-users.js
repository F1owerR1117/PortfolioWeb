// admin-users.js — extracted from admin.js
var ComponentsAdminUsers = {
  renderAdminUsers: async function() {
    this.renderLoading();
    try {
      var page = 1, search = '';
      var render = async function(p, s) {
        var d = await API.getAdminUsers(p, 20, s), users = d.users || [], pag = d.pagination || {};
        document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-page">' +
          Components._renderAdminNav('users') +
          '<div class="admin-card"><div class="admin-card-title">👥 用户管理 <span style="font-size:12px;color:var(--text-secondary);font-weight:400;">共 ' + (pag.total || users.length) + ' 位用户</span></div>' +
          '<div class="search-bar" style="margin-bottom:16px;max-width:400px;display:flex;gap:6px;"><input class="search-input" id="admin-user-search" type="text" placeholder="搜索用户名..." value="' + escapeHtml(s) + '" style="flex:1;"><button class="btn btn-primary btn-sm" id="admin-user-search-btn" style="border-radius:8px;padding:6px 14px;">🔍 搜索</button></div>' +
          (users.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">暂无用户</div></div>' :
          '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>用户</th><th>角色</th><th>求职身份</th><th>等级</th><th>XP</th><th>积分</th><th>状态</th><th>操作</th></tr></thead><tbody>' + users.map(function(u) {
            var avatarHtml = u.avatar_url ? '<img src="' + u.avatar_url + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;cursor:pointer;">' : '<span style="display:inline-flex;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6366f1);color:#fff;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:pointer;">' + escapeHtml((u.nickname || u.username).charAt(0).toUpperCase()) + '</span>';
            var roleBadge = u.role === 'admin' ? '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#e0e7ff;color:#4338ca;">管理员</span>' : '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#f0fdf4;color:#16a34a;">用户</span>';
            var statusBadge = u.is_banned ? '<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#dc2626;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dc2626;"></span>已禁言</span>' : '<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#16a34a;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#16a34a;"></span>正常</span>';
            var canManage = u.username !== 'admin';
            return '<tr style="border-bottom:1px solid var(--border);transition:background 0.15s;"><td style="padding:10px 14px;"><div style="display:flex;align-items:center;gap:10px;"><span class="admin-user-avatar" data-uid="' + u.id + '">' + avatarHtml + '</span><div><div class="admin-user-name" data-uid="' + u.id + '" style="cursor:pointer;color:var(--primary);font-weight:600;font-size:14px;">' + escapeHtml(u.nickname || u.username) + '</div>' + (u.nickname ? '<div style="font-size:11px;color:var(--text-light);">@' + escapeHtml(u.username) + '</div>' : '') + '</div></div></td>' +
              '<td style="padding:10px 14px;">' + roleBadge + '</td>' +
              '<td style="padding:10px 14px;"><select class="form-input admin-edit-job-role" data-uid="' + u.id + '" style="font-size:12px;padding:4px 6px;border-radius:6px;"><option value="">无</option><option value="employer"' + (u.job_role === 'employer' ? ' selected' : '') + '>💼 招聘者</option><option value="seeker"' + (u.job_role === 'seeker' ? ' selected' : '') + '>🔍 求职者</option></select>' + (u.job_role ? '<label style="display:inline-flex;align-items:center;gap:2px;font-size:10px;margin-left:4px;cursor:pointer;"><input type="checkbox" class="admin-edit-job-approved" data-uid="' + u.id + '"' + (u.job_role_approved ? ' checked' : '') + '>已审核</label>' : '') + '</td>' +
              '<td style="padding:10px 14px;"><input class="form-input admin-edit-level" data-uid="' + u.id + '" type="number" value="' + (u.level || 1) + '" style="width:52px;font-size:13px;padding:4px 6px;text-align:center;border-radius:6px;"></td>' +
              '<td style="padding:10px 14px;"><input class="form-input admin-edit-xp" data-uid="' + u.id + '" type="number" value="' + (u.xp || 0) + '" style="width:72px;font-size:13px;padding:4px 6px;text-align:center;border-radius:6px;"></td>' +
              '<td style="padding:10px 14px;"><input class="form-input admin-edit-points" data-uid="' + u.id + '" type="number" value="' + (u.points || 0) + '" style="width:72px;font-size:13px;padding:4px 6px;text-align:center;border-radius:6px;"></td>' +
              '<td style="padding:10px 14px;">' + statusBadge + '</td>' +
              '<td style="padding:10px 14px;"><div style="display:flex;gap:4px;flex-wrap:nowrap;">' +
              (canManage ? '<button class="admin-ban-btn" data-id="' + u.id + '" data-banned="' + u.is_banned + '" style="padding:5px 10px;font-size:12px;border-radius:6px;border:1px solid ' + (u.is_banned ? 'var(--success)' : 'var(--error)') + ';background:transparent;color:' + (u.is_banned ? 'var(--success)' : 'var(--error)') + ';cursor:pointer;white-space:nowrap;">' + (u.is_banned ? '解除禁言' : '禁言') + '</button>' : '') +
              '<button class="admin-save-level-btn" data-uid="' + u.id + '" style="padding:5px 12px;font-size:12px;border-radius:6px;border:none;background:var(--primary);color:#fff;cursor:pointer;white-space:nowrap;">保存</button>' +
              '</div></td></tr>';
          }).join('') + '</tbody></table></div>') +
          (pag.totalPages > 1 ? '<div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:16px 0 4px;"><button class="btn btn-sm btn-outline" data-up="prev"' + (pag.page <= 1 ? ' disabled' : '') + '>← 上一页</button><span style="font-size:13px;color:var(--text-secondary);font-weight:500;">第 ' + pag.page + '/' + pag.totalPages + ' 页</span><button class="btn btn-sm btn-outline" data-up="next"' + (pag.page >= pag.totalPages ? ' disabled' : '') + '>下一页 →</button></div>' : '') +
          '</div></div>';
        Components._bindAdminNav();
        var doSearch = function() { var v = (document.getElementById('admin-user-search').value || '').trim(); page = 1; render(1, v); };
        document.getElementById('admin-user-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });
        document.getElementById('admin-user-search-btn').addEventListener('click', doSearch);
        document.querySelectorAll('[data-up]').forEach(function(b) { b.addEventListener('click', function() { var dir = this.dataset.up; if (dir === 'prev' && pag.page > 1) page = pag.page - 1; else if (dir === 'next' && pag.page < pag.totalPages) page = pag.page + 1; else return; render(page, s); }); });
        document.querySelectorAll('.admin-user-avatar, .admin-user-name').forEach(function(el) { el.addEventListener('click', function() { playClickSound(); Router.navigate('#/users/' + parseInt(this.dataset.uid)); }); });
        document.querySelectorAll('.admin-ban-btn').forEach(function(b) { b.addEventListener('click', async function() { var uid = parseInt(this.dataset.id), banned = this.dataset.banned === 'true'; if (banned) { try { await API.adminBanUser(uid, false); showToast('已解除禁言', 'success'); render(page, s); } catch(err) { showToast(err.message, 'error'); } } else { var reason = await showPrompt('禁言原因（可选）：', '', ''); if (reason === null) return; var duration = await showPrompt('禁言时长（小时，留空=永久）：', '', ''); if (duration === null) return; try { await API.adminBanUser(uid, true, duration ? parseInt(duration) : null, reason || ''); showToast('已禁言', 'success'); render(page, s); } catch(err) { showToast(err.message, 'error'); } } }); });
        document.querySelectorAll('.admin-edit-job-role').forEach(function(sel) {
          sel.addEventListener('change', function() {
            var row = this.closest('tr');
            var approvedLabel = row.querySelector('label');
            var approvedCb = row.querySelector('.admin-edit-job-approved');
            if (this.value) {
              if (!approvedCb) {
                var label = document.createElement('label');
                label.style.cssText = 'display:inline-flex;align-items:center;gap:2px;font-size:10px;margin-left:4px;cursor:pointer;';
                label.innerHTML = '<input type="checkbox" class="admin-edit-job-approved" data-uid="' + this.dataset.uid + '">已审核';
                this.parentNode.appendChild(label);
              }
            }
          });
        });
        document.querySelectorAll('.admin-save-level-btn').forEach(function(b) { b.addEventListener('click', async function() { var uid = parseInt(this.dataset.uid), row = this.closest('tr'); var level = parseInt(row.querySelector('.admin-edit-level').value) || 1; var xp = parseInt(row.querySelector('.admin-edit-xp').value) || 0; var points = parseInt(row.querySelector('.admin-edit-points').value) || 0; var jr = row.querySelector('.admin-edit-job-role'); var ja = row.querySelector('.admin-edit-job-approved'); var data = { level: level, xp: xp, points: points }; if (jr) data.job_role = jr.value || null; if (ja) data.job_role_approved = ja.checked; try { await API.updateUserLevel(uid, data); showToast('已更新', 'success'); render(page, s); } catch(err) { showToast(err.message, 'error'); } }); });
      };
      render(page, search);
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  }
};
