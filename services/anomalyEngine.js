/**
 * OceanX — Rule-Based Marine Anomaly Detection Engine (v1.0)
 * Evaluates real-time telemetry against oceanic physical thresholds and hull safety bounds.
 */

const { ANOMALY_SEVERITIES, ANOMALY_STATUS, THRESHOLDS } = require("../utils/constants");
const { calculateHydrostaticPressure, calculateExpectedTemperature, generateId } = require("../utils/helpers");

/**
 * Scan active telemetry and trigger rule-based anomalies
 * @param {Object} submersible - Current vehicle state
 * @param {Array} existingAnomalies - Existing anomaly records
 * @returns {Array} Updated array of anomalies (existing + newly detected)
 */
function scanForAnomalies(submersible, existingAnomalies = []) {
  if (!submersible) return existingAnomalies;

  const anomalies = [...existingAnomalies];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  function hasActiveAnomalyOfType(type) {
    return anomalies.some(a => a.type === type && a.status === ANOMALY_STATUS.ACTIVE);
  }

  // 1. Battery Depletion Rules
  if (submersible.battery <= THRESHOLDS.BATTERY_CRITICAL) {
    if (!hasActiveAnomalyOfType("CRITICAL_BATTERY_DEPLETION")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "CRITICAL_BATTERY_DEPLETION",
        severity: ANOMALY_SEVERITIES.CRITICAL,
        timestamp: timeStr,
        description: `Main propulsion power critical: ${submersible.battery}% remaining. Ascent advised immediately.`,
        triggerValue: `Battery <= ${THRESHOLDS.BATTERY_CRITICAL}% (Actual: ${submersible.battery}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  } else if (submersible.battery <= THRESHOLDS.BATTERY_WARNING) {
    if (!hasActiveAnomalyOfType("LOW_BATTERY_WARNING") && !hasActiveAnomalyOfType("CRITICAL_BATTERY_DEPLETION")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "LOW_BATTERY_WARNING",
        severity: ANOMALY_SEVERITIES.WARNING,
        timestamp: timeStr,
        description: `Vehicle battery has dropped to reserve levels (${submersible.battery}%). Conserve auxiliary lighting.`,
        triggerValue: `Battery <= ${THRESHOLDS.BATTERY_WARNING}% (Actual: ${submersible.battery}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  }

  // 2. Oxygen & Life Support Rules
  if (submersible.oxygen <= THRESHOLDS.OXYGEN_CRITICAL) {
    if (!hasActiveAnomalyOfType("CRITICAL_OXYGEN_DEPLETION")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "CRITICAL_OXYGEN_DEPLETION",
        severity: ANOMALY_SEVERITIES.CRITICAL,
        timestamp: timeStr,
        description: `Breathing gas partial pressure critically depleted: ${submersible.oxygen}%. Emergency scrubbers engaged.`,
        triggerValue: `Oxygen <= ${THRESHOLDS.OXYGEN_CRITICAL}% (Actual: ${submersible.oxygen}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  } else if (submersible.oxygen <= THRESHOLDS.OXYGEN_WARNING) {
    if (!hasActiveAnomalyOfType("OXYGEN_WARNING") && !hasActiveAnomalyOfType("CRITICAL_OXYGEN_DEPLETION")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "OXYGEN_WARNING",
        severity: ANOMALY_SEVERITIES.WARNING,
        timestamp: timeStr,
        description: `Secondary O2 cylinder reserves depleted to ${submersible.oxygen}%.`,
        triggerValue: `Oxygen <= ${THRESHOLDS.OXYGEN_WARNING}% (Actual: ${submersible.oxygen}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  }

  // 3. Acoustic Communication Signal Rules
  if (submersible.communication <= THRESHOLDS.COMM_CRITICAL) {
    if (!hasActiveAnomalyOfType("COMMUNICATION_BLACKOUT")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "COMMUNICATION_BLACKOUT",
        severity: ANOMALY_SEVERITIES.CRITICAL,
        timestamp: timeStr,
        description: `Surface acoustic uplink critically degraded (${submersible.communication}%). High data loss risk.`,
        triggerValue: `Signal <= ${THRESHOLDS.COMM_CRITICAL}% (Actual: ${submersible.communication}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  } else if (submersible.communication <= THRESHOLDS.COMM_WARNING) {
    if (!hasActiveAnomalyOfType("COMMUNICATION_WARNING") && !hasActiveAnomalyOfType("COMMUNICATION_BLACKOUT")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "COMMUNICATION_WARNING",
        severity: ANOMALY_SEVERITIES.WARNING,
        timestamp: timeStr,
        description: `Subsurface telemetry link degraded to ${submersible.communication}% signal strength.`,
        triggerValue: `Signal <= ${THRESHOLDS.COMM_WARNING}% (Actual: ${submersible.communication}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  }

  // 4. Hydrostatic Pressure Discrepancy Rules
  const expectedPressure = calculateHydrostaticPressure(submersible.depth || 0);
  if (submersible.pressure && expectedPressure > 0) {
    const deviation = Math.abs(submersible.pressure - expectedPressure) / expectedPressure;
    if (deviation >= 0.20 && !hasActiveAnomalyOfType("PRESSURE_SPIKE_ANOMALY")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "PRESSURE_SPIKE_ANOMALY",
        severity: ANOMALY_SEVERITIES.CRITICAL,
        timestamp: timeStr,
        description: `External pressure sensor reads ${submersible.pressure} bar vs expected ${expectedPressure} bar (deviation: ${(deviation * 100).toFixed(1)}%).`,
        triggerValue: `Pressure deviation >= 20% (Actual: ${submersible.pressure} bar, Expected: ${expectedPressure} bar)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  }

  // 5. Thermal Gradient / Hydrothermal Plume Inversion
  const expectedTemp = calculateExpectedTemperature(submersible.depth || 0);
  if (submersible.temperature !== undefined) {
    const tempDiff = Math.abs(submersible.temperature - expectedTemp);
    if (tempDiff >= 3.0 && !hasActiveAnomalyOfType("THERMAL_GRADIENT_ANOMALY")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "THERMAL_GRADIENT_ANOMALY",
        severity: ANOMALY_SEVERITIES.WARNING,
        timestamp: timeStr,
        description: `External water temperature ${submersible.temperature}°C differs significantly from expected ambient ${expectedTemp}°C. Possible hydrothermal vent proximity.`,
        triggerValue: `Temp delta >= 3.0°C (Delta: ${tempDiff.toFixed(1)}°C)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  }

  // 6. Hull Stress & Structural Integrity Rules
  if (submersible.hullCondition <= THRESHOLDS.HULL_CRITICAL) {
    if (!hasActiveAnomalyOfType("CRITICAL_HULL_BREACH_RISK")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "CRITICAL_HULL_BREACH_RISK",
        severity: ANOMALY_SEVERITIES.CRITICAL,
        timestamp: timeStr,
        description: `Hull strain gauge indicates structural safety limit breached (${submersible.hullCondition}%). Immediate surface ascent required!`,
        triggerValue: `Hull <= ${THRESHOLDS.HULL_CRITICAL}% (Actual: ${submersible.hullCondition}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  } else if (submersible.hullCondition <= THRESHOLDS.HULL_WARNING) {
    if (!hasActiveAnomalyOfType("HULL_INTEGRITY_WARNING") && !hasActiveAnomalyOfType("CRITICAL_HULL_BREACH_RISK")) {
      anomalies.push({
        id: generateId("ANM"),
        type: "HULL_INTEGRITY_WARNING",
        severity: ANOMALY_SEVERITIES.WARNING,
        timestamp: timeStr,
        description: `Acoustic emission sensors detect micro-fracture strain on titanium viewport ring (${submersible.hullCondition}%).`,
        triggerValue: `Hull <= ${THRESHOLDS.HULL_WARNING}% (Actual: ${submersible.hullCondition}%)`,
        status: ANOMALY_STATUS.ACTIVE
      });
    }
  }

  return anomalies;
}

/**
 * Transition anomaly status to RESOLVED
 */
function resolveAnomaly(anomalies, anomalyId) {
  return anomalies.map(a => {
    if (a.id === anomalyId) {
      return { ...a, status: ANOMALY_STATUS.RESOLVED, resolvedAt: new Date().toISOString() };
    }
    return a;
  });
}

/**
 * Transition anomaly status to ACKNOWLEDGED
 */
function acknowledgeAnomaly(anomalies, anomalyId) {
  return anomalies.map(a => {
    if (a.id === anomalyId) {
      return { ...a, status: ANOMALY_STATUS.ACKNOWLEDGED, acknowledgedAt: new Date().toISOString() };
    }
    return a;
  });
}

module.exports = {
  scanForAnomalies,
  resolveAnomaly,
  acknowledgeAnomaly
};
