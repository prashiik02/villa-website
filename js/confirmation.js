(function () {
  function cfg() {
    return window.APP_CONFIG || {};
  }

  function propertyName(id) {
    var props = cfg().properties || {};
    var p = props[id] || props.grand_villa;
    return p ? p.name : 'Stay';
  }

  function fmt(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function boot() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('bookingId');
    if (!id) {
      document.getElementById('confirm-title').textContent = 'Missing booking link';
      return;
    }

    var client = window.getSupabase && window.getSupabase();
    if (!client) {
      document.getElementById('confirm-title').textContent = 'Unable to load booking';
      return;
    }

    client
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()
      .then(function (res) {
        if (res.error || !res.data) {
          document.getElementById('confirm-title').textContent = 'Booking not found';
          return;
        }
        var b = res.data;
        var banner = document.getElementById('confirmation-banner');
        var title = document.getElementById('confirm-title');
        if (b.status === 'pending') {
          if (banner) {
            banner.classList.remove('hidden');
            banner.classList.add('bg-amber-50', 'text-amber-900');
            banner.textContent =
              'Payment is still pending. If you completed payment, refresh in a moment or contact us on WhatsApp with your reference.';
          }
          if (title) title.textContent = 'Booking received';
        } else if (b.status === 'cancelled') {
          if (banner) {
            banner.classList.remove('hidden');
            banner.classList.add('bg-red-50', 'text-red-800');
            banner.textContent = 'This booking has been cancelled.';
          }
          if (title) title.textContent = 'Booking cancelled';
        } else {
          if (title) title.textContent = 'Booking confirmed!';
        }

        var code = document.getElementById('confirm-code');
        if (code) code.textContent = b.confirmation_code || b.id;

        document.getElementById('cf-checkin').textContent = fmt(b.check_in);
        document.getElementById('cf-checkout').textContent = fmt(b.check_out);
        document.getElementById('cf-property').textContent = propertyName(b.property_id);
        document.getElementById('cf-guests').textContent = String(b.guests) + ' guest' + (Number(b.guests) !== 1 ? 's' : '');
        document.getElementById('cf-name').textContent = b.guest_name || '—';
        document.getElementById('cf-phone').textContent = b.guest_phone || '—';
        document.getElementById('cf-email').textContent = b.guest_email || '—';

        if (b.special_requests) {
          var rw = document.getElementById('cf-requests-wrap');
          var rt = document.getElementById('cf-requests');
          if (rw && rt) {
            rw.classList.remove('hidden');
            rt.textContent = b.special_requests;
          }
        }

        var sub = Number(b.subtotal || 0);
        var ex = Number(b.extra_guest_fee || 0);
        var sv = Number(b.service_fee || 0);
        var gst = Number(b.gst || 0);
        var tot = Number(b.total_amount || 0);
        document.getElementById('cf-sub').textContent = '₹' + sub.toLocaleString('en-IN');
        document.getElementById('cf-extra').textContent = '₹' + ex.toLocaleString('en-IN');
        document.getElementById('cf-svc').textContent = '₹' + sv.toLocaleString('en-IN');
        document.getElementById('cf-gst').textContent = '₹' + gst.toLocaleString('en-IN');
        document.getElementById('cf-total').textContent = '₹' + tot.toLocaleString('en-IN');

        var st = document.getElementById('cf-status-label');
        if (st) {
          if (b.status === 'paid') st.textContent = 'Status: Paid in full';
          else if (b.status === 'pending') st.textContent = 'Status: Awaiting payment';
          else st.textContent = 'Status: ' + b.status;
        }

        var imgs = cfg().images || {};
        var mi = document.getElementById('cf-map-img');
        if (mi) mi.src = imgs.hero || '';
      });
  }

  window.addEventListener('vb-layout-ready', boot);
})();
