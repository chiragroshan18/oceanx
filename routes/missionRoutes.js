/**
 * OceanX — REST API Route Controller
 * Endpoints for mission management, telemetry streams, discoveries, anomalies, and simulations.
 */

const express = require("express");
const router = express.Router();
const missionEngine = require("../services/missionEngine");
const analyticsEngine = require("../services/analyticsEngine");
const { calculateMissionHealth } = require("../services/healthEngine");

/**
 * Middleware: Verify that active mission exists
 */
function requireActiveMission(req, res, next) {
  const mission = missionEngine.getActiveMission();
  if (!mission) {
    return res.status(404).json({
      success: false,
      error: "No active marine mission found. Create a new mission or restore the sample mission."
    });
  }
  req.mission = mission;
  next();
}

// -------------------------------------------------------------
// Mission Operations
// -------------------------------------------------------------

// GET /api/mission — Active mission overview
router.get("/mission", (req, res) => {
  const mission = missionEngine.getActiveMission();
  if (!mission) {
    return res.status(404).json({
      success: false,
      error: "No active marine mission found."
    });
  }
  res.json({ success: true, data: mission });
});

// POST /api/mission — Create new mission
router.post("/mission", (req, res) => {
  try {
    const mission = missionEngine.createMission(req.body);
    res.status(201).json({
      success: true,
      message: `Mission '${mission.name}' planned successfully.`,
      data: mission
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/mission/status — Lifecycle transition
router.patch("/mission/status", requireActiveMission, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: "Target status is required in body." });
    }
    const updated = missionEngine.transitionMissionState(status);
    res.json({
      success: true,
      message: `Mission transitioned to ${status}.`,
      data: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Live Telemetry & Simulation
// -------------------------------------------------------------

// GET /api/mission/telemetry — Current vehicle telemetry
router.get("/mission/telemetry", requireActiveMission, (req, res) => {
  const sub = req.mission.submersible;
  res.json({
    success: true,
    data: {
      missionId: req.mission.id,
      missionName: req.mission.name,
      status: req.mission.status,
      submersible: sub,
      history: req.mission.telemetryHistory.slice(-20)
    }
  });
});

// POST /api/mission/simulate — Advance step or execute simulation event
router.post("/mission/simulate", requireActiveMission, (req, res) => {
  try {
    const { action, params, options } = req.body;

    if (action) {
      // Named simulation action
      const result = missionEngine.simulateEvent(action, params || {});
      const missionPayload = {
        ...result.mission,
        telemetry: {
          submersible: result.mission.submersible,
          history: result.mission.telemetryHistory.slice(-20)
        }
      };
      return res.json({
        success: true,
        message: result.simulationResult.description,
        data: missionPayload,
        simulation: result.simulationResult
      });
    }

    // Default telemetry step progression
    const updated = missionEngine.simulateTelemetryStep(options || {});
    const updatedPayload = {
      ...updated,
      telemetry: {
        submersible: updated.submersible,
        history: updated.telemetryHistory.slice(-20)
      }
    };
    res.json({
      success: true,
      message: `Telemetry advanced. Depth is now ${updated.submersible.depth}m.`,
      data: updatedPayload
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/mission/emergency-return — Emergency ascent
router.post("/mission/emergency-return", requireActiveMission, (req, res) => {
  try {
    const result = missionEngine.triggerEmergencyReturn();
    res.json({
      success: true,
      message: "EMERGENCY RETURN INITIATED. Vehicle ascending at maximum speed.",
      data: result.mission
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Health, Anomalies & Discoveries
// -------------------------------------------------------------

// GET /api/mission/health — Health score & category
router.get("/mission/health", requireActiveMission, (req, res) => {
  const health = calculateMissionHealth(req.mission.submersible, req.mission.anomalies);
  res.json({ success: true, data: health });
});

// GET /api/mission/anomalies — Anomaly registry
router.get("/mission/anomalies", requireActiveMission, (req, res) => {
  const { severity, status } = req.query;
  const allAnomalies = req.mission.anomalies || [];
  let list = allAnomalies;

  if (severity) list = list.filter(a => a.severity === severity.toUpperCase());
  if (status) list = list.filter(a => a.status === status.toUpperCase());

  const activeCount = allAnomalies.filter(a => a.status === "ACTIVE").length;
  const criticalCount = allAnomalies.filter(a => a.severity === "CRITICAL").length;
  const warningCount = allAnomalies.filter(a => a.severity === "WARNING").length;
  const resolvedCount = allAnomalies.filter(a => a.status === "RESOLVED").length;

  res.json({
    success: true,
    data: {
      total: list.length,
      anomalies: list,
      stats: {
        total: allAnomalies.length,
        active: activeCount,
        critical: criticalCount,
        warning: warningCount,
        resolved: resolvedCount
      }
    }
  });
});

// PATCH /api/mission/anomalies/:id/acknowledge
router.patch("/mission/anomalies/:id/acknowledge", requireActiveMission, (req, res) => {
  try {
    const updated = missionEngine.handleAcknowledgeAnomaly(req.params.id);
    res.json({
      success: true,
      message: `Anomaly ${req.params.id} acknowledged.`,
      data: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/mission/anomalies/:id/resolve
router.patch("/mission/anomalies/:id/resolve", requireActiveMission, (req, res) => {
  try {
    const updated = missionEngine.handleResolveAnomaly(req.params.id);
    res.json({
      success: true,
      message: `Anomaly ${req.params.id} resolved.`,
      data: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/mission/discoveries — Marine discoveries
router.get("/mission/discoveries", requireActiveMission, (req, res) => {
  const { type, importance } = req.query;
  const allDiscoveries = req.mission.discoveries || [];
  let list = allDiscoveries;

  if (type) list = list.filter(d => d.type.toLowerCase() === type.toLowerCase());
  if (importance) list = list.filter(d => d.importance.toUpperCase() === importance.toUpperCase());

  const highCount = allDiscoveries.filter(d => d.importance === "HIGH" || d.importance === "CRITICAL").length;
  const speciesCount = allDiscoveries.filter(d => d.type === "Marine Species").length;
  const geoCount = allDiscoveries.filter(d => d.type === "Geological Formation" || d.type === "Hydrothermal Vent").length;
  const deepest = allDiscoveries.reduce((max, d) => Math.max(max, d.depth || 0), 0);

  res.json({
    success: true,
    data: {
      total: list.length,
      discoveries: list,
      stats: {
        totalDiscoveries: allDiscoveries.length,
        highImportanceCount: highCount,
        speciesCount: speciesCount,
        geologicalCount: geoCount,
        deepestDiscoveryMeters: deepest
      }
    }
  });
});

// POST /api/mission/discoveries — Record discovery
router.post("/mission/discoveries", requireActiveMission, (req, res) => {
  try {
    const discovery = missionEngine.recordDiscovery(req.body);
    res.status(201).json({
      success: true,
      message: `Discovery '${discovery.name}' logged successfully.`,
      data: discovery
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Timeline, Analytics & Reports
// -------------------------------------------------------------

// GET /api/mission/timeline — Chronological event stream
router.get("/mission/timeline", requireActiveMission, (req, res) => {
  const { category } = req.query;
  let events = req.mission.timeline || [];

  if (category) events = events.filter(e => e.category === category.toUpperCase());

  res.json({
    success: true,
    data: {
      total: events.length,
      events,
      timeline: events
    }
  });
});

// GET /api/mission/analytics — Complete performance metrics & profiles
router.get("/api/mission/analytics", requireActiveMission, (req, res) => {
  const analytics = analyticsEngine.generateMissionAnalytics(req.mission);
  res.json({ success: true, data: analytics });
});

// Alternate route for /mission/analytics
router.get("/mission/analytics", requireActiveMission, (req, res) => {
  const analytics = analyticsEngine.generateMissionAnalytics(req.mission);
  res.json({ success: true, data: analytics });
});

// GET /api/mission/report — Complete executive mission dossier
router.get("/mission/report", requireActiveMission, (req, res) => {
  const analytics = analyticsEngine.generateMissionAnalytics(req.mission);
  const health = calculateMissionHealth(req.mission.submersible, req.mission.anomalies);

  res.json({
    success: true,
    data: {
      mission: req.mission,
      analytics,
      efficiency: analytics.efficiency,
      discoveries: req.mission.discoveries || [],
      anomalies: req.mission.anomalies || [],
      insights: req.mission.insights || [],
      health,
      generatedAt: new Date().toISOString()
    }
  });
});

// -------------------------------------------------------------
// System & Data Governance
// -------------------------------------------------------------

// POST /api/mission/reset — Reset current mission
router.post("/mission/reset", requireActiveMission, (req, res) => {
  try {
    const reset = missionEngine.resetCurrentMission();
    res.json({
      success: true,
      message: "Active mission reset to pre-launch state.",
      data: reset
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/mission/sample — Restore pristine sample mission
router.post("/mission/sample", (req, res) => {
  const sample = missionEngine.restoreSample();
  res.json({
    success: true,
    message: "Curated sample mission 'Abyss Explorer 07' restored.",
    data: sample
  });
});

// DELETE /api/mission — Clear runtime data
router.delete("/mission", (req, res) => {
  const result = missionEngine.clearAllMissionData();
  res.json(result);
});

module.exports = router;
