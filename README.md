# RoamPulse

AI-Powered Practical Travel Planner for Real-World Itinerary Generation

RoamPulse is an AI-powered travel planning application that helps users create practical, realistic, and personalized travel itineraries based on their destination, dates, budget, travel pace, and interests.

The project is designed to go beyond simply generating a list of tourist attractions. RoamPulse combines Gemini AI with real-world place data to create itineraries that are geographically practical, time-aware, budget-conscious, and easy to follow.

Built as a hackathon project with a focus on demonstrating a realistic end-to-end travel planning workflow.


## Table of Contents

1. Overview
2. Problem Statement
3. Solution
4. Key Features
5. How RoamPulse Works
6. AI Itinerary Generation Workflow
7. Real Place Verification Workflow
8. Itinerary Generation Workflow
9. Content Workflow
10. Practicality & Planning Rules
11. Global Activity Uniqueness
12. Budget Workflow
13. Map & Location Workflow
14. Regeneration Workflow
15. Fallback & Reliability
16. Technology Stack
17. Project Architecture
18. Data Flow
19. Environment Variables
20. Getting Started
21. Running the Project
22. Production Deployment
23. Example Itinerary
24. Hackathon Demo Flow
25. Limitations
26. Future Improvements
27. Quality & Verification
28. Project Goal


## 1. Overview

Planning a trip often requires combining information from multiple sources:

- Places to visit
- Restaurants and cafes
- Opening hours
- Travel time
- Budget
- Number of days
- Personal interests
- Arrival and departure constraints
- Geographic location

Traditional AI itinerary generators can produce attractive-looking plans but may include:

- Invented places
- Unrealistic schedules
- Repeated attractions
- Too many activities in one day
- Impossible travel times
- Restaurants that do not exist
- Missing days
- Incorrect accommodation costs
- Generic activities such as "Explore the city"

RoamPulse addresses these problems by combining AI planning with real-world place data and deterministic validation.

The goal is not to generate the longest itinerary.

The goal is to generate an itinerary that a real traveler could actually follow.


## 2. Problem Statement

Most AI travel planners focus primarily on generating natural-language recommendations.

However, a practical itinerary requires much more than recommendations.

For example:

A user traveling to Shimla for four days should not receive:

Day 1:
- Explore Shimla

Day 2:
- Visit local attractions

Day 3:
- Explore culture

Day 4:
- Free time

Instead, the user should receive specific real places with realistic timings, travel buffers, meals, costs, and departure constraints.

RoamPulse is designed around this practical planning problem.


## 3. Solution

RoamPulse uses a multi-stage itinerary generation pipeline.

The application:

1. Collects trip preferences.
2. Identifies the destination and travel dates.
3. Retrieves real-world places.
4. Organizes those places into useful candidate categories.
5. Sends verified place context to Gemini.
6. Instructs Gemini to act as a practical travel planner.
7. Generates structured itinerary data.
8. Validates the generated response.
9. Removes duplicate activities globally.
10. Checks date coverage.
11. Repairs missing dates when necessary.
12. Adds location metadata.
13. Calculates practical travel timing.
14. Calculates budget categories.
15. Stores the itinerary in Supabase.
16. Displays the itinerary and map in the frontend.

This creates a complete AI-to-application workflow rather than simply displaying an AI-generated text response.


## 4. Key Features

### AI-Powered Itinerary Generation

RoamPulse uses Google Gemini to generate personalized itineraries based on:

- Destination
- Start date
- End date
- Budget
- Travel pace
- Interests
- Arrival time
- Departure time

### Real Places

The AI is provided with real-world candidate places retrieved through Google Places.

These candidates can contain:

- Place name
- Address
- Coordinates
- Rating
- Opening hours
- Price level
- Category

This significantly reduces the possibility of fictional attractions or restaurants being generated.

### Real Place Verification

Generated places are matched against the verified place dataset.

Verified places can display:

"REAL PLACE"

along with location metadata.

### Practical Scheduling

RoamPulse considers:

- Opening hours
- Activity duration
- Meal windows
- Travel time
- Arrival time
- Departure time
- Travel pace

### Geographic Clustering

Activities are grouped geographically to reduce unnecessary movement across the city.

The application uses geographic distance calculations to order activities more practically.

### Global Activity Uniqueness

A real attraction, restaurant, museum, market, viewpoint, temple, or cultural site should not be reused multiple times during the same trip.

RoamPulse performs canonical identity matching to detect:

- Exact duplicate places
- Different titles for the same place
- Restaurant name repetition
- Coordinate-level duplicates
- Similar attraction names

### Personalized Interests

Users can select interests such as:

- Culture
- Food
- Nature
- Shopping
- Adventure

These interests influence the type of places prioritized during itinerary generation.

### Budget Breakdown

The trip budget is divided into:

- Accommodation
- Activities
- Food & Dining
- Transportation
- Other

Accommodation is never incorrectly displayed as free or ₹0.

### Interactive Map

The itinerary can be visualized geographically.

The map uses real coordinates when available and falls back to destination-aware coordinates instead of using an unrelated default location.

### Regeneration

Users can regenerate an itinerary to receive a fresh plan.

A clean regeneration removes old generated itinerary items and allows Gemini to create a new itinerary without being unnecessarily constrained by the previous itinerary.

### Reliable Fallback

If Gemini is unavailable because of:

- Missing API key
- Network failure
- API failure
- Invalid response

RoamPulse can use a fallback itinerary generation mechanism.

Fallback output is clearly distinguished from Gemini-generated output.


## 5. How RoamPulse Works

The high-level flow is:

User
↓
Trip Preferences
↓
Trip Creation
↓
Real Place Discovery
↓
Verified Place Context
↓
Gemini AI Planner
↓
Structured JSON
↓
Validation
↓
Real Place Matching
↓
Global Deduplication
↓
Date Coverage Validation
↓
Geographic Ordering
↓
Budget Calculation
↓
Supabase
↓
React UI
↓
Itinerary + Map


## 6. AI Itinerary Generation Workflow

Gemini is not asked to freely invent a travel itinerary.

Instead, RoamPulse provides Gemini with structured information about the trip and verified place candidates.

The AI receives information such as:

- Destination
- Number of days
- Travel dates
- Budget
- Travel pace
- User interests
- Arrival time
- Departure time
- Available real places
- Restaurant candidates
- Attraction candidates
- Previous itinerary constraints when applicable

Gemini is instructed to behave like a practical local travel planner.

The generated response must follow the application's structured itinerary schema.


## 7. Real Place Verification Workflow

The real-place workflow is:

1. User selects a destination.
2. RoamPulse queries Google Places.
3. Multiple categories of places are discovered.
4. Results are deduplicated.
5. Useful metadata is retained.
6. Candidates are passed into the Gemini prompt.
7. Gemini selects from those candidates.
8. Generated place names are matched against the candidate dataset.
9. Coordinates and metadata are attached.
10. The UI marks verified places accordingly.

The system explicitly instructs Gemini:

Use only places supplied in the verified real-place context when a real place is required.

Gemini must not invent:

- Attractions
- Restaurants
- Cafes
- Museums
- Hotels
- Markets
- Landmarks
- Viewpoints


## 8. Itinerary Generation Workflow

The itinerary generation pipeline follows these stages:

### Stage 1 — Input Collection

The application collects:

- Destination
- Start date
- End date
- Budget
- Pace
- Interests
- Arrival time
- Departure time

### Stage 2 — Candidate Discovery

RoamPulse retrieves real places relevant to the destination.

Candidate categories include:

- Attractions
- Cultural sites
- Historic landmarks
- Museums
- Restaurants
- Cafes
- Markets
- Nature locations
- Viewpoints
- Shopping locations

### Stage 3 — AI Planning

Gemini receives the candidate context and generates the itinerary.

### Stage 4 — JSON Extraction

Gemini responses are cleaned so that responses wrapped in Markdown code blocks can still be parsed correctly.

### Stage 5 — Schema Validation

The response is validated against the application's itinerary schema.

Minor formatting variations such as:

- "9:30" instead of "09:30"
- Numeric values returned as strings
- Slight enum variations

can be normalized where appropriate.

### Stage 6 — Real Place Matching

Generated locations are matched against real-world candidates.

### Stage 7 — Global Deduplication

The entire itinerary is checked for repeated locations.

### Stage 8 — Date Coverage

Every date between the trip start and end date is checked.

If a date is missing, the system attempts to repair that date using unused real-place candidates.

### Stage 9 — Geographic Ordering

Activities are ordered to reduce unnecessary travel.

### Stage 10 — Database Storage

The final itinerary is inserted into Supabase.

### Stage 11 — UI Rendering

The React application retrieves the stored itinerary and renders:

- Daily itinerary cards
- Activity details
- Costs
- Real-place indicators
- Map locations
- Budget breakdown


## 9. Content Workflow

RoamPulse follows a structured content workflow instead of directly displaying raw AI output.

The content pipeline is:

User Preferences
↓
Destination Context
↓
Real-World Place Research
↓
Candidate Place Dataset
↓
AI Content Generation
↓
Structured JSON
↓
Content Validation
↓
Place Verification
↓
Duplicate Detection
↓
Schedule Validation
↓
Budget Validation
↓
Final Itinerary Content
↓
Database
↓
Frontend

This workflow ensures that generated content is not treated as trustworthy simply because it came from an AI model.

AI creates the plan.

The application validates and structures the plan.

Real-world data grounds the plan.


## 10. Practicality & Planning Rules

RoamPulse follows several practical planning rules.

### Travel Pace

Relaxed:

- Approximately 2–3 meaningful activities per day.

Balanced:

- Approximately 3–4 meaningful activities per day.

Packed:

- Approximately 4–5 meaningful activities per day.

The application avoids unrealistic schedules containing 8–10 major activities in a single day.

### Meal Windows

Lunch is generally planned around:

12:00–14:00

Dinner is generally planned around:

19:00–21:00

Restaurants should come from verified place candidates where possible.

### Activity Duration

Typical durations are based on activity type.

Museums:

Approximately 1.5–2.5 hours.

Landmarks and markets:

Approximately 1–2 hours.

Viewpoints:

Approximately 30–60 minutes.

Dining:

Approximately 45–90 minutes.

### Travel Buffers

Travel time is accounted for between different locations.

The system avoids scheduling attractions back-to-back with zero travel time.

### Arrival Day

The first day respects the user's arrival time.

The typical flow is:

Arrival
↓
Transfer
↓
Hotel check-in
↓
Refresh
↓
Evening activity
↓
Dinner

### Departure Day

The final day respects the user's departure time.

Major sightseeing should finish sufficiently early to allow:

- Hotel checkout
- Packing
- Transfer
- Airport/station arrival


## 11. Global Activity Uniqueness

One of the important reliability features in RoamPulse is global activity deduplication.

A place should not appear multiple times simply because the AI changed the wording.

For example:

"Visit Jakhoo Temple"

and

"Explore Jakhu Temple"

should be recognized as the same location.

Similarly:

"Lunch at Cafe Simla Times"

and

"Dinner at Cafe Simla Times"

should be recognized as the same restaurant.

The canonical identity system considers:

1. External place ID
2. Geographic coordinates
3. Canonical place name
4. Embedded restaurant/venue name
5. Normalized titles

Action words such as:

- Visit
- Explore
- Discover
- See
- Tour
- Experience
- Walk around

are removed during normalization.

Meal prefixes such as:

- Lunch at
- Dinner at
- Breakfast at
- Meal at
- Dining at

are also normalized.

This prevents the AI from bypassing uniqueness rules by changing the wording.


## 12. Budget Workflow

RoamPulse provides a practical budget breakdown.

The five primary categories are:

### Accommodation

Estimated or live hotel cost.

### Activities

Entry fees and activity-related expenses.

### Food & Dining

Estimated meal costs.

### Transportation

Local transport, transfers, and travel between locations.

### Other

Miscellaneous expenses.

The application clearly distinguishes estimated accommodation pricing from live provider pricing.

Examples:

~₹14,000 estimated / stay

or

₹14,000 live / stay


## 13. Map & Location Workflow

Each verified place can contain:

- Latitude
- Longitude
- Address
- Rating
- Place identifier

These coordinates are used by the map.

RoamPulse also uses destination-aware map centering.

For example, if itinerary coordinates are temporarily unavailable, the map should center around the selected destination rather than an unrelated hardcoded city.

This prevents issues such as:

User selects Shimla

but map opens in Jaipur.


## 14. Regeneration Workflow

When the user selects:

Regenerate Itinerary

RoamPulse performs a clean regeneration.

The workflow is:

Regenerate
↓
Remove previous generated itinerary items
↓
Reset previous-title restrictions
↓
Discover/use real place candidates
↓
Call Gemini
↓
Generate fresh itinerary
↓
Validate
↓
Deduplicate
↓
Repair missing dates
↓
Insert into Supabase
↓
Refresh UI

The previous itinerary should not unnecessarily prevent Gemini from selecting valid real places again.

Each regenerated itinerary should still maintain global uniqueness internally.


## 15. Fallback & Reliability

Gemini is the primary itinerary planner.

The fallback system is only intended for situations where Gemini cannot be used.

Possible fallback triggers include:

- Missing Gemini API key
- Gemini API error
- Network error
- Invalid response
- Failed structured response validation

Fallback generation should still attempt to:

- Use real places
- Cover every trip date
- Avoid repeated activities
- Produce practical schedules
- Provide usable content

The UI and trip history should distinguish between:

Gemini AI planner

and

Starter template / Gemini unavailable

This prevents the application from falsely claiming that an itinerary was generated by AI when it was actually generated by fallback logic.


## 16. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- React-based route architecture
- Responsive UI

### Backend

- TypeScript
- Server functions
- Nitro / Cloudflare-compatible server build

### AI

- Google Gemini API
- Gemini 2.0 Flash

### Places

- Google Places API

### Database

- Supabase
- PostgreSQL

### Maps

- Leaflet
- Real-world latitude/longitude coordinates

### Validation

- Zod

### Development

- ESLint
- Prettier
- TypeScript


## 17. Project Architecture

A simplified project structure:

src/
│
├── components/
│   ├── maps/
│   │   └── TripMap.tsx
│   │
│   └── ...
│
├── lib/
│   ├── itinerary.server.ts
│   ├── domain.ts
│   │
│   ├── places/
│   │   └── real-places.server.ts
│   │
│   ├── trips.functions.ts
│   └── ...
│
├── routes/
│   └── _authenticated/
│       └── trips.$tripId.tsx
│
└── ...


## 18. Data Flow

The core data flow is:

Trip Input
    |
    v
Trip Creation
    |
    v
Google Places Discovery
    |
    v
Real Place Candidate Dataset
    |
    v
Gemini Prompt
    |
    v
Gemini JSON Response
    |
    v
JSON Extraction
    |
    v
Zod Validation
    |
    v
Real Place Matching
    |
    v
Global Deduplication
    |
    v
Date Coverage Validation
    |
    v
Geographic Ordering
    |
    v
Budget Calculation
    |
    v
Supabase
    |
    v
React UI
    |
    +----> Daily Itinerary
    |
    +----> Budget
    |
    +----> Map


## 19. Environment Variables

The application requires the appropriate API credentials to be configured.

Example:

GEMINI_API_KEY=your_gemini_api_key

Depending on the configured environment, Google Places and Supabase credentials may also be required.

Never commit API keys directly into the repository.

For local development, environment variables should be stored in the appropriate local environment file.

For Vercel production, configure the variables in:

Vercel Dashboard
→ Project
→ Settings
→ Environment Variables


## 20. Getting Started

Clone the repository:

git clone <repository-url>

Move into the project:

cd roam-pulse

Install dependencies:

npm install

Create your environment configuration.

Add the required API keys.

Then start the development server:

npm run dev


## 21. Running the Project

Development:

npm run dev

Formatting:

npm run format

Type checking:

npx tsc --noEmit

Linting:

npm run lint

Production build:

npm run build


## 22. Production Deployment

RoamPulse can be deployed using Vercel or another compatible hosting environment.

Before deploying, make sure production environment variables are configured.

Important:

The local .env file is normally not committed to Git.

Therefore, having a working Gemini key locally does not automatically mean the deployed application has access to Gemini.

For Vercel:

1. Open the Vercel project.
2. Go to Settings.
3. Open Environment Variables.
4. Add GEMINI_API_KEY.
5. Enable it for Production.
6. Enable it for Preview if required.
7. Redeploy the application.

After deployment, verify that the production application is actually using Gemini rather than silently falling back.


## 23. Example Itinerary

Example: 4-Day Shimla Trip

Day 1 — Arrival & Local Evening

14:00 – 15:00
Arrival in Shimla & Station/Airport Transfer

15:00 – 16:00
Hotel Check-in & Refresh

16:30 – 18:00
The Ridge & Shimla Mall Road

19:30 – 20:30
Dinner at a verified local restaurant


Day 2 — Heritage & Culture

09:00 – 10:30
Jakhoo Temple & Hanuman Statue

10:50 – 12:15
Shimla State Museum

12:30 – 13:30
Lunch at a verified cafe

14:00 – 16:00
Christ Church Shimla

19:30 – 20:30
Dinner at a different verified restaurant


Day 3 — History & Exploration

09:30 – 11:30
Viceregal Lodge / Rashtrapati Niwas

12:30 – 13:30
Lunch at another verified restaurant

14:30 – 16:30
Annandale Ground & Army Heritage Museum

19:30 – 20:30
Dinner at another unused restaurant


Day 4 — Shopping & Departure

09:30 – 10:30
Lakkar Bazaar

11:00 – 11:45
Hotel Checkout & Packing

12:30 onwards
Transfer to departure point


The exact locations and timings are dynamically generated based on the user's trip.


## 24. Hackathon Demo Flow

The recommended live demonstration flow is:

### Step 1

Open RoamPulse.

### Step 2

Create a new trip.

Example:

Destination:
Shimla

Duration:
4 days

Pace:
Balanced

Interests:
Culture + Food + Nature

### Step 3

Generate the itinerary.

Show that the application uses AI to create a personalized travel plan.

### Step 4

Demonstrate real places.

Show:

- Real-place indicators
- Ratings
- Addresses
- Map locations

### Step 5

Demonstrate practical scheduling.

Point out:

- Arrival constraints
- Meal windows
- Travel buffers
- Different activities on different days

### Step 6

Demonstrate budget.

Show:

- Accommodation
- Activities
- Food & Dining
- Transportation
- Other

### Step 7

Demonstrate regeneration.

Click:

Regenerate Itinerary

Show that a fresh itinerary is generated while maintaining:

- Real places
- Date coverage
- Practical scheduling
- No repeated locations

### Step 8

Show the map.

Explain that activities use real coordinates and are geographically organized.


## 25. Limitations

RoamPulse is designed as a practical hackathon prototype rather than a complete commercial travel platform.

Some limitations include:

### Live Hotel Rates

Live hotel prices depend on available provider integrations and API credentials.

When live pricing is unavailable, the application uses clearly labeled estimated pricing.

### Traffic

Travel duration is based on geographic distance and routing data rather than guaranteed real-time traffic conditions.

### Opening Hours

Opening hours depend on the availability and accuracy of the external place provider.

### AI Limitations

Although the system strongly constrains Gemini, AI output can still require validation.

This is why the application uses deterministic post-processing and validation rather than trusting raw AI output.


## 26. Future Improvements

Potential future improvements include:

### Real-Time Traffic

Integrate live traffic-aware routing.

### Live Hotel Booking

Add hotel inventory and live booking providers.

### Live Restaurant Availability

Allow users to reserve restaurants directly.

### Weather-Aware Replanning

Automatically modify outdoor activities based on weather.

### Public Transport Integration

Use real bus, metro, train, and transit schedules.

### Collaborative Trips

Allow multiple users to plan a trip together.

### Smart Replanning

If a location is closed or unavailable, automatically replace it with the best nearby alternative.

### Cost Optimization

Automatically optimize an itinerary based on the user's remaining budget.

### Multi-City Trips

Support journeys such as:

Delhi → Agra → Jaipur → Udaipur


## 27. Quality & Verification

RoamPulse includes multiple validation layers.

The project has been repeatedly checked using:

npm run format

npx tsc --noEmit

npm run lint

npm run build

The expected quality checks are:

- Formatting passes
- TypeScript passes
- ESLint passes
- Production build succeeds

The application also includes runtime logging for itinerary generation.

Example:

[RoamPulse] GENERATION START

[RoamPulse] destination: Shimla

[RoamPulse] expected day count: 4

[RoamPulse] Gemini API key present: true

[RoamPulse] Gemini model: google/gemini-2.0-flash

[RoamPulse] Gemini HTTP status: 200

[RoamPulse] Gemini generated item count: 14

[RoamPulse] validation item count: 14

[RoamPulse] final item count: 14

[RoamPulse] Items inserted into database: 14

[RoamPulse] fallback used: false

[RoamPulse] GENERATION COMPLETE


These logs make it easier to determine whether an itinerary was generated by Gemini or by the fallback system.


## 28. Project Goal

The core idea behind RoamPulse is simple:

AI should not just generate a travel plan that sounds good.

It should generate a travel plan that makes sense.

RoamPulse combines:

AI intelligence
+
Real-world place data
+
Structured validation
+
Geographic reasoning
+
Budget awareness
+
Schedule constraints
+
Global activity uniqueness

to create practical travel itineraries that are closer to what a real traveler would actually use.

The project demonstrates how generative AI can be combined with deterministic software rules and real-world APIs to build a more reliable AI-powered application.

Built for hackathons, designed with real-world practicality in mind.


## License

This project is intended as a hackathon project and demonstration of AI-powered travel planning.