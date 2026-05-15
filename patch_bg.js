const fs = require('fs');

// ===== Phase 1: Database =====
let db = fs.readFileSync('db/init.js', 'utf8');

// Add bg_image to CREATE TABLE
db = db.replace(
  "title_icon TEXT DEFAULT ''",
  "title_icon TEXT DEFAULT '',\n    bg_image TEXT DEFAULT ''"
);

// Add migration
db = db.replace(
  'try { db.run("ALTER TABLE level_config ADD COLUMN title_icon TEXT DEFAULT \'\'"); } catch (e) {}',
  'try { db.run("ALTER TABLE level_config ADD COLUMN title_icon TEXT DEFAULT \'\'"); } catch (e) {}\n  try { db.run("ALTER TABLE level_config ADD COLUMN bg_image TEXT DEFAULT \'\'"); } catch (e) {}'
);

// Add bg_image to seed data
db = db.replace(
  "title_icon) VALUES (?, ?, ?, ?, ?)",
  "title_icon, bg_image) VALUES (?, ?, ?, ?, ?, ?)"
);
db = db.replace(
  "z, n, '']);",
  "z, n, '', '']);"
);

fs.writeFileSync('db/init.js', db, 'utf8');
console.log('✅ db/init.js updated');

// ===== Phase 1b: Backend API =====
let levels = fs.readFileSync('routes/levels.js', 'utf8');

// Add bg_image to PUT handler
levels = levels.replace(
  "var title_icon = cfg.title_icon || '';",
  "var title_icon = cfg.title_icon || '';\n      var bg_image = cfg.bg_image || '';"
);
levels = levels.replace(
  "name = ?, title_icon = ?",
  "name = ?, title_icon = ?, bg_image = ?"
);
levels = levels.replace(
  "xp_required, zonesStr, name, title_icon, level]",
  "xp_required, zonesStr, name, title_icon, bg_image, level]"
);
levels = levels.replace(
  "zones, name, title_icon) VALUES (?, ?, ?, ?, ?)",
  "zones, name, title_icon, bg_image) VALUES (?, ?, ?, ?, ?, ?)"
);
levels = levels.replace(
  "xp_required, zonesStr, name, title_icon]",
  "xp_required, zonesStr, name, title_icon, bg_image]"
);

// Update /levels/me to return bg_image
levels = levels.replace(
  "const levelCfg = getFirst('SELECT name, title_icon FROM level_config WHERE level = ?', [user.level || 1]);",
  "const levelCfg = getFirst('SELECT name, title_icon, bg_image FROM level_config WHERE level = ?', [user.level || 1]);"
);
levels = levels.replace(
  "title_icon: levelCfg ? (levelCfg.title_icon || '') : ''",
  "title_icon: levelCfg ? (levelCfg.title_icon || '') : '',\n      bg_image: levelCfg ? (levelCfg.bg_image || '') : ''"
);

fs.writeFileSync('routes/levels.js', levels, 'utf8');
console.log('✅ routes/levels.js updated');

// ===== Phase 2: Frontend Admin UI =====
let comp = fs.readFileSync('public/js/components.js', 'utf8');

// Update config table header
comp = comp.replace(
  '名称</th><th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">头衔图片</th>',
  '名称</th><th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">头衔图片</th><th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">背景图片</th>'
);

// Update row rendering - add bg_image cell with upload button
var oldRowEnd = "'<td style=\"padding:8px;border-bottom:1px solid var(--border);\"><input class=\"form-input\" type=\"text\" id=\"lvl-icon-' + cfg.level + '\" value=\"' + escapeHtml(cfg.title_icon || '') + '\" style=\"width:140px;\" placeholder=\"图片URL\"></td>' +";
var newRowEnd = "'<td style=\"padding:8px;border-bottom:1px solid var(--border);\"><input class=\"form-input\" type=\"text\" id=\"lvl-icon-' + cfg.level + '\" value=\"' + escapeHtml(cfg.title_icon || '') + '\" style=\"width:100px;\" placeholder=\"图片URL\"></td>' +\n" +
  "          '<td style=\"padding:8px;border-bottom:1px solid var(--border);\">' +\n" +
  "            '<div style=\"display:flex;gap:4px;align-items:center;\">' +\n" +
  "            '<input class=\"form-input\" type=\"text\" id=\"lvl-bg-' + cfg.level + '\" value=\"' + escapeHtml(cfg.bg_image || '') + '\" style=\"width:90px;\" placeholder=\"URL\">' +\n" +
  "            '<button class=\"btn btn-sm btn-outline upload-lvl-bg\" data-level=\"' + cfg.level + '\" style=\"font-size:11px;\">📁</button></div></td>' +";

if (comp.includes(oldRowEnd)) {
  comp = comp.replace(oldRowEnd, newRowEnd);
  console.log('✅ Config table rows updated with bg_image');
} else {
  console.log('⚠️ oldRowEnd not found');
}

// Update batch save handler to collect bg_image
var oldBGSave = "var lvlIcon = document.getElementById('lvl-icon-' + level).value;\n" +
  "          var zones = [];";
var newBGSave = "var lvlIcon = document.getElementById('lvl-icon-' + level).value;\n" +
  "          var lvlBg = document.getElementById('lvl-bg-' + level).value;\n" +
  "          var zones = [];";

comp = comp.replace(oldBGSave, newBGSave);

// Update batch save push to include bg_image
var oldBGPush = "allConfigs.push({ level: level, xp_required: xpRequired, zones: JSON.stringify(zones), name: lvlName, title_icon: lvlIcon });";
var newBGPush = "allConfigs.push({ level: level, xp_required: xpRequired, zones: JSON.stringify(zones), name: lvlName, title_icon: lvlIcon, bg_image: lvlBg });";

comp = comp.replace(oldBGPush, newBGPush);

// Add bg upload handlers after the save-all handler
var uploadHandler = "\n" +
  "    // Level bg image upload\n" +
  "    document.querySelectorAll('.upload-lvl-bg').forEach(function(btn) {\n" +
  "      btn.addEventListener('click', function() {\n" +
  "        var level = parseInt(btn.dataset.level);\n" +
  "        var input = document.createElement('input');\n" +
  "        input.type = 'file';\n" +
  "        input.accept = 'image/jpeg,image/png,image/webp';\n" +
  "        input.onchange = async function() {\n" +
  "          var file = input.files[0];\n" +
  "          if (!file) return;\n" +
  "          btn.textContent = '⏳';\n" +
  "          try {\n" +
  "            var result = await API.uploadFile(file);\n" +
  "            document.getElementById('lvl-bg-' + level).value = result.file.url;\n" +
  "            showToast('\u80cc\u666f\u56fe\u4e0a\u4f20\u6210\u529f', 'success');\n" +
  "          } catch(err) { showToast(err.message, 'error'); }\n" +
  "          btn.textContent = '\ud83d\udcc1';\n" +
  "        };\n" +
  "        input.click();\n" +
  "      });\n" +
  "    });\n\n    // Save all configs";

comp = comp.replace("    // Save all configs", uploadHandler);
console.log('✅ bg upload handler added');

fs.writeFileSync('public/js/components.js', comp, 'utf8');
console.log('✅ components.js updated');

// ===== Phase 3: Nav bar level display =====
let app = fs.readFileSync('public/js/app.js', 'utf8');

// Update refreshLevel to handle bg_image
app = app.replace(
  "var lvlBadge = document.getElementById('nav-lvl-badge');\n" +
  "      if (lvlBadge && data.level_name) {\n" +
  "        lvlBadge.innerHTML = (data.title_icon ? '<img src=\"' + data.title_icon + '\" class=\"lvl-icon\"> ' : '') + data.level_name;\n" +
  "      }",
  "var lvlBadge = document.getElementById('nav-lvl-badge');\n" +
  "      if (lvlBadge && data.level_name) {\n" +
  "        lvlBadge.innerHTML = '<span class=\"lvl-badge-bg\" style=\"' + (data.bg_image ? 'background-image:url(\\'' + data.bg_image + '\\')' : '') + '\">Lv.' + data.level + ' ' + data.level_name + '</span>';\n" +
  "      }"
);

// Update initial nav render
app = app.replace(
  '<span class="lvl-badge" id="nav-lvl-badge-init">Lv.',
  '<span class="lvl-badge" id="nav-lvl-badge-init">Lv.'
);

// Keep the original Lv display in updateNav but update it via refreshLevel anyway
// Add the bg style to the initial nav level display
app = app.replace(
  '<span class="lvl-badge" id="nav-lvl-badge-init">Lv.',
  '<span class="lvl-badge" id="nav-lvl-badge-init">Lv.'
);

fs.writeFileSync('public/js/app.js', app, 'utf8');
console.log('✅ app.js updated');

console.log('\n=== All done ===');
