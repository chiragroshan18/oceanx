/**
 * OceanX — Mission Analytics & Efficiency Profiling Controller
 */

async function loadAnalyticsView() {
  try {
    const res = await api.fetchAnalytics();
    if (!res.success || !res.data) return;

    const data = res.data;
    const eff = data.efficiency || {};
    const series = data.timeSeries || data.profiles || {};

    // 1. Efficiency Score & Factor Breakdown
    const scoreVal = eff.score !== undefined ? eff.score : 88;
    document.getElementById("eff-score-num").textContent = Math.round(scoreVal);

    const plannedDur = eff.plannedDuration !== undefined ? eff.plannedDuration : 6.0;
    const actualDur = eff.actualDuration !== undefined ? eff.actualDuration : 4.2;
    const plannedDepthVal = eff.plannedDepth !== undefined ? eff.plannedDepth : 4500;
    const maxDepthVal = eff.maxDepth !== undefined ? eff.maxDepth : (data.telemetryStats?.maxDepthReached || 4280);
    const discCount = eff.discoveriesCount !== undefined ? eff.discoveriesCount : (data.discoveriesSummary?.total || 4);
    const anomCount = eff.anomaliesCount !== undefined ? eff.anomaliesCount : (data.anomaliesSummary?.total || 2);

    document.getElementById("eff-planned-duration").textContent = `${plannedDur}h`;
    document.getElementById("eff-actual-duration").textContent = `${actualDur}h`;
    document.getElementById("eff-planned-depth").textContent = `${Number(plannedDepthVal).toLocaleString()}m`;
    document.getElementById("eff-max-depth").textContent = `${Number(maxDepthVal).toLocaleString()}m`;
    document.getElementById("eff-discoveries").textContent = discCount;
    document.getElementById("eff-anomalies").textContent = anomCount;

    // Efficiency Breakdown Bars
    if (eff.breakdown) {
      renderFactorBar("eff-bar-depth", eff.breakdown.depthAttainment ?? eff.breakdown.depthFulfillment);
      renderFactorBar("eff-bar-area", eff.breakdown.areaCoverageScore ?? eff.breakdown.areaCoverage);
      renderFactorBar("eff-bar-time", eff.breakdown.timePacingScore ?? eff.breakdown.timePacing);
      renderFactorBar("eff-bar-disc", eff.breakdown.discoveryProductivity ?? eff.breakdown.scientificYield);
      renderFactorBar("eff-bar-safety", eff.breakdown.safetyIndex ?? eff.breakdown.safetyRecord);
    }

    // Helper to safely extract numeric array from numbers or object records
    const extractNumbers = (arr, key) => {
      if (!Array.isArray(arr) || arr.length === 0) return [];
      return arr.map(item => {
        if (typeof item === 'number') return isNaN(item) ? 0 : item;
        if (typeof item === 'object' && item !== null) {
          const v = item[key] !== undefined ? item[key] : (item.val || item.value || 0);
          const parsed = parseFloat(v);
          return isNaN(parsed) ? 0 : parsed;
        }
        const parsed = parseFloat(item);
        return isNaN(parsed) ? 0 : parsed;
      });
    };

    const depthData = extractNumbers(series.depth, "depth");
    const batteryData = extractNumbers(series.battery, "battery");
    const tempData = extractNumbers(series.temperature, "temperature");
    const pressureData = extractNumbers(series.pressure, "pressure");
    const commData = extractNumbers(series.communication, "communication");

    // 2. Render SVG Time-Series Charts
    // Depth Profile (Invert Y so sea floor is downwards)
    TelemetryCharts.renderTimeSeries("chart-depth-profile", depthData, {
      title: "Depth Profile",
      unit: "m",
      color: "#00f5d4",
      gradientStart: "#00f5d4",
      height: 220,
      invertY: true
    });

    // Battery Decay
    TelemetryCharts.renderTimeSeries("chart-battery-profile", batteryData, {
      title: "Battery Consumption",
      unit: "%",
      color: "#00bbf9",
      gradientStart: "#00bbf9",
      min: 0,
      max: 100,
      height: 220
    });

    // Temperature Profile
    TelemetryCharts.renderTimeSeries("chart-temp-profile", tempData, {
      title: "Ambient Temperature",
      unit: "°C",
      color: "#fee440",
      gradientStart: "#fee440",
      height: 220
    });

    // Hydrostatic Pressure Profile
    TelemetryCharts.renderTimeSeries("chart-pressure-profile", pressureData, {
      title: "Hydrostatic Pressure",
      unit: "bar",
      color: "#3a86ff",
      gradientStart: "#3a86ff",
      height: 220
    });

    // Acoustic Communication Signal
    TelemetryCharts.renderTimeSeries("chart-comm-profile", commData, {
      title: "Acoustic Signal Quality",
      unit: "%",
      color: "#f72585",
      gradientStart: "#f72585",
      min: 0,
      max: 100,
      height: 220
    });

    refreshGlobalHeader();
  } catch (err) {
    console.error("Analytics view load error:", err);
  }
}

function renderFactorBar(elementId, value) {
  const num = typeof value === 'object' && value !== null ? (value.score ?? 0) : value;
  const scoreVal = typeof num === 'number' ? num : parseFloat(num) || 0;
  const el = document.getElementById(elementId);
  const textEl = document.getElementById(`${elementId}-val`);
  if (el) {
    el.style.width = `${Math.max(0, Math.min(100, scoreVal))}%`;
  }
  if (textEl) {
    textEl.textContent = `${Math.round(scoreVal)}%`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadAnalyticsView();
});
