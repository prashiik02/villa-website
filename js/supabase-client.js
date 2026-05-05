(function () {
  var client = null;

  function getClient() {
    if (client) return client;
    var c = window.APP_CONFIG || {};
    var supa = window.supabase;
    if (!c.supabaseUrl || !c.supabaseAnonKey || !supa || typeof supa.createClient !== 'function') {
      return null;
    }
    client = supa.createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return client;
  }

  window.getSupabase = getClient;
})();
