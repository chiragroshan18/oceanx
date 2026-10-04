/**
 * OceanX — Main Express Server Entry Point
 * Smart Ocean Exploration & Marine Mission Monitoring System
 */

const express = require("express");
const path = require("path");
const missionRoutes = require("./routes/missionRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Assets from /public
app.use(express.static(path.join(__dirname, "public")));

// System Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    system: "OceanX",
    version: "1.0.0",
    engine: "Marine Mission Simulation Engine",
    platform: "Node.js & Express.js (Cloud-Ready Runtime)",
    timestamp: new Date().toISOString()
  });
});

// Mount Mission API Routes
app.use("/api", missionRoutes);

// View Fallback Routing for Navigation
const views = [
  "submersible",
  "exploration",
  "discoveries",
  "anomalies",
  "analytics",
  "timeline",
  "simulation",
  "reports"
];

views.forEach(view => {
  app.get(`/${view}`, (req, res) => {
    res.sendFile(path.join(__dirname, "public", `${view}.html`));
  });
});

// Root Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Global API 404 Handler
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint '${req.originalUrl}' was not found.`
  });
});

// Start Server if launched directly
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🌊 OceanX Server running on http://localhost:${PORT}`);
    console.log(`🛰️ Marine Mission Control & Telemetry Simulation ready.`);
  });

  const shutdown = () => {
    console.log("\nHalting OceanX Server...");
    server.close(() => {
      console.log("OceanX Server stopped.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

module.exports = app;
