var fs = require("fs");
var s = fs.readFileSync("public/js/components.js", "utf8");
var Q = '"';

var startMarker = 'reports.map(function(r) {';
var startIdx = s.indexOf(startMarker);
if (startIdx === -1) { console.log("NOT FOUND"); process.exit(1); }

var nextMarker = s.indexOf("_renderReportList(reports, status)", startIdx);
if (nextMarker === -1) { console.log("NEXT NOT FOUND"); process.exit(1); }

// Build simple report card with action buttons
var lines = [];
lines.push('reports.map(function(r) {');
lines.push('  var actions = "";');
lines.push('  if (r.status === ' + Q + 'pending' + Q + ') {');
lines.push('    actions += ' + Q + '<button class="btn btn-sm btn-primary resolve-report" data-id="' + Q + ' + r.id + ' + Q + '">✅ 处理</button>' + Q + ';');
lines.push('    actions += ' + Q + '<button class="btn btn-sm btn-outline dismiss-report" data-id="' + Q + ' + r.id + ' + Q + '" style="color:var(--error);">❌ 驳回</button>' + Q + ';');
lines.push('    if (r.target_type === ' + Q + 'post' + Q + ') {');
lines.push('      actions += ' + Q + '<button class="btn btn-sm btn-outline lock-target-btn" data-target-id="' + Q + ' + r.target_id + ' + Q + '" style="color:var(--warning);">🔒 锁定帖子</button>' + Q + ';');
lines.push('      actions += ' + Q + '<button class="btn btn-sm btn-outline delete-target-btn" data-target-id="' + Q + ' + r.target_id + ' + Q + '" style="color:var(--error);">🗑 删除帖子</button>' + Q + ';');
lines.push('    } else if (r.target_type === ' + Q + 'user' + Q + ') {');
lines.push('      actions += ' + Q + '<button class="btn btn-sm btn-outline ban-target-btn" data-target-id="' + Q + ' + r.target_id + ' + Q + '" style="color:var(--error);">🔇 禁言用户</button>' + Q + ';');
lines.push('    }');
lines.push('  } else {');
lines.push('    actions = ' + Q + '<span style="font-size:12px;color:var(--text-light);">' + Q + ' + (r.status === ' + Q + 'resolved' + Q + ' ? ' + Q + '✅ 已处理' + Q + ' : ' + Q + '❌ 已驳回' + Q + ') + ' + Q + '</span>' + Q + ';');
lines.push('  }');
lines.push('  return ' + Q + '<div class="shop-item">' + Q + ' +');
lines.push('    ' + Q + '<div class="shop-item-info">' + Q + ' +');
lines.push('    ' + Q + '<div class="shop-item-name">举报 ' + Q + ' + (r.target_type === ' + Q + 'post' + Q + ' ? ' + Q + '帖子' + Q + ' : ' + Q + '用户' + Q + ') + ' + Q + ': ' + Q + ' + escapeHtml(r.target_name || ' + Q + '#' + Q + ' + r.target_id) + ' + Q + '</div>' + Q + ' +');
lines.push('    ' + Q + '<div class="shop-item-desc">举报人: ' + Q + ' + escapeHtml(r.reporter_name) + ' + Q + ' · 原因: ' + Q + ' + escapeHtml(r.reason) + ' + Q + '</div>' + Q + ' +');
lines.push('    ' + Q + '<div class="shop-item-meta">' + Q + ' + formatDate(r.created_at) + ' + Q + '</div></div>' + Q + ' +');
lines.push('    ' + Q + '<div style="display:flex;gap:4px;flex-wrap:wrap;">' + Q + ' + actions + ' + Q + '</div>' + Q + ' +');
lines.push('    ' + Q + '</div>' + Q + ';');
lines.push('}).join(' + Q + Q + '),');

var simpleMap = lines.join("\n");
s = s.slice(0, startIdx) + simpleMap + s.slice(nextMarker);

// Add handlers
var handlersEnd = s.indexOf("_renderReportList(reports, status)");
if (handlersEnd === -1) { process.exit(1); }

var h = [];
h.push("");
h.push('      document.querySelectorAll(".lock-target-btn").forEach(function(btn) {');
h.push('        btn.addEventListener("click", async function() {');
h.push('          if (!(await showConfirm("确定锁定此帖子？"))) return;');
h.push('          try { await API.lockPost(parseInt(btn.dataset.targetId), true); showToast("帖子已锁定", "success"); }');
h.push('          catch(err) { showToast(err.message, "error"); }');
h.push('        });');
h.push('      });');
h.push('');
h.push('      document.querySelectorAll(".delete-target-btn").forEach(function(btn) {');
h.push('        btn.addEventListener("click", async function() {');
h.push('          if (!(await showConfirm("确定删除此帖子？此操作不可撤销。"))) return;');
h.push('          try { await API.deletePost(parseInt(btn.dataset.targetId)); showToast("帖子已删除", "success"); self.renderAdminReports(); }');
h.push('          catch(err) { showToast(err.message, "error"); }');
h.push('        });');
h.push('      });');
h.push('');
h.push('      document.querySelectorAll(".ban-target-btn").forEach(function(btn) {');
h.push('        btn.addEventListener("click", async function() {');
h.push('          if (!(await showConfirm("确定禁言此用户？"))) return;');
h.push('          var hours = await showPrompt("禁言时长（小时，留空为永久）：", "", "例如 24");');
h.push('          if (hours === null) return;');
h.push('          try { await API.adminBanUser(parseInt(btn.dataset.targetId), true, hours ? parseInt(hours) : null, "举报违规"); showToast("用户已禁言", "success"); self.renderAdminReports(); }');
h.push('          catch(err) { showToast(err.message, "error"); }');
h.push('        });');
h.push('      });');

s = s.slice(0, handlersEnd) + h.join("\n") + "\n\n" + s.slice(handlersEnd);
fs.writeFileSync("public/js/components.js", s, "utf8");
console.log("DONE");
