(function () {
  function stars(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function renderReviews(list) {
    var el = document.getElementById('reviews-track');
    if (!el || !list || !list.length) return;
    var cardsHtml = list
      .map(function (r) {
        var name = r.guest_name || 'Guest';
        var stay = r.stay_type || '';
        var rating = Math.min(5, Math.max(1, r.rating || 5));
        var body = r.body || '';
        return (
          '<div class="w-[340px] md:w-[420px] bg-white rounded-[2rem] p-8 shadow-lg border border-orange-50 shrink-0">' +
          '<div class="flex justify-between items-start mb-5"><div><h4 class="font-extrabold text-forest">' +
          name +
          '</h4><p class="text-xs text-slate-400">' +
          stay +
          '</p></div><div class="text-amber-500">' +
          stars(rating) +
          '</div></div><p class="text-slate-600 leading-relaxed italic">&quot;' +
          body +
          '&quot;</p></div>'
        );
      })
      .join('');
    el.innerHTML = cardsHtml + cardsHtml;
  }

  function loadReviewsFromSupabase() {
    var client = window.getSupabase && window.getSupabase();
    var cfg = window.APP_CONFIG || {};
    if (!client) {
      renderReviews(cfg.defaultReviews || []);
      return;
    }
    client
      .from('reviews')
      .select('guest_name, stay_type, rating, body')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(24)
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          renderReviews(cfg.defaultReviews || []);
        } else {
          renderReviews(res.data);
        }
      })
      .catch(function () {
        renderReviews(cfg.defaultReviews || []);
      });
  }

  function submitInquiry(ev) {
    ev.preventDefault();
    var form = document.getElementById('inquiry-form');
    var msg = document.getElementById('inquiry-form-message');
    if (!form) return;
    var fd = new FormData(form);
    var row = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim() || null,
      stay_preference: String(fd.get('stay_preference') || '').trim() || null,
      guests: fd.get('guests') ? parseInt(String(fd.get('guests')), 10) : null,
      message: String(fd.get('message') || '').trim() || null,
    };
    if (!row.name) return;
    var client = window.getSupabase && window.getSupabase();
    if (!client) {
      if (msg) {
        msg.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-green-50', 'text-green-800');
        msg.classList.add('bg-amber-50', 'text-amber-900');
        msg.textContent =
          'Thank you. Configure Supabase in js/config.js to save inquiries online, or call us on +91 74480 20325.';
      }
      return;
    }
    client
      .from('inquiries')
      .insert([row])
      .then(function (res) {
        if (msg) {
          msg.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-amber-50', 'text-amber-900');
          if (res.error) {
            msg.classList.add('bg-red-50', 'text-red-700');
            msg.textContent = 'Could not send. Please try WhatsApp or call us.';
          } else {
            msg.classList.add('bg-green-50', 'text-green-800');
            msg.textContent = 'Thank you — we received your inquiry and will reply shortly.';
            form.reset();
          }
        }
      });
  }

  function initGa() {
    var id = window.APP_CONFIG && window.APP_CONFIG.gaMeasurementId;
    if (!id) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGa();
    loadReviewsFromSupabase();
    var form = document.getElementById('inquiry-form');
    if (form) form.addEventListener('submit', submitInquiry);
  });
})();
