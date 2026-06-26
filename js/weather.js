/**
 * WEL-Weather v1.0 - Core Weather & Geocoding Engine
 * Seamlessly integrates OpenWeatherMap & Open-Meteo fallback structures
 */

const WEATHER_ENGINE = {
  /**
   * Geocodes a city name to Latitude/Longitude
   * Falls back to free Open-Meteo Geocoding to ensure 100% key-free uptime
   * @param {string} query - City name query
   * @returns {Promise<Array>} List of geocoded locations
   */
  async geocodeLocation(query) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const apiKey = window.CONFIG ? window.CONFIG.OPENWEATHER_API_KEY : 'YOUR_OPENWEATHER_API_KEY';
    const isKeyConfigured = apiKey && apiKey !== 'YOUR_OPENWEATHER_API_KEY';

    // 1. Try Open-Meteo Geocoding first (completely keyless, extremely fast and reliable)
    try {
      const openMeteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`;
      const res = await fetch(openMeteoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          return data.results.map(item => ({
            name: item.name,
            country: item.country_code ? item.country_code.toUpperCase() : 'N/A',
            state: item.admin1 || '',
            lat: item.latitude,
            lon: item.longitude
          }));
        }
      }
    } catch (e) {
      console.warn('Open-Meteo Geocoding failed, attempting OpenWeather Geocoding...', e);
    }

    // 2. Try OpenWeather Geocoding if key is present
    if (isKeyConfigured) {
      try {
        const openWeatherUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(trimmed)}&limit=5&appid=${apiKey}`;
        const res = await fetch(openWeatherUrl);
        if (res.ok) {
          const data = await res.json();
          return data.map(item => ({
            name: item.name,
            country: item.country,
            state: item.state || '',
            lat: item.lat,
            lon: item.lon
          }));
        }
      } catch (e) {
        console.warn('OpenWeather Geocoding failed (this is expected if API key is unconfigured):', e);
      }
    }

    // 3. Simple offline fallback array for standard test locations
    const localDb = [
      { name: 'London', country: 'GB', state: 'England', lat: 51.5074, lon: -0.1278 },
      { name: 'New York', country: 'US', state: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'Tokyo', country: 'JP', state: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { name: 'Miami', country: 'US', state: 'Florida', lat: 25.7617, lon: -80.1918 },
      { name: 'Sydney', country: 'AU', state: 'New South Wales', lat: -33.8688, lon: 151.2093 }
    ];

    return localDb.filter(loc => loc.name.toLowerCase().includes(trimmed.toLowerCase()));
  },

  /**
   * Fetches current meteorological conditions
   * Uses OpenWeatherMap API, with a beautiful Open-Meteo fallback if key is unconfigured.
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Processed weather profile
   */
  async fetchCurrentWeather(lat, lon) {
    const apiKey = window.CONFIG ? window.CONFIG.OPENWEATHER_API_KEY : 'YOUR_OPENWEATHER_API_KEY';
    const isKeyConfigured = apiKey && apiKey !== 'YOUR_OPENWEATHER_API_KEY';

    if (isKeyConfigured) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return {
            temp: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            visibility: data.visibility / 1000, // convert meters to km
            windSpeed: Math.round(data.wind.speed * 3.6), // convert m/s to km/h
            windDir: data.wind.deg || 0,
            cloudCover: data.clouds.all,
            sunrise: new Date(data.sys.sunrise * 1000),
            sunset: new Date(data.sys.sunset * 1000),
            condition: data.weather[0].main,
            conditionDesc: data.weather[0].description,
            iconCode: data.weather[0].icon,
            isDemo: false,
            timezoneOffset: data.timezone
          };
        }
      } catch (err) {
        console.warn('OpenWeather current API failed, trying Open-Meteo backup...', err);
      }
    }

    // -------------------------------------------------------------
    // KEYLESS OPEN-METEO CURRENT WEATHER ENGINE (Aesthetic Masterstroke)
    // -------------------------------------------------------------
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code&daily=sunrise,sunset&timezone=auto`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const current = data.current;
        const daily = data.daily;

        const wmoMapped = this.mapWmoCode(current.weather_code);

        return {
          temp: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          pressure: Math.round(current.pressure_msl),
          visibility: 10, // Open-Meteo current profile lacks direct visibility; default 10km standard
          windSpeed: Math.round(current.wind_speed_10m),
          windDir: current.wind_direction_10m || 0,
          cloudCover: current.cloud_cover,
          sunrise: daily && daily.sunrise ? new Date(daily.sunrise[0]) : new Date(),
          sunset: daily && daily.sunset ? new Date(daily.sunset[0]) : new Date(),
          condition: wmoMapped.condition,
          conditionDesc: wmoMapped.desc,
          iconCode: wmoMapped.icon,
          isDemo: true, // Served via Free Sandbox Layer
          timezoneOffset: data.utc_offset_seconds
        };
      }
    } catch (err) {
      console.warn('Core weather APIs both failed. Booting synthetic offline profile.', err);
    }

    return this.getOfflineProfile(lat, lon);
  },

  /**
   * Translates World Meteorological Organization (WMO) Weather Codes
   * @param {number} code - Weather code
   * @returns {Object} Mapped profile
   */
  mapWmoCode(code) {
    if (code === 0) return { condition: 'Clear', desc: 'clear sky', icon: '01d' };
    if ([1, 2, 3].includes(code)) return { condition: 'Clouds', desc: 'partly cloudy', icon: '03d' };
    if ([45, 48].includes(code)) return { condition: 'Fog', desc: 'foggy visibility', icon: '50d' };
    if ([51, 53, 55].includes(code)) return { condition: 'Drizzle', desc: 'light misting drizzle', icon: '09d' };
    if ([61, 63, 65].includes(code)) return { condition: 'Rain', desc: 'moderate precipitation', icon: '10d' };
    if ([71, 73, 75].includes(code)) return { condition: 'Snow', desc: 'active snowfall', icon: '13d' };
    if ([80, 81, 82].includes(code)) return { condition: 'Rain Showers', desc: 'torrential rain showers', icon: '09d' };
    if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', desc: 'thunderstorms active', icon: '11d' };
    return { condition: 'Clouds', desc: 'variable clouds', icon: '04d' };
  },

  /**
   * Deterministic offline weather state seeded by geographic inputs
   */
  getOfflineProfile(lat, lon) {
    const seed = Math.sin(lat) * Math.cos(lon);
    const mockTemp = Math.round(18 + seed * 10);
    return {
      temp: mockTemp,
      feelsLike: mockTemp + 1,
      humidity: Math.round(65 - seed * 15),
      pressure: Math.round(1012 + seed * 8),
      visibility: 10,
      windSpeed: Math.round(12 + Math.abs(seed) * 15),
      windDir: Math.round(180 + seed * 100),
      cloudCover: Math.round(40 + seed * 30),
      sunrise: new Date(new Date().setHours(6, 12, 0)),
      sunset: new Date(new Date().setHours(18, 45, 0)),
      condition: Math.abs(seed) > 0.4 ? 'Rain' : 'Clear',
      conditionDesc: Math.abs(seed) > 0.4 ? 'light convective shower' : 'clear atmospheric visibility',
      iconCode: Math.abs(seed) > 0.4 ? '10d' : '01d',
      isDemo: true,
      timezoneOffset: Math.round(lon / 15) * 3600
    };
  }
};

// Export or expose on window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WEATHER_ENGINE;
} else {
  window.WEATHER_ENGINE = WEATHER_ENGINE;
}
