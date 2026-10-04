/**
 * OceanX — Mission Report & Publication-Grade A4 Dossier Controller
 * Formatted with exact margins, auto-pagination, and html2pdf alignment precision.
 */

let activeReportData = null;

async function loadReportView() {
  try {
    const res = await api.fetchReport();
    if (!res.success || !res.data) return;

    activeReportData = res.data;
    const mission = res.data.mission;
    const sub = mission.submersible;
    const eff = res.data.efficiency || res.data.analytics?.efficiency || {};
    const discSummary = res.data.discoveriesSummary || {};
    const anomSummary = res.data.anomaliesSummary || {};
    const insights = res.data.insights || res.data.mission?.insights || [];

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    // Header & Meta
    setEl("rep-mission-name", mission.name);
    setEl("rep-mission-id", mission.id);
    setEl("rep-date", new Date().toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    }));

    const statusEl = document.getElementById("rep-status");
    if (statusEl) {
      statusEl.textContent = mission.status;
      statusEl.className = `badge badge-${mission.status.toLowerCase().replace(/_/g, "-")}`;
    }

    setEl("rep-region", mission.region);
    setEl("rep-objective", mission.objective);
    setEl("rep-lead", mission.leadResearcher);
    setEl("rep-submersible", `${sub.name} (${sub.id})`);

    const durationHrs = mission.plannedDuration !== undefined 
      ? mission.plannedDuration 
      : (mission.plannedDurationMinutes ? Math.round(mission.plannedDurationMinutes / 60) : 48);
    setEl("rep-planned-duration", `${durationHrs} Hours`);
    setEl("rep-target-depth", `${mission.targetDepth.toLocaleString()} m`);

    // Operational Telemetry Breakdown
    setEl("rep-max-depth", `${eff.maxDepth?.toLocaleString() || sub.depth.toLocaleString()} m`);
    setEl("rep-final-depth", `${sub.depth.toLocaleString()} m`);
    setEl("rep-pressure", `${sub.pressure.toFixed(1)} bar`);
    setEl("rep-temp", `${sub.temperature.toFixed(1)} °C`);
    setEl("rep-battery", `${Math.round(sub.battery)}%`);
    setEl("rep-oxygen", `${Math.round(sub.oxygen)}%`);
    setEl("rep-hull", `${sub.hullCondition.toFixed(1)}%`);

    const repHealthScore = mission.health?.score !== undefined ? mission.health.score : (mission.healthScore || 84);
    const repHealthCat = mission.health?.category || mission.healthCategory || "HEALTHY";
    setEl("rep-health-score", `${Math.round(repHealthScore)} / 100 (${repHealthCat})`);
    setEl("rep-efficiency-score", `${Math.round(eff.score || 0)} / 100`);

    // Discoveries Table
    renderReportDiscoveries(res.data.discoveries || []);

    // Anomalies Table
    renderReportAnomalies(res.data.anomalies || []);

    // Mission Insights & Recommendations
    renderReportInsights(insights);

    refreshGlobalHeader();
  } catch (err) {
    console.error("Load report error:", err);
  }
}

function renderReportDiscoveries(discoveries) {
  const container = document.getElementById("rep-discoveries-table-body");
  if (!container) return;

  if (discoveries.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: #8da4c4;">No specimen or geological discoveries recorded.</td></tr>`;
    return;
  }

  container.innerHTML = discoveries.map(d => `
    <tr>
      <td class="font-mono">#${d.id}</td>
      <td><strong>${d.name}</strong></td>
      <td>${d.type}</td>
      <td class="font-mono">${d.depth?.toLocaleString()} m</td>
      <td><span class="badge ${d.importance === 'CRITICAL' ? 'badge-emergency' : d.importance === 'HIGH' ? 'badge-returning' : 'badge-ready'}">${d.importance}</span></td>
    </tr>
  `).join("");
}

function renderReportAnomalies(anomalies) {
  const container = document.getElementById("rep-anomalies-table-body");
  if (!container) return;

  if (anomalies.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: #8da4c4;">Zero anomalies recorded during mission execution.</td></tr>`;
    return;
  }

  container.innerHTML = anomalies.map(a => `
    <tr>
      <td class="font-mono">#${a.id}</td>
      <td><strong>${a.type}</strong></td>
      <td><span class="badge severity-${a.severity.toLowerCase()}">${a.severity}</span></td>
      <td>${a.description}</td>
      <td><span class="badge ${a.status === 'RESOLVED' ? 'badge-recovered' : 'badge-emergency'}">${a.status}</span></td>
    </tr>
  `).join("");
}

function renderReportInsights(insights) {
  const container = document.getElementById("rep-insights-list");
  if (!container) return;

  if (!insights || insights.length === 0) {
    container.innerHTML = `<div style="color: #8da4c4;">No recommendations generated.</div>`;
    return;
  }

  container.innerHTML = insights.map(i => `
    <div style="background: rgba(10, 24, 50, 0.4); border-left: 3px solid #00f5d4; padding: 0.8rem 1.1rem; margin-bottom: 0.8rem; border-radius: 4px;">
      <div style="font-weight: 700; color: #00f5d4; font-size: 0.85rem; margin-bottom: 2px;">
        ${i.area ? `[${i.area.toUpperCase()}] ` : ''}${i.title || 'OPERATIONAL OBSERVATION'}
      </div>
      <div style="font-size: 0.8rem; color: #e6f1ff; line-height: 1.4;">${i.message || i.detail || i}</div>
    </div>
  `).join("");
}

/**
 * Download High-Resolution A4 PDF Dossier
 * Uses exact isolated CSS container scaling without coordinate drift
 */
async function downloadPDFReport() {
  const element = document.getElementById("mission-report-dossier");
  if (!element) return;

  if (typeof html2pdf === "undefined") {
    alert("html2pdf library is loading. Please try again in a few seconds.");
    return;
  }

  showToast("Compiling Dossier", "Rendering publication-grade A4 PDF...", "info");

  // Add isolation class
  element.classList.add("pdf-export-mode");

  const missionId = activeReportData?.mission?.id || "EX-07";
  const opt = {
    margin: [10, 10, 10, 10], // mm
    filename: `OceanX_Mission_Dossier_${missionId}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      logging: false
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait"
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    showToast("Download Complete", "Mission dossier saved successfully in A4 format.", "success");
  } catch (err) {
    console.error("PDF generation failed:", err);
    showToast("Export Failed", "Error creating PDF. Please use browser print as fallback.", "danger");
  } finally {
    element.classList.remove("pdf-export-mode");
  }
}

function triggerBrowserPrint() {
  window.print();
}

document.addEventListener("DOMContentLoaded", () => {
  loadReportView();
});
