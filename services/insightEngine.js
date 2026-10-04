/**
 * OceanX — Rule-Based Mission Intelligence & Operational Insights (v1.0)
 * Evaluates real-time mission telemetry and generates deterministic coaching guidance.
 */

const { THRESHOLDS } = require("../utils/constants");

/**
 * Generate overarching mission intelligence insights
 * @param {Object} mission - Current mission state
 * @returns {Array} Array of insight objects
 */
function generateMissionInsights(mission) {
  if (!mission) return [];

  const sub = mission.submersible || {};
  const discoveries = mission.discoveries || [];
  const anomalies = mission.anomalies || [];

  const insights = [
    generateMissionInsight(mission),
    generateTelemetryInsight(sub),
    generateBatteryInsight(sub),
    generateAnomalyInsight(anomalies),
    generateDiscoveryInsight(discoveries)
  ].filter(Boolean);

  return insights;
}

/**
 * Evaluates overall mission lifecycle and progress pacing
 */
function generateMissionInsight(mission) {
  if (!mission) return null;

  if (mission.status === "EMERGENCY_RETURN") {
    return {
      id: "INS-01",
      category: "LIFECYCLE",
      type: "CRITICAL",
      title: "Emergency Ascent Active",
      message: "Submersible is executing ballast weight release. Immediate surface recovery vessel positioning required.",
      recommendedAction: "Alert crane telemetry crew and prepare medical hyperbaric chamber on ship."
    };
  }

  if (mission.status === "RETURNING") {
    return {
      id: "INS-01",
      category: "LIFECYCLE",
      type: "INFO",
      title: "Planned Ascent Phase",
      message: `Submersible has concluded survey operations. Currently ascending at ${(mission.submersible?.speed || 2.4).toFixed(1)} knots.`,
      recommendedAction: "Monitor acoustic pinger to coordinate surface retrieval winch."
    };
  }

  if (mission.progressPercentage >= 65 && mission.status === "EXPLORING") {
    return {
      id: "INS-01",
      category: "LIFECYCLE",
      type: "SUCCESS",
      title: "Major Survey Threshold Achieved",
      message: `Explored ${mission.exploredAreaSqKm} of ${mission.plannedAreaSqKm} sq km (${mission.progressPercentage}%). Primary objective benchmarks met.`,
      recommendedAction: "Plan ascent schedule before auxiliary battery drops below 50%."
    };
  }

  return {
    id: "INS-01",
    category: "LIFECYCLE",
    type: "INFO",
    title: "Survey Operations Nominal",
    message: `Mission '${mission.name}' proceeding according to planned bathymetric flight path in ${mission.region}.`,
    recommendedAction: "Maintain standard 15-minute telemetry polling cadence."
  };
}

/**
 * Evaluates depth, pressure safety, and acoustic signal
 */
function generateTelemetryInsight(submersible) {
  if (!submersible) return null;

  if (submersible.communication <= THRESHOLDS.COMM_WARNING) {
    return {
      id: "INS-02",
      category: "COMMUNICATIONS",
      type: "WARNING",
      title: "Acoustic Telemetry Attenuation",
      message: `Communication signal has degraded to ${submersible.communication}%. Thermocline density layers causing signal reflection.`,
      recommendedAction: "Direct surface research ship to reposition sonobuoy array directly over vehicle GPS coordinates."
    };
  }

  if (submersible.depth >= 4000) {
    return {
      id: "INS-02",
      category: "TELEMETRY",
      type: "INFO",
      title: "Abyssal Pressure Equilibrium",
      message: `Operating in the Abyssopelagic Zone at ${submersible.depth}m. Hull experiencing ${(submersible.pressure || 400).toFixed(1)} bar hydrostatic pressure.`,
      recommendedAction: "Maintain structural viewport strain monitoring."
    };
  }

  return {
    id: "INS-02",
    category: "TELEMETRY",
    type: "SUCCESS",
    title: "Telemetry Link Optimal",
    message: `Acoustic hydrophone telemetry active at ${submersible.communication}% signal strength. Depth sensor and pressure transducers calibrated.`,
    recommendedAction: "Continue multi-beam forward mapping."
  };
}

/**
 * Evaluates battery reserves against mission profile
 */
function generateBatteryInsight(submersible) {
  if (!submersible) return null;

  if (submersible.battery <= THRESHOLDS.BATTERY_CRITICAL) {
    return {
      id: "INS-03",
      category: "POWER",
      type: "CRITICAL",
      title: "Critical Power Reserve Depletion",
      message: `Battery reserves at ${submersible.battery}%. Emergency power threshold reached.`,
      recommendedAction: "Cut auxiliary halogen floodlights and begin emergency ascent immediately."
    };
  }

  if (submersible.battery <= THRESHOLDS.BATTERY_WARNING) {
    return {
      id: "INS-03",
      category: "POWER",
      type: "WARNING",
      title: "Battery Approaching Reserve Threshold",
      message: `Current charge is ${submersible.battery}%. Consumption rate indicates ~55 minutes of powered exploration remaining.`,
      recommendedAction: "Switch science sampling arm to standby mode and prepare to terminate dive."
    };
  }

  return {
    id: "INS-03",
    category: "POWER",
    type: "SUCCESS",
    title: "Lithium Power Reserves Stable",
    message: `Submersible battery at ${submersible.battery}%. Magnetic propulsion thrusters operating at optimal efficiency.`,
    recommendedAction: "Power budget supports full planned survey duration."
  };
}

/**
 * Evaluates active anomalies and safety impacts
 */
function generateAnomalyInsight(anomalies = []) {
  const active = anomalies.filter(a => a.status === "ACTIVE");
  const critical = active.filter(a => a.severity === "CRITICAL");

  if (critical.length > 0) {
    return {
      id: "INS-04",
      category: "ANOMALIES",
      type: "CRITICAL",
      title: `${critical.length} Critical Marine Anomaly Detected`,
      message: `Active critical alerts: ${critical.map(c => c.type).join(", ")}. Immediate operational intervention required.`,
      recommendedAction: "Execute emergency ascent checklist and alert mission director."
    };
  }

  if (active.length > 0) {
    return {
      id: "INS-04",
      category: "ANOMALIES",
      type: "WARNING",
      title: `${active.length} Unresolved Environmental Anomalies`,
      message: `Active warnings logged in telemetry stream: ${active.map(a => a.type).join(", ")}.`,
      recommendedAction: "Acknowledge anomaly flags in telemetry center and assess sensor validity."
    };
  }

  return {
    id: "INS-04",
    category: "ANOMALIES",
    type: "SUCCESS",
    title: "Zero Active System Anomalies",
    message: "Environmental sensors, hull strain gauges, and internal atmospheric systems are running within green safety parameters.",
    recommendedAction: "No corrective actions required."
  };
}

/**
 * Evaluates scientific discoveries and biodiversity yield
 */
function generateDiscoveryInsight(discoveries = []) {
  if (discoveries.length === 0) {
    return {
      id: "INS-05",
      category: "DISCOVERIES",
      type: "INFO",
      title: "Awaiting Seafloor Discoveries",
      message: "Submersible has not yet cataloged benthic specimens or geological formations on this dive leg.",
      recommendedAction: "Slow vehicle speed to 1.5 knots and activate 4K UHD survey cameras."
    };
  }

  const highVal = discoveries.filter(d => d.importance === "CRITICAL" || d.importance === "HIGH");
  if (highVal.length >= 2) {
    return {
      id: "INS-05",
      category: "DISCOVERIES",
      type: "SUCCESS",
      title: "High-Priority Scientific Discoveries Cataloged",
      message: `${discoveries.length} total discoveries logged, including ${highVal.length} high-importance findings (${highVal.map(h => h.name).slice(0, 2).join(", ")}).`,
      recommendedAction: "Tag spatial coordinates for future benthic core sampling expedition."
    };
  }

  return {
    id: "INS-05",
    category: "DISCOVERIES",
    type: "INFO",
    title: `${discoveries.length} Scientific Records Logged`,
    message: `Survey team has documented ${discoveries.length} marine observations across current depth strata.`,
    recommendedAction: "Continue cataloging specimens according to World Ocean Database standards."
  };
}

module.exports = {
  generateMissionInsights,
  generateMissionInsight,
  generateTelemetryInsight,
  generateBatteryInsight,
  generateAnomalyInsight,
  generateDiscoveryInsight
};
