const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://betmcvtyqsbxhzvraglg.supabase.co";
const SUPABASE_KEY = "sb_publishable_EJxFkuQugUpxoRLnR0dKtg_XKZzvEb9";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("=== DIAGNOSTIC START ===");

  // Try sign up or sign in
  const email = "dhira.test@gmail.com";
  const password = "TestPassword123!";

  let authRes = await supabase.auth.signInWithPassword({ email, password });
  if (authRes.error) {
    console.log("Sign in failed, trying sign up:", authRes.error.message);
    authRes = await supabase.auth.signUp({ email, password });
  }

  if (authRes.error || !authRes.data.session) {
    console.error("Auth error:", authRes.error);
    return;
  }

  console.log("Authenticated as user:", authRes.data.session.user.id);
  const token = authRes.data.session.access_token;

  // Create authenticated client
  const authSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  // Fetch trips for this authenticated user
  const { data: trips, error: tripsErr } = await authSupabase.from("trips").select("*");
  if (tripsErr) {
    console.error("Trips fetch error:", tripsErr);
    return;
  }

  console.log(`Found ${trips.length} trips for user:\n`);
  for (const t of trips) {
    console.log(`==================================================`);
    console.log(`TRIP ID: ${t.id}`);
    console.log(`Name / Destination: "${t.name}" -> ${t.destination}`);
    console.log(`Style: ${t.travel_style} | Mode: ${t.recovery_mode}`);
    console.log(`Dates: ${t.start_date} -> ${t.end_date} | Budget: ${t.budget} ${t.currency}`);
    console.log(`Interests:`, t.interests);
    console.log(`Preferences:`, JSON.stringify(t.preferences));

    // Fetch itinerary_items for this trip
    const { data: items = [], error: itemsErr } = await authSupabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", t.id);

    if (itemsErr) {
      console.error(`Items fetch error for ${t.id}:`, itemsErr);
      continue;
    }

    const total = items.length;
    const active = items.filter((i) => i.status !== "replaced").length;
    const locked = items.filter((i) => i.is_locked && i.status !== "replaced").length;
    const replaced = items.filter((i) => i.status === "replaced").length;
    const confirmed = items.filter((i) => i.status === "confirmed").length;
    const flexible = items.filter((i) => i.status === "flexible").length;

    console.log(`ITINERARY METRICS:`);
    console.log(`  Total items: ${total}`);
    console.log(`  Active items (status !== replaced): ${active}`);
    console.log(`  Locked active items (is_locked = true): ${locked}`);
    console.log(`  Replaced items (status = replaced): ${replaced}`);
    console.log(`  Confirmed status: ${confirmed} | Flexible status: ${flexible}`);

    // Detail sample of items
    console.log(`\nSample of active items:`);
    items
      .filter((i) => i.status !== "replaced")
      .slice(0, 10)
      .forEach((i) => {
        console.log(
          `   - [${i.id}] locked=${i.is_locked} status=${i.status} day=${i.day_date} ${i.start_time}-${i.end_time}: "${i.title}"`,
        );
      });

    // Check recoveries
    const { data: recs = [] } = await authSupabase
      .from("recovery_recommendations")
      .select("*")
      .eq("trip_id", t.id);

    console.log(`\nRECOVERY RECOMMENDATIONS: ${recs.length}`);
    recs.forEach((r) => {
      console.log(`   - [${r.id}] status=${r.status} type=${r.disruption_type}`);
    });

    // Check history
    const { data: hist = [] } = await authSupabase
      .from("trip_history")
      .select("*")
      .eq("trip_id", t.id)
      .order("created_at", { ascending: false });

    console.log(`\nTRIP HISTORY (latest 5): ${hist.length} total`);
    hist.slice(0, 5).forEach((h) => {
      console.log(`   - [${h.created_at}] event="${h.event}" detail="${h.detail}"`);
    });
    console.log(`==================================================\n`);
  }
}

run().catch(console.error);
