// Auth component: login/register
var ComponentsAuth = {
  renderAuth: function() {
    var app = document.getElementById('app');
    app.innerHTML = '<div class="page-fade-in"><div class="auth-page"><div class="auth-card"><h1 class="auth-title">📂 作品集</h1><p class="auth-subtitle">登录以浏览作品</p><div class="auth-tabs" id="auth-tabs"><button class="auth-tab active" data-tab="login">登录</button><button class="auth-tab" data-tab="register">注册</button></div><div id="auth-form">' + this._renderLoginForm() + '</div></div></div></div>';
    document.querySelectorAll('.auth-tab').forEach(function(tab) {
      tab.addEventListener('click', function() { playClickSound(); document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); }); tab.classList.add('active'); document.getElementById('auth-form').innerHTML = tab.dataset.tab === 'login' ? Components._renderLoginForm() : Components._renderRegisterForm(); Components._bindAuthForms(); });
    });
    this._bindAuthForms();
  },

  _renderLoginForm: function() { return '<form id="login-form"><div class="form-group"><label class="form-label">用户名</label><input class="form-input" name="username" type="text" placeholder="输入用户名" required autocomplete="username"></div><div class="form-group"><label class="form-label">密码</label><input class="form-input" name="password" type="password" placeholder="输入密码" required autocomplete="current-password"></div><button type="submit" class="btn btn-primary btn-block" id="login-btn">登录</button></form>'; },

  _renderRegisterForm: function() { return '<form id="register-form"><div class="form-group"><label class="form-label">用户名</label><input class="form-input" name="username" type="text" placeholder="3-20个字符" required autocomplete="username"></div><div class="form-group"><label class="form-label">密码</label><input class="form-input" name="password" type="password" placeholder="至少6位" required autocomplete="new-password"></div><div class="form-group"><label class="form-checkbox"><input type="checkbox" name="is-admin" id="is-admin-checkbox"><span>注册为管理员</span></label></div><div class="form-group" id="admin-secret-group" style="display:none;"><label class="form-label">管理员注册秘钥</label><input class="form-input" name="admin-secret" type="password" placeholder="请输入管理员秘钥"><span class="form-hint">请联系网站管理员获取注册秘钥</span></div><button type="submit" class="btn btn-primary btn-block" id="register-btn">注册</button></form>'; },

  _bindAuthForms: function() {
    var lf = document.getElementById('login-form'), rf = document.getElementById('register-form'), ac = document.getElementById('is-admin-checkbox');
    if (ac) ac.addEventListener('change', function() { document.getElementById('admin-secret-group').style.display = ac.checked ? 'block' : 'none'; });
    if (lf) lf.addEventListener('submit', async function(e) { e.preventDefault(); var b = document.getElementById('login-btn'); if (Components._isButtonDisabled(b)) return; Components._disableButton(b, '登录中...'); try { var d = await API.login(lf.username.value.trim(), lf.password.value); showToast('登录成功', 'success'); App.setUser(d.user); Router.navigate('#/works'); } catch (err) { showToast(err.message, 'error'); } finally { Components._enableButton(b, '登录'); } });
    if (rf) rf.addEventListener('submit', async function(e) { e.preventDefault(); var b = document.getElementById('register-btn'); if (Components._isButtonDisabled(b)) return; Components._disableButton(b, '注册中...'); try { var role = ac && ac.checked ? 'admin' : 'user'; var secret = ac && ac.checked ? rf['admin-secret'].value.trim() : undefined; var d = await API.register(rf.username.value.trim(), rf.password.value, role, secret); showToast('注册成功', 'success'); App.setUser(d.user); Router.navigate('#/works'); } catch (err) { showToast(err.message, 'error'); } finally { Components._enableButton(b, '注册'); } });
  }
};
