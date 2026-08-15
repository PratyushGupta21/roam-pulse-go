# Roam Compass

Build a production-ready full-stack web application called RoamPulse — an AI-powered, real-time adaptive travel planner that helps travelers recover from flight delays, bad weather, schedule disruptions, and changing travel conditions.

Do not build a static landing page or visual prototype. Build the actual working SaaS product with a polished marketing website, authentication, database, trip management, AI itinerary generation, dynamic rerouting architecture, real-time updates, notifications, pricing, and a responsive traveler dashboard.

1. PRODUCT

Product: RoamPulse
Category: Travel Tech / AI Travel Planning / Real-Time Trip Recovery

Problem

Travelers currently have to manually monitor flights, weather, transportation, bookings, maps, and activities across multiple websites. A single delayed flight or weather disruption can break an entire itinerary.

Solution

RoamPulse creates personalized travel itineraries and continuously monitors the trip. When something changes, it identifies affected plans and recommends a new itinerary automatically.

Examples:

Flight delay → shift or replace affected activities.

Rain forecast → replace outdoor activities with nearby indoor alternatives.

Transportation disruption → calculate a new route.

Schedule conflict → automatically rearrange flexible itinerary items.

Price change → surface better available travel options.

Unexpected free time → recommend relevant local experiences.

Target Users

Independent travelers

Backpackers

Budget-conscious explorers

Frequent flyers

USP

Autonomous trip recovery + intelligent price comparison + real-time itinerary adaptation.

2. LOVABLE IMPLEMENTATION STACK

Use the following stack unless a specific Lovable-compatible implementation requires an equivalent:

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Lucide React

Supabase

PostgreSQL

Supabase Authentication

Supabase Realtime

Edge Functions for secure server-side operations

n8n for external automation

Mapbox for maps

Zod for validation

TanStack Query for server state

Recharts for dashboard analytics where useful

Use Supabase as the primary backend.

Do not expose secret API keys in frontend code.

All external API calls requiring secrets must go through Supabase Edge Functions or another secure backend layer.

3. BRANDING

Use the Dynamic Adventure Palette:

Deep Teal: #005F73

Sunset Coral: #EE9B00

Slate: #1D2D44

Crisp White: #FFFFFF

Visual personality:

Intelligent

Adventurous

Reliable

Modern

Fast

Travel-oriented

Do NOT make the website look like a generic AI SaaS dashboard.

Avoid excessive gradients, excessive glassmorphism, excessive rounded cards, and excessive animations.

Use subtle animations to communicate live updates and itinerary changes.

4. GLOBAL DESIGN SYSTEM

Create a reusable design system using Tailwind and shadcn/ui.

Use:

Deep Teal for primary actions

Sunset Coral for important alerts/recovery actions

Slate for typography and dark UI elements

White/light neutral backgrounds for content areas

Create consistent:

Buttons

Inputs

Selects

Cards

Dialogs

Tabs

Badges

Alerts

Toasts

Tables

Timeline components

Skeleton loaders

Empty states

Error states

Use Lucide icons consistently.

Every interactive element must have hover, focus, disabled, and loading states where applicable.

5. PUBLIC WEBSITE

Create these public pages:

/

/how-it-works

/pricing

/faq

/about

/privacy

/terms

Homepage

The homepage should immediately communicate:

Your Trip Changes. RoamPulse Adapts.

Supporting copy:

AI-powered travel planning that continuously adapts your itinerary when flights, weather, prices, and plans change.

Primary CTA:

Plan My Trip

Secondary CTA:

See How It Works

6. HOMEPAGE STRUCTURE

Build the homepage with these sections.

Hero

Include:

RoamPulse logo

Navigation

Headline

Supporting copy

Plan My Trip CTA

See How It Works CTA

Hero visual should show a realistic RoamPulse trip timeline.

Example visual:

10:30 AM — Flight delayed

↓

RoamPulse detected conflict

↓

Outdoor walking tour removed

↓

Indoor food experience recommended

↓

New itinerary ready

This should look like an actual product interface, not a generic illustration.

Problem Section

Explain:

Flight delays

Bad weather

Lost time

Manual rebooking

Too many booking websites

Difficult local discovery

Solution Section

Explain how RoamPulse:

Plans

Monitors

Detects

Adapts

Re-routes

Live Recovery Demo

Create a visually strong interactive example:

Before

Flight arrives 2:00 PM
Walking tour 4:00 PM
Dinner 7:00 PM

Disruption

Flight delayed by 3 hours.

After

Flight arrives 5:00 PM
Indoor food experience 6:00 PM
Dinner 8:30 PM

Show an Apply Recovery button.

This can use demo data on the marketing page, but it must look like a real product experience.

Price Comparison

Show a comparison interface with multiple providers and prices.

Clearly label prices as examples/demo data if not coming from a live provider.

Features

Highlight:

AI itinerary generation

Live flight tracking

Weather-aware planning

Dynamic rerouting

Price comparison

Live maps

Local experiences

Autonomous recovery

How It Works

Use a 4-step process:

Build your trip

RoamPulse monitors it

A disruption happens

Your itinerary adapts

Automation Modes

Show:

Manual

Recommendations only.

Assisted

RoamPulse handles low-risk changes and asks before important changes.

Autonomous

RoamPulse can automatically recover eligible itinerary items within user-defined spending and preference limits.

Pricing

Show Free and Premium plans.

FAQ

Answer questions around:

How does RoamPulse detect delays?

Does it book flights automatically?

Can I control automatic changes?

Does it monitor weather?

Where do prices come from?

Does RoamPulse charge booking fees?

What happens if an API is unavailable?

Final CTA

Headline:

Don't Let One Delay Ruin Your Trip.

CTA:

Plan My Trip

7. AUTHENTICATION

Use Supabase Auth.

Implement:

Sign up

Login

Logout

Forgot password

Reset password

Session persistence

Protected routes

Pages:

/login

/signup

/forgot-password

/reset-password

Use email/password authentication.

Do not expose authentication secrets.

Redirect authenticated users to /dashboard.

8. APPLICATION ROUTES

Create:

/dashboard

/trips

/trips/new

/trips/:tripId

/trips/:tripId/map

/trips/:tripId/recovery

/notifications

/settings

/settings/preferences

/settings/automation

/settings/notifications

/settings/billing

Protect all authenticated routes.

9. DASHBOARD

Build a premium travel dashboard.

Top section:

Good morning, Traveler 👋

Show:

Upcoming trip

Current destination

Flight status

Weather

Next activity

Current trip cost

Active alerts

Example card:

Upcoming Trip

Tokyo Adventure

Aug 18 – Aug 25

7 days · 1 traveler

View Trip →

Flight Status

AI-247

Delhi → Tokyo

Delayed 2h 35m

Status should update dynamically when real data is connected.

10. TRIP CREATION

Create a multi-step trip creation experience.

Steps:

1. Destination

Origin

Destination

Multiple destinations

Use location autocomplete.

2. Dates

Start date

End date

3. Travelers

Adults

Children where applicable

4. Budget

Total budget

Currency

5. Travel Style

Options:

Backpacker

Budget

Balanced

Comfort

Luxury

6. Interests

Multi-select:

Food

Nature

Adventure

Culture

History

Nightlife

Shopping

Photography

Local experiences

Wellness

7. Preferences

Indoor/outdoor balance

Pace

Transportation preference

Accommodation preference

8. Recovery Settings

Choose:

Manual

Assisted

Autonomous

If autonomous:

Maximum additional spending

Activities that can be automatically replaced

Activities that must never be changed

Final CTA:

Generate My Itinerary

11. AI ITINERARY GENERATION

After submission, show an animated generation state.

Example:

Building your trip...

✓ Understanding your preferences
✓ Finding activities
✓ Optimizing travel time
✓ Checking weather
✓ Balancing your budget
✓ Building your itinerary

Then display the generated itinerary.

The AI output must be structured.

Each itinerary item should contain:

Title

Description

Date

Start time

End time

Category

Location

Coordinates

Estimated cost

Travel time

Indoor/outdoor

Weather suitability

Booking link if available

Status

Flexible/locked

Do not rely on free-form AI output for critical scheduling.

Validate structured AI responses before saving them.

12. ACTIVE TRIP EXPERIENCE

This is the most important application screen.

Desktop:

Left: itinerary timeline

Right: interactive map

Mobile:

Timeline

Sticky alerts

Map toggle

Bottom navigation

Header:

Tokyo Adventure

Aug 18–25

Status:

Monitoring Live

13. ITINERARY TIMELINE

Show each activity as a timeline card.

Example:

09:00

☕ Breakfast

Local coffee shop
₹450
20 min

↓

10:30

🏯 Temple Visit

Outdoor
2 hours

↓

14:00

🍜 Lunch

↓

16:00

🥾 Walking Tour

Outdoor
2 hours

Each card should support:

View

Edit

Lock

Replace

Remove

Move

Status badges:

Confirmed

Flexible

At Risk

Disrupted

Replaced

Completed

14. REAL-TIME DISRUPTION EXPERIENCE

When a disruption occurs, show a prominent alert.

Example:

⚠ Trip disruption detected

Your flight has been delayed by 2h 45m.

Impact

Your 4:00 PM outdoor walking tour can no longer fit your schedule.

RoamPulse Recovery

Replace walking tour with:

Tokyo Indoor Food Experience

6:00 PM – 7:45 PM

1.2 km away
Indoor
₹1,200 estimated

Why this recommendation?

Fits your new schedule

Indoor

Matches your food interest

14 minutes from your hotel

Within your budget

Show:

Apply Recovery

See Alternatives

Keep Original

Customize

15. RECOVERY OPTIONS

When the user clicks See Alternatives, display 3–5 alternatives.

Each card should show:

Name

Category

Distance

Duration

Estimated cost

Weather suitability

Rating where available

Reason recommended

Booking CTA

Allow sorting by:

Cheapest

Closest

Best match

Highest rated

16. RECOVERY LOGIC

When a disruption is detected:

Identify affected itinerary items.

Preserve locked items.

Calculate new available time.

Find conflicting activities.

Search alternative activities.

Check weather.

Check travel time.

Compare costs.

Score alternatives.

Generate recovery recommendation.

Display recommendation.

Apply only after authorization according to automation settings.

Save new itinerary version.

Update map.

Update timeline.

Send notification.

Never automatically purchase something simply because Autonomous mode is enabled.

17. AUTOMATION SETTINGS

Create /settings/automation.

Show three modes.

Manual

"RoamPulse will notify you and recommend changes. Nothing changes automatically."

Assisted

"RoamPulse can automatically adjust flexible itinerary items but asks before expensive changes."

Autonomous

"RoamPulse can recover eligible trip disruptions automatically within your limits."

Include:

Maximum additional spend

₹ ______

Automatically replace

☑ Flexible activities
☑ Weather-sensitive activities
☐ Transportation
☐ Accommodation

Always ask before

☑ Flights
☑ Hotels
☑ Purchases above limit

Save settings to Supabase.

18. LIVE MAP

Use Mapbox.

Show:

Current location where permission is available

Hotel

Airport

Activities

Restaurants

Routes

Replacement activities

When recovery occurs, update the route.

Show travel mode:

Walking

Driving

Transit

Include route duration.

Map API credentials must remain secure.

19. WEATHER SYSTEM

Integrate a weather provider through a secure backend function.

For relevant itinerary activities:

Show current conditions

Show forecast

Show rain probability

Show temperature

Show weather suitability

Example:

Outdoor activity at risk

🌧 82% rain probability

RoamPulse recommends moving this activity indoors.

Do not invent weather data.

If the weather API is unavailable, show:

Weather data temporarily unavailable

20. FLIGHT MONITORING

Build the flight monitoring architecture around a provider such as Duffel or another permitted flight-status provider.

Store:

Airline

Flight number

Departure

Arrival

Scheduled time

Estimated time

Actual time

Status

Last updated

Possible states:

Scheduled

Boarding

Departed

Delayed

Landed

Cancelled

Unknown

When status changes, trigger the disruption workflow.

Do not use fake flight data in production.

21. N8N INTEGRATION

Use self-hosted n8n for automation.

Create a secure integration abstraction.

Example workflows:

Flight Monitoring

Cron/webhook
→ Flight API
→ Compare status
→ Supabase
→ Detect disruption
→ Trigger recovery function
→ Supabase Realtime
→ User notification

Weather Monitoring

Cron
→ Weather API
→ Evaluate activities
→ Detect risk
→ Generate alternatives
→ Store recovery
→ Notify user

Price Monitoring

Cron
→ Travel providers
→ Normalize prices
→ Store snapshot
→ Compare price
→ Notify user when appropriate

Do not put authentication or critical authorization solely inside n8n.

22. SUPABASE DATABASE

Create a proper PostgreSQL schema.

At minimum include:

profiles

id

user_id

name

avatar

preferences

created_at

updated_at

trips

id

user_id

name

origin

destination

start_date

end_date

travelers

budget

currency

travel_style

recovery_mode

created_at

updated_at

itinerary_items

id

trip_id

date

start_time

end_time

title

description

category

location

latitude

longitude

estimated_cost

currency

indoor_outdoor

status

is_locked

created_at

updated_at

flights

id

trip_id

provider

flight_number

departure

arrival

scheduled_departure

scheduled_arrival

estimated_departure

estimated_arrival

status

last_updated

disruption_events

id

trip_id

type

severity

title

description

affected_item_ids

detected_at

resolved_at

recovery_recommendations

id

trip_id

disruption_id

recommendation_data

status

created_at

notifications

id

user_id

trip_id

type

title

message

read

created_at

price_snapshots

id

trip_id

provider

product_type

product_id

price

currency

booking_url

captured_at

subscriptions

id

user_id

provider

plan

status

current_period_end

created_at

updated_at

automation_runs

id

trip_id

workflow

status

started_at

completed_at

error

Add appropriate indexes and foreign keys.

23. ROW LEVEL SECURITY

Use Supabase Row Level Security.

Users can only:

View their own profile

View their own trips

Modify their own trips

View itinerary data belonging to their trips

View their notifications

Manage their preferences

Never rely only on frontend route protection.

Admin permissions must be enforced server-side.

24. PRICE COMPARISON

Create provider adapters for:

Skyscanner where API access is available

Duffel

Agoda or another approved accommodation provider

Do not scrape provider websites if prohibited.

Normalize offers.

Display:

ProviderPriceDetailsChecked

Highlight:

Best available option

Include:

Prices can change. Last checked at [time].

Affiliate booking links should be clearly identifiable.

25. MONETIZATION

Implement:

Free

Basic trip planning

Basic itinerary generation

Limited monitoring

Premium

Real-time flight tracking

Advanced disruption alerts

More frequent monitoring

Advanced recovery recommendations

Autonomous recovery controls

Advanced price monitoring

Use Stripe for subscriptions if available.

Payment state must be verified server-side.

Do not expose Stripe secrets.

26. AFFILIATE TRACKING

When users click booking links:

Record click.

Associate it with user/session when appropriate.

Associate it with trip/item.

Redirect to provider.

Do not claim that RoamPulse directly sells or books a product unless it actually does.

Add appropriate affiliate disclosure.

27. SPONSORED EXPERIENCES

Create support for sponsored local experiences.

Sponsored listings must display:

Sponsored

Do not disguise paid placements as organic recommendations.

Sponsored experiences must still be relevant to the user's destination and schedule.

28. NOTIFICATIONS

Create /notifications.

Support:

Flight delay

Flight cancellation

Weather alert

Recovery recommendation

Price change

Booking update

Automation failure

Use Supabase Realtime to update notification state.

Show unread count in navigation.

Allow users to configure notification preferences.

29. TRIP HISTORY

When a recovery is applied, preserve the previous itinerary.

Create a history/timeline:

6:42 PM — Flight delay detected

6:43 PM — Walking tour marked at risk

6:44 PM — 4 alternatives found

6:45 PM — Recovery applied

6:45 PM — Map route updated

This should be persisted in Supabase.

30. LOADING STATES

Never leave the user staring at a blank page.

Use skeletons for:

Dashboard

Trip cards

Itinerary

Map

Flight status

Price comparisons

Use progress states for AI generation.

31. ERROR STATES

Every external API must have graceful fallback behavior.

Examples:

Flight provider unavailable

"Flight data couldn't be refreshed. Your last successful update was 18:42 IST."

Weather provider unavailable

"Weather data is temporarily unavailable."

AI unavailable

"We couldn't generate a recovery plan right now. Try again."

Never expose stack traces or API errors.

32. MOBILE EXPERIENCE

RoamPulse is primarily used while traveling.

Optimize for mobile.

On mobile:

Use large touch targets

Keep alerts visible

Keep next activity prominent

Make map easy to open

Avoid dense tables

Make recovery actions sticky

Support one-handed interaction

Prevent horizontal overflow

Use a mobile bottom navigation:

Home

Trips

Active Trip

Alerts

Profile

33. ACCESSIBILITY

Implement:

Semantic HTML

Keyboard navigation

Proper form labels

Focus states

Accessible dialogs

Screen-reader labels

Accessible alerts

Sufficient contrast

Reduced-motion support

Do not communicate important information through color alone.

34. SEO

Public pages need:

Page titles

Meta descriptions

Open Graph tags

Sitemap

Robots configuration

Semantic headings

Private trip data must not be indexed.

35. SECURITY RULES

Never:

Put API secrets in frontend code

Trust frontend payment status

Trust frontend authorization

Allow users to access another user's trip

Process unverified webhooks

Store provider secrets in database rows accessible to users

Automatically spend money without explicit authorization

Use environment variables and secure Supabase Edge Functions.

36. PERFORMANCE

Optimize for real-world mobile networks.

Use:

Lazy loading

Caching where safe

TanStack Query

Supabase Realtime subscriptions

Efficient database queries

Pagination

Optimized images

Debounced search

Minimal unnecessary JavaScript

Do not reload the entire application when a flight status or itinerary item changes.

37. DEMO MODE

For the initial Lovable-generated application, create a clearly identifiable Demo Mode if external APIs are not configured.

Demo Mode should allow the evaluator to experience:

Create a sample trip.

View generated itinerary.

Trigger a simulated flight delay.

See affected activities.

Generate recovery recommendations.

Apply a recovery.

Watch the timeline update.

Watch the map state update.

See a notification appear.

Clearly label demo data as:

Demo Data

Do not present simulated data as live provider information.

Keep the architecture ready to replace demo providers with real APIs through environment variables.

38. CORE DEMO SCENARIO

Create one polished sample scenario:

Trip: Tokyo Adventure
Dates: August 18–25
Traveler: 1
Budget: ₹75,000

Initial itinerary:

09:00 Breakfast
10:30 Temple visit
13:00 Lunch
15:00 Walking tour
18:00 Local food experience
20:00 Dinner

Trigger:

Flight delayed by 3 hours

RoamPulse should demonstrate:

Conflict detection

Walking tour marked at risk

Indoor alternative recommendation

Timeline adjustment

Updated route

Cost comparison

Recovery confirmation

Notification

The user must be able to experience this flow through the UI.

39. CODE QUALITY

Use:

TypeScript throughout

Reusable components

Strong typing

Clear naming

Modular services

Centralized validation

Centralized API integrations

No unnecessary duplication

Avoid:

Giant React components

Hardcoded secrets

Hardcoded production data

Fake API functions pretending to be live

any everywhere

Dead code

Unused dependencies

Broken navigation

40. ACCEPTANCE CRITERIA

The generated application is complete only when:

Landing page works.

Navigation works.

Authentication works.

User can create a trip.

Trip persists in Supabase.

Dashboard displays actual user data.

Itinerary can be generated.

Itinerary can be edited.

Items can be locked.

Demo disruption can be triggered.

Disruption affects itinerary.

Recovery recommendations appear.

User can apply recovery.

New itinerary state persists.

Map reflects changes.

Notifications update.

Supabase Realtime is used for live state where appropriate.

RLS prevents unauthorized access.

External API architecture is secure.

Premium subscription architecture exists.

Affiliate tracking architecture exists.

n8n integration architecture exists.

Mobile UI works.

Loading and error states exist.

No API secrets are exposed.

41. IMPORTANT LOVABLE INSTRUCTION

Do not stop after creating the homepage.

Build the actual authenticated application.

Prioritize this complete product loop:

Landing Page → Sign Up → Create Trip → AI Itinerary → Active Trip → Simulated/Real Disruption → Impact Analysis → Recovery Options → Apply Recovery → Updated Timeline + Map + Notification

The interface should make this flow immediately understandable.

If an external API cannot be configured during generation, implement the correct provider abstraction and Demo Mode rather than inventing fake live integrations.

Use Supabase for persistent data and authentication.

Use Supabase Realtime for live application updates.

Use secure Edge Functions for external APIs and sensitive operations.

Use self-hosted n8n as the automation/orchestration layer.

The final result should look and behave like a serious commercial travel-tech SaaS product, not a template or prototype.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0ec0fe4e-f6cc-4654-9d85-4a932e0390bf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
