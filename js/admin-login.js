(function () {
  function cfg() {
    return window.APP_CONFIG || {};
  }

  function show(el, type, text) {
    if (!el) return;
    el.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-green-50', 'text-green-800');
    if (type === 'error') el.classList.add('bg-red-50', 'text-red-700');
    else el.classList.add('bg-green-50', 'text-green-800');
    el.textContent = text;
    el.classList.remove('hidden');
  }

  function allowed(email) {
    var list = cfg().adminEmails || [];
    return list.some(function (e) {
      return String(e).toLowerCase() === String(email).toLowerCase();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var client = window.getSupabase && window.getSupabase();
    var form = document.getElementById('admin-login-form');
    var msg = document.getElementById('login-message');
    if (!client || !form) {
      if (msg) show(msg, 'error', 'Configure Supabase keys in js/config.js first.');
      return;
    }

    client.auth.getSession().then(function (res) {
      if (res.data && res.data.session && res.data.session.user) {
        if (allowed(res.data.session.user.email)) {
          window.location.href = 'dashboard.html';
        }
      }
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = document.getElementById('admin-email').value.trim();
      var password = document.getElementById('admin-password').value;
      if (!allowed(email)) {
        show(msg, 'error', 'This email is not authorized for admin access.');
        return;
      }
      client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) {
          show(msg, 'error', res.error.message || 'Sign-in failed');
          return;
        }
        window.location.href = 'dashboard.html';
      });
    });
  });
})();
