// Ads component — left/right advertisement bars
var ComponentsAds = {
  _ads: { left: [], right: [] },
  _currentIndex: { left: 0, right: 0 },

  async init() {
    if (!App.user) return;
    try {
      var data = await API.getAds();
      this._ads = { left: data.left || [], right: data.right || [] };
      this._currentIndex = { left: 0, right: 0 };
      this._renderAll();
    } catch (e) { /* non-critical */ }
  },

  async refresh() {
    if (!App.user) return;
    try {
      var data = await API.getAds();
      this._ads = { left: data.left || [], right: data.right || [] };
      // Reset index if current is out of bounds
      ['left', 'right'].forEach(function(side) {
        if (ComponentsAds._currentIndex[side] >= ComponentsAds._ads[side].length) {
          ComponentsAds._currentIndex[side] = 0;
        }
      });
      this._renderAll();
    } catch (e) { /* non-critical */ }
  },

  _renderAll: function() {
    this._renderBar('left');
    this._renderBar('right');
    this._bindNavEvents();
  },

  _renderBar: function(side) {
    var ads = this._ads[side] || [];
    var idx = this._currentIndex[side] || 0;
    var container = document.getElementById('ad-bar-' + side);
    if (!container) return;

    if (ads.length === 0 || !App.user) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';

    var ad = ads[idx];
    if (!ad || !ad.image_url) {
      container.innerHTML = '';
      return;
    }

    var imgHtml = '<img src="' + escapeHtml(ad.image_url) + '" class="ad-image" alt="广告">';
    var contentHtml = ad.link_url
      ? '<a href="' + escapeHtml(ad.link_url) + '" class="ad-link" target="_blank" data-ad-id="' + ad.id + '">' + imgHtml + '</a>'
      : imgHtml;

    var isFirst = idx <= 0;
    var isLast = idx >= ads.length - 1;

    container.innerHTML =
      '<div class="ad-bar-inner">' +
      '<div class="ad-container">' + contentHtml + '</div>' +
      (ads.length > 1
        ? '<div class="ad-nav">' +
          '<button class="ad-nav-btn ad-prev" data-side="' + side + '"' + (isFirst ? ' disabled' : '') + '>▲</button>' +
          '<span class="ad-counter">' + (idx + 1) + '/' + ads.length + '</span>' +
          '<button class="ad-nav-btn ad-next" data-side="' + side + '"' + (isLast ? ' disabled' : '') + '>▼</button>' +
          '</div>'
        : '') +
      '</div>';
  },

  _bindNavEvents: function() {
    var self = this;
    document.querySelectorAll('.ad-prev, .ad-next').forEach(function(btn) {
      // Avoid duplicate binding
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        playClickSound();
        var side = this.dataset.side;
        if (!side) return;
        var idx = self._currentIndex[side] || 0;
        if (this.classList.contains('ad-prev') && idx > 0) {
          self._currentIndex[side] = idx - 1;
        } else if (this.classList.contains('ad-next') && idx < self._ads[side].length - 1) {
          self._currentIndex[side] = idx + 1;
        } else {
          return;
        }
        self._renderAll();
      });
    });

    // Record ad click
    document.querySelectorAll('.ad-link').forEach(function(link) {
      var newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);
      newLink.addEventListener('click', function(e) {
        var adId = parseInt(this.dataset.adId);
        if (adId) API.recordAdClick(adId).catch(function() {});
      });
    });
  }
};
