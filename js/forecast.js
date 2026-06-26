/**
 * WEL-Weather v1.0 - Hourly & Multi-Day Forecast Processor
 * Resolves forecasts from OpenWeatherMap or Open-Meteo backups
 */

const FORECAST_ENGINE = {
  /**
   * Fetches hourly and daily forecasts
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Formatted forecast lists
   */
  async fetchForecasts(lat, lon) {
    const apiKey = window.CONFIG ? window.CONFIG.OPENWEATHER_API_KEY : 'YOUR_OPENWEATHER_API_KEY';
    const isKeyConfigured = apiKey && apiKey !== 'YOUR_OPENWEATHER_API_KEY';

    if (isKeyConfigured) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return this.processOpenWeatherForecast(data);
        }
      } catch (err) {
        console.warn('OpenWeather Forecast query failed, booting Open-Meteo backup...', err);
      }
    }

    // -------------------------------------------------------------
    // KEYLESS OPEN-METEO MULTI-DAY & HOURLY FORECAST ENGINE
    // -------------------------------------------------------------
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return this.processOpenMeteoForecast(data);
      }
    } catch (err) {
      console.warn('All forecast API routes failed, compiling deterministic mock forecast...', err);
    }

    return this.getOfflineForecasts(lat, lon);
  },

  /**
   * Processes OpenWeather forecast JSON
   */
  processOpenWeatherForecast(data) {
    const hourly = [];
    const dailyMap = {};

    // OpenWeather delivers 40 blocks of 3-hour forecasts
    data.list.forEach((item, index) => {
      const date = new Date(item.dt * 1000);
      
      // Keep first 8 entries for 24-Hour Synoptic scrollbar
      if (index < 8) {
        hourly.push({
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: Math.round(item.main.temp),
          icon: item.weather[0].icon,
          pop: Math.round((item.pop || 0) * 100) // probability of precipitation
        });
      }

      // Roll up 3-hour blocks into days for 5-Day Trend
      const dayKey = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = {
          dayLabel: date.toLocaleDateString([], { weekday: 'long' }),
          dateLabel: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          tempMax: item.main.temp,
          tempMin: item.main.temp,
          icon: item.weather[0].icon,
          condition: item.weather[0].main,
          conditionDesc: item.weather[0].description,
          counts: {}
        };
      } else {
        const d = dailyMap[dayKey];
        if (item.main.temp > d.tempMax) d.tempMax = item.main.temp;
        if (item.main.temp < d.tempMin) d.tempMin = item.main.temp;
      }
    });

    const daily = Object.values(dailyMap).slice(0, 5).map(d => ({
      ...d,
      tempMax: Math.round(d.tempMax),
      tempMin: Math.round(d.tempMin)
    }));

    return { hourly, daily };
  },

  /**
   * Processes Open-Meteo forecast JSON
   */
  processOpenMeteoForecast(data) {
    const hourly = [];
    const daily = [];
    const hData = data.hourly;
    const dData = data.daily;

    // Build Hourly (first 24 hours, sampling every 2 hours for clarity)
    for (let i = 0; i < 24; i += 2) {
      if (hData.time[i]) {
        const date = new Date(hData.time[i]);
        const wmo = WEATHER_ENGINE.mapWmoCode(hData.weather_code[i]);
        hourly.push({
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: Math.round(hData.temperature_2m[i]),
          icon: wmo.icon,
          pop: hData.precipitation_probability[i] || 0
        });
      }
    }

    // Build Daily (5 Days)
    for (let i = 0; i < 5; i++) {
      if (dData.time[i]) {
        const date = new Date(dData.time[i] + 'T12:00:00'); // set mid-day to prevent timezone shifts
        const wmo = WEATHER_ENGINE.mapWmoCode(dData.weather_code[i]);
        daily.push({
          dayLabel: date.toLocaleDateString([], { weekday: 'long' }),
          dateLabel: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          tempMax: Math.round(dData.temperature_2m_max[i]),
          tempMin: Math.round(dData.temperature_2m_min[i]),
          icon: wmo.icon,
          condition: wmo.condition,
          conditionDesc: wmo.desc
        });
      }
    }

    return { hourly, daily };
  },

  /**
   * Deterministic offline mock fallback
   */
  getOfflineForecasts(lat, lon) {
    const seed = Math.sin(lat) * Math.cos(lon);
    const hourly = [];
    const daily = [];

    // Hourly Mock
    for (let i = 0; i < 8; i++) {
      const hour = (new Date().getHours() + i * 3) % 24;
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      hourly.push({
        time: timeStr,
        temp: Math.round(18 + seed * 6 + Math.sin(i) * 3),
        icon: Math.abs(seed) > 0.4 ? '10d' : '01d',
        pop: Math.round(Math.abs(Math.sin(i) * 100))
      });
    }

    // Daily Mock (5 Days)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayIdx = new Date().getDay();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayName = days[(currentDayIdx + i) % 7];
      
      daily.push({
        dayLabel: dayName,
        dateLabel: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        tempMax: Math.round(22 + seed * 5 + i * 0.5),
        tempMin: Math.round(14 + seed * 3 - i * 0.2),
        icon: Math.abs(seed) > 0.4 ? '10d' : '01d',
        condition: Math.abs(seed) > 0.4 ? 'Rain' : 'Clear',
        conditionDesc: Math.abs(seed) > 0.4 ? 'shower' : 'clear skies'
      });
    }

    return { hourly, daily };
  }
};

// Export or expose on window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FORECAST_ENGINE;
} else {
  window.FORECAST_ENGINE = FORECAST_ENGINE;
}
