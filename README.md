# ⚡ RoamPulse — Autonomous AI Travel Telemetry & Recovery Engine

<p align="center">
  <img src="public/logo.png" alt="RoamPulse Logo" width="120" height="120" style="border-radius: 20px; box-shadow: 0 0 25px rgba(30,193,203,0.3);" />
</p>

<p align="center">
  <strong>Real-time itinerary recalculation engine powered by autonomous travel monitoring, live disruption sensing, and instant itinerary recovery.</strong>
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#system-architecture">System Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#license">License</a>
</p>

---

## 🌟 Overview

Standard travel apps are static—they show your itinerary until something goes wrong, leaving you stranded with canceled flights, unexpected weather, or missed connections.

**RoamPulse** is a dynamic, event-driven travel resilience engine. It acts as an autonomous telemetry monitor that constantly scans flight gates, weather radar, traffic disruptions, and real-time place availability. When a disruption occurs, RoamPulse automatically re-evaluates schedule conflicts and recalculates optimized alternative itineraries in under 1.5 seconds.

---

## 🚀 Key Features

### 📡 1. Real-Time Telemetry & Monitoring Engine

- **Flight Tracker & Gate Radar:** Continuous monitoring of delay predictions, gate changes, and cancellation flags.
- **Hyper-Local Weather Sensing:** Detects sudden rainfall or heatwaves and automatically swaps outdoor walking tours for indoor alternatives.
- **Autonomous Conflict Detection:** Algorithmic constraint solver that flags tight connection windows and overlapping venue hours.

### 🔄 2. Autonomous Itinerary Recovery

- **Sub-1.5s Recalculation:** Instantly restructures downstream activities when an upstream event (e.g., flight delay) shifts your timeline.
- **Activity Swap Engine:** Intelligent fallback catalog that swaps canceled activities with equal-value, near-location experiences.
- **One-Tap Recovery Authorization:** Presents users with clean "Before & After" diff proposals with one-click resolution.

### 🎨 3. High-Performance 3D Glassmorphic UI/UX

- **Dark Navy & Neon Cyan Aesthetic:** Engineered with custom `#1C1C28` canvas design and high-contrast `#1EC1CB` telemetry indicators.
- **Framer Motion Physics:** Smooth 3D tilt interactions, reactive dynamic lighting, and spring-based depth layering.
- **Adaptive Glassmorphism:** Translucent glass panels (`backdrop-blur-xl`) with custom ambient radial glow effects.

### 💰 4. Price & Route Intelligence

- **Live Price Radar:** Real-time fare tracking for flights, hotel stays, and local transport options.
- **Segmented Pricing Analytics:** Interactive comparison breakdown between standard self-managed travel vs. autonomous RoamPulse protection.

---

## 🏗️ System Architecture

```text
[ Live Telemetry Inputs ]
   ├── Flight Status APIs
   ├── Geocoding & Weather Radar
   └── Real Places & Venues Catalog
              │
              ▼
┌─────────────────────────────────────────┐
│     RoamPulse Core Engine (.server)     │
│  - Real-time Conflict Solver            │
│  - Downstream Itinerary Recalculator    │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      TanStack / React UI Layer          │
│  - Framer Motion 3D Glass Physics       │
│  - Live Telemetry Stream Widget         │
└─────────────────────────────────────────┘
🛠️ Tech Stack
Framework: React / TanStack Router (SSR & Edge Ready)

Styling & Design: Tailwind CSS v4, Glassmorphic Utility Design Tokens (roam-navy, roam-cyan)

Animations & 3D Tilt: Framer Motion

Runtime / Deployment: Cloudflare Wrangler / Edge Workers

Language: TypeScript (strict mode with 0 compilation tolerance)

Icons & Assets: Custom 3D Glassmorphic Brand Assets + Lucide React

📦 Project Structure
Plaintext
roam-pulse-go/
├── public/
│   └── logo.png              # 3D Glassmorphic primary brand asset
├── src/
│   ├── components/
│   │   ├── auth/             # Authentication modals & AuthCard component
│   │   ├── brand/            # RoamPulse Logo & Brand Mark definitions
│   │   ├── marketing/        # Hero, Telemetry Terminal, Price Compare, Site Footer
│   │   └── ui/               # Reusable primitives (Separators, Dialogs, Buttons)
│   ├── lib/
│   │   ├── flights/          # Flight tracking API integration
│   │   ├── hotels/           # Lodging availability provider
│   │   ├── maps/             # Routing & spatial calculation utilities
│   │   ├── places/           # `real-places.server.ts` venue engine
│   │   └── weather/          # Live weather monitoring adapters
│   └── routes/
│       ├── __root.tsx        # HTML document frame & global metadata
│       ├── index.tsx         # Main landing page & live telemetry demo
│       ├── pricing.tsx       # Tier comparisons & protection plans
│       └── how-it-works.tsx  # Interactive engine breakdown
├── tailwind.config.js        # Design tokens (`roam-navy`, `roam-cyan`)
└── package.json
```
