const {
  fetchMultiCityRealWorldPlaces,
  parseTripDestinations,
  fetchRealWorldPlacesForCity,
} = require("../src/lib/places/real-places.server");
const { generateItinerary } = require("../src/lib/itinerary.server");

async function runMultiCityDiagnostic() {
  console.log("==========================================");
  console.log("ROAMPULSE MULTI-CITY REAL-PLACE DIAGNOSTIC");
  console.log("==========================================\n");

  // Test 1: Destination Parser
  console.log("--- TEST 1: DESTINATION PARSER ---");
  const testInputs = [
    "Paris",
    "Paris, Amsterdam",
    "Paris -> Amsterdam -> Rome",
    "Paris; Amsterdam; Rome",
  ];
  for (const input of testInputs) {
    const parsed = parseTripDestinations(input);
    console.log(`Input: "${input}" -> Parsed Cities:`, parsed);
  }

  // Test 2: Multi-City Candidate Pools
  console.log("\n--- TEST 2: MULTI-CITY PLACE DISCOVERY ---");
  const cityTests = ["Paris", "Islamabad", "Tokyo", "Paris, Amsterdam", "Paris, Amsterdam, Rome"];

  for (const dest of cityTests) {
    console.log(`\nTesting Candidate Pools for: "${dest}"`);
    const pools = await fetchMultiCityRealWorldPlaces(dest, [], ["culture", "food", "history"]);
    console.log(`Total Cities Discovered: ${pools.length}`);

    for (const pool of pools) {
      console.log(
        `  City: ${pool.city} (Lat: ${pool.latitude.toFixed(4)}, Lon: ${pool.longitude.toFixed(4)})`,
      );
      console.log(`  Verified Candidate Places Found: ${pool.candidates.length}`);
      console.log("  Sample Candidates:");
      pool.candidates.slice(0, 5).forEach((p, idx) => {
        console.log(
          `    ${idx + 1}. ${p.name} [${p.category}] - ${p.address || "N/A"} (Rating: ${p.rating || "N/A"})`,
        );
      });
    }
  }

  // Test 3: Full Itinerary Generation Pipeline
  console.log("\n--- TEST 3: FULL ITINERARY GENERATION ---");
  const tripTestCases = [
    {
      name: "Paris 3-Day Trip",
      destination: "Paris",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
    },
    {
      name: "Islamabad 3-Day Trip",
      destination: "Islamabad",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
    },
    {
      name: "Tokyo 3-Day Trip",
      destination: "Tokyo",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
    },
    {
      name: "Multi-City 4-Day Trip: Paris & Amsterdam",
      destination: "Paris, Amsterdam",
      startDate: "2026-09-01",
      endDate: "2026-09-04",
    },
    {
      name: "Multi-City 6-Day Trip: Paris, Amsterdam, Rome",
      destination: "Paris, Amsterdam, Rome",
      startDate: "2026-09-01",
      endDate: "2026-09-06",
    },
  ];

  for (const testCase of tripTestCases) {
    console.log(`\n==========================================`);
    console.log(`RUNNING PIPELINE TEST: ${testCase.name}`);
    console.log(`==========================================`);

    const input = {
      name: testCase.name,
      origin: "New York",
      destination: testCase.destination,
      extraDestinations: [],
      startDate: testCase.startDate,
      endDate: testCase.endDate,
      arrivalTime: "14:00",
      departureTime: "16:00",
      adults: 2,
      children: 0,
      budget: 3000,
      currency: "USD",
      travelStyle: "balanced",
      interests: ["Culture", "History", "Food"],
      preferences: {
        indoorOutdoor: "balanced",
        pace: "moderate",
        transport: "public_transit",
        accommodation: "hotel",
      },
      recoveryMode: "assisted",
      automationSettings: {
        maxExtraSpend: 500,
        autoReplace: ["flexible"],
        alwaysAsk: ["flights"],
      },
    };

    const genId = "test-gen-" + Date.now();
    const result = await generateItinerary(input, { generationId: genId });

    console.log(`\n--- RESULTS FOR ${testCase.name} ---`);
    console.log(`Generation Source: ${result.source}`);
    console.log(`Generation State: ${result.state}`);
    if (result.notice) console.log(`Notice: ${result.notice}`);
    console.log(`Total Generated Items: ${result.items.length}`);

    const verifiedPlaces = result.items.filter((i) => i.verification_status === "verified");
    const structuralItems = result.items.filter(
      (i) => i.is_structural || i.category === "transit" || i.category === "accommodation",
    );

    console.log(`Verified Real Place Items: ${verifiedPlaces.length}`);
    console.log(`Structural Logistics Items: ${structuralItems.length}`);

    console.log("\nGenerated Itinerary Schedule:");
    result.items.forEach((item) => {
      const badge = item.verification_status === "verified" ? "[✓ REAL PLACE]" : "[LOGISTICS]";
      console.log(
        `  ${item.day_date} | ${item.start_time} - ${item.end_time} | ${badge} ${item.title} (${item.category})`,
      );
    });
  }
}

runMultiCityDiagnostic().catch(console.error);
