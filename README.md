# 🌍 RoamPulse — AI-Powered Intelligent Travel Planning

> Plan smarter. Explore better. Travel with confidence.

RoamPulse is an AI-powered travel planning platform that transforms a user's destination, travel dates, interests, and preferences into a personalized, geographically-aware itinerary.

Unlike a simple AI chatbot that generates travel suggestions from text alone, RoamPulse combines AI reasoning with real-world place discovery, geographic validation, multiple external data sources, bounded API usage, caching, fallback systems, and serverless performance safeguards.

The result is a travel planning system designed not only to generate an itinerary, but to generate one using real, relevant, and geographically appropriate places while remaining resilient when external APIs fail or become unavailable.

---

# ✨ Why RoamPulse?

Travel itinerary generation sounds simple:

User → AI → Itinerary

In practice, it is much harder.

A useful itinerary needs to consider:

- Is the place real?
- Is it actually located near the destination?
- Is it relevant to the user's interests?
- Are there enough places to build a complete trip?
- What happens if a Places API fails?
- What happens when an API quota is exhausted?
- What happens if an external API hangs?
- Can the system run reliably inside a serverless environment?
- Can repeated generations avoid unnecessary API calls?

RoamPulse was designed around these real-world engineering problems.

The architecture therefore follows:

User Input
    ↓
Destination Resolution
    ↓
Bounded Place Discovery
    ↓
AI Research
    ↓
Place Verification
    ↓
Fallback Discovery
    ↓
Geographic Validation
    ↓
Deduplication
    ↓
AI Itinerary Generation
    ↓
Final Validation
    ↓
Personalized Itinerary

---

# 🎯 Core Objective

The primary objective of RoamPulse is to create personalized travel itineraries while maintaining:

- Real-world relevance
- Geographic correctness
- API efficiency
- Fault tolerance
- Predictable execution time
- Graceful degradation
- Extensibility

The project focuses not only on the AI output, but also on the engineering system required to make AI-powered travel planning practical in production.

---

# 🚀 Key Features

## 🤖 AI-Powered Itinerary Generation

RoamPulse uses Gemini to transform user preferences and discovered destination data into a structured travel itinerary.

The AI considers factors such as:

- Destination
- Travel dates
- Trip duration
- Interests
- Activities
- Food preferences
- Attractions
- Experiences
- Geographic relationships between locations

Instead of asking the AI to invent an itinerary from scratch, RoamPulse provides it with a validated pool of real-world places.

This improves the connection between AI-generated recommendations and actual destinations.

---

## 📍 Real-World Place Discovery

RoamPulse combines multiple discovery sources rather than depending on a single API.

The discovery pipeline can use:

1. Google Places
2. Gemini research
3. Curated destination data
4. OpenStreetMap / Overpass

This multi-source architecture improves resilience and allows the application to continue operating when one source provides incomplete or unavailable data.

---

## 🧠 Bounded Discovery Engine

One of the most important architectural decisions in RoamPulse is that external API usage is intentionally bounded.

An early version of the system used aggressive parallel discovery with many search queries.

That approach created problems:

- Excessive API consumption
- Quota exhaustion
- Increased latency
- More failure points
- Unpredictable serverless execution time

The discovery engine was redesigned around a bounded strategy.

### Google Places Discovery

The system performs a maximum of three high-value discovery searches:

1. Top attractions and landmarks
2. Restaurants and food
3. User-interest-specific discovery or hidden gems

### AI Verification

Gemini-discovered candidates are verified using a bounded number of additional requests.

### Approximate Per-City Budget

The discovery pipeline is designed around a maximum external discovery budget of approximately:

8 API calls per city

This is significantly lower than the original unbounded/aggressive approach.

---

# 🛡️ API Quota Protection

External APIs can fail for reasons that are outside the application's control.

RoamPulse explicitly handles Google Places quota exhaustion.

When the system receives quota-related responses such as:

429
RESOURCE_EXHAUSTED

it marks the Places provider as exhausted for the current request lifecycle.

Subsequent Google Places requests are skipped instead of continuing to consume quota.

This allows the system to move toward fallback sources instead of repeatedly hitting a failing provider.

---

# ⚡ Intelligent Caching

Repeatedly discovering the same destination is unnecessary and expensive.

RoamPulse therefore includes an in-memory place discovery cache.

### Cache characteristics

- Destination-based cache keys
- Case-insensitive normalization
- Six-hour TTL
- Immediate return on cache hit
- Avoids repeated external discovery requests

Conceptually:

Destination
    ↓
Cache Check
    ├── HIT  → Return cached places
    └── MISS → Discover → Validate → Cache

This reduces API usage and improves response performance for repeated requests.

---

# 🌎 Geographic Validation

AI-generated or externally discovered places cannot simply be trusted because they have a valid name.

RoamPulse validates places geographically.

The system uses:

- Latitude
- Longitude
- Destination coordinates
- Distance calculations
- Destination-region validation

A proximity threshold is used to prevent unrelated places from being included in a destination itinerary.

This is especially important for cities or regions with similar names and for AI-generated recommendations that may otherwise be geographically incorrect.

---

# 🔄 Multi-Level Fallback Architecture

RoamPulse is designed to degrade gracefully.

If one external source fails, the system can continue through alternative sources.

The discovery pipeline follows a layered strategy:

### Stage 1 — Google Places

Primary real-world place discovery.

### Stage 2 — Gemini Research + Verification

AI-assisted discovery and bounded verification.

### Stage 3 — Curated Catalog

Reliable application-controlled fallback data.

### Stage 4 — OpenStreetMap / Overpass

Additional geographic and point-of-interest discovery.

### Stage 5 — Validation + Deduplication

Only appropriate and relevant places continue to the itinerary stage.

This means the system is not dependent on a single external provider.

---

# 🗺️ OpenStreetMap / Overpass Integration

The original implementation relied on Nominatim for POI discovery.

However, Nominatim search can return administrative boundaries instead of useful points of interest.

RoamPulse therefore uses Overpass for POI discovery.

Overpass can retrieve relevant geographic entities such as:

- Tourism locations
- Historic locations
- Amenities
- Attractions
- Other points of interest

When destination coordinates are available, the system can search within an appropriate geographic bounding area.

This provides more useful geographic data for itinerary construction.

---

# ⏱️ Serverless Timeout Protection

Serverless functions cannot safely depend on unlimited external request duration.

RoamPulse therefore places explicit timeout boundaries around external network requests.

### Timeout strategy

| External Operation | Timeout |
|---|---:|
| Gemini itinerary generation | 20s |
| Gemini gateway | 20s |
| Gemini discovery | 15s |
| Google Places | 10s |
| Overpass | 12s |
| Open-Meteo geocoding | 8s |
| Nominatim destination resolution | 8s |
| Nominatim location lookup | 6s |
| Itinerary-item geocoding | 4s |

If an upstream service becomes unresponsive, the request is aborted rather than allowing the complete pipeline to hang.

---

# 🚀 Performance Optimization

A major optimization was removing unnecessary per-item network requests.

### Previous approach

For every generated itinerary item:

Itinerary Item
    ↓
Resolve Coordinates
    ↓
Network Request
    ↓
Validate

For N itinerary items, this could result in N additional geocoding calls.

### Optimized approach

RoamPulse already resolves destination coordinates during the discovery phase.

Those coordinates are stored in the city candidate pool and reused during final validation.

The new approach is:

City Discovery
    ↓
Resolve Coordinates Once
    ↓
Store Coordinates
    ↓
Reuse During Validation

This removes unnecessary network round-trips and makes the final validation stage significantly more efficient.

---

# 📊 Pipeline Observability

Production debugging becomes difficult when a request simply appears "slow."

RoamPulse therefore includes pipeline timing instrumentation.

The system records timing information for important stages such as:

- Discovery
- Gemini requests
- Complete itinerary generation

Example production logs:

[RoamPulse][Places] discovery complete | duration: XXXms

[RoamPulse][Gemini] HTTP 200 | duration: XXXms

[RoamPulse][Gemini] TIMEOUT

[RoamPulse][Itinerary] COMPLETE | duration: XXXms

This makes it easier to identify which stage is responsible for slow generations or failures.

---

# 🧩 Fault-Tolerant Architecture

RoamPulse assumes that external services can fail.

Instead of treating every external API failure as a fatal application error, the system attempts to continue using alternative strategies.

Potential failure cases include:

- API timeout
- API quota exhaustion
- HTTP errors
- Empty discovery results
- Geocoding failure
- Gemini failure
- Missing geographic coordinates
- Incomplete external data

The architecture is designed around graceful degradation rather than single-provider dependency.

---

# 🔐 API Key Safety

All external API credentials should be stored through environment variables.

Secrets should never be hardcoded into frontend code or committed to source control.

Expected configuration can include:

GOOGLE_MAPS_API_KEY
GEMINI_API_KEY
LOVABLE_API_KEY

The exact environment variable names should match the application's implementation.

---

# 🏗️ Technical Architecture

At a high level:

Frontend
    ↓
Trip Creation
    ↓
Server Function
    ↓
Destination Resolution
    ↓
Place Discovery Engine
    ├── Google Places
    ├── Gemini Research
    ├── Curated Catalog
    └── Overpass / OpenStreetMap
    ↓
Candidate Validation
    ↓
Geographic Filtering
    ↓
Deduplication
    ↓
Gemini Itinerary Generation
    ↓
Final Validation
    ↓
Frontend Itinerary

---

# 🔧 Tech Stack

## Frontend

- React
- TypeScript
- Tailwind CSS

## Backend

- TypeScript
- Server-side functions
- Node.js runtime

## Artificial Intelligence

- Google Gemini
- Lovable AI Gateway

## Places & Geographic Data

- Google Places API
- OpenStreetMap
- Overpass API
- Open-Meteo
- Nominatim

## Deployment

- Vercel

## Development

- npm
- TypeScript
- Git
- GitHub

---

# 📁 Important Architecture Components

The core implementation is organized around several major responsibilities.

### `src/lib/itinerary.server.ts`

Responsible for:

- Itinerary generation
- Gemini communication
- Generation orchestration
- Candidate validation
- Pipeline timing
- Final itinerary construction

### `src/lib/places/real-places.server.ts`

Responsible for:

- Real-world place discovery
- Google Places integration
- Gemini discovery
- Place verification
- Caching
- Quota protection
- Overpass fallback
- Place deduplication

### `src/lib/maps/geocoding.ts`

Responsible for:

- Destination coordinate resolution
- Geocoding
- Geographic validation
- Coordinate handling

---

# 🛠️ Local Setup

## 1. Clone the repository

git clone <repository-url>

cd roam-pulse-go

## 2. Install dependencies

npm install

## 3. Configure environment variables

Create a `.env` file and provide the required API credentials.

Example:

GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GEMINI_API_KEY=your_gemini_api_key
LOVABLE_API_KEY=your_lovable_api_key

Do not commit `.env` files or API secrets.

## 4. Start development server

npm run dev

## 5. Type check

npx tsc --noEmit

## 6. Build for production

npm run build

---

# ✅ Verification

The project has been verified using:

### TypeScript

npx tsc --noEmit

Result:

Zero TypeScript errors.

### Production Build

npm run build

Result:

Successful production build.

### Production Deployment

The application is deployed through Vercel.

Production URL:

https://roam-pulse-go.vercel.app

---

# 🧪 Example User Flow

A typical trip-generation request looks like:

User enters:

Destination:
Bir Billing

Dates:
18 Aug 2026 → 25 Aug 2026

Interests:
Adventure, nature, food, local experiences

↓

RoamPulse resolves the destination.

↓

The discovery engine searches for relevant real-world places.

↓

External results are validated geographically.

↓

Gemini researches additional relevant experiences.

↓

Duplicate and geographically invalid places are removed.

↓

The validated place pool is provided to Gemini.

↓

Gemini generates a structured multi-day itinerary.

↓

The final itinerary is validated and returned to the user.

---

# 💡 Engineering Challenges Solved

RoamPulse was not built as a simple "prompt → AI response" application.

Several real engineering challenges were addressed during development.

### Challenge 1 — API Quota Exhaustion

Aggressive place discovery caused excessive API consumption.

Solution:

Bounded discovery + quota detection + caching.

---

### Challenge 2 — Legacy API Reliability

Legacy Google Places endpoints could return request-denied errors.

Solution:

Use the newer Places integration and remove the obsolete fallback.

---

### Challenge 3 — AI Model Changes

AI providers can deprecate models.

Solution:

Update the Gemini integration to the supported model and centralize model configuration.

---

### Challenge 4 — Poor POI Discovery

Nominatim was not suitable as the primary POI discovery mechanism.

Solution:

Use Overpass for actual geographic points of interest.

---

### Challenge 5 — Unbounded Verification

AI discovery could potentially trigger large numbers of verification requests.

Solution:

Bound verification to a fixed maximum.

---

### Challenge 6 — Serverless Timeouts

External services could hang and consume the entire serverless execution window.

Solution:

Explicit AbortController-based timeouts across external fetch operations.

---

### Challenge 7 — Unnecessary Network Calls

Final itinerary validation repeatedly resolved coordinates.

Solution:

Reuse coordinates already resolved during city discovery.

---

### Challenge 8 — Difficult Production Debugging

Slow requests were difficult to diagnose.

Solution:

Pipeline-level timing instrumentation and structured logs.

---

# 🎯 Design Principles

RoamPulse follows several engineering principles:

### 1. AI should not be the only source of truth

AI is powerful for reasoning and personalization, but real-world place data should be validated against external geographic sources.

### 2. External APIs are unreliable

Every external dependency should have:

- A timeout
- Error handling
- A fallback where possible

### 3. API usage should be bounded

More API calls do not automatically mean better results.

The system prioritizes high-value queries over brute-force discovery.

### 4. Reuse data whenever possible

Previously resolved coordinates and cached places should be reused instead of repeatedly requesting the same information.

### 5. Graceful degradation is better than total failure

If Google Places fails, the application should still have alternative discovery mechanisms.

### 6. Observability matters

Performance instrumentation is essential when debugging serverless applications and external API dependencies.

---

# 📈 Future Integrations

RoamPulse has been designed so that additional travel services can be integrated without replacing the core itinerary architecture.

## Persistent Database

Future versions can integrate Supabase/PostgreSQL for:

- User accounts
- Saved trips
- Saved itineraries
- Favorite places
- Travel history
- Persistent caching

## Authentication

Add secure authentication and personalized user profiles.

## Persistent Distributed Cache

Move from in-memory caching to a shared caching system so cached destinations can be reused across serverless instances.

## Live Weather

Integrate live weather data to dynamically adjust activities and daily plans.

For example:

Rainy day
    ↓
Outdoor activity reduced
    ↓
Indoor alternatives recommended

## Hotel Integration

Future versions could recommend accommodation based on:

- Budget
- Location
- Trip style
- Distance from itinerary activities

## Restaurant Availability

Integrate live restaurant availability and reservations.

## Transportation

Add:

- Flights
- Trains
- Buses
- Local transportation
- Travel-time estimation

## Interactive Maps

Display the complete itinerary visually with:

- Daily routes
- Attractions
- Restaurants
- Hotels
- Travel distances

## Route Optimization

Automatically optimize daily activities based on geography to reduce unnecessary travel.

## Multi-City Planning

Support complete journeys across multiple cities with:

- City sequencing
- Inter-city transportation
- Travel-time calculations
- City-specific itinerary generation

## Advanced Personalization

Future AI models can learn from:

- Saved trips
- Favorite destinations
- Preferred activities
- Budget
- Travel pace
- Previous choices

## Real-Time Adaptive Itineraries

A future version could dynamically modify an itinerary based on:

- Weather
- Traffic
- Opening hours
- Events
- Delays
- User changes

For example:

Weather changes
    ↓
Existing itinerary evaluated
    ↓
Affected activities identified
    ↓
Alternative activities discovered
    ↓
AI regenerates affected portion
    ↓
Updated itinerary delivered

---

# 🌟 Vision

RoamPulse aims to evolve from an itinerary generator into an intelligent travel planning platform.

The long-term vision is:

User Preference
    +
Real-World Data
    +
Geographic Intelligence
    +
AI Reasoning
    +
Real-Time Context
    ↓
Adaptive Personal Travel Assistant

Instead of simply telling users where they could go, RoamPulse can eventually understand the entire context of a trip and continuously help users decide what to do next.

---

# 🏆 What Makes RoamPulse Different?

RoamPulse combines several capabilities that are often implemented independently:

✓ AI itinerary generation

✓ Real-world place discovery

✓ Geographic validation

✓ Multi-source data discovery

✓ API quota protection

✓ Bounded external API usage

✓ Intelligent caching

✓ Timeout protection

✓ Fault-tolerant fallbacks

✓ Serverless performance optimization

✓ Pipeline observability

The project therefore demonstrates both sides of modern AI application development:

AI product design

and

production-oriented engineering.

---

# 📌 Project Status

RoamPulse is deployed and ready for production testing.

The current implementation includes:

- AI-powered itinerary generation
- Real-world place discovery
- Bounded discovery architecture
- Google Places integration
- Gemini integration
- OpenStreetMap / Overpass fallback
- Geographic validation
- Place deduplication
- API quota protection
- Six-hour discovery caching
- External request timeouts
- Serverless performance optimization
- Pipeline timing instrumentation
- Multi-level fallback architecture

---

# 👨‍💻 Final Note

RoamPulse was built with the idea that a good AI product is not just about generating impressive text.

A useful AI application must also deal with:

real data,
unreliable APIs,
rate limits,
timeouts,
geographic accuracy,
performance,
fallbacks,
and scalability.

RoamPulse focuses on solving those problems together to create a more reliable foundation for AI-powered travel planning.

---

## 🌍 RoamPulse

Plan smarter. Explore better. Travel with confidence.