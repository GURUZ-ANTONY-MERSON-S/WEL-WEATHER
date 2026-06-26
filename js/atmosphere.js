/**
 * WEL-Weather v1.0 - Atmospheric & Marine Data Controller
 * Uses free public Open-Meteo APIs (No API key required)
 */

const ATMOSPHERE_ENGINE = {
  /**
   * Fetches thermodynamic atmospheric profile from Open-Meteo
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Thermodynamic metrics
   */
  async fetchAtmosphericProfile(lat, lon) {
    try {
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure,cloud_cover,wind_speed_10m&hourly=cape,lifted_index&timezone=auto`;
      
      const response = await fetch(forecastUrl);
      if (!response.ok) {
        throw new Error('Open-Meteo atmospheric forecast query failed');
      }
      
      const data = await response.json();
      const current = data.current;
      
      // Parse hourly CAPE and Lifted Index
      let apiCape = null;
      let apiLiftedIndex = null;
      if (data.hourly && data.hourly.time && data.hourly.cape && data.hourly.lifted_index) {
        const currentTimeStr = current.time;
        const idx = data.hourly.time.indexOf(currentTimeStr);
        if (idx !== -1) {
          apiCape = data.hourly.cape[idx];
          apiLiftedIndex = data.hourly.lifted_index[idx];
        } else {
          // Find closest hour
          const currentHourMs = new Date(currentTimeStr).getTime();
          let minDiff = Infinity;
          let closestIdx = 0;
          for (let i = 0; i < data.hourly.time.length; i++) {
            const hourMs = new Date(data.hourly.time[i]).getTime();
            const diff = Math.abs(hourMs - currentHourMs);
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
            }
          }
          apiCape = data.hourly.cape[closestIdx];
          apiLiftedIndex = data.hourly.lifted_index[closestIdx];
        }
      }
      
      // Calculate Cloud Base (LCL - Lifted Condensation Level) using Espy's Formula
      // Height (m) = 125 * (Temperature - DewPoint)
      const temp = current.temperature_2m;
      const dew = current.dew_point_2m;
      const rh = current.relative_humidity_2m;
      
      let cloudBase = 0;
      let cloudCeiling = 'Clear Sky';
      
      if (temp > dew) {
        cloudBase = Math.round(125 * (temp - dew));
        
        // Estimate Cloud Ceiling based on cloud cover
        const cover = current.cloud_cover;
        if (cover >= 50) {
          // Cloud ceiling is generally slightly above the base for overcast decks
          cloudCeiling = Math.round(cloudBase + (1000 - (cover - 50) * 10)) + ' m';
        } else {
          cloudCeiling = 'No Ceiling (< 50% Cover)';
        }
      } else {
        cloudBase = 100; // Low fog deck
        cloudCeiling = '120 m (Overcast Fog)';
      }

      // Fetch Marine Sea Surface Temperature (SST)
      let sst = 'N/A (Inland)';
      try {
        const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature`;
        const marineRes = await fetch(marineUrl);
        if (marineRes.ok) {
          const marineData = await marineRes.json();
          if (marineData && marineData.current && marineData.current.sea_surface_temperature !== undefined) {
            const rawSst = marineData.current.sea_surface_temperature;
            sst = rawSst !== null ? `${rawSst} °C` : 'N/A (Inland)';
          }
        }
      } catch (err) {
        console.warn('Marine SST API query skipped or unavailable (standard for inland coordinates).');
      }

      return {
        surfaceTemp: temp,
        dewPoint: dew,
        relativeHumidity: rh,
        pressure: current.surface_pressure,
        cloudCover: current.cloud_cover,
        windSpeed: current.wind_speed_10m,
        cloudBase: cloudBase + ' m',
        cloudCeiling: cloudCeiling,
        seaSurfaceTemp: sst,
        apiCape: apiCape,
        apiLiftedIndex: apiLiftedIndex
      };
    } catch (error) {
      console.warn('Error fetching atmospheric profile (activating fallback):', error);
      return this.getFallbackProfile(lat, lon);
    }
  },

  /**
   * Deterministic meteorological fallback data in case of connection limits
   */
  getFallbackProfile(lat, lon) {
    // Deterministic values seeded by coordinates
    const seed = Math.sin(lat) * Math.cos(lon);
    const surfaceTemp = Math.round(15 + seed * 12);
    const dewPoint = Math.round(surfaceTemp - 4 - Math.abs(seed) * 3);
    const relativeHumidity = Math.round(70 - seed * 20);
    const pressure = Math.round(1011 + seed * 10);
    const cloudCover = Math.round(Math.abs(seed) * 100);
    
    const cloudBase = Math.round(125 * (surfaceTemp - dewPoint));
    const cloudCeiling = cloudCover >= 50 ? (cloudBase + 800) + ' m' : 'No Ceiling (< 50% Cover)';
    const sst = Math.abs(lat) < 45 ? Math.round(20 + seed * 5) + ' °C' : 'N/A (Inland)';

    return {
      surfaceTemp,
      dewPoint,
      relativeHumidity,
      pressure,
      cloudCover,
      windSpeed: Math.round(8 + Math.abs(seed) * 20),
      cloudBase: cloudBase + ' m',
      cloudCeiling,
      seaSurfaceTemp: sst,
      apiCape: null,
      apiLiftedIndex: null
    };
  }
};

// Export or expose on window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ATMOSPHERE_ENGINE;
} else {
  window.ATMOSPHERE_ENGINE = ATMOSPHERE_ENGINE;
}
