(function () {
  var state = {
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    blocked: new Set(),
    loading: false,
  };

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function isoFromParts(y, m0, d) {
    return y + '-' + pad(m0 + 1) + '-' + pad(d);
  }

  function parseISODate(s) {
    var p = String(s).split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function daysInMonth(y, m0) {
    return new Date(y, m0 + 1, 0).getDate();
  }

  function startWeekday(y, m0) {
    return new Date(y, m0, 1).getDay();
  }

  function fmtDisplay(isoStr) {
    if (!isoStr) return '—';
    var d = parseISODate(isoStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function addDays(isoStr, delta) {
    var d = parseISODate(isoStr);
    d.setDate(d.getDate() + delta);
    return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function eachNightInRange(checkIn, checkOut, fn) {
    if (!checkIn || !checkOut) return;
    var a = parseISODate(checkIn);
    var b = parseISODate(checkOut);
    if (b <= a) return;
    for (var d = new Date(a); d < b; d.setDate(d.getDate() + 1)) {
      fn(isoFromParts(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  }

  function rangeHasBlocked(checkIn, checkOut) {
    var bad = false;
    eachNightInRange(checkIn, checkOut, function (ymd) {
      if (state.blocked.has(ymd)) bad = true;
    });
    return bad;
  }

  function propertyConfig(id) {
    var props = (window.APP_CONFIG && window.APP_CONFIG.properties) || {};
    return props[id] || props.grand_villa;
  }

  function syncPropertyCards() {
    var d = window.BookingState.get();
    document.querySelectorAll('[data-property-id]').forEach(function (btn) {
      var id = btn.getAttribute('data-property-id');
      var on = id === d.propertyId;
      btn.classList.toggle('ring-4', on);
      btn.classList.toggle('ring-terracotta/30', on);
      btn.classList.toggle('border-terracotta', on);
      btn.classList.toggle('border-orange-100', !on);
      var mark = btn.querySelector('[data-property-check]');
      if (mark) mark.classList.toggle('opacity-0', !on);
    });
  }

  function syncGuestStepper() {
    var d = window.BookingState.get();
    var p = propertyConfig(d.propertyId);
    var el = document.getElementById('guest-count-display');
    if (el) el.textContent = pad(d.guests);
    var cap = document.getElementById('guest-capacity-label');
    if (cap && p) cap.textContent = String(p.maxGuests) + ' Guests';
  }

  function updateSummary() {
    var d = window.BookingState.get();
    var p = propertyConfig(d.propertyId);
    var pr = window.BookingState.computePricing(d.propertyId, d.checkIn, d.checkOut, d.guests);
    var stayEl = document.getElementById('summary-property');
    if (stayEl && p) stayEl.textContent = p.name;
    var ci = document.getElementById('summary-checkin');
    var co = document.getElementById('summary-checkout');
    if (ci) ci.textContent = fmtDisplay(d.checkIn);
    if (co) co.textContent = fmtDisplay(d.checkOut);
    var line = document.getElementById('summary-nights-line');
    if (line && p)
      line.textContent =
        '₹' +
        p.basePricePerNight.toLocaleString('en-IN') +
        ' × ' +
        pr.nights +
        ' night' +
        (pr.nights > 1 ? 's' : '');
    var sub = document.getElementById('summary-subtotal');
    if (sub) sub.textContent = '₹' + pr.subtotal.toLocaleString('en-IN');
    var ex = document.getElementById('summary-extra');
    if (ex) ex.textContent = '₹' + pr.extraGuest.toLocaleString('en-IN');
    var svc = document.getElementById('summary-service');
    if (svc) svc.textContent = '₹' + pr.service.toLocaleString('en-IN');
    var gst = document.getElementById('summary-gst');
    if (gst) gst.textContent = '₹' + pr.gst.toLocaleString('en-IN');
    var tot = document.getElementById('summary-total');
    if (tot) tot.textContent = '₹' + pr.total.toLocaleString('en-IN');
    var err = document.getElementById('booking-step-error');
    if (err) {
      err.classList.add('hidden');
      err.textContent = '';
    }
  }

  function validateDates() {
    var d = window.BookingState.get();
    if (!d.checkIn || !d.checkOut) return 'Please select check-in and check-out dates.';
    if (parseISODate(d.checkOut) <= parseISODate(d.checkIn)) return 'Check-out must be after check-in.';
    if (rangeHasBlocked(d.checkIn, d.checkOut)) return 'Those dates include unavailable nights. Please adjust.';
    return '';
  }

  function renderCalendar() {
    var grid = document.getElementById('booking-calendar-grid');
    if (!grid) return;
    var y = state.viewYear;
    var m0 = state.viewMonth;
    var d = window.BookingState.get();
    var checkIn = d.checkIn;
    var checkOut = d.checkOut;
    var dim = daysInMonth(y, m0);
    var lead = startWeekday(y, m0);
    var labelEl = document.getElementById('cal-month-label');
    if (labelEl) {
      labelEl.textContent = new Date(y, m0, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    }

    var days = [];
    var i;
    for (i = 0; i < lead; i++) days.push({ type: 'empty' });
    for (i = 1; i <= dim; i++) {
      days.push({ type: 'day', day: i, ymd: isoFromParts(y, m0, i) });
    }
    while (days.length % 7 !== 0) days.push({ type: 'empty' });
    while (days.length < 42) days.push({ type: 'empty' });

    var headers = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var html = '';
    for (i = 0; i < 7; i++) {
      html +=
        '<div class="text-center text-xs font-bold text-slate-400 uppercase py-4">' + headers[i] + '</div>';
    }

    for (i = 0; i < days.length; i++) {
      var cell = days[i];
      if (cell.type === 'empty') {
        html += '<div class="calendar-day empty"></div>';
        continue;
      }
      var ymd = cell.ymd;
      var booked = state.blocked.has(ymd);
      var cls = 'calendar-day';
      if (booked) cls += ' booked';
      else cls += ' available';

      var inRange = false;
      var isStart = false;
      var isEnd = false;
      if (checkIn && checkOut && !booked) {
        var t = parseISODate(ymd);
        var a = parseISODate(checkIn);
        var b = parseISODate(checkOut);
        if (t > a && t < b) {
          inRange = true;
          cls += ' range';
        }
        if (ymd === checkIn) {
          cls += ' selected range-start';
          isStart = true;
        }
        if (ymd === checkOut) {
          cls += ' selected range-end';
          isEnd = true;
        }
      } else if (checkIn && ymd === checkIn && !booked) {
        cls += ' selected';
      }

      html +=
        '<button type="button" role="gridcell" class="' +
        cls +
        '" data-cal-date="' +
        ymd +
        '"' +
        (booked ? ' disabled' : '') +
        '>' +
        cell.day +
        '</button>';
    }
    grid.innerHTML = html;

    grid.querySelectorAll('[data-cal-date]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ymd = btn.getAttribute('data-cal-date');
        if (!ymd || state.blocked.has(ymd)) return;
        var draft = window.BookingState.get();
        if (!draft.checkIn || (draft.checkIn && draft.checkOut)) {
          window.BookingState.patch({ checkIn: ymd, checkOut: '' });
        } else {
          var a = draft.checkIn;
          var b = ymd;
          if (parseISODate(b) < parseISODate(a)) {
            var t = a;
            a = b;
            b = t;
          }
          if (rangeHasBlocked(a, b)) {
            var err = document.getElementById('booking-step-error');
            if (err) {
              err.textContent = 'That range includes unavailable dates.';
              err.classList.remove('hidden');
            }
            return;
          }
          window.BookingState.patch({ checkIn: a, checkOut: b });
        }
        renderCalendar();
        updateSummary();
      });
    });
  }

  function shiftMonth(delta) {
    var nm = state.viewMonth + delta;
    var ny = state.viewYear;
    if (nm > 11) {
      nm = 0;
      ny++;
    } else if (nm < 0) {
      nm = 11;
      ny--;
    }
    state.viewMonth = nm;
    state.viewYear = ny;
    refreshAvailability();
  }

  function refreshAvailability() {
    var draft = window.BookingState.get();
    var pid = draft.propertyId;
    var client = window.getSupabase && window.getSupabase();
    state.blocked = new Set();
    if (!client) {
      renderCalendar();
      return;
    }
    state.loading = true;
    var y = state.viewYear;
    var m0 = state.viewMonth;
    var fetchStart = new Date(y, m0 - 1, 1);
    var fetchEnd = new Date(y, m0 + 2, 0);
    var fs = isoFromParts(fetchStart.getFullYear(), fetchStart.getMonth(), fetchStart.getDate());
    var fe = isoFromParts(fetchEnd.getFullYear(), fetchEnd.getMonth(), fetchEnd.getDate());

    Promise.all([
      client.from('blocked_dates').select('block_date').eq('property_id', pid).gte('block_date', fs).lte('block_date', fe),
      client
        .from('bookings')
        .select('check_in, check_out, status')
        .eq('property_id', pid)
        .in('status', ['pending', 'paid'])
        .lte('check_in', fe)
        .gt('check_out', fs),
    ])
      .then(function (results) {
        var blk = results[0];
        if (blk.data) {
          blk.data.forEach(function (r) {
            state.blocked.add(r.block_date);
          });
        }
        var bk = results[1];
        if (bk.data) {
          bk.data.forEach(function (b) {
            eachNightInRange(b.check_in, b.check_out, function (ymd) {
              state.blocked.add(ymd);
            });
          });
        }
      })
      .catch(function () {})
      .finally(function () {
        state.loading = false;
        renderCalendar();
      });
  }

  function bindControls() {
    document.querySelectorAll('[data-property-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-property-id');
        if (!id) return;
        var p = propertyConfig(id);
        var draft = window.BookingState.get();
        var g = draft.guests;
        if (p) g = Math.min(Math.max(g, p.minGuests || 1), p.maxGuests);
        window.BookingState.patch({ propertyId: id, guests: g });
        syncPropertyCards();
        syncGuestStepper();
        refreshAvailability();
        updateSummary();
      });
    });

    var prev = document.getElementById('cal-prev');
    var next = document.getElementById('cal-next');
    if (prev) prev.addEventListener('click', function () { shiftMonth(-1); });
    if (next) next.addEventListener('click', function () { shiftMonth(1); });

    var gm = document.getElementById('guest-minus');
    var gp = document.getElementById('guest-plus');
    if (gm)
      gm.addEventListener('click', function () {
        var draft = window.BookingState.get();
        var p = propertyConfig(draft.propertyId);
        var g = Math.max((p && p.minGuests) || 1, draft.guests - 1);
        window.BookingState.patch({ guests: g });
        syncGuestStepper();
        updateSummary();
      });
    if (gp)
      gp.addEventListener('click', function () {
        var draft = window.BookingState.get();
        var p = propertyConfig(draft.propertyId);
        var max = (p && p.maxGuests) || 12;
        var g = Math.min(max, draft.guests + 1);
        window.BookingState.patch({ guests: g });
        syncGuestStepper();
        updateSummary();
      });

    var cta = document.getElementById('cta-continue-booking');
    if (cta)
      cta.addEventListener('click', function (e) {
        var msg = validateDates();
        if (msg) {
          e.preventDefault();
          var err = document.getElementById('booking-step-error');
          if (err) {
            err.textContent = msg;
            err.classList.remove('hidden');
          }
          return;
        }
        var d = window.BookingState.get();
        var p = propertyConfig(d.propertyId);
        if (p && (d.guests < p.minGuests || d.guests > p.maxGuests)) {
          e.preventDefault();
          var er2 = document.getElementById('booking-step-error');
          if (er2) {
            er2.textContent = 'Guest count is outside the allowed range for this property.';
            er2.classList.remove('hidden');
          }
        }
      });
  }

  function boot() {
    if (!window.BookingState) return;
    var today = new Date();
    var draft = window.BookingState.get();
    if (!draft.checkIn) {
      window.BookingState.patch({
        checkIn: isoFromParts(today.getFullYear(), today.getMonth(), today.getDate()),
        checkOut: addDays(isoFromParts(today.getFullYear(), today.getMonth(), today.getDate()), 3),
      });
    }
    var ci = window.BookingState.get().checkIn;
    if (ci) {
      var cd = parseISODate(ci);
      state.viewYear = cd.getFullYear();
      state.viewMonth = cd.getMonth();
    }
    syncPropertyCards();
    syncGuestStepper();
    bindControls();
    updateSummary();
    refreshAvailability();
  }

  window.addEventListener('vb-layout-ready', function () {
    boot();
  });
})();
