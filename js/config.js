/**
 * Site configuration. Replace Supabase and Razorpay values for production.
 * For Vercel: set matching env vars and optionally inject at build; for static hosting,
 * edit this file or serve with a tiny env-replacement step.
 */
window.APP_CONFIG = {
  siteName: "Vedant's Bungalow",
  siteUrl: typeof window !== 'undefined' ? window.location.origin : '',

  supabaseUrl: window.__SUPABASE_URL__ || 'https://zuemskawdsuukodwohrh.supabase.co',
  supabaseAnonKey: window.__SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZW1za2F3ZHN1dWtvZHdvaHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDkwNjEsImV4cCI6MjA5MzQ4NTA2MX0.1RGr6Vc231yM750i_NJUhwM2m6X3N7lFW9nhnobYK_8',

  /** Supabase Edge Functions base: https://<project>.supabase.co/functions/v1 */
  functionsBase:
    window.__SUPABASE_FUNCTIONS_BASE__ ||
    (window.__SUPABASE_URL__
      ? String(window.__SUPABASE_URL__).replace(/\/$/, '') + '/functions/v1'
      : ''),

  razorpayKeyId: window.__RAZORPAY_KEY_ID__ || '',

  /** Google Analytics 4 — set in production */
  gaMeasurementId: window.__GA_MEASUREMENT_ID__ || '',

  whatsappNumber: '917448020325',
  mapUrl: 'https://maps.app.goo.gl/ArdZAAn7CqJUgXUA6?g_st=aw',

  images: {
    hero: 'https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/0fe58f1a-a323-46f8-a89e-5d958c8dc3d8/1777813360488-cb8746f5/WhatsApp_Image_2026-05-03_at_12.25.33.jpeg',
    pool: 'https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/0fe58f1a-a323-46f8-a89e-5d958c8dc3d8/1777813362629-980d64b6/WhatsApp_Image_2026-05-03_at_12.27.33__1_.jpeg',
    villa: 'https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/0fe58f1a-a323-46f8-a89e-5d958c8dc3d8/1777813361514-54de87ad/WhatsApp_Image_2026-05-03_at_12.25.53.jpeg',
    cottage: 'https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/0fe58f1a-a323-46f8-a89e-5d958c8dc3d8/1777813356682-83033bb6/WhatsApp_Image_2026-05-03_at_12.24.44__1_.jpeg',
  },

  /** Property slugs match DB seed in supabase/schema.sql */
  properties: {
    grand_villa: {
      id: 'grand_villa',
      name: 'The Grand Villa',
      slug: 'grand_villa',
      maxGuests: 12,
      minGuests: 1,
      basePricePerNight: 12500,
      serviceFeeFlat: 1500,
      extraGuestFee: 500,
      includedGuests: 8,
      bedrooms: 4,
      baths: 4,
      imageKey: 'villa',
    },
    cozy_cottage: {
      id: 'cozy_cottage',
      name: 'Cozy Cottage',
      slug: 'cozy_cottage',
      maxGuests: 4,
      minGuests: 1,
      basePricePerNight: 6500,
      serviceFeeFlat: 800,
      extraGuestFee: 400,
      includedGuests: 2,
      bedrooms: 2,
      baths: 2,
      imageKey: 'cottage',
    },
  },

  gstPercent: 12,

  /** Admin emails allowed to sign in (also enforce in Supabase Auth hooks if needed) */
  adminEmails: ['admin@vedantsbungalow.local'],

  /** Fallback reviews when DB empty */
  defaultReviews: [
    { guest_name: 'Rahul Kulkarni', stay_type: 'Family Trip · March 2024', rating: 5, body: 'The pool, rooms and location were excellent. Our group had complete privacy and the caretaker was very helpful throughout the stay.' },
    { guest_name: 'Sneha Agarwal', stay_type: 'Couple Stay · February 2024', rating: 5, body: 'Peaceful, clean and very close to Venna Lake. Perfect for a relaxed couple getaway with safe surroundings and beautiful weather.' },
    { guest_name: 'Amit Patil', stay_type: 'Friends Group · January 2024', rating: 5, body: 'Free parking, power backup and room service made the stay stress-free. The bungalow looks even better in person.' },
    { guest_name: 'Priya Shah', stay_type: 'Family Vacation · December 2023', rating: 5, body: 'The kids loved the pool and we loved the cleanliness. CCTV and caretaker support gave us extra confidence.' },
    { guest_name: 'Nikhil Deshmukh', stay_type: 'Corporate Outing · November 2023', rating: 4, body: 'Spacious, private and well managed. Great choice for a team outing near major Mahabaleshwar attractions.' },
    { guest_name: 'Meera Joshi', stay_type: 'Weekend Stay · October 2023', rating: 5, body: 'Hot water, blankets, TV, Wi-Fi and a calm location—everything was arranged nicely. We will visit again.' },
  ],
};

(function () {
  var c = window.APP_CONFIG;
  if (!c) return;
  if (!c.functionsBase && c.supabaseUrl) {
    c.functionsBase = String(c.supabaseUrl).replace(/\/$/, '') + '/functions/v1';
  }
})();
