var fs = require("fs");
var s = fs.readFileSync("public/js/components.js", "utf8");

// Find the report card HTML section (currently broken, find by unique marker)
var startMarker = 'reports.map(function(r) {';
var startIdx = s.indexOf(startMarker);
if (startIdx === -1) { console.log("NOT FOUND"); process.exit(1); }

// Find end of current broken block
var origBlock = s.slice(startIdx, startIdx + 200);

// Find the next "// Lock target post" or "_renderReportList" marker
var nextMarker = s.indexOf("_renderReportList(reports, status)", startIdx);
if (nextMarker === -1) { console.log("NEXT NOT FOUND"); process.exit(1); }

// Restore original simple version between start and nextMarker
var simpleMap = [
  'reports.map(function(r) {',
  '  var actions = "";',
  '  var cls = "btn btn-sm ";',
  '  if (r.status === "pending") {',
  '    actions += "<button class=\\"btn btn-sm btn-primary resolve-report\\" data-id=\\"" + r.id + "\\">✅ 处理</button>";',
  '    actions += "<button class=\\"btn btn-sm btn-outline dismiss-report\\" data-id=\\"" + r.id + "\\" style=\\"color:var(--error);\\">❌ 驳回</button>";',
  '    if (r.target_type === "post") {',
  '      actions += "<button class=\\"btn btn-sm btn-outline lock-target-btn\\" data-target-id=\\"" + r.target_id + "\\" style=\\"color:var(--warning);\\">🔒 锁定</button>";',
  '      actions += "<button class=\\"btn btn-sm btn-outline\\" onclick=\\"var p=confirm(\'确定删除此帖子？\');if(p)fetch(\'/api/posts/\'+' + r.target_id + '+\',{method:\'DELETE\',credentials:\'include\'}).then(r=>location.reload())\\" style=\\"color:var(--error);\\">🗑️ 删除</button>";',
  '    } else if (r.target_type === "user") {',
  '      actions += "<button class=\\"btn btn-sm btn-outline ban-target-btn\\" data-target-id=\\"" + r.target_id + "\\" style=\\"color:var(--error);\\">🔇 禁言</button>";',
  '    }',
  '  } else {',
  '    actions = "<span style=\\"font-size:12px;color:var(--text-light);\\">" + (r.status === "resolved" ? "✅ 已处理" : "❌ 已驳回") + "</span>";',
  '  }',
  '  return "<div class=\\"shop-item\\">" +',
  '    "<div class=\\"shop-item-info\\">" +',
  '    "<div class=\\"shop-item-name\\">举报 " + (r.target_type === "post" ? "帖子" : "用户") + ": " + escapeHtml(r.target_name || "#" + r.target_id) + "</div>" +',
  '    "<div class=\\"shop-item-desc\\">举报人: " + escapeHtml(r.reporter_name) + " · 原因: " + escapeHtml(r.reason) + "</div>" +',
  '    "<div class=\\"shop-item-meta\\">" + formatDate(r.created_at) + "</div></div>" +',
  '    "<div style=\\"display:flex;gap:4px;flex-wrap:wrap;\\">" + actions + "</div>" +',
  '    "</div>";',
  '}).join(""),',
].join("\n");

s = s.slice(0, startIdx) + simpleMap + s.slice(nextMarker);

// Now add handler code for the new buttons before _renderReportList
var handlersEnd = s.indexOf("_renderReportList(reports, status)");
if (handlersEnd === -1) { process.exit(1); }

var handlerCode = [
  "",
  "      // Lock target post",
  '      document.querySelectorAll(".lock-target-btn").forEach(function(btn) {',
  '        btn.addEventListener("click", async function() {',
  '          if (!(await showConfirm("确定锁定此帖子？"))) return;',
  "          try {",
  '            await API.lockPost(parseInt(btn.dataset.targetId), true);',
  '            showToast("帖子已锁定", "success");',
  '          } catch(err) { showToast(err.message, "error"); }',
  "        });",
  "      });",
  "",
  "      // Ban target user",
  '      document.querySelectorAll(".ban-target-btn").forEach(function(btn) {',
  '        btn.addEventListener("click", async function() {',
  '          if (!(await showConfirm("确定禁言此用户？"))) return;',
  '          var hours = await showPrompt("禁言时长（小时，留空为永久）：", "", "例如 24");',
  '          if (hours === null) return;',
  "          try {",
  '            await API.adminBanUser(parseInt(btn.dataset.targetId), true, hours ? parseInt(hours) : null, "举报违规");',
  '            showToast("用户已禁言", "success");',
  '            self.renderAdminReports();',
  '          } catch(err) { showToast(err.message, "error"); }',
  "        });",
  "      });",
  "",
].join("\n");

s = s.slice(0, handlersEnd) + handlerCode + s.slice(handlersEnd);
fs.writeFileSync("public/js/components.js", s, "utf8");
console.log("DONE");
