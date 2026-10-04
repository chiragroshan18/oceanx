/**
 * OceanX — Mathematical & Physical Oceanography Helpers
 * Deterministic physics calculations and utility routines
 */

const { DEPTH_ZONES, THRESHOLDS } = require("./constants");

/**
 * Hydrostatic Pressure Calculation
 * Standard marine physics: 1 bar at surface + 1 bar per 10 meters depth
 * P = 1.0 + (depth * 0.1)
 */
function calculateHydrostaticPressure(depthMeters) {
  const depth = Math.max(0, depthMeters || 0);
  const pressure = THRESHOLDS.SURFACE_PRESSURE_BAR + (depth * THRESHOLDS.PRESSURE_PER_METER_BAR);
  return parseFloat(pressure.toFixed(1));
}

/**
 * Deep-Sea Ocean Thermal Profile
 * Models realistic oceanic thermocline:
 * - 0 to 200m (Epipelagic): Sunlight layer, 22.0°C to 14.0°C
 * - 200 to 1,000m (Mesopelagic Thermocline): Steep thermal drop to 4.2°C
 * - 1,000 to 6,000m+ (Bathypelagic / Abyss): Stable abyssal isotherm (4.2°C down to 1.8°C)
 */
function calculateExpectedTemperature(depthMeters) {
  const depth = Math.max(0, depthMeters || 0);
  if (depth <= 200) {
    return parseFloat((22.0 - (depth / 200) * 8.0).toFixed(1));
  } else if (depth <= 1000) {
    return parseFloat((14.0 - ((depth - 200) / 800) * 9.8).toFixed(1));
  } else {
    const t = Math.max(1.8, 4.2 - ((depth - 1000) / 5000) * 2.4);
    return parseFloat(t.toFixed(1));
  }
}

/**
 * Categorize depth into standard oceanic bathymetric zone
 */
function getDepthZone(depthMeters) {
  const depth = Math.max(0, depthMeters || 0);
  for (const zone of DEPTH_ZONES) {
    if (depth >= zone.min && depth < zone.max) {
      return zone;
    }
  }
  return DEPTH_ZONES[DEPTH_ZONES.length - 1];
}

/**
 * Expected Communication Signal based on depth
 * Acoustic and VLF deep-sea comms degrade with depth and thermocline boundary scattering
 */
function calculateExpectedSignal(depthMeters, baseSignal = 100) {
  const depth = Math.max(0, depthMeters || 0);
  // Linear attenuation with acoustic drop-off: ~6% loss per 1,000m
  const attenuation = (depth / 1000) * 6.5;
  const signal = Math.max(15, Math.min(100, Math.round(baseSignal - attenuation)));
  return signal;
}

/**
 * Generate human-readable identifier with domain prefix
 */
function generateId(prefix = "EVT") {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}

/**
 * Number clamping utility
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * JSON deep-clone helper for immutability
 */
function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  calculateHydrostaticPressure,
  calculateExpectedTemperature,
  getDepthZone,
  calculateExpectedSignal,
  generateId,
  clamp,
  cloneDeep
};
