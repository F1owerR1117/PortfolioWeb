// Fix remaining job zone issues
var fs = require('fs');

// 1. postList.js: add job stats fetch
var pl = fs.readFileSync('F:/code/portfolio/public/js/components/postList.js', 'utf8');
var marker = "document.getElementById('load-more-btn').addEventListener('click'";
var statsCode = "if (isJob) {\n      API.getJobStats().then(function(d) {\n        var s = d.salary || {}; var cities = d.cities || []; var skills = d.skills || [];\n        var sidebar = document.getElementById('post-container');\n        if (sidebar) {\n          sidebar.insertAdjacentHTML('beforebegin', '<div class=\"job-stats-bar\" style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:16px;padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;\">' +\n            '<div style=\"text-align:center;\"><div style=\"font-size:18px;font-weight:700;color:var(--primary);\">' + (s.total_jobs || 0) + '</div><div style=\"font-size:11px;color:var(--text-secondary);\">\uD83D\uDCBC 招聘职位</div></div>' +\n            (s.avg_salary_min ? '<div style=\"text-align:center;\"><div style=\"font-size:18px;font-weight:700;\">' + Math.round(s.avg_salary_min/1000) + 'K-'+ Math.round(s.avg_salary_max/1000) + 'K</div><div style=\"font-size:11px;color:var(--text-secondary);\">\uD83D\uDCB0 平均薪资</div></div>' : '') +\n            (cities[0] ? '<div style=\"text-align:center;\"><div style=\"font-size:18px;font-weight:700;\">' + escapeHtml(cities[0].city) + '</div><div style=\"font-size:11px;color:var(--text-secondary);\">\uD83D\uDCCC 最热门城市</div></div>' : '') +\n            (skills[0] ? '<div style=\"text-align:center;\"><div style=\"font-size:18px;font-weight:700;color:var(--primary);\">' + escapeHtml(skills[0].name) + '</div><div style=\"font-size:11px;color:var(--text-secondary);\">\uD83C\uDF1F 最热门技能</div></div>' : '') +\n            '</div>');\n        }\n      }).catch(function(){});\n    }\n    ";
if (pl.indexOf(statsCode) === -1) {
  pl = pl.replace(marker, statsCode + marker);
  fs.writeFileSync('F:/code/portfolio/public/js/components/postList.js', pl);
  console.log('1. postList.js: stats code added');
} else {
  console.log('1. postList.js: stats already present');
}

// 2. profile.js: fix reputation text in approved card
var pf = fs.readFileSync('F:/code/portfolio/public/js/components/profile.js', 'utf8');
var oldText = '✅ 已通过审核，发布招聘/求职帖已开启';
var newText = "'\u2705 \u5DF2\u901A\u8FC7\u5BA1\u6838' + (p.job_rating ? ' \u00B7 \u2B50 ' + p.job_rating + ' \u4FE1\u8A89' : '') + (p.job_completed ? ' \u00B7 \u2705 ' + p.job_completed + ' \u6B21\u5B8C\u6210' : '')";
if (pf.indexOf(newText) === -1 && pf.indexOf(oldText) >= 0) {
  pf = pf.replace(oldText, newText);
  fs.writeFileSync('F:/code/portfolio/public/js/components/profile.js', pf);
  console.log('2. profile.js: reputation text added');
} else {
  console.log('2. profile.js: reputation already present or old text not found');
}

// 3. postEditor.js: check job category fix
var ed = fs.readFileSync('F:/code/portfolio/public/js/components/postEditor.js', 'utf8');
if (ed.indexOf("category === 'job' ? 'job'") === -1) {
  ed = ed.replace("category === 'chat' ? 'chat' : 'work'", "category === 'chat' ? 'chat' : category === 'job' ? 'job' : 'work'");
  fs.writeFileSync('F:/code/portfolio/public/js/components/postEditor.js', ed);
  console.log('3. postEditor.js: job category fix applied');
}
if (ed.indexOf('\u6C42\u804C\u62DB\u8058') === -1) {
  ed = ed.replace("</option><option value=\"chat\"", "</option><option value=\"job\">\uD83D\uDCBC \u6C42\u804C\u62DB\u8058</option><option value=\"chat\"");
  fs.writeFileSync('F:/code/portfolio/public/js/components/postEditor.js', ed);
  console.log('3. postEditor.js: job option added');
}

console.log('Done');
