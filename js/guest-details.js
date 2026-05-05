(function () {
  function propertyConfig(id) {
    var props = (window.APP_CONFIG && window.APP_CONFIG.properties) || {};
    return props[id] || props.grand_villa;
  }

  function fmt(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function showMsg(el, type, text) {
    if (!el) return;
    el.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-green-50', 'text-green-800', 'bg-amber-50', 'text-amber-900');
    if (type === 'error') {
      el.classList.add('bg-red-50', 'text-red-700');
    } else if (type === 'ok') {
      el.classList.add('bg-green-50', 'text-green-800');
    } else {
      el.classList.add('bg-amber-50', 'text-amber-900');
    }
    el.textContent = text;
    el.classList.remove('hidden');
  }

  function genConfirmationCode() {
    var u = '';
    if (window.crypto && crypto.randomUUID) u = crypto.randomUUID().replace(/-/g, '');
    else u = String(Date.now()) + Math.random().toString(16).slice(2);
    return 'VB-' + u.slice(0, 8).toUpperCase();
  }

  function fillReview() {
    var d = window.BookingState.get();
    var p = propertyConfig(d.propertyId);
    var pr = window.BookingState.computePricing(d.propertyId, d.checkIn, d.checkOut, d.guests);
    var rp = document.getElementById('rev-property');
    var ci = document.getElementById('rev-checkin');
    var co = document.getElementById('rev-checkout');
    var g = document.getElementById('rev-guests');
    if (rp && p) rp.textContent = p.name;
    if (ci) ci.textContent = fmt(d.checkIn);
    if (co) co.textContent = fmt(d.checkOut);
    if (g) g.textContent = String(d.guests);
    var rs = document.getElementById('rev-sub');
    var re = document.getElementById('rev-extra');
    var rv = document.getElementById('rev-svc');
    var rg = document.getElementById('rev-gst');
    var rt = document.getElementById('rev-total');
    if (rs) rs.textContent = '₹' + pr.subtotal.toLocaleString('en-IN');
    if (re) re.textContent = '₹' + pr.extraGuest.toLocaleString('en-IN');
    if (rv) rv.textContent = '₹' + pr.service.toLocaleString('en-IN');
    if (rg) rg.textContent = '₹' + pr.gst.toLocaleString('en-IN');
    if (rt) rt.textContent = '₹' + pr.total.toLocaleString('en-IN');

    document.getElementById('gd-name').value = d.guestName || '';
    document.getElementById('gd-phone').value = d.guestPhone || '';
    document.getElementById('gd-email').value = d.guestEmail || '';
    document.getElementById('gd-id').value = d.idProofNote || '';
    document.getElementById('gd-notes').value = d.specialRequests || '';
  }

  function validateDraft() {
    var d = window.BookingState.get();
    if (!d.propertyId || !d.checkIn || !d.checkOut) {
      return 'Please select property and dates on the previous step.';
    }
    var a = new Date(d.checkIn + 'T12:00:00');
    var b = new Date(d.checkOut + 'T12:00:00');
    if (!(b > a)) return 'Check-out must be after check-in.';
    var p = propertyConfig(d.propertyId);
    if (p && (d.guests < (p.minGuests || 1) || d.guests > p.maxGuests)) {
      return 'Guest count is not valid for the selected property.';
    }
    return '';
  }

  function boot() {
    if (!window.BookingState) return;
    var err = validateDraft();
    if (err) {
      window.location.href = '/booking.html';
      return;
    }
    fillReview();

    var form = document.getElementById('guest-details-form');
    var msg = document.getElementById('guest-form-message');
    if (!form) return;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = window.BookingState.get();
      var pr = window.BookingState.computePricing(d.propertyId, d.checkIn, d.checkOut, d.guests);
      var name = String(document.getElementById('gd-name').value || '').trim();
      var phone = String(document.getElementById('gd-phone').value || '').trim();
      var email = String(document.getElementById('gd-email').value || '').trim();
      var idNote = String(document.getElementById('gd-id').value || '').trim();
      var notes = String(document.getElementById('gd-notes').value || '').trim();
      if (!name || !phone || !email) {
        showMsg(msg, 'error', 'Name, phone and email are required.');
        return;
      }

      window.BookingState.patch({
        guestName: name,
        guestPhone: phone,
        guestEmail: email,
        idProofNote: idNote || null,
        specialRequests: notes || null,
        lineItems: pr,
        totalPaise: pr.totalPaise,
      });

      var client = window.getSupabase && window.getSupabase();
      var btn = document.getElementById('gd-submit');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving…';
      }

      if (!client) {
        showMsg(
          msg,
          'warn',
          'Supabase is not configured. Add keys in js/config.js (or inject __SUPABASE_URL__ / __SUPABASE_ANON_KEY__) to save this booking online.',
        );
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Save & continue to payment';
        }
        return;
      }

      var row = {
        property_id: d.propertyId,
        check_in: d.checkIn,
        check_out: d.checkOut,
        guests: d.guests,
        guest_name: name,
        guest_phone: phone,
        guest_email: email,
        id_proof_note: idNote || null,
        special_requests: notes || null,
        subtotal: pr.subtotal,
        extra_guest_fee: pr.extraGuest,
        service_fee: pr.service,
        gst: pr.gst,
        total_amount: pr.total,
        status: 'pending',
        confirmation_code: genConfirmationCode(),
      };

      client
        .from('bookings')
        .insert([row])
        .select('id')
        .single()
        .then(function (res) {
          if (res.error || !res.data) {
            showMsg(msg, 'error', 'Could not create booking. Please try again or call us.');
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Save & continue to payment';
            }
            return;
          }
          window.BookingState.patch({ bookingId: res.data.id });
          window.location.href = '/payment.html?bookingId=' + encodeURIComponent(res.data.id);
        })
        .catch(function () {
          showMsg(msg, 'error', 'Network error. Please retry.');
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save & continue to payment';
          }
        });
    });
  }

  window.addEventListener('vb-layout-ready', boot);
})();
