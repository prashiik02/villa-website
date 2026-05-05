(function () {
  var KEY = 'vb_booking_draft_v1';

  function read() {
    try {
      var raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function write(data) {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  }

  function clear() {
    sessionStorage.removeItem(KEY);
  }

  /** @returns {import('./config.js')} */
  function cfg() {
    return window.APP_CONFIG || {};
  }

  function defaultDraft() {
    var p = cfg().properties && cfg().properties.grand_villa;
    var today = new Date();
    var out = new Date(today);
    out.setDate(out.getDate() + 3);
    return {
      propertyId: p ? p.id : 'grand_villa',
      checkIn: today.toISOString().slice(0, 10),
      checkOut: out.toISOString().slice(0, 10),
      guests: p ? Math.min(8, p.maxGuests) : 8,
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      idProofNote: '',
      specialRequests: '',
      bookingId: null,
      lineItems: null,
      totalPaise: null,
    };
  }

  function get() {
    var d = read();
    if (!d) {
      d = defaultDraft();
      write(d);
    }
    return d;
  }

  function patch(updates) {
    var d = get();
    Object.assign(d, updates);
    write(d);
    return d;
  }

  function nightsBetween(checkIn, checkOut) {
    var a = new Date(checkIn + 'T12:00:00');
    var b = new Date(checkOut + 'T12:00:00');
    var ms = b - a;
    return Math.max(1, Math.round(ms / (86400000)));
  }

  function computePricing(propertyId, checkIn, checkOut, guests) {
    var props = cfg().properties || {};
    var p = props[propertyId] || props.grand_villa;
    if (!p) return { nights: 1, subtotal: 0, extraGuest: 0, service: 0, gst: 0, total: 0 };
    var nights = nightsBetween(checkIn, checkOut);
    var subtotal = p.basePricePerNight * nights;
    var extra = Math.max(0, guests - (p.includedGuests || 0)) * (p.extraGuestFee || 0) * nights;
    var service = p.serviceFeeFlat || 0;
    var beforeGst = subtotal + extra + service;
    var gstPct = cfg().gstPercent || 0;
    var gst = Math.round((beforeGst * gstPct) / 100);
    var total = beforeGst + gst;
    return {
      nights: nights,
      subtotal: subtotal,
      extraGuest: extra,
      service: service,
      gst: gst,
      total: total,
      totalPaise: Math.round(total * 100),
    };
  }

  window.BookingState = {
    get: get,
    patch: patch,
    clear: clear,
    nightsBetween: nightsBetween,
    computePricing: computePricing,
    defaultDraft: defaultDraft,
  };
})();
