# Vedant's Bungalow — website

Static HTML + Tailwind frontend with Supabase (Postgres, Auth, optional Storage) and Razorpay Checkout via Supabase Edge Functions.

## Local preview

```bash
npm start
```

Open the URL shown (defaults to port 3000). Paths like `/index.html` assume a server root; opening files directly from disk may break absolute links and partial fetches.

## Configure Supabase + keys

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Deploy Edge Functions `create-order` and `verify-payment` from `supabase/functions/`, with secrets:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
3. Create an Auth user for the owner and set `adminEmails` in `js/config.js` to that email.

Inject **public** keys in the browser (before `js/config.js` on pages that need them), for example:

```html
<script>
  window.__SUPABASE_URL__ = 'https://YOUR_PROJECT.supabase.co';
  window.__SUPABASE_ANON_KEY__ = 'eyJ...';
  window.__RAZORPAY_KEY_ID__ = 'rzp_test_...';
  window.__GA_MEASUREMENT_ID__ = 'G-...'; /* optional */
</script>
<script src="js/config.js"></script>
```

Never expose the service-role key or Razorpay secret to the browser.

## Booking flow

`index.html` → `booking.html` → `guest-details.html` (creates `pending` row) → `payment.html?bookingId=` (Razorpay) → `confirmation.html?bookingId=`.

## Admin

- `/admin/login.html` — Supabase Auth (email must be listed in `adminEmails` in `js/config.js`).
- `/admin/dashboard.html` — bookings, blocked dates, inquiries, review approval.

## Deploy (Vercel + domain)

1. Push this folder to a GitHub repository.
2. Import the repo in Vercel; no framework preset required.
3. Set environment variables only for build-time injection if you add a small compile step; for the stock static setup, use the inline `window.__...` pattern or edit `js/config.js` for production values.
4. Connect your domain in Vercel; enable HTTPS.
5. Replace `YOUR_PRODUCTION_DOMAIN` in `robots.txt` and `sitemap.xml`.
6. Add Google Analytics (optional) via `__GA_MEASUREMENT_ID__`.
7. Complete Google Search Console and a Google Business Profile for “Vedant's Bungalow Mahabaleshwar”.
8. After Razorpay KYC, switch to live keys and run a small real payment test before marketing the site.

## Images

Hero and gallery URLs currently point at a demo Supabase Storage bucket. For production, copy assets into your own bucket or `assets/images/` and update `js/config.js`.
