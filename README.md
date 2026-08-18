# RoamPulse

## Overview

RoamPulse is an AI-powered travel itinerary generation platform designed to create personalized, practical, and location-aware travel plans.

Users can enter their destination, travel dates, interests, preferences, and other trip requirements. RoamPulse then combines AI-powered itinerary generation with real-world place discovery, geocoding, geographic validation, and curated fallback data to produce a structured itinerary.

The system is designed with a bounded discovery architecture to reduce unnecessary API usage, avoid quota exhaustion, handle unreliable external services, and maintain predictable performance in a serverless production environment.

## Tech Stack

- Frontend: React / TypeScript
- Framework: Modern full-stack React framework with server-side functions
- Styling: Tailwind CSS
- Backend: TypeScript server functions
- AI: Google Gemini
- AI Gateway: Lovable AI Gateway
- Maps & Places: Google Places API
- Geographic Data: OpenStreetMap / Overpass API
- Geocoding: Open-Meteo and Nominatim
- Deployment: Vercel
- Version Control: Git / GitHub
- Runtime: Node.js
- Build & Type Checking: npm, TypeScript

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd roam-pulse-go
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and configure the required API credentials.

Typical configuration includes:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GEMINI_API_KEY=your_gemini_api_key
LOVABLE_API_KEY=your_lovable_api_key
```

Use the exact environment variable names expected by the application.

Never commit API keys, secrets, or `.env` files to Git.

### 4. Run the Development Server

```bash
npm run dev
```

Open the local development URL shown in the terminal.

### 5. Type Check

```bash
npx tsc --noEmit
```

### 6. Production Build

```bash
npm run build
```

## Features

### AI-Powered Itinerary Generation

RoamPulse uses Gemini to generate personalized travel itineraries based on:

- Destination
- Travel dates
- Trip duration
- User interests
- Travel preferences
- Activities
- Food preferences
- Attractions
- Experiences
- Geographic context

### Real-World Place Discovery

The application combines multiple sources to discover actual places and experiences:

- Google Places
- Gemini research
- OpenStreetMap / Overpass
- Curated fallback catalog

This prevents the application from depending entirely on a single external API.

### Bounded API Discovery

The place-discovery pipeline is intentionally bounded.

Instead of making dozens of parallel API searches, RoamPulse limits discovery to a controlled number of queries.

The normal discovery pipeline uses:

- Up to 3 Google Places discovery queries
- Up to 5 bounded Gemini verification queries
- Curated fallback data
- Overpass fallback discovery

This keeps the approximate maximum discovery API-call budget around 8 calls per city.

### API Quota Protection

The Google Places integration detects quota exhaustion and prevents unnecessary follow-up requests during the same generation lifecycle.

When a `429` or `RESOURCE_EXHAUSTED` response is detected, subsequent Google Places calls are skipped instead of continuing to consume quota.

### In-Memory Place Caching

Successfully discovered places are cached in memory with a six-hour TTL.

This reduces repeated API requests when users regenerate itineraries for the same destination.

### Geographic Validation

Discovered places are validated against the requested destination using geographic coordinates and proximity checks.

The system uses:

- Latitude
- Longitude
- Destination coordinates
- Geographic distance
- Destination-region validation

Places outside the reasonable destination area can be filtered out.

### Duplicate Removal

The discovery pipeline performs deduplication so that the final itinerary does not repeatedly contain the same places or experiences.

### Multiple Fallback Layers

If one discovery provider fails, RoamPulse can continue using another source.

The fallback sequence includes:

1. Google Places
2. Gemini research and verification
3. Curated catalog
4. OpenStreetMap / Overpass
5. Geographic validation and deduplication

### Timeout Protection

External API calls have explicit timeouts to prevent serverless functions from hanging indefinitely.

Configured timeout protection includes:

- Gemini itinerary generation: 20 seconds
- Gemini gateway: 20 seconds
- Gemini discovery: 15 seconds
- Google Places: 10 seconds
- Overpass: 12 seconds
- Open-Meteo geocoding: 8 seconds
- Nominatim destination resolution: 8 seconds
- Nominatim location geocoding: 6 seconds
- Itinerary-item geocoding: 4 seconds

### Serverless Performance Optimization

The itinerary generation pipeline avoids unnecessary network calls.

Previously, individual itinerary items could trigger additional geocoding requests. The optimized implementation instead reuses coordinates already resolved during the discovery stage.

This eliminates unnecessary N-per-item geocoding requests.

### Error Handling

The application handles external API failures without immediately terminating the entire itinerary-generation process.

Examples include:

- API quota exhaustion
- HTTP errors
- API timeouts
- Gemini failures
- Geocoding failures
- Missing place data
- Empty discovery results

### Production Monitoring

The itinerary pipeline includes timing instrumentation to make production performance easier to diagnose.

Important logs include:

```text
[RoamPulse][Places] discovery complete
[RoamPulse][Gemini] HTTP 200
[RoamPulse][Gemini] TIMEOUT
[RoamPulse][Itinerary] COMPLETE
```

These logs help identify slow or failing stages in the Vercel production environment.

## Technical Workflow

### 1. User Creates a Trip

The user enters their trip information through the trip creation interface.

Example information includes:

- Destination
- Start date
- End date
- Interests
- Travel preferences
- Desired experiences

### 2. Destination Resolution

RoamPulse resolves the destination into geographic coordinates.

The system uses available geocoding services and applies timeout protection to prevent a slow geocoding provider from blocking the entire request.

### 3. City Discovery Pipeline

The application starts the bounded real-world place discovery process.

The first stage performs a limited Google Places search.

Instead of sending a large number of category queries, RoamPulse performs a small number of high-value searches covering:

- Attractions and landmarks
- Restaurants and food
- User-specific interests or hidden gems

### 4. Quota Detection

If Google Places responds with a quota-related error such as:

```text
429
RESOURCE_EXHAUSTED
```

RoamPulse marks Google Places as quota exhausted for the current request lifecycle.

Further Google Places requests are skipped.

### 5. Gemini Research

Gemini is used to discover additional relevant places and experiences that may not have been returned by the initial Places search.

Gemini discovery is also protected by a timeout.

### 6. Place Verification

Gemini-discovered candidates are verified using a bounded number of Google Places requests.

Verification is intentionally limited so that AI discovery cannot create an unbounded number of external API requests.

### 7. Curated Fallback

If external discovery sources do not provide enough usable results, RoamPulse falls back to its curated destination catalog.

This provides a reliable baseline even when external APIs are unavailable.

### 8. OpenStreetMap / Overpass Fallback

The system can also query OpenStreetMap data through Overpass.

Overpass is used to find real geographic entities such as:

- Attractions
- Tourism locations
- Historic places
- Amenities
- Points of interest

This replaces the previous reliance on Nominatim search for POI discovery.

### 9. Geographic Validation

All discovered candidates are evaluated against the destination's geographic coordinates.

Places that are too far from the destination can be rejected.

The system uses a proximity threshold to prevent unrelated places from appearing in an itinerary.

### 10. Deduplication

The candidate pool is normalized and deduplicated before being passed to the itinerary-generation stage.

### 11. AI Itinerary Generation

The validated place pool and user requirements are passed to Gemini.

Gemini generates the final structured itinerary based on:

- User preferences
- Trip duration
- Destination
- Available places
- Geographic relationships
- Activities
- Dining
- Experiences

### 12. Final Validation

The generated itinerary is processed again to ensure that places correspond to the discovered destination data and that valid geographic information is available.

The implementation reuses coordinates already present in the city candidate pools rather than making additional geocoding requests for every itinerary item.

### 13. Final Response

The validated itinerary is returned to the frontend and presented to the user as a structured travel plan.

## Performance & Reliability Architecture

RoamPulse was specifically optimized for serverless production environments.

The system uses several defensive mechanisms:

- Bounded external API calls
- Request timeouts
- API quota detection
- In-memory caching
- Multiple fallback providers
- Geographic validation
- Deduplication
- Reuse of previously resolved coordinates
- Pipeline timing instrumentation
- Graceful external-service failure handling

This architecture prevents a single slow or unavailable API from unnecessarily blocking the complete itinerary-generation pipeline.

## Future Integration

### Persistent Database

Introduce a persistent database such as Supabase/PostgreSQL for:

- User accounts
- Saved trips
- Saved itineraries
- Favorite destinations
- Travel history
- Persistent place caching

### Persistent Caching

Move the current in-memory cache to a persistent caching layer so that cached places can be reused across serverless function instances and deployments.

### User Authentication

Add authentication and personalized user profiles so users can save and manage their travel plans.

### Advanced Personalization

Improve itinerary personalization using:

- Previous trips
- Saved places
- Favorite activities
- Travel style
- Budget preferences
- Dietary preferences
- Preferred trip pace

### Live Travel Data

Future integrations could provide:

- Weather forecasts
- Flight information
- Hotel availability
- Restaurant availability
- Local events
- Traffic information
- Attraction opening hours

### Interactive Maps

Add interactive maps showing:

- Daily itinerary routes
- Places to visit
- Restaurants
- Hotels
- Attractions
- Distance between activities

### Route Optimization

Introduce route optimization to arrange daily activities geographically and reduce unnecessary travel time.

### Multi-City Trips

Expand the system to support complex multi-city journeys with:

- Inter-city transportation
- City-by-city itinerary generation
- Automatic travel-time estimation
- Optimized city sequencing

### Smarter AI Planning

Future versions can use more advanced AI planning to dynamically balance:

- Activities
- Travel time
- Food
- Rest
- Budget
- Opening hours
- User preferences

### Observability & Analytics

Introduce dedicated monitoring and analytics for:

- API latency
- API failure rates
- Cache hit rates
- Generation duration
- Quota consumption
- User behavior
- Itinerary quality

### Additional Data Providers

The architecture can be extended with additional travel-data providers to improve resilience and coverage without depending on a single external service.

## Project Status

RoamPulse currently includes a production-oriented itinerary generation pipeline with bounded place discovery, API quota protection, caching, timeout handling, geographic validation, fallback discovery, and AI-powered itinerary generation.

The application has been type-checked and production-built successfully, and is deployed on Vercel for final production testing.
