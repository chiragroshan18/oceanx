/**
 * OceanX — Marine Telemetry & Mission Simulation Engine (v1.0)
 * Drives deterministic underwater vehicle physics, depth progression, and sensor simulation.
 */

const { MISSION_STATES, SIMULATION_ACTIONS, DISCOVERY_TYPES, DISCOVERY_IMPORTANCE } = require("../utils/constants");
const { calculateHydrostaticPressure, calculateExpectedTemperature, calculateExpectedSignal, getDepthZone, clamp, generateId } = require("../utils/helpers");

/**
 * Advance telemetry by one standard mission step
 * @param {Object} mission - Active mission state
 * @param {Object} options - Custom parameters (e.g. depthDelta, batteryDrain)
 * @returns {Object} { updatedMission, timelineEvent, newDiscovery }
 */
function advanceTelemetry(mission, options = {}) {
  if (!mission || mission.status === MISSION_STATES.COMPLETED) {
    throw new Error("Cannot advance telemetry on completed or non-existent mission.");
  }

  const sub = mission.submersible;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let depthDelta = options.depthDelta !== undefined ? options.depthDelta : 150;
  let batteryDrain = options.batteryDrain !== undefined ? options.batteryDrain : 1.5;
  let o2Drain = options.o2Drain !== undefined ? options.o2Drain : 0.8;

  // Behavior based on lifecycle
  if (mission.status === MISSION_STATES.DIVING) {
    depthDelta = options.depthDelta || 350;
    batteryDrain = 2.0;
    // Check if reached target depth
    if (sub.depth + depthDelta >= mission.targetDepth) {
      sub.depth = mission.targetDepth;
      mission.status = MISSION_STATES.EXPLORING;
      sub.status = MISSION_STATES.EXPLORING;
    } else {
      sub.depth += depthDelta;
    }
  } else if (mission.status === MISSION_STATES.EXPLORING) {
    // Minor depth variations while surveying seafloor
    depthDelta = options.depthDelta !== undefined ? options.depthDelta : (Math.sin(sub.depth) > 0 ? 30 : -30);
    sub.depth = clamp(sub.depth + depthDelta, 0, mission.targetDepth + 300);
  } else if (mission.status === MISSION_STATES.RETURNING || mission.status === MISSION_STATES.EMERGENCY_RETURN) {
    // Ascent reduces depth
    const ascentRate = options.depthDelta ? Math.abs(options.depthDelta) : 600;
    sub.depth = Math.max(0, sub.depth - ascentRate);
    if (sub.depth === 0) {
      mission.status = MISSION_STATES.RECOVERED;
      sub.status = MISSION_STATES.RECOVERED;
    }
  } else if (mission.status === MISSION_STATES.DEPLOYED) {
    mission.status = MISSION_STATES.DIVING;
    sub.status = MISSION_STATES.DIVING;
    sub.depth = 120;
  }

  // Update track records
  mission.maxDepthReached = Math.max(mission.maxDepthReached || 0, sub.depth);
  sub.depthZone = getDepthZone(sub.depth).name;

  // Recalculate physics
  sub.pressure = calculateHydrostaticPressure(sub.depth);
  sub.temperature = calculateExpectedTemperature(sub.depth);
  sub.communication = calculateExpectedSignal(sub.depth, 100);

  // Consume consumables
  sub.battery = clamp(parseFloat((sub.battery - batteryDrain).toFixed(1)), 0, 100);
  sub.oxygen = clamp(parseFloat((sub.oxygen - o2Drain).toFixed(1)), 0, 100);

  // Speed adjustments
  sub.speed = options.speed !== undefined ? options.speed : clamp(parseFloat((2.2 + (Math.sin(sub.depth / 100) * 0.4)).toFixed(1)), 0.5, 4.0);

  // Update coordinates and exploration area
  sub.coordinates = {
    x: clamp(Math.round(sub.coordinates.x + (Math.cos(sub.headingDegrees * (Math.PI / 180)) * 12)), 20, 580),
    y: clamp(Math.round(sub.coordinates.y + (Math.sin(sub.headingDegrees * (Math.PI / 180)) * 12)), 20, 380)
  };

  // Heading drift
  sub.headingDegrees = (sub.headingDegrees + 4) % 360;

  // Progress update
  mission.elapsedMinutes = (mission.elapsedMinutes || 0) + 15;
  const areaIncrease = 0.4;
  mission.exploredAreaSqKm = parseFloat(Math.min(mission.plannedAreaSqKm, (mission.exploredAreaSqKm || 0) + areaIncrease).toFixed(1));
  mission.progressPercentage = clamp(Math.round((mission.exploredAreaSqKm / mission.plannedAreaSqKm) * 100), 0, 100);

  // Auto-record milestone timeline events
  let timelineEvent = null;
  if (sub.depth >= 1000 && !mission.timeline.some(t => t.event.includes("1,000m"))) {
    timelineEvent = { time: timeStr, event: "Depth Milestone: 1,000 m (Bathypelagic)", category: "TELEMETRY", detail: `Submersible passed 1,000m depth into the Midnight Zone at ${sub.pressure} bar pressure.` };
  } else if (sub.depth >= 4000 && !mission.timeline.some(t => t.event.includes("4,000m"))) {
    timelineEvent = { time: timeStr, event: "Depth Milestone: 4,000 m (Abyssopelagic)", category: "TELEMETRY", detail: `Vehicle entered the Abyssal Plains. Hydrostatic pressure measured at ${sub.pressure} bar.` };
  }

  if (timelineEvent) {
    timelineEvent.timestamp = timelineEvent.time || timeStr;
    timelineEvent.title = timelineEvent.event;
    timelineEvent.description = timelineEvent.detail;
  }

  // Record point in telemetry history
  mission.telemetryHistory.push({
    timestamp: timeStr,
    elapsedMin: mission.elapsedMinutes,
    depth: sub.depth,
    pressure: sub.pressure,
    temperature: sub.temperature,
    battery: sub.battery,
    oxygen: sub.oxygen,
    communication: sub.communication,
    speed: sub.speed,
    healthScore: 85 // will be recalculated by healthEngine
  });

  // Limit telemetry history to recent 100 entries to prevent memory bloat
  if (mission.telemetryHistory.length > 100) {
    mission.telemetryHistory.shift();
  }

  return { timelineEvent };
}

/**
 * Execute specific simulation action from Mission Simulation Center
 * @param {Object} mission - Active mission state
 * @param {string} actionType - One of SIMULATION_ACTIONS
 * @param {Object} customParams - Optional trigger params
 * @returns {Object} { actionExecuted, description, timelineEvent, newDiscovery }
 */
function executeSimulationAction(mission, actionType, customParams = {}) {
  if (!mission) throw new Error("No active mission found to simulate.");
  if (mission.status === MISSION_STATES.COMPLETED) {
    throw new Error("Cannot execute simulation actions on a completed mission.");
  }

  const sub = mission.submersible;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let timelineEvent = null;
  let newDiscovery = null;
  let description = "";

  switch (actionType) {
    case SIMULATION_ACTIONS.NORMAL_DIVE: {
      sub.depth = Math.min(mission.targetDepth, sub.depth + 300);
      sub.pressure = calculateHydrostaticPressure(sub.depth);
      sub.temperature = calculateExpectedTemperature(sub.depth);
      sub.battery = clamp(sub.battery - 2, 0, 100);
      sub.oxygen = clamp(sub.oxygen - 1, 0, 100);
      sub.depthZone = getDepthZone(sub.depth).name;
      mission.maxDepthReached = Math.max(mission.maxDepthReached, sub.depth);
      description = `Normal dive progression executed. Current depth: ${sub.depth} m (${sub.pressure} bar).`;
      timelineEvent = { time: timeStr, event: `Dive Descent to ${sub.depth}m`, category: "TELEMETRY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.DEEP_DIVE: {
      sub.depth = Math.min(mission.targetDepth + 500, sub.depth + 750);
      sub.pressure = calculateHydrostaticPressure(sub.depth);
      sub.temperature = calculateExpectedTemperature(sub.depth);
      sub.battery = clamp(sub.battery - 4, 0, 100);
      sub.oxygen = clamp(sub.oxygen - 2, 0, 100);
      sub.depthZone = getDepthZone(sub.depth).name;
      mission.maxDepthReached = Math.max(mission.maxDepthReached, sub.depth);
      description = `Rapid deep dive maneuver executed to ${sub.depth} m. Hydrostatic pressure: ${sub.pressure} bar.`;
      timelineEvent = { time: timeStr, event: `Deep Dive to ${sub.depth}m`, category: "TELEMETRY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.LOW_BATTERY: {
      sub.battery = 18; // drops below 20% warning threshold
      description = "Simulated auxiliary battery drain. Power dropped to 18%.";
      timelineEvent = { time: timeStr, event: "Simulated Low Battery Event", category: "ANOMALY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.COMM_LOSS: {
      sub.communication = 22; // drops below 30% warning threshold
      description = "Simulated acoustic hydrophone interference. Uplink signal degraded to 22%.";
      timelineEvent = { time: timeStr, event: "Simulated Comm Signal Loss", category: "ANOMALY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.PRESSURE_SPIKE: {
      // Artificially inflate pressure sensor reading by 30% above expected
      const expected = calculateHydrostaticPressure(sub.depth);
      sub.pressure = parseFloat((expected * 1.32).toFixed(1));
      description = `Simulated hydrostatic pressure spike: Sensor reads ${sub.pressure} bar (expected ${expected} bar).`;
      timelineEvent = { time: timeStr, event: "Simulated Pressure Spike Anomaly", category: "ANOMALY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.TEMP_SHIFT: {
      // Sudden thermal eddy plume
      sub.temperature = parseFloat((sub.temperature + 4.8).toFixed(1));
      description = `Thermal sensor detected sudden localized water heating to ${sub.temperature}°C (+4.8°C shift).`;
      timelineEvent = { time: timeStr, event: "Simulated Thermal Gradient Shift", category: "ANOMALY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.MARINE_DISCOVERY: {
      const types = DISCOVERY_TYPES;
      const randomType = customParams.type || types[Math.floor(Math.random() * types.length)];
      const sampleNames = {
        "Marine Species": "Bioluminescent Siphonophore Clade",
        "Coral Formation": "Deep-Sea Gorgonian Sea Fan",
        "Geological Formation": "Manganese-Iron Nodular Crust",
        "Hydrothermal Vent": "White Smoker Anhydrite Chimney",
        "Underwater Structure": "Submerged Seamount Pinnacle",
        "Sediment Sample": "Pelagic Biogenic Ooze Core",
        "Unknown Observation": "Unclassified Acoustic Sonar Echo"
      };

      newDiscovery = {
        id: generateId("DSC"),
        name: customParams.name || sampleNames[randomType] || "Deep-Sea Discovery Specimen",
        type: randomType,
        depth: sub.depth,
        location: { x: sub.coordinates.x, y: sub.coordinates.y, label: `Zone Sector ${Math.floor(sub.depth / 500)}` },
        importance: customParams.importance || DISCOVERY_IMPORTANCE.HIGH,
        timestamp: timeStr,
        description: customParams.description || `Cataloged at depth ${sub.depth}m during systematic forward sonar sweep.`
      };

      mission.discoveries.push(newDiscovery);
      description = `New discovery cataloged: ${newDiscovery.name} (${newDiscovery.type}) at ${sub.depth} m.`;
      timelineEvent = { time: timeStr, event: `Discovery: ${newDiscovery.name}`, category: "DISCOVERY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.CRITICAL_ANOMALY: {
      sub.hullCondition = 38; // drops below 40% critical threshold
      description = "Simulated hull micro-fracture alarm. Structural integrity dropped to 38%!";
      timelineEvent = { time: timeStr, event: "Critical Hull Integrity Alert", category: "ANOMALY", detail: description };
      break;
    }

    case SIMULATION_ACTIONS.EMERGENCY_RETURN: {
      if (mission.status === MISSION_STATES.RECOVERED || mission.status === MISSION_STATES.COMPLETED) {
        throw new Error("Cannot initiate emergency return on an already recovered/completed mission.");
      }
      mission.status = MISSION_STATES.EMERGENCY_RETURN;
      sub.status = MISSION_STATES.RETURNING;
      sub.depth = Math.max(0, sub.depth - 800);
      sub.speed = 3.6; // emergency ballast blow ascent speed
      description = "Emergency return procedure initiated. Dropped ascent weights; ascending at maximum ballast rate.";
      timelineEvent = { time: timeStr, event: "EMERGENCY RETURN INITIATED", category: "LIFECYCLE", detail: description };
      break;
    }

    default:
      throw new Error(`Unknown simulation action: '${actionType}'`);
  }

  // Update mission timestamp
  mission.updatedAt = new Date().toISOString();

  if (timelineEvent) {
    timelineEvent.timestamp = timelineEvent.time || timeStr;
    timelineEvent.title = timelineEvent.event;
    timelineEvent.description = timelineEvent.detail;
  }

  return {
    action: actionType,
    description,
    timelineEvent,
    newDiscovery
  };
}

module.exports = {
  advanceTelemetry,
  executeSimulationAction
};
