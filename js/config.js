/**
 * WEL-Weather v1.0 - Configuration
 * Client-Side Configuration & API Settings
 */

const CONFIG = {
  // Replace with your actual OpenWeatherMap API key (v2.5/v3.0)
  // Get one for free at: https://openweathermap.org/
  OPENWEATHER_API_KEY: '2326eefe6428b8ad953e5b2691b33b8d',
  
  // Default location: London, UK
  DEFAULT_LOCATION: {
    lat: 51.5074,
    lon: -0.1278,
    name: 'London',
    country: 'GB'
  },

  // Storage keys for localStorage persistence
  STORAGE_KEYS: {
    USER: 'wel_weather_user',
    API_KEY: 'wel_weather_api_key',
    FAVORITES: 'wel_weather_favorites',
    LAST_SEARCH: 'wel_weather_last_search'
  },

  // Enable/Disable Demo Mode if OpenWeather API key is not configured
  // This ensures the portfolio works perfectly and interactively immediately
  DEMO_MODE_IF_NO_KEY: true
};

// Export config if we are in a module environment, else expose on window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
