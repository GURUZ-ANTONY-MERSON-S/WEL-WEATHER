/**
 * WEL-Weather v1.0 - Thunderstorm Instability Engine
 * Handcrafted Rule-Based Meteorological Convective Risk Evaluator
 */

const THUNDERSTORM_ENGINE = {
  /**
   * Evaluates and estimates convective instability parameters
   * @param {Object} data - Standard and atmospheric parameters
   * @returns {Object} Instability profile
   */
  evaluateInstability(data) {
    const temp = parseFloat(data.temp) || 15;      // Surface Temp (°C)
    const dewPoint = parseFloat(data.dewPoint) || (temp - 5); // Dew Point (°C)
    const rh = parseFloat(data.humidity) || 60;      // Relative Humidity (%)
    const pressure = parseFloat(data.pressure) || 1013; // Pressure (hPa)
    const clouds = parseFloat(data.cloudCover) || 40;  // Cloud Cover (%)
    const wind = parseFloat(data.windSpeed) || 10;     // Wind Speed (km/h)
    const sst = parseFloat(data.seaSurfaceTemp) || null; // Marine SST if available

    let cape = 0;
    let liftedIndex = 0;
    let isEstimated = true;

    // Check if the API provided real CAPE and Lifted Index directly
    if (data.apiCape !== undefined && data.apiCape !== null && data.apiLiftedIndex !== undefined && data.apiLiftedIndex !== null) {
      cape = parseFloat(data.apiCape);
      liftedIndex = parseFloat(data.apiLiftedIndex);
      isEstimated = false;
    } else {
      // -------------------------------------------------------------
      // METEOROLOGICAL DETERMINISTIC ESTIMATION ENGINE
      // -------------------------------------------------------------
      // 1. Estimate Lifted Index (LI):
      // LI is temperature difference of lifted surface parcel vs 500 hPa ambient.
      // Stable is > 0, unstable is < 0.
      // High humidity (temp-dewPoint gap is small) & warm surface decrease LI.
      const tempDewGap = Math.max(0, temp - dewPoint);
      
      // Base LI is 5.0. It decreases (becomes unstable) with warmer surface, 
      // smaller temp-dewpoint spread, higher general dew points, and lower pressures.
      let estimatedLI = 5.5 - (0.16 * temp) - (0.1 * dewPoint) + (0.2 * tempDewGap) + (0.05 * (pressure - 1013));
      
      // Limit LI bounds from -12 to 15
      liftedIndex = Math.round(Math.max(-12, Math.min(15, estimatedLI)) * 10) / 10;

      // 2. Estimate CAPE (Convective Available Potential Energy):
      // CAPE correlates inversely with Lifted Index when LI < 0.
      if (liftedIndex < 0) {
        // Quadratic convective model
        let baseCape = 230 * Math.pow(Math.abs(liftedIndex), 1.65);
        
        // Adjust for moisture profile (relative humidity)
        const moistureFactor = rh / 70; // 70% RH is neutral reference
        baseCape *= moistureFactor;

        // Sea Surface Temperature (SST) correlation:
        // Warmer water enhances convective energy via heat/moisture flux.
        if (sst !== null && sst > 20) {
          baseCape *= (1 + (sst - 20) * 0.04);
        }

        // Adjust for cloud cover:
        // Extreme overcast (100%) inhibits solar insolation, lowering surface CAPE.
        // Direct clear sky (0%) has no initial condensation lift trigger.
        // Optimal convective triggering occurs around 50% - 80% cloud cover.
        if (clouds > 85) {
          baseCape *= (1 - (clouds - 85) * 0.03); // dampens up to 45%
        } else if (clouds < 20) {
          baseCape *= (0.65 + (clouds * 0.015));  // dampens up to 35%
        }

        cape = Math.round(Math.max(0, Math.min(4500, baseCape)));
      } else {
        // Slightly positive or zero CAPE when Lifted Index is stable (positive)
        cape = liftedIndex < 1.5 ? Math.round((1.5 - liftedIndex) * 80) : 0;
      }
    }

    // -------------------------------------------------------------
    // CONVECTIVE RISK EVALUATION
    // -------------------------------------------------------------
    let riskScore = 0;

    // CAPE points (up to 40% contribution)
    if (cape > 0) {
      riskScore += Math.min(40, (cape / 3000) * 40);
    }

    // Lifted Index points (up to 30% contribution)
    if (liftedIndex < 0) {
      riskScore += Math.min(30, (Math.abs(liftedIndex) / 8) * 30);
    }

    // Relative Humidity contribution (up to 15% contribution)
    if (rh > 50) {
      riskScore += Math.min(15, ((rh - 50) / 40) * 15);
    }

    // Atmospheric Pressure contribution (up to 10% contribution)
    // Low pressure systems are highly supportive of convergence and lift
    if (pressure < 1013) {
      riskScore += Math.min(10, ((1013 - pressure) / 25) * 10);
    }

    // Cloud cover lift contribution (up to 5% contribution)
    if (clouds > 30 && clouds < 90) {
      riskScore += 5;
    }

    // Wind Shear trigger contribution (up to 5% contribution)
    if (wind > 15) {
      riskScore += Math.min(5, ((wind - 15) / 30) * 5);
    }

    // Bound final risk score between 0 and 100%
    riskScore = Math.round(Math.max(0, Math.min(100, riskScore)));

    // Categorize risk profiles
    let riskLevel = 'Low';
    let riskColor = 'var(--accent-green)';
    let indicatorText = '● Stable Atmosphere';
    let summaryExplanation = '';

    if (riskScore < 25) {
      riskLevel = 'Low';
      riskColor = 'var(--accent-green)';
      indicatorText = '● Stable Atmosphere';
      summaryExplanation = `Atmospheric profile indicates strong stability. Low-level moisture is insufficient (RH: ${rh}%) or thermal lift is absent, suppressing any convective cell triggering.`;
    } else if (riskScore < 55) {
      riskLevel = 'Moderate';
      riskColor = 'var(--accent-yellow)';
      indicatorText = '● Convective Potential';
      summaryExplanation = `Moderate instability observed (${cape > 100 ? `CAPE: ~${cape} J/kg` : 'limited CAPE'}). Minor localized convective updrafts are possible if surface solar heating or localized convergence triggers mechanical lift.`;
    } else if (riskScore < 85) {
      riskLevel = 'High';
      riskColor = 'var(--accent-orange)';
      indicatorText = '● Unstable Column';
      summaryExplanation = `High thunderstorm potential detected. Strong atmospheric lapse rates (${liftedIndex < 0 ? `LI: ${liftedIndex}°C` : 'low LI'}) combined with rich low-level humidity (${rh}%) and thermal triggers point to imminent thunderstorm development.`;
    } else {
      riskLevel = 'Severe';
      riskColor = 'var(--accent-red)';
      indicatorText = '● Extreme Instability';
      summaryExplanation = `Severe convective outbreak hazard. Massive atmospheric energy profile (${cape} J/kg) paired with an extremely buoyant lifted column (${liftedIndex}°C) and optimal convergence triggers indicate a severe thunderstorm risk. Seek shelter if warnings are active.`;
    }

    return {
      cape,
      liftedIndex,
      isEstimated,
      riskScore,
      riskLevel,
      riskColor,
      indicatorText,
      summaryExplanation
    };
  }
};

// Export or expose on window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = THUNDERSTORM_ENGINE;
} else {
  window.THUNDERSTORM_ENGINE = THUNDERSTORM_ENGINE;
}
