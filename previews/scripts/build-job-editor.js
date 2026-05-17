// Build job location panel for postEditor.js
var fs = require('fs');
var js = fs.readFileSync('F:/code/portfolio/public/js/components/postEditor.js', 'utf8');

// Add location config after the tags sidebar card in _renderEditor
var afterTags = "self._editorTags.join(',')";
// Find the sidebar section - the tag input is there
var sidebarTagEnd = "'<div class=\"edit-sidebar-card\"><h4>🏷️ 标签</h4><div class=\"tag-input-wrap\"...'";
// Actually, let's find where the sidebar is built
var sidebarStart = "'<div class=\"edit-sidebar-card\"' + catGroupStyle + '\"><h4>\uD83D\uDCC2 分类</h4>";
var locationPanel = "'<div class=\"edit-sidebar-card\"><h4>\uD83D\uDCCD 位置与薪资</h4>' + " +
  "'<div style=\"display:flex;gap:6px;margin-bottom:8px;\">' + " +
  "'<select id=\"editor-job-type\" style=\"flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;outline:none;\">' + " +
  "'<option value=\"\">工作方式</option><option value=\"office\">\uD83C\uDFE2 坐班</option><option value=\"remote\">\uD83C\uDFE0 远程</option><option value=\"hybrid\">\uD83D\uDD04 混合</option></select>' + " +
  "'<select id=\"editor-job-worktype\" style=\"flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;outline:none;\">' + " +
  "'<option value=\"\">工作性质</option><option value=\"fulltime\">全职</option><option value=\"parttime\">兼职</option><option value=\"intern\">实习</option><option value=\"project\">项目</option></select></div>' + " +
  "'<div style=\"display:flex;gap:6px;margin-bottom:8px;\">' + " +
  "'<input id=\"editor-job-city\" class=\"form-input\" type=\"text\" placeholder=\"城市\" value=\"' + escapeHtml(post && post.job_location_city ? post.job_location_city : '') + '\" style=\"flex:1;\">' + " +
  "'<input id=\"editor-job-detail\" class=\"form-input\" type=\"text\" placeholder=\"详细地址（可选）\" value=\"' + escapeHtml(post && post.job_location_detail ? post.job_location_detail : '') + '\" style=\"flex:1.5;\"></div>' + " +
  "'<div style=\"display:flex;gap:6px;align-items:center;\">' + " +
  "'<input id=\"editor-job-salary-min\" class=\"form-input\" type=\"number\" placeholder=\"薪资下限\" value=\"' + (post && post.job_salary_min ? post.job_salary_min : '') + '\" style=\"flex:1;\">' + " +
  "'<span style=\"color:var(--text-muted);font-size:12px;\">-</span>' + " +
  "'<input id=\"editor-job-salary-max\" class=\"form-input\" type=\"number\" placeholder=\"薪资上限\" value=\"' + (post && post.job_salary_max ? post.job_salary_max : '') + '\" style=\"flex:1;\">' + " +
  "'<span style=\"color:var(--text-muted);font-size:12px;\">元/月</span></div></div>' +";
js = js.replace(sidebarStart, locationPanel + sidebarStart);

// Collect job fields on save - add before the blocks.map
var beforeBlocks = "var blocks = self.editorBlocks.map(function(b) {";
var collectJob = "var jobType = document.getElementById('editor-job-type'); var jobWorkType = document.getElementById('editor-job-worktype'); " +
  "var jobCity = document.getElementById('editor-job-city'); var jobDetail = document.getElementById('editor-job-detail'); " +
  "var jobSalMin = document.getElementById('editor-job-salary-min'); var jobSalMax = document.getElementById('editor-job-salary-max'); " +
  "if (jobType) data.job_location_type = jobType.value || null; " +
  "if (jobWorkType) data.job_type = jobWorkType.value || null; " +
  "if (jobCity) data.job_location_city = jobCity.value.trim() || null; " +
  "if (jobDetail) data.job_location_detail = jobDetail.value.trim() || null; " +
  "if (jobSalMin) data.job_salary_min = jobSalMin.value || null; " +
  "if (jobSalMax) data.job_salary_max = jobSalMax.value || null; ";
js = js.replace(beforeBlocks, collectJob + beforeBlocks);

fs.writeFileSync('F:/code/portfolio/public/js/components/postEditor.js', js);
console.log('postEditor.js updated with job location panel');
