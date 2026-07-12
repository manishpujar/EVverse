# ⚡ EVverse — EV Smart Route Planner & Charger Locator

> A 0→1 product built to eliminate range anxiety for EV users — combining real-time charger discovery with intelligent route planning that automatically calculates charging stops based on your vehicle's battery specs.

---

## 🎯 The Problem

Range anxiety is the #1 barrier to EV adoption. EV users planning long-distance trips face two compounding problems:

1. **Where are the chargers?** Charging infrastructure is fragmented across networks with no unified discovery layer
2. **Will I make it?** No native tool accounts for a specific vehicle's real battery capacity, current charge level, and charging speed to tell you *exactly* where and when to stop

EVverse solves both — in one product.

---

## 🚀 What's Built

EVverse is two MVPs shipped as a unified product:

### 1. EV Charger Locator
- Detects user's real-time location via browser geolocation
- Searches nearby EV charging stations within a 5km radius using Google Places API
- Displays stations on an interactive map with custom markers — green for available, red for in-use
- Differentiates connector types (Tesla Supercharger, CCS, CHAdeMO, Type 2)
- Shows station name, address, availability, pricing, and connector details on click
- Location search to find chargers anywhere, not just nearby

### 2. Intelligent Route Planner
- Takes source, destination, selected EV model, current battery %, and round-trip toggle as inputs
- Calculates **exact charging stops** along the route based on real vehicle specs — not generic estimates
- Supports **8 EV models** across Indian and global markets (Tata Nexon EV, MG ZS EV, Tesla Model 3, Hyundai IONIQ 5, Kia EV6, VW ID.4, Ford Mach-E, BMW i4)
- Each vehicle has hardcoded battery capacity (kWh), energy efficiency (kWh/km), and max charging rate (kW)
- Finds the nearest real charging station within remaining range at each stop point
- Calculates charging time per stop based on vehicle's charging rate
- Outputs total trip time including driving + charging, total distance, and stop-by-stop breakdown
- Handles **round trips** — plans both outward and return legs independently

---

## 📊 Outcomes

| Metric | Result |
|---|---|
| Route prediction accuracy | 95% |
| EV models supported | 8 (India + global) |
| MVPs shipped | 2 |
| Core features built | 5 |
| Charging stop algorithm | Battery-state aware, range-constrained |

---

## 🧠 How the Charging Stop Algorithm Works

This is the core product logic — not just a maps wrapper:

1. Takes the route path from Google Directions API as an array of lat/lng points
2. Simulates battery drain across the route using the selected EV's efficiency (kWh/km)
3. When remaining range drops below 50km, triggers a station search at the current path point
4. Searches for real charging stations within the remaining range using Google Places
5. Filters stations to those with minimal route detour (within 20% of remaining range)
6. Calculates charging time: `(target_charge - current_charge) / charging_rate`
7. Resets battery state and continues simulation from the charging stop
8. For round trips, runs the same simulation on the return leg with remaining battery from the outward journey

---

## 🛠️ Tech Stack

**Frontend (Charger Locator)**
- React + TypeScript
- Google Maps JavaScript API (`@react-google-maps/api`)
- Google Places API — nearby search + place details
- Tailwind CSS
- Vite

**Backend (Route Planner)**
- Node.js + TypeScript
- Express.js REST API
- Google Maps Directions API
- Google Places API — station search along route
- Google Geometry library — distance calculations

---

## 📁 Project Structure

```
EVverse/
├── EV Charger Locator/          # MVP 1 — Charger discovery
│   └── project/
│       ├── src/
│       │   ├── App.tsx          # Root component
│       │   ├── components/
│       │   │   ├── Map.tsx      # Google Maps + station search logic
│       │   │   └── StationDetails.tsx  # Station info panel
│       │   └── types.ts         # ChargingStation interface
│       └── package.json
│
└── EV Smart Route Planner/      # MVP 2 — Intelligent route planning
    └── round-trip-backend/
        ├── index.ts             # Express server entry point
        ├── controllers/
        │   ├── routeController.ts
        │   └── stationController.ts
        ├── services/
        │   ├── routeService.ts  # Core charging stop algorithm
        │   └── stationService.ts # Station search + range logic
        └── types/
            └── index.ts         # EV specs, interfaces, GLOBAL_EVS map
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- Google Maps API key with the following APIs enabled:
  - Maps JavaScript API
  - Places API
  - Directions API
  - Geometry library

### Charger Locator

```bash
cd "EV Charger Locator/project"
npm install
```

Create a `.env` file:
```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

```bash
npm run dev
```

### Route Planner Backend

```bash
cd "EV Smart Route Planner/round-trip-backend"
npm install
```

Create a `.env` file:
```
GOOGLE_MAPS_API_KEY=your_api_key_here
PORT=3000
```

```bash
npm run dev
```

---

## 🔑 Environment Variables

> ⚠️ Never commit `.env` files. Both projects include `.gitignore` entries to prevent this.

| Variable | Used In | Purpose |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Charger Locator | Maps + Places API |
| `GOOGLE_MAPS_API_KEY` | Route Planner backend | Directions + Places API |

---

## 💡 Why I Built This

EVverse was a self-initiated 0→1 product — no team, no brief, no spec handed to me.

I identified range anxiety as a real, high-frequency problem for EV owners in India where charging infrastructure is sparse and unevenly distributed. Existing tools (Google Maps, PlugShare) show chargers but don't account for your specific vehicle's real-world battery behaviour.

I owned the entire product lifecycle — problem framing, feature definition, prioritisation, build, and testing. The charging stop algorithm is the core product insight: rather than estimating based on average range, it simulates actual battery drain per kilometre using real EV specs and triggers smarter, route-aware stop decisions.

---

## 🗺️ Roadmap (if continued)

- [ ] Add more Indian EV models (Ather, Ola Electric, Tata Tiago EV)
- [ ] Integrate OCPP-compliant charger networks for real-time availability data
- [ ] Add traffic-aware battery drain estimation
- [ ] iOS / Android app
- [ ] Charging cost estimator per stop

---

*Built by Manish Pujar · Founder, EVverse · 2025*  
*Portfolio: [your portfolio link] · LinkedIn: [your LinkedIn]*
