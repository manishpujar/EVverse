# EV Companion

A single app combining two modules:

- **Route Planner** — plan a route between two locations with an EV, showing recommended charging stops.
- **Charger Locator** — find nearby EV charging stations on a map.

## Structure

```
ev-app/
  frontend/   Single React + Vite app. Both modules live here as separate
              tabs (src/route-planner, src/charger-locator), sharing one
              Google Maps script load (src/App.tsx).
  backend/    Express + TypeScript API used only by the Route Planner tab
              (route planning, nearby-station search). The Charger Locator
              tab talks to Google Places directly from the browser and
              doesn't need the backend.
```

## Setup

You'll need a Google Maps API key with the **Maps JavaScript API**,
**Places API**, and **Directions API** enabled.

### 1. Backend

```bash
cd backend
npm install
```

Edit `.env`:
```
PORT=3000
GOOGLE_MAPS_API_KEY=your_actual_key_here
```

Run it:
```bash
npm run dev
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
```

Edit `.env`:
```
VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
VITE_API_URL=http://localhost:3000
```

Run it:
```bash
npm run dev
```

Open the printed URL. Use the nav bar at the top to switch between
**Route Planner** and **Charger Locator** — both stay loaded in the
background when you switch tabs, so in-progress work isn't lost.
