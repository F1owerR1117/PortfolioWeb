// Build job zone additions for postList.js
var fs = require('fs');
var js = fs.readFileSync('F:/code/portfolio/public/js/components/postList.js', 'utf8');

// 1. Add job filter bar HTML
var searchBar = '<div class="search-bar"><input class="search-input" id="post-search"';
var jobBar = "' + (isJob ? '<div class=\"job-filter-bar\" style=\"display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;\">' + " +
  "'<select id=\"job-filter-type\" style=\"padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;\">' + " +
  "'<option value=\"\">\uD83D\uDCBC 全部类型</option><option value=\"fulltime\">全职</option><option value=\"parttime\">兼职</option><option value=\"intern\">实习</option></select>' + " +
  "'<select id=\"job-filter-city\" style=\"padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;\">' + " +
  "'<option value=\"\">\uD83D\uDCCC 所有城市</option><option>北京</option><option>上海</option><option>深圳</option><option>杭州</option><option>远程</option></select>' + " +
  "'<select id=\"job-filter-salary\" style=\"padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;\">' + " +
  "'<option value=\"\">\uD83D\uDCB0 薪资不限</option><option value=\"10\">10K+</option><option value=\"20\">20K+</option><option value=\"30\">30K+</option></select></div>' : '') +";
js = js.replace(searchBar, jobBar + searchBar);

// 2. Add filter logic in _applyFilters
var filterEnd = "f.forEach(function(p) { g.appendChild(Components._viewMode === 'grid' ? Components._createPostCard(p) : Components._createPostRow(p)); });";
var jobFilter = "if (Components._currentCategory === 'job') { var jt=document.getElementById('job-filter-type'); var jc=document.getElementById('job-filter-city'); var js2=document.getElementById('job-filter-salary'); if(jt&&jt.value)f=f.filter(function(p){return p.job_type===jt.value;}); if(jc&&jc.value)f=f.filter(function(p){return(p.job_location_city||'').toLowerCase().indexOf(jc.value.toLowerCase())>=0;}); if(js2&&js2.value){var mn=parseInt(js2.value)*1000;f=f.filter(function(p){return parseInt(p.job_salary_min||0)>=mn;});} } " + filterEnd;
js = js.replace(filterEnd, jobFilter);

// 3. Add filter event bindings after sort bar binding
var afterSort = "document.querySelectorAll('.sort-btn').forEach(function(b)";
var filterBind = "document.querySelectorAll('#job-filter-type,#job-filter-city,#job-filter-salary').forEach(function(el){el.addEventListener('change',function(){Components._applyFilters();});}); " + afterSort;
js = js.replace(afterSort, filterBind);

fs.writeFileSync('F:/code/portfolio/public/js/components/postList.js', js);
console.log('postList.js updated');
