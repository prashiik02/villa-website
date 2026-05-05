(function () {
  var currentBooking = null;
  var currentBookingId = null;

  function cfg() {
    return window.APP_CONFIG || {};
  }

  function functionsBaseUrl() {
    var c = cfg();
    if (c.functionsBase) return String(c.functionsBase).replace(/\/$/, '');
    if (c.supabaseUrl) return String(c.supabaseUrl).replace(/\/$/, '') + '/functions/v1';
    return '';
  }

  function showErr(msg) {
    var el = document.getElementById('payment-page-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function propertyMeta(propertyId) {
    var props = cfg().properties || {};
    var p = props[propertyId] || props.grand_villa;
    var imgs = cfg().images || {};
    var img = '';
    if (p && p.imageKey && imgs[p.imageKey]) img = imgs[p.imageKey];
    return { name: p ? p.name : 'Stay', image: img };
  }

  function fmt(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function nights(ci, co) {
    var a = new Date(ci + 'T12:00:00');
    var b = new Date(co + 'T12:00:00');
    return Math.max(1, Math.round((b - a) / 86400000));
  }

  function loadRazorpayScript() {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Razorpay script failed')); };
      document.body.appendChild(s);
    });
  }

  function invokeFunction(name, body) {
    var base = functionsBaseUrl();
    var c = cfg();
    if (!base || !c.supabaseAnonKey) return Promise.reject(new Error('Missing functions URL or anon key'));
    return fetch(base + '/' + name, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + c.supabaseAnonKey,
        apikey: c.supabaseAnonKey,
      },
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || j.message || 'Request failed');
        return j;
      });
    });
  }

  function renderBooking(b) {
    currentBooking = b;
    var meta = propertyMeta(b.property_id);
    var img = document.getElementById('pay-cover-img');
    if (img) {
      img.src = meta.image || '';
      img.alt = meta.name;
    }
    var badge = document.getElementById('pay-property-badge');
    if (badge) badge.textContent = meta.name;
    var pd = document.getElementById('pay-dates');
    if (pd) {
      var n = nights(b.check_in, b.check_out);
      pd.textContent = fmt(b.check_in) + ' → ' + fmt(b.check_out) + ' (' + n + ' night' + (n > 1 ? 's' : '') + ')';
    }
    var pg = document.getElementById('pay-guests');
    if (pg) pg.textContent = String(b.guests) + ' guest' + (Number(b.guests) !== 1 ? 's' : '');
    var pn = document.getElementById('pay-guest-name');
    if (pn) pn.textContent = b.guest_name || '—';

    var sub = Number(b.subtotal || 0);
    var ex = Number(b.extra_guest_fee || 0);
    var sv = Number(b.service_fee || 0);
    var gst = Number(b.gst || 0);
    var tot = Number(b.total_amount || 0);

    var els = [
      ['pay-line-sub', sub],
      ['pay-line-extra', ex],
      ['pay-line-svc', sv],
      ['pay-line-gst', gst],
      ['pay-line-total', tot],
    ];
    els.forEach(function (x) {
      var el = document.getElementById(x[0]);
      if (el) el.textContent = '₹' + x[1].toLocaleString('en-IN');
    });

    var btn = document.getElementById('pay-btn-label');
    if (btn) btn.textContent = 'Pay ₹' + tot.toLocaleString('en-IN') + ' securely';

    if (b.status === 'paid') {
      window.location.replace('/confirmation.html?bookingId=' + encodeURIComponent(currentBookingId));
    }
  }

  function boot() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('bookingId') || (window.BookingState && window.BookingState.get().bookingId);
    currentBookingId = id;
    if (!id) {
      showErr('Missing booking reference. Start again from the booking page.');
      return;
    }

    var client = window.getSupabase && window.getSupabase();
    if (!client) {
      showErr('Supabase is not configured; cannot load this booking.');
      return;
    }

    client
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()
      .then(function (res) {
        if (res.error || !res.data) {
          showErr('Booking not found. It may have expired or the link is invalid.');
          return;
        }
        if (res.data.status === 'cancelled') {
          showErr('This booking was cancelled. Please create a new booking.');
          return;
        }
        renderBooking(res.data);
      });

    var payBtn = document.getElementById('pay-razorpay-btn');
    if (payBtn) {
      payBtn.addEventListener('click', function () {
        if (!currentBooking || currentBooking.status !== 'pending') return;
        var c = cfg();
        if (!c.supabaseAnonKey || !functionsBaseUrl()) {
          showErr('Payment gateway is not configured (Supabase URL / anon key / Edge Functions).');
          return;
        }
        payBtn.disabled = true;
        invokeFunction('create-order', { bookingId: currentBookingId })
          .then(function (data) {
            return loadRazorpayScript().then(function () {
              var key = data.keyId || c.razorpayKeyId;
              if (!key) throw new Error('Missing Razorpay key');
              var options = {
                key: key,
                amount: data.amount,
                currency: data.currency || 'INR',
                order_id: data.orderId,
                name: c.siteName || "Vedant's Bungalow",
                description: 'Stay booking',
                prefill: {
                  email: currentBooking.guest_email || '',
                  contact: currentBooking.guest_phone || '',
                  name: currentBooking.guest_name || '',
                },
                theme: { color: '#8C3B2E' },
                handler: function (response) {
                  invokeFunction('verify-payment', {
                    bookingId: currentBookingId,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                  })
                    .then(function () {
                      window.location.href =
                        '/confirmation.html?bookingId=' + encodeURIComponent(currentBookingId);
                    })
                    .catch(function (e) {
                      showErr(e.message || 'Payment verification failed. Contact us with your payment ID.');
                      payBtn.disabled = false;
                    });
                },
                modal: {
                  ondismiss: function () {
                    payBtn.disabled = false;
                  },
                },
              };
              var rz = new window.Razorpay(options);
              rz.open();
            });
          })
          .catch(function (e) {
            showErr(e.message || 'Could not start checkout.');
            payBtn.disabled = false;
          });
      });
    }
  }

  window.addEventListener('vb-layout-ready', boot);
})();
