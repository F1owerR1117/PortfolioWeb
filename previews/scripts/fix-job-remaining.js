// Fix remaining job zone issues
var fs = require('fs');

// 1. postEditor.js: only show location panel for job category
var ed = fs.readFileSync('F:/code/portfolio/public/js/components/postEditor.js', 'utf8');
// The location panel was inserted unconditionally. Wrap it with category check.
// Find the locationPanel + catGroupStyle pattern
ed = ed.replace(
  "'<div class=\"edit-sidebar-card\"><h4>\uD83D\uDCCD 位置与薪资</h4>' + ",
  "(cat === 'job' ? '<div class=\"edit-sidebar-card\"><h4>\uD83D\uDCCD 位置与薪资</h4>' + "
);
ed = ed.replace(
  "'<span style=\"color:var(--text-muted);font-size:12px;\">元/月</span></div></div>' +",
  "'<span style=\"color:var(--text-muted);font-size:12px;\">元/月</span></div></div>' : '') +"
);
fs.writeFileSync('F:/code/portfolio/public/js/components/postEditor.js', ed);
console.log('1. postEditor.js location panel conditional');

// 2. postList.js: add identity prompt banner for job zone non-approved users
var pl = fs.readFileSync('F:/code/portfolio/public/js/components/postList.js', 'utf8');
// Add after the page header: a banner for unapproved users
var afterHeader = "isJob ? '<div class=\"job-filter-bar\"";
var promptBanner = "isJob && App.user && !App.user.job_role_approved ? " +
  "'<div class=\"job-apply-prompt\" style=\"background:var(--bg-active);border:1px solid rgba(163,230,53,.1);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px;\">" +
  "'<span style=\"font-size:18px;\">\uD83D\uDD11</span>" +
  "'<div style=\"flex:1;font-size:12px;color:var(--text-secondary);\">你需要申请招聘者/求职者身份才能发布职位</div>" +
  "'<button class=\"btn btn-primary btn-sm\" id=\"job-apply-btn\" style=\"flex-shrink:0;\">立即申请</button></div>' : '') + " +
  "(isJob ? '<div class=\"job-filter-bar\"";
pl = pl.replace(afterHeader, promptBanner);
fs.writeFileSync('F:/code/portfolio/public/js/components/postList.js', pl);
console.log('2. postList.js identity prompt added');

// 3. profile.js: show job_role badge
var pf = fs.readFileSync('F:/code/portfolio/public/js/components/profile.js', 'utf8');
// Add job role display in my profile view (renderView)
pf = pf.replace(
  "'<div class=\"profile-username\">@' + escapeHtml(p.username) + ' \u00B7 ' + (p.role === 'admin' ? '\u7BA1\u7406\u5458' : '\u7528\u6237') + '</div>'",
  "'<div class=\"profile-username\">@' + escapeHtml(p.username) + ' \u00B7 ' + (p.role === 'admin' ? '\u7BA1\u7406\u5458' : '\u7528\u6237') + (p.job_role === 'employer' ? ' \u00B7 <span class=\"badge\" style=\"background:rgba(245,158,11,.1);color:#f59e0b;font-size:10px;\">\uD83D\uDCBC \u62DB\u8058\u8005</span>' : p.job_role === 'seeker' ? ' \u00B7 <span class=\"badge\" style=\"background:rgba(96,165,250,.1);color:#60a5fa;font-size:10px;\">\uD83D\uDD0D \u6C42\u804C\u8005</span>' : '') + '</div>'"
);
fs.writeFileSync('F:/code/portfolio/public/js/components/profile.js', pf);
console.log('3. profile.js job_role badge added');

// 4. Add job apply button event in postList.js init
pl = fs.readFileSync('F:/code/portfolio/public/js/components/postList.js', 'utf8');
pl = pl.replace(
  "document.getElementById('load-more-btn').addEventListener('click'",
  "document.getElementById('job-apply-btn')?.addEventListener('click', function() { var role = confirm('\u7533\u8BF7\u62DB\u8058\u8005\u8EAB\u4EFD\uFF1F\u70B9\u786E\u5B9A\u4E3A\u62DB\u8058\u8005\uFF0C\u53D6\u6D88\u4E3A\u6C42\u804C\u8005'); API.submitApplication(role ? 'employer' : 'seeker').then(function() { showToast('\u7533\u8BF7\u5DF2\u63D0\u4EA4', 'success'); document.getElementById('job-apply-btn')?.remove(); }).catch(function(err) { showToast(err.message, 'error'); }); });\n    document.getElementById('load-more-btn').addEventListener('click'"
);
fs.writeFileSync('F:/code/portfolio/public/js/components/postList.js', pl);
console.log('4. postList.js apply button event bound');

console.log('All fixes applied');
