const { fetchRealWorldPlaces } = require("../src/lib/places/real-places.server");
const { resolveDestinationCoordinates, haversineDistanceKm } = require("../src/lib/maps/geocoding");

async function testPipeline() {
  const testCities = ["Islamabad", "Jaipur", "Shimla", "Paris"];

  for (const city of testCities) {
    console.log("\n==========================================");
    console.log(`TESTING DESTINATION: ${city}`);
    console.log("==========================================");

    const coords = await resolveDestinationCoordinates(city);
    console.log(`[DIAGNOSTIC] Resolved coordinates for ${city}:`, coords);

    const places = await fetchRealWorldPlaces(city, ["sightseeing", "food"]);
    console.log(`[DIAGNOSTIC] Total real places returned for ${city}: ${places.length}`);

    if (places.length > 0) {
      console.log(`[DIAGNOSTIC] Sample real places for ${city}:`);
      places.slice(0, 5).forEach((p, idx) => {
        const dist = coords
          ? haversineDistanceKm(coords.latitude, coords.longitude, p.latitude, p.longitude)
          : 0;
        console.log(
          `  ${idx + 1}. ${p.name} (${p.category}) - ${dist.toFixed(1)} km - lat:${p.latitude}, lon:${p.longitude}`,
        );
      });
    }
  }
}

testPipeline().catch(console.error);
