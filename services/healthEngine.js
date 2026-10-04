/**
 * OceanX — Mission Health Engine (v1.0)
 * 100% Deterministic Mathematical Health Scoring (0–100)
 * Evaluates core life-support, power, hull stress, acoustic telemetry, and active anomalies.
 */

const { HEALTH_CATEGORIES, THRESHOLDS } = require("../utils/constants");
const { calculateHydrostaticPressure, clamp } = require("../utils/helpers");

/**
 * Calculate deterministic mission health score
 * @param {Object} submersible - Current vehicle telemetry
 * @param {Array} anomalies - Active & historical anomaly records
 * @returns {Object} { score: number, category: string, status: string, color: string, breakdown: Object }
 */
function calculateMissionHealth(submersible, anomalies = []) {
  if (!submersible) {
    return {
      score: 0,
      category: "Critical",
      status: "CRITICAL",
      color: "#f72585",
      breakdown: { batteryScore: 0, oxygenScore: 0, hullScore: 0, commScore: 0, pressureScore: 0, anomalyScore: 0 }
    };
  }

  // 1. Battery Score (Weight: 25%)
  let batScore = clamp(submersible.battery ?? 100, 0, 100);
  if (batScore < THRESHOLDS.BATTERY_CRITICAL) batScore = Math.max(0, batScore - 25);
  else if (batScore < THRESHOLDS.BATTERY_WARNING) batScore = Math.max(0, batScore - 12);

  // 2. Oxygen Score (Weight: 20%)
  let o2Score = clamp(submersible.oxygen ?? 100, 0, 100);
  if (o2Score < THRESHOLDS.OXYGEN_CRITICAL) o2Score = Math.max(0, o2Score - 25);
  else if (o2Score < THRESHOLDS.OXYGEN_WARNING) o2Score = Math.max(0, o2Score - 12);

  // 3. Hull Integrity Score (Weight: 20%)
  let hullScore = clamp(submersible.hullCondition ?? 100, 0, 100);
  if (hullScore < THRESHOLDS.HULL_CRITICAL) hullScore = Math.max(0, hullScore - 30);
  else if (hullScore < THRESHOLDS.HULL_WARNING) hullScore = Math.max(0, hullScore - 15);

  // 4. Communication Signal Score (Weight: 15%)
  let commScore = clamp(submersible.communication ?? 100, 0, 100);
  if (commScore < THRESHOLDS.COMM_CRITICAL) commScore = Math.max(0, commScore - 20);
  else if (commScore < THRESHOLDS.COMM_WARNING) commScore = Math.max(0, commScore - 10);

  // 5. Hydrostatic Pressure Safety Score (Weight: 10%)
  const expectedPressure = calculateHydrostaticPressure(submersible.depth || 0);
  const actualPressure = submersible.pressure || expectedPressure;
  const deviationRatio = expectedPressure > 0 ? Math.abs(actualPressure - expectedPressure) / expectedPressure : 0;

  let pressureScore = 100;
  if (deviationRatio > 0.30) pressureScore = 20;
  else if (deviationRatio > 0.15) pressureScore = 55;
  else if (deviationRatio > 0.05) pressureScore = 80;

  // 6. Active Anomaly Impact Score (Weight: 10%)
  const activeAnomalies = anomalies.filter(a => a.status === "ACTIVE");
  let anomalyScore = 100;
  for (const anom of activeAnomalies) {
    if (anom.severity === "CRITICAL") anomalyScore -= 35;
    else if (anom.severity === "WARNING") anomalyScore -= 15;
    else if (anom.severity === "INFO") anomalyScore -= 5;
  }
  anomalyScore = clamp(anomalyScore, 0, 100);

  // Weighted Sum Calculation
  let rawHealth = (
    batScore * 0.25 +
    o2Score * 0.20 +
    hullScore * 0.20 +
    commScore * 0.15 +
    pressureScore * 0.10 +
    anomalyScore * 0.10
  );

  // Critical Safety Override: If power, life support, hull, or critical alarms exist,
  // cap overall health score to prevent masking critical emergency states
  const hasCriticalAlarm = activeAnomalies.some(a => a.severity === "CRITICAL");
  if (submersible.battery <= THRESHOLDS.BATTERY_CRITICAL ||
      submersible.oxygen <= THRESHOLDS.OXYGEN_CRITICAL ||
      submersible.hullCondition <= THRESHOLDS.HULL_CRITICAL ||
      hasCriticalAlarm) {
    rawHealth = Math.min(rawHealth, 45); // Risk threshold ceiling
  }

  const finalScore = Math.round(clamp(rawHealth, 0, 100));

  // Determine Category Matching
  let matchedCategory = HEALTH_CATEGORIES[HEALTH_CATEGORIES.length - 1];
  for (const cat of HEALTH_CATEGORIES) {
    if (finalScore >= cat.min && finalScore <= cat.max) {
      matchedCategory = cat;
      break;
    }
  }

  return {
    score: finalScore,
    category: matchedCategory.label,
    status: matchedCategory.status,
    color: matchedCategory.color,
    breakdown: {
      battery: { value: submersible.battery, score: Math.round(batScore), weight: 0.25 },
      oxygen: { value: submersible.oxygen, score: Math.round(o2Score), weight: 0.20 },
      hull: { value: submersible.hullCondition, score: Math.round(hullScore), weight: 0.20 },
      communication: { value: submersible.communication, score: Math.round(commScore), weight: 0.15 },
      pressure: { actual: actualPressure, expected: expectedPressure, score: Math.round(pressureScore), weight: 0.10 },
      anomalies: { activeCount: activeAnomalies.length, score: Math.round(anomalyScore), weight: 0.10 }
    }
  };
}

module.exports = { calculateMissionHealth };
