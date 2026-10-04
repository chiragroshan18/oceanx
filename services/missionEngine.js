/**
 * OceanX — Stateful Marine Mission Engine (v1.0)
 * Orchestrates mission state, lifecycle transitions, submersibles, anomaly scans, and telemetry updates.
 */

const { MISSION_STATES, ALLOWED_LIFECYCLE_TRANSITIONS, VEHICLE_STATES, DISCOVERY_TYPES, DISCOVERY_IMPORTANCE } = require("../utils/constants");
const { calculateHydrostaticPressure, calculateExpectedTemperature, calculateExpectedSignal, getDepthZone, clamp, generateId } = require("../utils/helpers");
const { createSampleMission } = require("../data/sampleMission");
const { calculateMissionHealth } = require("./healthEngine");
const { scanForAnomalies, resolveAnomaly, acknowledgeAnomaly } = require("./anomalyEngine");
const { advanceTelemetry, executeSimulationAction } = require("./telemetryEngine");
const { generateMissionAnalytics } = require("./analyticsEngine");
const { generateMissionInsights } = require("./insightEngine");

// Runtime In-Memory State Store
let activeMission = createSampleMission();

/**
 * Retrieve the active mission with real-time health score, insights, and analytics attached
 */
function getActiveMission() {
  if (!activeMission) return null;

  // Run real-time anomaly scan & health calculation
  activeMission.anomalies = scanForAnomalies(activeMission.submersible, activeMission.anomalies);
  const health = calculateMissionHealth(activeMission.submersible, activeMission.anomalies);
  activeMission.health = health;
  activeMission.healthScore = health.score;
  activeMission.healthCategory = health.category;
  activeMission.progress = activeMission.progressPercentage !== undefined ? activeMission.progressPercentage : 68;
  activeMission.insights = generateMissionInsights(activeMission);

  return activeMission;
}

/**
 * Initialize a new marine mission
 * @param {Object} payload - Mission configuration
 */
function createMission(payload = {}) {
  const {
    name,
    region,
    objective,
    submersibleName,
    leadResearcher,
    plannedDurationMinutes,
    targetDepth,
    priority
  } = payload;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Mission name is mandatory and cannot be empty.");
  }
  if (!region || typeof region !== "string" || region.trim().length === 0) {
    throw new Error("Exploration region is mandatory.");
  }
  if (!objective || typeof objective !== "string" || objective.trim().length === 0) {
    throw new Error("Mission objective is mandatory.");
  }

  const parsedTargetDepth = parseInt(targetDepth, 10);
  if (isNaN(parsedTargetDepth) || parsedTargetDepth <= 0 || parsedTargetDepth > 11000) {
    throw new Error("Target depth must be a positive integer between 1 and 11,000 meters.");
  }

  const parsedDuration = parseInt(plannedDurationMinutes, 10);
  if (isNaN(parsedDuration) || parsedDuration <= 0) {
    throw new Error("Planned duration must be a positive number of minutes.");
  }

  const missionId = generateId("MSN");
  const vehicleId = generateId("SUB");
  const now = new Date().toISOString();
  const timeStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

  activeMission = {
    id: missionId,
    name: name.trim(),
    region: region.trim(),
    objective: objective.trim(),
    leadResearcher: (leadResearcher || "Lead Oceanographer").trim(),
    priority: (priority || "HIGH").toUpperCase(),
    status: MISSION_STATES.PLANNED,
    targetDepth: parsedTargetDepth,
    maxDepthReached: 0,
    plannedDurationMinutes: parsedDuration,
    elapsedMinutes: 0,
    plannedAreaSqKm: 10.0,
    exploredAreaSqKm: 0.0,
    progressPercentage: 0,
    createdAt: now,
    updatedAt: now,

    submersible: {
      id: vehicleId,
      name: (submersibleName || "DeepSea Rover").trim(),
      status: VEHICLE_STATES.READY,
      depth: 0,
      depthZone: "Epipelagic",
      speed: 0.0,
      pressure: 1.0,
      temperature: 22.0,
      battery: 100,
      oxygen: 100,
      communication: 100,
      hullCondition: 100,
      headingDegrees: 0,
      coordinates: { x: 50, y: 50 },
      subsystems: {
        propulsion: { status: "OPTIMAL", health: 100, detail: "All thrusters ready" },
        lifeSupport: { status: "OPTIMAL", health: 100, detail: "Atmospheric scrubbers 100%" },
        hullIntegrity: { status: "OPTIMAL", health: 100, detail: "Composite pressure hull nominal" },
        commsArray: { status: "OPTIMAL", health: 100, detail: "Surface RF & acoustic transponder active" },
        sonarMultiBeam: { status: "STANDBY", health: 100, detail: "Sonar calibrated" }
      }
    },

    telemetryHistory: [
      { timestamp: timeStr, elapsedMin: 0, depth: 0, pressure: 1.0, temperature: 22.0, battery: 100, oxygen: 100, communication: 100, speed: 0.0, healthScore: 100 }
    ],

    discoveries: [],
    anomalies: [],
    timeline: [
      { time: timeStr, event: "Mission Initialized", category: "LIFECYCLE", detail: `Mission '${name}' planned for ${region}. Target depth: ${parsedTargetDepth}m.` }
    ],
    commandLog: []
  };

  return getActiveMission();
}

/**
 * Execute mission lifecycle transition
 * @param {string} targetState - Destination MISSION_STATES
 */
function transitionMissionState(targetState) {
  if (!activeMission) throw new Error("No active mission found to transition.");

  const current = activeMission.status;
  if (current === targetState) {
    return getActiveMission();
  }

  const allowed = ALLOWED_LIFECYCLE_TRANSITIONS[current] || [];
  if (!allowed.includes(targetState)) {
    throw new Error(`Invalid lifecycle transition from '${current}' to '${targetState}'. Allowed transitions: [${allowed.join(", ")}]`);
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  activeMission.status = targetState;
  activeMission.updatedAt = now.toISOString();

  // Update submersible state accordingly
  if (targetState === MISSION_STATES.DEPLOYED) {
    activeMission.submersible.status = VEHICLE_STATES.DEPLOYED;
    activeMission.timeline.push({ time: timeStr, event: "Submersible Deployed", category: "LIFECYCLE", detail: "Vehicle released into the water from surface support ship." });
  } else if (targetState === MISSION_STATES.DIVING) {
    activeMission.submersible.status = VEHICLE_STATES.DIVING;
    activeMission.submersible.depth = Math.max(50, activeMission.submersible.depth);
    activeMission.timeline.push({ time: timeStr, event: "Dive Descent Commenced", category: "LIFECYCLE", detail: `Vehicle flooding ballast; descending toward ${activeMission.targetDepth}m.` });
  } else if (targetState === MISSION_STATES.EXPLORING) {
    activeMission.submersible.status = VEHICLE_STATES.EXPLORING;
    activeMission.timeline.push({ time: timeStr, event: "Exploration Phase Active", category: "LIFECYCLE", detail: "Target depth stratum reached. Bathymetric scientific survey underway." });
  } else if (targetState === MISSION_STATES.EMERGENCY_RETURN) {
    activeMission.submersible.status = VEHICLE_STATES.RETURNING;
    activeMission.timeline.push({ time: timeStr, event: "EMERGENCY RETURN INITIATED", category: "LIFECYCLE", detail: "Emergency surfacing procedure triggered by mission commander." });
  } else if (targetState === MISSION_STATES.RETURNING) {
    activeMission.submersible.status = VEHICLE_STATES.RETURNING;
    activeMission.timeline.push({ time: timeStr, event: "Ascent Phase Begun", category: "LIFECYCLE", detail: "Submersible climbing back to surface retrieval zone." });
  } else if (targetState === MISSION_STATES.RECOVERED) {
    activeMission.submersible.status = VEHICLE_STATES.RECOVERED;
    activeMission.submersible.depth = 0;
    activeMission.submersible.pressure = 1.0;
    activeMission.timeline.push({ time: timeStr, event: "Submersible Recovered", category: "LIFECYCLE", detail: "Vehicle hoisted back aboard research vessel. Mission concluded." });
  } else if (targetState === MISSION_STATES.COMPLETED) {
    activeMission.submersible.status = VEHICLE_STATES.READY;
    activeMission.timeline.push({ time: timeStr, event: "Mission Fully Completed", category: "LIFECYCLE", detail: "Scientific data downloaded and archived into OceanX repository." });
  }

  return getActiveMission();
}

/**
 * Add a new scientific discovery to the mission
 */
function recordDiscovery(discoveryData = {}) {
  if (!activeMission) throw new Error("No active mission found to record discovery.");

  const { name, type, importance, description, depth, location } = discoveryData;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Discovery name is required.");
  }
  if (!type || !DISCOVERY_TYPES.includes(type)) {
    throw new Error(`Invalid discovery type '${type}'. Valid types: [${DISCOVERY_TYPES.join(", ")}]`);
  }

  const currentDepth = depth !== undefined ? parseInt(depth, 10) : activeMission.submersible.depth;
  const validImportance = Object.values(DISCOVERY_IMPORTANCE).includes(importance) ? importance : DISCOVERY_IMPORTANCE.MEDIUM;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const discovery = {
    id: generateId("DSC"),
    name: name.trim(),
    type,
    depth: Math.max(0, currentDepth),
    location: location || { x: activeMission.submersible.coordinates.x, y: activeMission.submersible.coordinates.y, label: "Survey Station" },
    importance: validImportance,
    timestamp: timeStr,
    description: (description || "Observation logged during marine exploration.").trim()
  };

  activeMission.discoveries.push(discovery);
  activeMission.timeline.push({
    time: timeStr,
    event: `Discovery: ${discovery.name}`,
    category: "DISCOVERY",
    detail: `Cataloged ${discovery.type} (${discovery.importance} importance) at ${discovery.depth}m depth.`
  });

  activeMission.updatedAt = now.toISOString();
  return discovery;
}

/**
 * Acknowledge an anomaly
 */
function handleAcknowledgeAnomaly(anomalyId) {
  if (!activeMission) throw new Error("No active mission found.");
  activeMission.anomalies = acknowledgeAnomaly(activeMission.anomalies, anomalyId);
  return getActiveMission();
}

/**
 * Resolve an anomaly
 */
function handleResolveAnomaly(anomalyId) {
  if (!activeMission) throw new Error("No active mission found.");
  activeMission.anomalies = resolveAnomaly(activeMission.anomalies, anomalyId);
  return getActiveMission();
}

/**
 * Advance mission simulation step
 */
function simulateTelemetryStep(options = {}) {
  if (!activeMission) throw new Error("No active mission found to simulate.");
  const res = advanceTelemetry(activeMission, options);
  if (res.timelineEvent) {
    activeMission.timeline.push(res.timelineEvent);
  }
  return getActiveMission();
}

/**
 * Trigger an explicit simulation event
 */
function simulateEvent(actionType, customParams = {}) {
  if (!activeMission) throw new Error("No active mission found to simulate.");
  const res = executeSimulationAction(activeMission, actionType, customParams);
  if (res.timelineEvent) {
    activeMission.timeline.push(res.timelineEvent);
  }
  return {
    mission: getActiveMission(),
    simulationResult: res
  };
}

/**
 * Trigger Emergency Return
 */
function triggerEmergencyReturn() {
  if (!activeMission) throw new Error("No active mission found to initiate emergency return.");
  if (activeMission.status === MISSION_STATES.RECOVERED || activeMission.status === MISSION_STATES.COMPLETED) {
    throw new Error("Cannot trigger emergency return: Submersible is already recovered/completed.");
  }

  return simulateEvent("EMERGENCY_RETURN");
}

/**
 * Restore curated sample mission
 */
function restoreSample() {
  activeMission = createSampleMission();
  return getActiveMission();
}

/**
 * Reset active mission to initial planned state
 */
function resetCurrentMission() {
  if (!activeMission) throw new Error("No active mission to reset.");

  activeMission.status = MISSION_STATES.PLANNED;
  activeMission.maxDepthReached = 0;
  activeMission.elapsedMinutes = 0;
  activeMission.exploredAreaSqKm = 0.0;
  activeMission.progressPercentage = 0;

  activeMission.submersible.status = VEHICLE_STATES.READY;
  activeMission.submersible.depth = 0;
  activeMission.submersible.depthZone = "Epipelagic";
  activeMission.submersible.pressure = 1.0;
  activeMission.submersible.temperature = 22.0;
  activeMission.submersible.battery = 100;
  activeMission.submersible.oxygen = 100;
  activeMission.submersible.communication = 100;
  activeMission.submersible.hullCondition = 100;
  activeMission.submersible.coordinates = { x: 50, y: 50 };

  activeMission.telemetryHistory = [
    { timestamp: "00:00", elapsedMin: 0, depth: 0, pressure: 1.0, temperature: 22.0, battery: 100, oxygen: 100, communication: 100, speed: 0.0, healthScore: 100 }
  ];
  activeMission.discoveries = [];
  activeMission.anomalies = [];
  activeMission.timeline = [
    { time: "00:00", event: "Mission Reset", category: "LIFECYCLE", detail: "Mission reverted to initial pre-launch configuration." }
  ];

  return getActiveMission();
}

/**
 * Clear all mission data
 */
function clearAllMissionData() {
  activeMission = null;
  return { success: true, message: "All runtime mission data cleared." };
}

module.exports = {
  getActiveMission,
  createMission,
  transitionMissionState,
  recordDiscovery,
  handleAcknowledgeAnomaly,
  handleResolveAnomaly,
  simulateTelemetryStep,
  simulateEvent,
  triggerEmergencyReturn,
  restoreSample,
  resetCurrentMission,
  clearAllMissionData
};
