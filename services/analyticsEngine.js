/**
 * OceanX — Mission Performance & Scientific Analytics Engine (v1.0)
 * Evaluates real-time mission telemetry time-series, depth profiles, and deterministic efficiency metrics.
 */

const { clamp } = require("../utils/helpers");

/**
 * Generate full analytical breakdowns from active mission telemetry
 * @param {Object} mission - Current mission state
 * @returns {Object} Comprehensive analytics packet
 */
function generateMissionAnalytics(mission) {
  if (!mission) return null;

  const history = mission.telemetryHistory || [];
  const discoveries = mission.discoveries || [];
  const anomalies = mission.anomalies || [];
  const sub = mission.submersible || {};

  // 1. Telemetry Time Series (Profiles)
  const depthProfile = history.map(h => ({ time: h.timestamp, depth: h.depth, pressure: h.pressure }));
  const batteryProfile = history.map(h => ({ time: h.timestamp, battery: h.battery, oxygen: h.oxygen }));
  const tempProfile = history.map(h => ({ time: h.timestamp, temperature: h.temperature }));
  const commProfile = history.map(h => ({ time: h.timestamp, communication: h.communication }));
  const healthTrajectory = history.map(h => ({ time: h.timestamp, score: h.healthScore || 85 }));

  // 2. Discovery Distribution Aggregations
  const discoveriesByType = {};
  const discoveriesByImportance = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  let deepestDiscovery = null;

  discoveries.forEach(d => {
    discoveriesByType[d.type] = (discoveriesByType[d.type] || 0) + 1;
    if (discoveriesByImportance[d.importance] !== undefined) {
      discoveriesByImportance[d.importance]++;
    }
    if (!deepestDiscovery || d.depth > deepestDiscovery.depth) {
      deepestDiscovery = d;
    }
  });

  // 3. Anomaly Breakdown
  const anomaliesBySeverity = { INFO: 0, WARNING: 0, CRITICAL: 0 };
  const anomaliesByStatus = { ACTIVE: 0, ACKNOWLEDGED: 0, RESOLVED: 0 };

  anomalies.forEach(a => {
    if (anomaliesBySeverity[a.severity] !== undefined) anomaliesBySeverity[a.severity]++;
    if (anomaliesByStatus[a.status] !== undefined) anomaliesByStatus[a.status]++;
  });

  // 4. Mission Efficiency Calculation
  const efficiency = calculateMissionEfficiency(mission);

  return {
    missionId: mission.id,
    missionName: mission.name,
    status: mission.status,
    profiles: {
      depth: depthProfile,
      battery: batteryProfile,
      temperature: tempProfile,
      communication: commProfile,
      health: healthTrajectory
    },
    timeSeries: {
      depth: history.map(h => h.depth),
      battery: history.map(h => h.battery),
      temperature: history.map(h => h.temperature),
      pressure: history.map(h => h.pressure),
      communication: history.map(h => h.communication),
      oxygen: history.map(h => h.oxygen),
      health: history.map(h => h.healthScore || 85)
    },
    discoveriesSummary: {
      total: discoveries.length,
      highImportanceCount: (discoveriesByImportance.HIGH || 0) + (discoveriesByImportance.CRITICAL || 0),
      byType: discoveriesByType,
      byImportance: discoveriesByImportance,
      deepest: deepestDiscovery
    },
    anomaliesSummary: {
      total: anomalies.length,
      activeCount: anomaliesByStatus.ACTIVE || 0,
      bySeverity: anomaliesBySeverity,
      byStatus: anomaliesByStatus
    },
    telemetryStats: {
      currentDepth: sub.depth || 0,
      maxDepthReached: mission.maxDepthReached || 0,
      currentPressure: sub.pressure || 1.0,
      currentTemperature: sub.temperature || 22.0,
      batteryRemaining: sub.battery || 100,
      oxygenRemaining: sub.oxygen || 100,
      communicationSignal: sub.communication || 100,
      currentSpeed: sub.speed || 0,
      exploredAreaSqKm: mission.exploredAreaSqKm || 0,
      plannedAreaSqKm: mission.plannedAreaSqKm || 1
    },
    efficiency
  };
}

/**
 * Deterministic Mission Efficiency Score Calculation (0–100)
 * Weighted Formula:
 * - Depth Objective Fulfillment (30%): Max depth reached vs Target depth
 * - Exploration Area Coverage (25%): Explored area vs Planned area
 * - Time & Pacing Management (20%): Elapsed minutes vs Planned duration
 * - Scientific Discovery Yield (15%): Discovery volume & high-value findings
 * - Operational Safety Margin (10%): Active & resolved anomaly penalty factor
 */
function calculateMissionEfficiency(mission) {
  if (!mission) return { score: 0, rating: "Not Available", breakdown: {} };

  // A. Depth Factor (Weight: 30%)
  const targetDepth = Math.max(1, mission.targetDepth || 4000);
  const maxDepth = mission.maxDepthReached || mission.submersible?.depth || 0;
  const depthRatio = Math.min(1.0, maxDepth / targetDepth);
  const depthScore = Math.round(depthRatio * 100);

  // B. Exploration Area Factor (Weight: 25%)
  const plannedArea = Math.max(0.1, mission.plannedAreaSqKm || 10);
  const exploredArea = mission.exploredAreaSqKm || 0;
  const areaRatio = Math.min(1.0, exploredArea / plannedArea);
  const areaScore = Math.round(areaRatio * 100);

  // C. Time Pacing Factor (Weight: 20%)
  const plannedDuration = Math.max(1, mission.plannedDurationMinutes || 360);
  const elapsed = mission.elapsedMinutes || 0;
  let timeScore = 100;
  if (elapsed > plannedDuration) {
    const overdueRatio = (elapsed - plannedDuration) / plannedDuration;
    timeScore = Math.max(35, Math.round(100 - overdueRatio * 50));
  }

  // D. Scientific Discovery Factor (Weight: 15%)
  const discCount = (mission.discoveries || []).length;
  const criticalDiscCount = (mission.discoveries || []).filter(d => d.importance === "CRITICAL" || d.importance === "HIGH").length;
  const discScore = Math.min(100, Math.round(discCount * 18 + criticalDiscCount * 14));

  // E. Safety & Anomaly Factor (Weight: 10%)
  const anomalies = mission.anomalies || [];
  let safetyScore = 100;
  anomalies.forEach(a => {
    const penalty = a.severity === "CRITICAL" ? 30 : a.severity === "WARNING" ? 14 : 5;
    safetyScore -= a.status === "RESOLVED" ? penalty * 0.4 : penalty;
  });
  safetyScore = clamp(Math.round(safetyScore), 0, 100);

  // Weighted Sum
  const rawScore = (
    depthScore * 0.30 +
    areaScore * 0.25 +
    timeScore * 0.20 +
    discScore * 0.15 +
    safetyScore * 0.10
  );

  const finalScore = Math.round(clamp(rawScore, 0, 100));

  let rating = "Optimal";
  if (finalScore >= 90) rating = "Superior Scientific Yield";
  else if (finalScore >= 75) rating = "High Operational Efficiency";
  else if (finalScore >= 55) rating = "Acceptable Marine Yield";
  else rating = "Sub-Optimal Operations";

  return {
    score: finalScore,
    rating,
    plannedDuration: Math.round((plannedDuration / 60) * 10) / 10,
    actualDuration: Math.round((elapsed / 60) * 10) / 10,
    plannedDepth: targetDepth,
    maxDepth: maxDepth,
    discoveriesCount: discCount,
    anomaliesCount: anomalies.length,
    breakdown: {
      depthFulfillment: { score: depthScore, weight: 0.30, detail: `${maxDepth}m of ${targetDepth}m target` },
      areaCoverage: { score: areaScore, weight: 0.25, detail: `${exploredArea} of ${plannedArea} sq km` },
      timePacing: { score: timeScore, weight: 0.20, detail: `${elapsed}m elapsed vs ${plannedDuration}m planned` },
      scientificYield: { score: discScore, weight: 0.15, detail: `${discCount} discoveries cataloged` },
      safetyRecord: { score: safetyScore, weight: 0.10, detail: `${anomalies.length} total anomalies logged` },
      depthAttainment: depthScore,
      discoveryProductivity: discScore,
      safetyIndex: safetyScore
    }
  };
}

module.exports = {
  generateMissionAnalytics,
  calculateMissionEfficiency
};
