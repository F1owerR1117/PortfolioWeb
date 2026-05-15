var fs = require("fs");
var s = fs.readFileSync("public/js/components.js", "utf8");

// Find social section end and add playlist section + click handler
var socialEnd = s.indexOf("` : ''}\n\n            ${isOwn");
if (socialEnd === -1) { socialEnd = s.indexOf("` : ''}\n\n            ${isOwn ?"); }
if (socialEnd === -1) { socialEnd = s.indexOf("` : ''}\n"); if (socialEnd === -1) { console.log("SOCIAL END NOT FOUND"); process.exit(1); }}
socialEnd = socialEnd + 8; // after ` : ''}

var plHTML = [
  "",
  "            ${publicPlaylists.length > 0 ? `",
  '              <h3 class="about-section-title" style="margin-top:24px;">🎵 公开歌单</h3>',
  '              <div class="music-playlist-grid" id="public-playlist-grid" style="margin-top:8px;">',
  "                ${publicPlaylists.map(function(pl) {",
  "                  return '<div class=\"music-playlist-card\" data-pid=\"' + pl.id + '\">' +",
  "                    '<div class=\"music-playlist-card-cover\"><span class=\"music-playlist-card-cover-icon\">📋</span></div>' +",
  "                    '<div class=\"music-playlist-card-body\">' +",
  "                    '<div class=\"music-playlist-name\">' + escapeHtml(pl.name) + '</div>' +",
  "                    '<div class=\"music-playlist-count\">' +",
  "                    '<span class=\"music-playlist-count-badge\">' + (pl.song_count || 0) + ' 首</span>' +",
  "                    '<span style=\"font-size:11px;color:var(--text-light);margin-left:8px;\">👁️ ' + (pl.view_count || 0) + '</span>' +",
  "                    '<span style=\"font-size:11px;color:var(--text-light);margin-left:4px;\">💾 ' + (pl.collection_count || 0) + '</span>' +",
  "                    '</div></div></div>';",
  "                }).join('')}`,
  "            </div>",
  "            ` : ''}",
].join("\n");

s = s.slice(0, socialEnd) + plHTML + s.slice(socialEnd);

// Add click handlers after the profile content is rendered
// Find the admin ban button handler and add playlist click handler after it
var banBtnEnd = s.indexOf("});\n            }\n          }\n\n          // Check and render friend button");
if (banBtnEnd === -1) { console.log("BAN BTN END NOT FOUND, skipping handler add"); }
else {
  var handler = [
    "",
    "          // Public playlist click to view",
    '          document.querySelectorAll("#public-playlist-grid .music-playlist-card").forEach(function(card) {',
    "            card.addEventListener(\"click\", function() {",
    "              var pid = parseInt(this.dataset.pid);",
    "              if (pid) Router.navigate(\"#/music/playlist/\" + pid);",
    "            });",
    "          });",
  ].join("\n");
  s = s.slice(0, banBtnEnd) + handler + s.slice(banBtnEnd);
}

fs.writeFileSync("public/js/components.js", s, "utf8");
console.log("DONE");
