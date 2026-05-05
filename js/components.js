(function () {
  function year() {
    document.querySelectorAll('[data-current-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function bindMobileNav() {
    var toggle = document.getElementById('mobile-menu-toggle');
    var panel = document.getElementById('mobile-nav-panel');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('hidden') === false;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function includePrefix() {
    var path = (window.location.pathname || '').replace(/\\/g, '/');
    if (path.indexOf('/admin/') !== -1) return '../';
    return '';
  }

  function loadPartial(name) {
    return fetch(includePrefix() + 'partials/' + name + '.html', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + name);
        return r.text();
      });
  }

  window.initLayout = function () {
    year();
    bindMobileNav();
  };

  function emitLayoutReady() {
    try {
      window.dispatchEvent(new Event('vb-layout-ready'));
    } catch (e) {}
  }

  window.loadIncludes = function () {
    var nodes = document.querySelectorAll('[data-include]');
    if (!nodes.length) {
      window.initLayout();
      emitLayoutReady();
      return Promise.resolve();
    }
    var tasks = Array.prototype.map.call(nodes, function (node) {
      var name = node.getAttribute('data-include');
      return loadPartial(name).then(function (html) {
        node.innerHTML = html;
      });
    });
    return Promise.all(tasks)
      .then(function () {
        window.initLayout();
        emitLayoutReady();
      })
      .catch(function () {
        window.initLayout();
        emitLayoutReady();
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.loadIncludes();
    });
  } else {
    window.loadIncludes();
  }
})();
