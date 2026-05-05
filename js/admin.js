(function () {
  function cfg() {
    return window.APP_CONFIG || {};
  }

  function allowed(email) {
    var list = cfg().adminEmails || [];
    return list.some(function (e) {
      return String(e).toLowerCase() === String(email).toLowerCase();
    });
  }

  function setActiveTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === name;
      btn.classList.toggle('bg-forest', on);
      btn.classList.toggle('text-white', on);
      btn.classList.toggle('bg-white', !on);
      btn.classList.toggle('border', !on);
      btn.classList.toggle('border-orange-100', !on);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.add('hidden');
    });
    var panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.remove('hidden');
  }

  function fmt(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function loadBookings(client) {
    var st = document.getElementById('filter-booking-status').value;
    var q = client.from('bookings').select('*').order('created_at', { ascending: false }).limit(200);
    if (st) q = q.eq('status', st);
    q.then(function (res) {
      var tb = document.getElementById('bookings-tbody');
      if (!tb) return;
      tb.innerHTML = '';
      if (res.error || !res.data) return;
      res.data.forEach(function (b) {
        var tr = document.createElement('tr');
        tr.className = 'border-t border-orange-50';
        tr.innerHTML =
          '<td class="px-4 py-3 font-mono text-xs">' +
          (b.confirmation_code || b.id.slice(0, 8)) +
          '</td>' +
          '<td class="px-4 py-3">' +
          (b.guest_name || '—') +
          '<div class="text-xs text-slate-400">' +
          (b.guest_phone || '') +
          '</div></td>' +
          '<td class="px-4 py-3 text-xs">' +
          fmt(b.check_in) +
          ' → ' +
          fmt(b.check_out) +
          '</td>' +
          '<td class="px-4 py-3">₹' +
          Number(b.total_amount || 0).toLocaleString('en-IN') +
          '</td>' +
          '<td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-bold bg-slate-100">' +
          b.status +
          '</span></td>' +
          '<td class="px-4 py-3 space-x-2">' +
          (b.status !== 'cancelled'
            ? '<button type="button" data-cancel-booking="' +
              b.id +
              '" class="text-xs font-bold text-red-600 underline">Cancel</button>'
            : '') +
          '</td>';
        tb.appendChild(tr);
      });
      tb.querySelectorAll('[data-cancel-booking]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-cancel-booking');
          if (!id || !confirm('Mark this booking as cancelled?')) return;
          client
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .then(function () {
              loadBookings(client);
            });
        });
      });
    });
  }

  function loadBlocked(client) {
    client
      .from('blocked_dates')
      .select('*')
      .order('block_date', { ascending: false })
      .limit(200)
      .then(function (res) {
        var tb = document.getElementById('blocked-tbody');
        if (!tb) return;
        tb.innerHTML = '';
        if (res.error || !res.data) return;
        res.data.forEach(function (row) {
          var tr = document.createElement('tr');
          tr.className = 'border-t border-orange-50';
          tr.innerHTML =
            '<td class="px-4 py-3">' +
            row.property_id +
            '</td>' +
            '<td class="px-4 py-3">' +
            fmt(row.block_date) +
            '</td>' +
            '<td class="px-4 py-3 text-xs text-slate-500">' +
            (row.reason || '') +
            '</td>' +
            '<td class="px-4 py-3"><button type="button" data-delete-block="' +
            row.id +
            '" class="text-xs font-bold text-red-600 underline">Remove</button></td>';
          tb.appendChild(tr);
        });
        tb.querySelectorAll('[data-delete-block]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-delete-block');
            if (!id) return;
            client
              .from('blocked_dates')
              .delete()
              .eq('id', id)
              .then(function () {
                loadBlocked(client);
              });
          });
        });
      });
  }

  function loadInquiries(client) {
    client
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(function (res) {
        var wrap = document.getElementById('inquiries-list');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (res.error || !res.data) {
          wrap.innerHTML = '<p class="text-sm text-slate-500">No inquiries or insufficient permissions.</p>';
          return;
        }
        res.data.forEach(function (q) {
          var card = document.createElement('div');
          card.className = 'bg-white rounded-2xl border border-orange-50 p-5 shadow-sm';
          var phone = (q.phone || '').replace(/\D/g, '');
          var wa = phone ? 'https://wa.me/91' + phone.replace(/^91/, '') : 'https://wa.me/917448020325';
          card.innerHTML =
            '<div class="flex justify-between gap-4 flex-wrap">' +
            '<div><p class="font-bold text-forest">' +
            (q.name || 'Guest') +
            '</p><p class="text-xs text-slate-400">' +
            new Date(q.created_at).toLocaleString() +
            '</p></div>' +
            '<a href="' +
            wa +
            '" target="_blank" rel="noopener" class="text-sm font-bold text-terracotta underline">Reply on WhatsApp</a>' +
            '</div>' +
            '<p class="text-sm text-slate-600 mt-3">' +
            (q.message || '') +
            '</p>' +
            '<p class="text-xs text-slate-400 mt-2">' +
            (q.stay_preference || '') +
            (q.guests ? ' · ' + q.guests + ' guests' : '') +
            '</p>';
          wrap.appendChild(card);
        });
      });
  }

  function loadReviews(client) {
    client
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(function (res) {
        var wrap = document.getElementById('reviews-list');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (res.error || !res.data) {
          wrap.innerHTML = '<p class="text-sm text-slate-500">No reviews or insufficient permissions.</p>';
          return;
        }
        res.data.forEach(function (r) {
          var card = document.createElement('div');
          card.className = 'bg-white rounded-2xl border border-orange-50 p-5 shadow-sm';
          card.innerHTML =
            '<div class="flex justify-between gap-4 flex-wrap items-start">' +
            '<div><p class="font-bold text-forest">' +
            r.guest_name +
            '</p><p class="text-xs text-slate-400">' +
            (r.stay_type || '') +
            ' · ' +
            r.rating +
            '/5</p></div>' +
            '<div class="flex gap-2">' +
            (r.approved
              ? '<span class="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">Live</span>'
              : '<button type="button" data-approve-review="' +
                r.id +
                '" class="text-xs font-bold text-white bg-forest px-3 py-1 rounded-full">Approve</button>') +
            '</div></div>' +
            '<p class="text-sm text-slate-600 mt-3 italic">&quot;' +
            r.body +
            '&quot;</p>';
          wrap.appendChild(card);
        });
        wrap.querySelectorAll('[data-approve-review]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-approve-review');
            client
              .from('reviews')
              .update({ approved: true })
              .eq('id', id)
              .then(function () {
                loadReviews(client);
              });
          });
        });
      });
  }

  function bootAuth(client) {
    client.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
      }
      if (!allowed(session.user.email)) {
        client.auth.signOut().then(function () {
          window.location.href = 'login.html';
        });
        return;
      }
      var el = document.getElementById('admin-email-label');
      if (el) el.textContent = session.user.email || '';

      document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setActiveTab(btn.getAttribute('data-tab'));
          if (btn.getAttribute('data-tab') === 'bookings') loadBookings(client);
          if (btn.getAttribute('data-tab') === 'calendar') loadBlocked(client);
          if (btn.getAttribute('data-tab') === 'inquiries') loadInquiries(client);
          if (btn.getAttribute('data-tab') === 'reviews') loadReviews(client);
        });
      });

      var rb = document.getElementById('reload-bookings');
      if (rb) rb.addEventListener('click', function () { loadBookings(client); });
      var fs = document.getElementById('filter-booking-status');
      if (fs) fs.addEventListener('change', function () { loadBookings(client); });
      var ri = document.getElementById('reload-inquiries');
      if (ri) ri.addEventListener('click', function () { loadInquiries(client); });
      var rr = document.getElementById('reload-reviews');
      if (rr) rr.addEventListener('click', function () { loadReviews(client); });

      var so = document.getElementById('admin-signout');
      if (so)
        so.addEventListener('click', function () {
          client.auth.signOut().then(function () {
            window.location.href = 'login.html';
          });
        });

      var bab = document.getElementById('block-add-btn');
      if (bab)
        bab.addEventListener('click', function () {
        var pid = document.getElementById('block-property').value;
        var d = document.getElementById('block-date').value;
        var reason = document.getElementById('block-reason').value.trim();
        var msg = document.getElementById('block-msg');
        if (!d) {
          if (msg) {
            msg.classList.remove('hidden');
            msg.textContent = 'Pick a date.';
          }
          return;
        }
        client
          .from('blocked_dates')
          .insert([{ property_id: pid, block_date: d, reason: reason || null }])
          .then(function (res) {
            if (msg) msg.classList.remove('hidden');
            if (msg) {
              if (res.error) msg.textContent = res.error.message || 'Could not add block';
              else {
                msg.textContent = 'Blocked.';
                var br = document.getElementById('block-reason');
                if (br) br.value = '';
                loadBlocked(client);
              }
            }
          });
      });

      setActiveTab('bookings');
      loadBookings(client);
    });
  }

  window.addEventListener('vb-layout-ready', function () {
    var client = window.getSupabase && window.getSupabase();
    if (!client) {
      window.location.href = 'login.html';
      return;
    }
    bootAuth(client);
  });
})();
