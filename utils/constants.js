/**
 * OceanX — System Constants & Configuration Enums
 * Centralized governance for mission states, thresholds, and domain types
 */

const MISSION_STATES = Object.freeze({
  PLANNED: "PLANNED",
  READY: "READY",
  DEPLOYED: "DEPLOYED",
  DIVING: "DIVING",
  EXPLORING: "EXPLORING",
  RETURNING: "RETURNING",
  RECOVERED: "RECOVERED",
  COMPLETED: "COMPLETED",
  EMERGENCY_RETURN: "EMERGENCY_RETURN"
});

const ALLOWED_LIFECYCLE_TRANSITIONS = Object.freeze({
  [MISSION_STATES.PLANNED]: [MISSION_STATES.READY],
  [MISSION_STATES.READY]: [MISSION_STATES.DEPLOYED],
  [MISSION_STATES.DEPLOYED]: [MISSION_STATES.DIVING],
  [MISSION_STATES.DIVING]: [MISSION_STATES.EXPLORING, MISSION_STATES.RETURNING, MISSION_STATES.EMERGENCY_RETURN],
  [MISSION_STATES.EXPLORING]: [MISSION_STATES.RETURNING, MISSION_STATES.EMERGENCY_RETURN],
  [MISSION_STATES.EMERGENCY_RETURN]: [MISSION_STATES.RETURNING],
  [MISSION_STATES.RETURNING]: [MISSION_STATES.RECOVERED],
  [MISSION_STATES.RECOVERED]: [MISSION_STATES.COMPLETED],
  [MISSION_STATES.COMPLETED]: []
});

const VEHICLE_STATES = Object.freeze({
  READY: "READY",
  DEPLOYED: "DEPLOYED",
  DIVING: "DIVING",
  EXPLORING: "EXPLORING",
  RETURNING: "RETURNING",
  RECOVERED: "RECOVERED",
  MAINTENANCE: "MAINTENANCE"
});

const DISCOVERY_TYPES = Object.freeze([
  "Marine Species",
  "Coral Formation",
  "Geological Formation",
  "Hydrothermal Vent",
  "Underwater Structure",
  "Sediment Sample",
  "Unknown Observation"
]);

const DISCOVERY_IMPORTANCE = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

const ANOMALY_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL"
});

const ANOMALY_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED"
});

const HEALTH_CATEGORIES = Object.freeze([
  { min: 90, max: 100, label: "Excellent", status: "HEALTHY", color: "#00f5d4" },
  { min: 75, max: 89, label: "Healthy", status: "HEALTHY", color: "#00bbf9" },
  { min: 50, max: 74, label: "Watch", status: "CAUTION", color: "#fee440" },
  { min: 25, max: 49, label: "Risk", status: "ELEVATED_RISK", color: "#f77f00" },
  { min: 0, max: 24, label: "Critical", status: "CRITICAL", color: "#f72585" }
]);

const DEPTH_ZONES = Object.freeze([
  { name: "Epipelagic", label: "Sunlight Zone", min: 0, max: 200, color: "#48cae4" },
  { name: "Mesopelagic", label: "Twilight Zone", min: 200, max: 1000, color: "#0096c7" },
  { name: "Bathypelagic", label: "Midnight Zone", min: 1000, max: 4000, color: "#023e8a" },
  { name: "Abyssopelagic", label: "Abyss Zone", min: 4000, max: 6000, color: "#03045e" },
  { name: "Hadopelagic", label: "Trenches Zone", min: 6000, max: 11000, color: "#000814" }
]);

const SIMULATION_ACTIONS = Object.freeze({
  NORMAL_DIVE: "NORMAL_DIVE",
  DEEP_DIVE: "DEEP_DIVE",
  LOW_BATTERY: "LOW_BATTERY",
  COMM_LOSS: "COMM_LOSS",
  PRESSURE_SPIKE: "PRESSURE_SPIKE",
  TEMP_SHIFT: "TEMP_SHIFT",
  MARINE_DISCOVERY: "MARINE_DISCOVERY",
  CRITICAL_ANOMALY: "CRITICAL_ANOMALY",
  EMERGENCY_RETURN: "EMERGENCY_RETURN"
});

const THRESHOLDS = Object.freeze({
  BATTERY_WARNING: 20,
  BATTERY_CRITICAL: 10,
  OXYGEN_WARNING: 25,
  OXYGEN_CRITICAL: 15,
  COMM_WARNING: 30,
  COMM_CRITICAL: 15,
  HULL_WARNING: 60,
  HULL_CRITICAL: 40,
  PRESSURE_TOLERANCE_PCT: 0.15, // expected ± 15%
  MAX_SPEED_KNOTS: 4.5,
  SURFACE_PRESSURE_BAR: 1.0,
  PRESSURE_PER_METER_BAR: 0.1
});

module.exports = {
  MISSION_STATES,
  ALLOWED_LIFECYCLE_TRANSITIONS,
  VEHICLE_STATES,
  DISCOVERY_TYPES,
  DISCOVERY_IMPORTANCE,
  ANOMALY_SEVERITIES,
  ANOMALY_STATUS,
  HEALTH_CATEGORIES,
  DEPTH_ZONES,
  SIMULATION_ACTIONS,
  THRESHOLDS
};
