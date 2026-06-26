/**
 * WEL-Weather v1.0 - central UI Orchestration & Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Verification of session
  const storedUserJson = localStorage.getItem('wel_weather_user');
  if (!storedUserJson) {
    window.location.href = '/login.html';
    return;
  }
  const user = JSON.parse(storedUserJson);

  // Expose User Badge
  const userBadgeName = document.getElementById('userBadgeName');
  if (userBadgeName) {
    userBadgeName.textContent = user.username;
  }

  // Central Coordinates State (Default: London)
  let activeCoords = {
    lat: 51.5074,
    lon: -0.1278,
    name: 'London',
    country: 'GB'
  };

  // Station Timezone Offset (seconds from UTC, dynamically synced)
  let activeTimezoneOffsetSeconds = null;

  // Check last searched station from local storage
  const lastSearch = localStorage.getItem('wel_weather_last_search');
  if (lastSearch) {
    try {
      activeCoords = JSON.parse(lastSearch);
    } catch (e) {
      console.warn('Last search parse failed. Defaulting to London.');
    }
  }

  // Bind DOM Elements
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const locateBtn = document.getElementById('locate-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const searchSuggestions = document.getElementById('search-suggestions');
  
  const currentDateEl = document.getElementById('current-date');
  const currentTimeEl = document.getElementById('current-time');
  const alertCloseBtn = document.getElementById('alertCloseBtn');
  const alertsBanner = document.getElementById('alertsBannerContainer');

  // -------------------------------------------------------------
  // CLOCK ENGINE (Real-Time Digital Synchronization)
  // -------------------------------------------------------------
  function startDigitalClock() {
    function updateClock() {
      const now = new Date();
      let displayTime = now;
      let tzLabel = '';
      
      if (activeTimezoneOffsetSeconds !== null) {
        // Compute precise station local time in milliseconds
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
        displayTime = new Date(utcMs + (activeTimezoneOffsetSeconds * 1000));
        
        const offsetHrs = activeTimezoneOffsetSeconds / 3600;
        const sign = offsetHrs >= 0 ? '+' : '';
        tzLabel = ` GMT${sign}${offsetHrs}`;
      } else {
        try {
          const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(now);
          const tzPart = parts.find(p => p.type === 'timeZoneName');
          if (tzPart) tzLabel = ' ' + tzPart.value;
        } catch (e) {
          const offset = -now.getTimezoneOffset() / 60;
          tzLabel = ' GMT' + (offset >= 0 ? '+' : '') + offset;
        }
      }

      const timeStr = displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + tzLabel;
      const dateStr = displayTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      if (currentTimeEl) currentTimeEl.textContent = timeStr;
      if (currentDateEl) currentDateEl.textContent = dateStr;
    }
    updateClock();
    setInterval(updateClock, 1000);
  }
  startDigitalClock();

  // -------------------------------------------------------------
  // AIR QUALITY DATA PROCESSOR (Open-Meteo Air Quality API)
  // -------------------------------------------------------------
  async function fetchAirQuality(lat, lon) {
    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const current = data.current;
        return {
          aqi: Math.round(current.us_aqi) || 0,
          pm25: current.pm2_5 ? Math.round(current.pm2_5) : 'N/A',
          pm10: current.pm10 ? Math.round(current.pm10) : 'N/A',
          ozone: current.ozone ? Math.round(current.ozone) : 'N/A'
        };
      }
    } catch (e) {
      console.warn('Air quality metrics fetch failed (activating fallback):', e);
    }
    // Fallback based on latitude seed
    const seed = Math.abs(Math.sin(lat) * 120);
    return {
      aqi: Math.round(35 + seed),
      pm25: Math.round(8 + seed * 0.15),
      pm10: Math.round(15 + seed * 0.3),
      ozone: Math.round(45 + seed * 0.2)
    };
  }

  // -------------------------------------------------------------
  // ANIMATED METEOROLOGICAL INLINE SVG RESOLVER (Pure Craft)
  // -------------------------------------------------------------
  function generateWeatherSvg(condition) {
    const term = (condition || '').toLowerCase();
    
    // Sunny/Clear
    if (term.includes('clear') || term.includes('sun')) {
      return `
        <svg class="weather-svg-animate" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <style>
            @keyframes rotateSun { to { transform: rotate(360deg); } }
            .sun-circle { transform-origin: center; animation: rotateSun 20s linear infinite; color: #eab308; }
          </style>
          <g class="sun-circle">
            <circle cx="12" cy="12" r="4" fill="#f59e0b"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
          </g>
        </svg>
      `;
    }
    
    // Thunderstorms
    if (term.includes('thunder') || term.includes('storm')) {
      return `
        <svg class="weather-svg-animate" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <style>
            @keyframes flashLightning { 0%, 90%, 100% { opacity: 0.2; } 92%, 95% { opacity: 1; filter: drop-shadow(0 0 8px #06b6d4); } }
            @keyframes driftCloud { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(2px); } }
            .lightning-bolt { animation: flashLightning 2.5s infinite; color: #06b6d4; fill: #06b6d4; }
            .cloud-body { animation: driftCloud 4s infinite ease-in-out; color: #94a3b8; }
          </style>
          <path class="cloud-body" d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.76-3.5-3.5-4.08a4.5 4.5 0 0 0-6.75 3.33A5 5 0 0 0 2 15.5C2 18.1 4.4 20 7 20h10.5c.33 0 .66-.03.97-.1" fill="#475569"/>
          <path class="lightning-bolt" d="M13 14l-3 5h3l-1 5 5-6h-3z"/>
        </svg>
      `;
    }

    // Rain / Drizzle
    if (term.includes('rain') || term.includes('drizzle') || term.includes('shower')) {
      return `
        <svg class="weather-svg-animate" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <style>
            @keyframes fallRain { 0% { transform: translateY(-3px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(6px); opacity: 0; } }
            .rain-drop-1 { animation: fallRain 1.2s infinite linear; color: #3b82f6; }
            .rain-drop-2 { animation: fallRain 1.2s infinite linear 0.4s; color: #3b82f6; }
            .rain-drop-3 { animation: fallRain 1.2s infinite linear 0.8s; color: #3b82f6; }
          </g>
          </style>
          <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.76-3.5-3.5-4.08a4.5 4.5 0 0 0-6.75 3.33A5 5 0 0 0 2 15.5C2 18.1 4.4 20 7 20h10.5c.33 0 .66-.03.97-.1" fill="#475569" stroke="#94a3b8"/>
          <path class="rain-drop-1" d="M9 20v2"/>
          <path class="rain-drop-2" d="M12 20v2"/>
          <path class="rain-drop-3" d="M15 20v2"/>
        </svg>
      `;
    }

    // Snow
    if (term.includes('snow') || term.includes('ice') || term.includes('blizzard')) {
      return `
        <svg class="weather-svg-animate" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <style>
            @keyframes spinSnow { to { transform: rotate(360deg); } }
            .snow-flake { transform-origin: center; animation: spinSnow 12s linear infinite; color: #93c5fd; }
          </style>
          <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.76-3.5-3.5-4.08a4.5 4.5 0 0 0-6.75 3.33A5 5 0 0 0 2 15.5C2 18.1 4.4 20 7 20h10.5c.33 0 .66-.03.97-.1" fill="#475569" stroke="#94a3b8"/>
          <g class="snow-flake">
            <path d="M12 11v2M11 12h2M9.5 9.5l5 5M14.5 9.5l-5 5"/>
          </g>
        </svg>
      `;
    }

    // Overcast / Cloudy / Clouds
    return `
      <svg class="weather-svg-animate" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <style>
          @keyframes floatClouds { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
          .cloud-main { animation: floatClouds 6s infinite ease-in-out; color: #cbd5e1; }
        </g>
        </style>
        <path class="cloud-main" d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.76-3.5-3.5-4.08a4.5 4.5 0 0 0-6.75 3.33A5 5 0 0 0 2 15.5C2 18.1 4.4 20 7 20h10.5c.33 0 .66-.03.97-.1" fill="#475569" stroke="#94a3b8"/>
      </svg>
    `;
  }

  // Mini SVGs for lists
  function getMiniWeatherSvg(iconCode) {
    let emoji = '☁️';
    const code = (iconCode || '03d').slice(0, 2);
    if (code === '01') emoji = '☀️';
    else if (code === '02' || code === '03' || code === '04') emoji = '⛅';
    else if (code === '09' || code === '10') emoji = '🌧️';
    else if (code === '11') emoji = '⛈️';
    else if (code === '13') emoji = '❄️';
    else if (code === '50') emoji = '🌫️';
    return `<span style="font-size: 1.5rem;">${emoji}</span>`;
  }

  // -------------------------------------------------------------
  // CENTRAL SYNOPTIC DATA FETCH & RENDER PIPELINE
  // -------------------------------------------------------------
  async function triggerStationSync() {
    // Show static loading skeletons or loading states
    document.getElementById('current-location-name').textContent = 'Scanning Coordinates...';
    document.getElementById('station-coordinates').textContent = `${activeCoords.lat.toFixed(4)}°N, ${activeCoords.lon.toFixed(4)}°E`;
    
    try {
      // Parallel fetches for optimum dashboard speed
      const [weather, forecasts, atmosphere, air] = await Promise.all([
        WEATHER_ENGINE.fetchCurrentWeather(activeCoords.lat, activeCoords.lon),
        FORECAST_ENGINE.fetchForecasts(activeCoords.lat, activeCoords.lon),
        ATMOSPHERE_ENGINE.fetchAtmosphericProfile(activeCoords.lat, activeCoords.lon),
        fetchAirQuality(activeCoords.lat, activeCoords.lon)
      ]);

      // Set timezone offset for local clock
      activeTimezoneOffsetSeconds = weather.timezoneOffset !== undefined ? weather.timezoneOffset : null;

      // 1. Render Current Weather Panel
      document.getElementById('current-location-name').textContent = `${activeCoords.name}, ${activeCoords.country}`;
      document.getElementById('current-temp').textContent = weather.temp;
      document.getElementById('feels-like').textContent = weather.feelsLike;
      document.getElementById('current-condition').textContent = weather.conditionDesc;
      document.getElementById('humidity').textContent = weather.humidity + '%';
      document.getElementById('wind-speed').textContent = weather.windSpeed + ' km/h';
      document.getElementById('wind-direction').textContent = weather.windDir + '°';
      document.getElementById('pressure').textContent = weather.pressure + ' hPa';
      document.getElementById('cloud-cover').textContent = weather.cloudCover + '%';
      document.getElementById('visibility').textContent = weather.visibility.toFixed(1) + ' km';
      
      // Render Dynamic Climate Suggestions
      renderClimateSuggestions(weather.condition, weather.temp, weather.conditionDesc);
      
      // Inline visual SVG
      const svgBox = document.getElementById('current-icon-container');
      if (svgBox) {
        svgBox.innerHTML = generateWeatherSvg(weather.condition);
      }

      // Demo badge toggle
      const demoBadge = document.getElementById('demo-badge');
      if (demoBadge) {
        demoBadge.style.display = weather.isDemo ? 'inline-block' : 'none';
      }

      // Sunrise & Sunset formatting
      const sunriseStr = weather.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sunsetStr = weather.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      document.getElementById('sunrise').textContent = sunriseStr;
      document.getElementById('sunset').textContent = sunsetStr;

      // Sun Path bar ratio
      const nowMs = Date.now();
      const riseMs = weather.sunrise.getTime();
      const setMs = weather.sunset.getTime();
      let sunPercent = 0;
      if (nowMs > riseMs && nowMs < setMs) {
        sunPercent = Math.round(((nowMs - riseMs) / (setMs - riseMs)) * 100);
      } else if (nowMs >= setMs) {
        sunPercent = 100;
      }
      document.getElementById('sun-path-progress').style.width = sunPercent + '%';

      // 2. Render Thunderstorm Instability Engine (Central Signature)
      // Pass combined data to calculation logic
      const instabilityData = {
        temp: weather.temp,
        dewPoint: atmosphere.dewPoint,
        humidity: weather.humidity,
        pressure: weather.pressure,
        cloudCover: weather.cloudCover,
        windSpeed: weather.windSpeed,
        seaSurfaceTemp: parseFloat(atmosphere.seaSurfaceTemp) || null,
        apiCape: atmosphere.apiCape,
        apiLiftedIndex: atmosphere.apiLiftedIndex
      };

      const riskResult = THUNDERSTORM_ENGINE.evaluateInstability(instabilityData);
      
      // Bind values
      const riskPercentEl = document.getElementById('thunderstorm-risk-percent');
      const riskLevelEl = document.getElementById('thunderstorm-risk-level');
      const riskIndicatorEl = document.getElementById('thunderstorm-risk-indicator');
      const riskCircleEl = document.getElementById('risk-circle-element');
      const riskPointerEl = document.getElementById('risk-gauge-pointer-wrapper');
      const riskPointerValEl = document.getElementById('risk-gauge-pointer-val');
      const explanationEl = document.getElementById('thunderstorm-explanation');
      const methodBadgeEl = document.getElementById('instability-method-badge');
      
      const capeValueEl = document.getElementById('cape-value');
      const capeStatusEl = document.getElementById('cape-status');
      const capeTypeEl = document.getElementById('cape-type');
      const liValueEl = document.getElementById('li-value');
      const liStatusEl = document.getElementById('li-status');
      const liTypeEl = document.getElementById('li-type');

      if (riskPercentEl) {
        riskPercentEl.textContent = riskResult.riskScore + '%';
        riskPercentEl.style.color = riskResult.riskColor;
      }
      if (riskLevelEl) {
        riskLevelEl.textContent = riskResult.riskLevel + ' Risk';
        riskLevelEl.style.color = riskResult.riskColor;
      }
      if (riskIndicatorEl) {
        riskIndicatorEl.textContent = riskResult.indicatorText;
        riskIndicatorEl.style.color = riskResult.riskColor;
      }
      if (riskCircleEl) {
        riskCircleEl.style.borderColor = riskResult.riskColor;
        riskCircleEl.style.boxShadow = `0 0 15px ${riskResult.riskColor}, inset 0 0 10px rgba(0,0,0,0.5)`;
      }
      if (riskPointerEl) {
        riskPointerEl.style.left = riskResult.riskScore + '%';
      }
      if (riskPointerValEl) {
        riskPointerValEl.textContent = riskResult.riskScore + '%';
      }
      if (methodBadgeEl) {
        methodBadgeEl.textContent = riskResult.isEstimated ? 'Estimated Engine' : 'Open-Meteo API (Accurate)';
        methodBadgeEl.className = `badge badge-${riskResult.isEstimated ? 'cyan' : 'green'}`;
      }
      if (capeTypeEl) {
        capeTypeEl.textContent = riskResult.isEstimated ? 'Estimated' : 'Open-Meteo API';
        capeTypeEl.style.color = riskResult.isEstimated ? 'var(--text-muted)' : 'var(--accent-green)';
      }
      if (liTypeEl) {
        liTypeEl.textContent = riskResult.isEstimated ? 'Estimated' : 'Open-Meteo API';
        liTypeEl.style.color = riskResult.isEstimated ? 'var(--text-muted)' : 'var(--accent-green)';
      }
      if (explanationEl) {
        explanationEl.textContent = riskResult.summaryExplanation;
      }

      // CAPE display values
      if (capeValueEl) {
        capeValueEl.textContent = riskResult.cape + ' J/kg';
      }
      if (capeStatusEl) {
        if (riskResult.cape === 0) {
          capeStatusEl.textContent = 'Stable';
          capeStatusEl.style.color = 'var(--accent-green)';
        } else if (riskResult.cape < 500) {
          capeStatusEl.textContent = 'Normal / Low Convective';
          capeStatusEl.style.color = 'var(--accent-green)';
        } else if (riskResult.cape < 1000) {
          capeStatusEl.textContent = 'Marginal';
          capeStatusEl.style.color = 'var(--accent-yellow)';
        } else if (riskResult.cape < 2500) {
          capeStatusEl.textContent = 'Unstable';
          capeStatusEl.style.color = 'var(--accent-orange)';
        } else {
          capeStatusEl.textContent = 'Extreme';
          capeStatusEl.style.color = 'var(--accent-red)';
        }
      }

      // LI display values
      if (liValueEl) {
        liValueEl.textContent = riskResult.liftedIndex.toFixed(1) + ' °C';
      }
      if (liStatusEl) {
        if (riskResult.liftedIndex >= 3) {
          liStatusEl.textContent = 'Highly Stable';
          liStatusEl.style.color = 'var(--accent-green)';
        } else if (riskResult.liftedIndex >= 0) {
          liStatusEl.textContent = 'Stable';
          liStatusEl.style.color = 'var(--accent-green)';
        } else if (riskResult.liftedIndex >= -4) {
          liStatusEl.textContent = 'Unstable';
          liStatusEl.style.color = 'var(--accent-yellow)';
        } else if (riskResult.liftedIndex >= -7) {
          liStatusEl.textContent = 'Highly Unstable';
          liStatusEl.style.color = 'var(--accent-orange)';
        } else {
          liStatusEl.textContent = 'Severe convective';
          liStatusEl.style.color = 'var(--accent-red)';
        }
      }

      // 3. Render Atmospheric Profile Card
      const sTemp = parseFloat(atmosphere.surfaceTemp) || 15;
      const dPoint = parseFloat(atmosphere.dewPoint) || 10;
      const pres = parseFloat(atmosphere.pressure) || 1013;
      const rHum = parseFloat(atmosphere.relativeHumidity) || 60;

      document.getElementById('surface-temp').textContent = sTemp.toFixed(1) + ' °C';
      document.getElementById('dew-point').textContent = dPoint.toFixed(1) + ' °C';
      document.getElementById('relative-humidity').textContent = rHum.toFixed(0) + ' %';
      document.getElementById('cloud-base').textContent = atmosphere.cloudBase;
      document.getElementById('cloud-ceiling').textContent = atmosphere.cloudCeiling;
      document.getElementById('sea-temp').textContent = atmosphere.seaSurfaceTemp;

      // Bolton (1980) formula for Equivalent Potential Temperature (θe)
      const tK = sTemp + 273.15;
      const tdK = dPoint + 273.15;
      // vapor pressure e in hPa
      const vaporPressure = 6.112 * Math.exp((17.67 * dPoint) / (dPoint + 243.5));
      // mixing ratio w in kg/kg
      const mixingRatio = 0.622 * (vaporPressure / (pres - vaporPressure));
      // temperature at LCL in Kelvin
      const tLcl = 55 + (1 / (1 / (tdK - 56) + Math.log(tK / tdK) / 800));
      // Bolton's theta-e formula
      const thetaE = tK * Math.pow(1000 / pres, 0.2854 * (1 - 0.28 * mixingRatio)) * Math.exp(((3376 / tLcl) - 0.00254) * mixingRatio * (1 + 0.81 * mixingRatio));
      
      // Precipitable Water Vapor (PWV) using Reitan's formula
      const pwv = Math.exp(0.07 * dPoint + 0.11);

      document.getElementById('theta-e').textContent = isNaN(thetaE) ? 'N/A' : Math.round(thetaE) + ' K';
      document.getElementById('precipitable-water').textContent = isNaN(pwv) ? 'N/A' : pwv.toFixed(1) + ' mm';

      // 4. Render Air Quality Card
      const aqiValueEl = document.getElementById('aqi-value');
      const aqiLevelEl = document.getElementById('aqi-level');
      const aqiAdviceEl = document.getElementById('aqi-advice');
      const pm25El = document.getElementById('pm25');
      const pm10El = document.getElementById('pm10');
      const ozoneEl = document.getElementById('ozone');
      const aqiCircle = document.getElementById('aqi-circle-element');

      if (aqiValueEl) aqiValueEl.textContent = air.aqi;
      if (pm25El) pm25El.textContent = air.pm25 + ' µg/m³';
      if (pm10El) pm10El.textContent = air.pm10 + ' µg/m³';
      if (ozoneEl) ozoneEl.textContent = air.ozone + ' µg/m³';

      let aqiColor = 'var(--accent-green)';
      let aqiLvl = 'Good';
      let aqiAdv = 'Air dispersion profiles indicate safe conditions. Outward ventilation is optimal.';

      if (air.aqi > 50 && air.aqi <= 100) {
        aqiColor = 'var(--accent-yellow)';
        aqiLvl = 'Moderate';
        aqiAdv = 'Acceptable air quality index. Highly sensitive observers should limit prolonged exposure.';
      } else if (air.aqi > 100 && air.aqi <= 150) {
        aqiColor = 'var(--accent-orange)';
        aqiLvl = 'Unhealthy (Sens.)';
        aqiAdv = 'Active particle counts. Sensitive groups may experience minor inhalation irritation.';
      } else if (air.aqi > 150) {
        aqiColor = 'var(--accent-red)';
        aqiLvl = 'Hazardous';
        aqiAdv = 'Severe respiratory pollutant loading. Indoor atmospheric recirculation recommended.';
      }

      if (aqiLevelEl) {
        aqiLevelEl.textContent = aqiLvl;
        aqiLevelEl.style.color = aqiColor;
      }
      if (aqiAdviceEl) aqiAdviceEl.textContent = aqiAdv;
      if (aqiCircle) {
        aqiCircle.style.borderColor = aqiColor;
        aqiCircle.style.boxShadow = `0 0 15px ${aqiColor}`;
      }

      // 5. Render Hourly horizontal scrollbar items
      const hourlyContainer = document.getElementById('hourly-container');
      if (hourlyContainer) {
        hourlyContainer.innerHTML = '';
        forecasts.hourly.forEach(item => {
          const card = document.createElement('div');
          card.className = 'hourly-item';
          card.innerHTML = `
            <span class="hourly-time">${item.time}</span>
            <div class="hourly-icon-box">${getMiniWeatherSvg(item.icon)}</div>
            <span class="hourly-temp">${item.temp}°</span>
            <span class="hourly-pop">${item.pop > 0 ? '💧 ' + item.pop + '%' : '•'}</span>
          `;
          hourlyContainer.appendChild(card);
        });
      }

      // 6. Render 5-Day forecast items
      const forecastContainer = document.getElementById('forecast-container');
      if (forecastContainer) {
        forecastContainer.innerHTML = '';
        
        // Find global highs/lows for range visual alignment
        const allMaxs = forecasts.daily.map(d => d.tempMax);
        const allMins = forecasts.daily.map(d => d.tempMin);
        const globalMax = Math.max(...allMaxs);
        const globalMin = Math.min(...allMins);
        const globalSpread = globalMax - globalMin || 1;

        forecasts.daily.forEach(item => {
          // Calculate bar ratios
          const leftPercent = ((item.tempMin - globalMin) / globalSpread) * 100;
          const widthPercent = ((item.tempMax - item.tempMin) / globalSpread) * 100;

          const row = document.createElement('div');
          row.className = 'forecast-item';
          row.innerHTML = `
            <div class="forecast-day">
              <strong>${item.dayLabel}</strong>
              <span class="forecast-date">${item.dateLabel}</span>
            </div>
            <div class="forecast-visual">
              <div class="forecast-mini-icon">${getMiniWeatherSvg(item.icon)}</div>
              <span class="forecast-desc-lbl">${item.conditionDesc}</span>
            </div>
            <div class="forecast-temp-range">
              <span class="temp-min">${item.tempMin}°</span>
              <div class="temp-bar-visual">
                <div class="temp-bar-active" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
              </div>
              <span class="temp-max">${item.tempMax}°</span>
            </div>
          `;
          forecastContainer.appendChild(row);
        });
      }

      // 7. Render Custom Weather Alerts / Convective warnings
      const alertsContainer = document.getElementById('weather-alerts-container');
      const alerts = [];

      if (riskResult.riskScore >= 55) {
        alerts.push(`WARNING: Strong Convective Storm potential detected for ${activeCoords.name} (Risk: ${riskResult.riskScore}%). Convective parameters (CAPE: ${riskResult.cape} J/kg) support sudden lightning and convective wind shear.`);
      }
      if (weather.windSpeed > 40) {
        alerts.push(`ADVISORY: Active high wind velocity warnings registered at ${weather.windSpeed} km/h.`);
      }
      if (air.aqi > 100) {
        alerts.push(`AIR HEALTH ALERT: Hazardous particle indices detected. Ozone and micro-dust concentrations exceed standard thresholds.`);
      }

      if (alerts.length > 0) {
        if (alertsContainer && alertsBanner) {
          alertsContainer.innerHTML = alerts.map(a => `<div>${a}</div>`).join('');
          alertsBanner.style.display = 'block';
        }
      } else {
        if (alertsBanner) alertsBanner.style.display = 'none';
      }

    } catch (err) {
      console.warn('Error synchronizing station components:', err);
    }
  }

  // -------------------------------------------------------------
  // INTERACTIVE SEARCH & SUGGESTIONS BINDINGS
  // -------------------------------------------------------------
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = searchInput.value;
      
      if (query.trim().length < 2) {
        if (searchSuggestions) searchSuggestions.style.display = 'none';
        return;
      }

      debounceTimer = setTimeout(async () => {
        const locations = await WEATHER_ENGINE.geocodeLocation(query);
        if (locations && locations.length > 0 && searchSuggestions) {
          searchSuggestions.innerHTML = '';
          searchSuggestions.style.display = 'flex';
          
          locations.forEach(loc => {
            const row = document.createElement('div');
            row.className = 'suggestion-item';
            row.innerHTML = `
              <span>📍 ${loc.name}, ${loc.country} ${loc.state ? `(${loc.state})` : ''}</span>
              <span class="item-coords">${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°</span>
            `;
            row.addEventListener('click', () => {
              activeCoords = {
                lat: loc.lat,
                lon: loc.lon,
                name: loc.name,
                country: loc.country
              };
              localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SEARCH, JSON.stringify(activeCoords));
              triggerStationSync();
              searchInput.value = '';
              searchSuggestions.style.display = 'none';
            });
            searchSuggestions.appendChild(row);
          });
        } else {
          if (searchSuggestions) searchSuggestions.style.display = 'none';
        }
      }, 300);
    });

    // Close suggestions on outside clicks
    document.addEventListener('click', (e) => {
      if (searchSuggestions && !searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.style.display = 'none';
      }
    });
  }

  // Bind Search Trigger Button
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', async () => {
      const query = searchInput.value;
      if (query.trim().length >= 2) {
        const locations = await WEATHER_ENGINE.geocodeLocation(query);
        if (locations && locations.length > 0) {
          const loc = locations[0];
          activeCoords = {
            lat: loc.lat,
            lon: loc.lon,
            name: loc.name,
            country: loc.country
          };
          localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SEARCH, JSON.stringify(activeCoords));
          triggerStationSync();
          searchInput.value = '';
          if (searchSuggestions) searchSuggestions.style.display = 'none';
        } else {
          alert('Coordinates station search failed to scan results.');
        }
      }
    });
  }

  // -------------------------------------------------------------
  // GEOLOCATION RADAR INTEGRATION (🛰️ Locate)
  // -------------------------------------------------------------
  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        locateBtn.textContent = '📡 Scanning GPS...';
        locateBtn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            // Reverse geocode or fetch coordinates directly
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            
            // Reverse geocoding fallback
            let name = 'Geolocated Station';
            try {
              const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
              if (res.ok) {
                const geoData = await res.json();
                name = geoData.city || geoData.locality || 'GPS Station';
              }
            } catch (err) {
              console.warn('Reverse geocode client failed. Utilizing coordinates label.');
            }

            activeCoords = {
              lat: lat,
              lon: lon,
              name: name,
              country: 'GPS'
            };
            localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SEARCH, JSON.stringify(activeCoords));
            
            await triggerStationSync();
            locateBtn.textContent = '🛰️ Locate';
            locateBtn.disabled = false;
          },
          (err) => {
            console.warn('GPS signal lost or blocked by client permissions.', err);
            alert('Unable to acquire satellite lock. Please confirm your browser frame permissions or search manually.');
            locateBtn.textContent = '🛰️ Locate';
            locateBtn.disabled = false;
          }
        );
      } else {
        alert('Your terminal lacks geolocation scanning devices.');
      }
    });
  }

  // Bind Close Alerts button
  if (alertCloseBtn && alertsBanner) {
    alertCloseBtn.addEventListener('click', () => {
      alertsBanner.style.display = 'none';
    });
  }

  // Central Logout Session Trigger
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
      window.location.href = '/login.html';
    });
  }

  // -------------------------------------------------------------
  // CLIMATE SUGGESTIONS & WEATHER INTELLIGENCE ENGINE
  // -------------------------------------------------------------
  function renderClimateSuggestions(condition, temp, conditionDesc) {
    const term = (condition || '').toLowerCase();
    const currentTemp = parseFloat(temp);
    
    // Default Climate Configuration (Temperate / Normal)
    let state = 'temperate';
    let badgeText = 'Temperate';
    let summaryText = `Atmospheric parameters are in a comfortable, stable zone for ${activeCoords.name || 'this station'}.`;
    let apparel = 'Comfortable light layers like cotton t-shirts, light jeans, and a light jacket for breezy evenings.';
    let activities = 'Highly recommended for outdoor recreation: park visits, scenic walks, running, or outdoor cafes.';
    let health = 'Optimal physical comfort levels. Perfect for outdoor exercises and natural ventilation.';
    let home = 'Fully open windows to promote natural cross-ventilation. Save on mechanical climate controls today.';

    if (term.includes('rain') || term.includes('drizzle') || term.includes('shower') || term.includes('thunder') || term.includes('storm')) {
      state = 'rainy';
      badgeText = 'Precipitation / Storm';
      summaryText = `Active wet weather patterns detected (${conditionDesc || 'Rainy'}). Low atmospheric stability and high ambient humidity.`;
      apparel = 'Waterproof rain shell, robust waterproof boots or shoes, and a sturdy windbreaker umbrella.';
      activities = 'Excellent day for indoor museums, libraries, local cafes, or focusing on indoor creative projects.';
      health = 'Stay warm and completely dry to prevent rapid skin cooling. Carry dry socks or layers if transiting.';
      home = 'Double-check window seals and outdoor drainage grids. Turn on dehumidifiers if indoor air gets heavy.';
    } else if (term.includes('snow') || term.includes('ice') || term.includes('blizzard') || currentTemp <= 2) {
      state = 'freezing';
      badgeText = 'Freezing / Sub-Zero';
      summaryText = `Sub-freezing temperatures registered at ${temp}°C. Strong thermal protection is highly advised.`;
      apparel = 'Heavy insulated down jacket, thermal base layers, wool beanie, thick mittens, and windproof thermal pants.';
      activities = 'Winter sports if safe; otherwise, indoor stretching, relaxing by the hearth, or enjoy hot cocoa.';
      health = 'Limit exposure times for bare skin to guard against wind chill. Keep chest, ears, and neck fully covered.';
      home = 'Keep heating lines on a low, continuous cycle to avoid frozen pipes. Close insulating curtains to conserve home heat.';
    } else if (currentTemp >= 32) {
      state = 'extreme-heat';
      badgeText = 'Extreme Heat';
      summaryText = `High thermal load detected at ${temp}°C. Significant risk of heat fatigue and sunburn under direct rays.`;
      apparel = 'Lightweight, loose-fitting linen, cotton wear, polarized sunglasses, and a wide-brimmed protective hat.';
      activities = 'Limit heavy physical exertion to early morning or late night. Swim or rest in air-conditioned hubs.';
      health = 'Drink at least 3-4 liters of water and sports minerals proactively. Monitor pets and children for heat signs.';
      home = 'Pull thermal blinds shut early to deflect heat waves. Run fans to optimize cooling flow; restrict heavy oven usage.';
    } else if (term.includes('clear') || term.includes('sun')) {
      state = 'clear';
      badgeText = 'High Solar / Clear';
      summaryText = `High solar radiation under high barometric pressure. Bright, direct solar rays with active UV indexes.`;
      apparel = 'Breathable light clothing, sunglasses with UV protection, and a sun visor or cap.';
      activities = 'Superb for hiking, park activities, coastal runs, and outdoor sports. Best enjoyed with sunscreen.';
      health = 'Apply sunscreen (SPF 30+) even if temperature is moderate. Hydrate consistently throughout your route.';
      home = 'Ventilate home in the cool early hours, then draw shades during peak midday sun to block solar heat gain.';
    } else if (term.includes('cloud') || term.includes('overcast')) {
      state = 'cloudy';
      badgeText = 'Overcast / Cloudy';
      summaryText = `Ambient light shaded by dense cloud cover. Temperatures remain stable with comfortable low-glare humidity.`;
      apparel = 'Perfect for smart layers—a sweatshirt, hoodie, or a casual denim jacket is highly appropriate.';
      activities = 'Ideal for sightseeing, landscape sketching, photography, or running errands without sweating under the sun.';
      health = 'Low immediate heat index. Remember that UV rays still diffuse through cloud layers—maintain standard care.';
      home = 'Great day for full house air cycles. Open windows and vents wide to replace stale indoor air.';
    } else if (term.includes('mist') || term.includes('fog') || term.includes('haze') || term.includes('smoke')) {
      state = 'hazy';
      badgeText = 'Reduced Visibility';
      summaryText = `Suspended meteorological aerosols or moisture particles. Visual range is significantly reduced.`;
      apparel = 'Bright, highly visible clothing or reflective running strips. Keep an extra light layer handy.';
      activities = 'Stick to familiar indoor paths. Avoid high-speed outdoor cycling or activities in areas with dense fog.';
      health = 'If haze is smoke-induced, stay indoors, run air filtration devices, and wear protective respirator masks.';
      home = 'Keep all exterior entries securely sealed to block particle penetration. Run HEPA filters at speed.';
    }

    const badgeEl = document.getElementById('climate-state-badge');
    const summaryEl = document.getElementById('climate-state-summary');
    const apparelEl = document.getElementById('suggest-apparel');
    const activitiesEl = document.getElementById('suggest-activities');
    const healthEl = document.getElementById('suggest-health');
    const homeEl = document.getElementById('suggest-home');

    if (badgeEl) {
      badgeEl.textContent = badgeText;
      badgeEl.className = 'climate-badge ' + state;
    }
    if (summaryEl) summaryEl.textContent = summaryText;
    if (apparelEl) apparelEl.textContent = apparel;
    if (activitiesEl) activitiesEl.textContent = activities;
    if (healthEl) healthEl.textContent = health;
    if (homeEl) homeEl.textContent = home;
  }

  // -------------------------------------------------------------
  // DYNAMIC VIEWPORT MODE SWITCHER
  // -------------------------------------------------------------
  function initLayoutModes() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    const savedMode = localStorage.getItem('wel_weather_layout_mode') || 'auto';
    
    // Apply initial saved mode
    applyLayoutMode(savedMode);
    
    modeButtons.forEach(btn => {
      // Highlight correct button initially
      if (btn.getAttribute('data-mode') === savedMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const mode = btn.getAttribute('data-mode');
        applyLayoutMode(mode);
        localStorage.setItem('wel_weather_layout_mode', mode);
      });
    });
  }

  function applyLayoutMode(mode) {
    document.body.classList.remove('mode-desktop', 'mode-mobile');
    if (mode === 'desktop') {
      document.body.classList.add('mode-desktop');
    } else if (mode === 'mobile') {
      document.body.classList.add('mode-mobile');
    }
  }

  initLayoutModes();

  // Trigger Initial Sync on boot
  triggerStationSync();
});
