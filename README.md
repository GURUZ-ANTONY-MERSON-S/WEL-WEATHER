# WEL-Weather v1.0 — Meteorological Command Center

WEL-Weather is a professional-grade, fast, modular, and client-side meteorological platform designed to render high-fidelity weather metrics, atmospheric thermodynamics, real-time air quality indexing, and advanced projected thunderstorm instability ratings entirely within the browser.

---

## 🎨 Design Philosophy & Concept

WEL-Weather adopts a **Modern Premium Dark UI** style incorporating high-contrast **Glassmorphism**, floating ambient neon glow orbs, professional mathematical typography pairings (**Space Grotesk** for display headers, **Inter** for core readability, and **JetBrains Mono** for raw sensor data), smooth CSS3 vector animations, and lightweight interactive dashboard widgets.

---

## 🌪️ The Signature Feature: Convective Instability Engine

WEL-Weather features a signature rule-based **Thunderstorm Instability Engine** that evaluates convective risk deterministically:
* **Real-time Diagnostic Mode**: If available from external feeds, the engine reads CAPE (Convective Available Potential Energy) and Lifted Index (LI) variables directly.
* **Thermodynamic Estimation Mode**: If unavailable, the engine applies standard meteorological formulae (like Espy's LCL height formulas) to estimate stability metrics based on surface temperatures, boundary dew points, relative humidity, pressure, cloud cover, wind speed, and sea-surface thermal readings.
* **Deterministic Risk Vectoring**: Calculates a definitive risk percentage categorized from Low to Severe, displaying contributing factors and clear advice in a live explanatory block.

---

## 📁 Folder Structure

The project has been organized with strict modular separation of concerns:

```text
WEL-Weather/
│
├── index.html         # High-fidelity splash screen, checks authentication
├── login.html         # Secure, glassmorphic login gate & guest simulator
├── dashboard.html     # Bento-grid primary meteorological command center
│
├── css/
│   ├── components.css # Central variables, badges, scrollbars, and button system
│   ├── login.css      # Login panel placement, animations, and form structures
│   ├── dashboard.css  # Column grids, digital clocks, and card properties
│   └── responsive.css # Adaptive media queries for desktop, tablet, and mobile
│
├── js/
│   ├── config.js      # Key variables, local storage tags, and default coordinates
│   ├── login.js       # Authenticates session clearance, remembers credentials
│   ├── weather.js     # Geocodes names, pulls OpenWeather/Open-Meteo current parameters
│   ├── forecast.js    # Compiles synoptic 24h scrollbar and 5-day trends
│   ├── atmosphere.js  # Runs advanced thermodynamics (pressure, LCL cloud heights)
│   ├── thunderstorm.js# Handcrafted convective risk diagnostic calculations
│   └── ui.js          # Core orchestrator, updates elements, binds events, draws SVGs
│
└── assets/
    ├── logo/
    │   └── wel-weather-logo.png # Custom generated vector cloud & lightning logo
    └── background/
        └── login-bg.jpg         # Dark atmospheric night sky background image
```

---

## 📡 API Integrations (100% Key-Free Core Capability)

WEL-Weather utilizes a multi-tiered pipeline:
1. **OpenWeatherMap API**: Provides current coordinates weather conditions and 5-day forecasts. (Requires standard free API Key in `js/config.js`).
2. **Open-Meteo Geocoding API**: Seamless, completely key-free, high-performance global city queries.
3. **Open-Meteo Weather Forecast API**: Used as an automated fallback for key-free real-time queries.
4. **Open-Meteo Marine API**: Acquires Sea Surface Temperatures (SST) for coastal coordinates.
5. **Open-Meteo Air Quality API**: Yields US AQI ratings, PM2.5, PM10, and Ozone measurements.

---

## 🚀 Installation & Local Execution

### Prerequisites
* A standard modern web browser.
* Node.js (for the Vite dev server workspace, optional but recommended).

### Running Locally with Vite
1. Clone or download this project workspace.
2. In the root directory, install dependencies:
   ```bash
   npm install
   ```
3. Run the high-performance local server:
   ```bash
   npm run dev
   ```
4. Access the server at `http://localhost:3000`.

---

## 🔑 Obtaining an OpenWeather Map API Key

1. Navigate to [OpenWeatherMap API](https://openweathermap.org/api).
2. Register for a free account.
3. Generate your standard API Key from the Account Settings Dashboard.
4. Open `/js/config.js` and input your key:
   ```javascript
   OPENWEATHER_API_KEY: 'PASTE_YOUR_API_KEY_HERE',
   ```
*Note: If no API Key is added, WEL-Weather automatically boots into **Demo Sandbox Mode**, retrieving precise data dynamically from Open-Meteo so the dashboard remains 100% interactive and operational immediately.*

---

## 📦 Deploying to Vercel

Since WEL-Weather runs completely client-side in the browser, deployment to Vercel is extremely fast and requires no backend setup:

### Option 1: Via Vercel CLI
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` in the root folder.
3. Follow the CLI prompt steps to link your workspace.
4. Done! Your site is live.

### Option 2: Via GitHub Integration
1. Push the folder structure to your public or private GitHub repository.
2. Log into the Vercel Dashboard and click **Add New Project**.
3. Import your GitHub repository.
4. Set the Build Command to `npm run build` and Output Directory to `dist`.
5. Click **Deploy**.

---

## 🖥️ Browser Compatibility & Accessibility

* **Google Chrome**: 100% compatible (optimized for CSS backdrop filter performance).
* **Mozilla Firefox**: 100% compatible (supports CSS variables and high-performance scrolling).
* **Apple Safari**: 100% compatible.
* **Mobile Viewports**: Incorporates touch targets of at least 44px, optimized cards, and vertical stacking grids.

---

## 🛤️ Future Roadmap

- [ ] **Dynamic Radar Imagery Layer**: Integration of Open-Meteo weather radar overlays.
- [ ] **Offline Cache Service Worker**: Utilizing standard Service Workers to store the last fetched state and allow offline operations.
- [ ] **Visual Weather Graphing**: Direct visual canvas diagrams of thermodynamic variables over 5-day trendlines using simple d3 rendering.

---

## 📄 License

Distributed under the Apache 2.0 License. See the copyright indicators in the dashboard footer for reference.
