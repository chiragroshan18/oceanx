/**
 * OceanX — Mission Control Dashboard Controller
 */

let globalMap = null;
let pollInterval = null;

async function loadDashboard() {
  try {
    const res = await api.fetchMission();
    if (!res.success || !res.data) {
      renderEmptyMissionState();
      return;
    }

    const mission = res.data;
    const sub = mission.submersible;

    // 1. Mission Header & Status
    document.getElementById("dash-mission-name").textContent = mission.name;
    document.getElementById("dash-mission-id").textContent = mission.id;
    document.getElementById("dash-region").textContent = mission.region;
    document.getElementById("dash-sub-name").textContent = sub.name;
    document.getElementById("dash-researcher").textContent = mission.leadResearcher;

    const statusBadge = document.getElementById("dash-status-badge");
    statusBadge.textContent = mission.status;
    statusBadge.className = `badge badge-${mission.status.toLowerCase().replace(/_/g, "-")}`;

    // Emergency Banner
    const emergBanner = document.getElementById("emergency-banner");
    if (mission.status === "EMERGENCY_RETURN" || (mission.anomalies && mission.anomalies.some(a => a.severity === "CRITICAL" && a.status !== "RESOLVED"))) {
      emergBanner.style.display = "flex";
      document.getElementById("emergency-banner-msg").textContent = 
        mission.status === "EMERGENCY_RETURN" 
          ? "CRITICAL STATUS: Emergency ascent in progress. Submersible is returning to surface." 
          : "CRITICAL ALARM: Active critical anomaly detected! Review anomaly command center immediately.";
    } else {
      emergBanner.style.display = "none";
    }

    // 2. Real-time Telemetry Tiles
    document.getElementById("tile-depth").textContent = sub.depth.toLocaleString();
    document.getElementById("tile-pressure").textContent = sub.pressure.toFixed(1);
    document.getElementById("tile-temp").textContent = sub.temperature.toFixed(1);
    document.getElementById("tile-battery").textContent = Math.round(sub.battery);
    document.getElementById("tile-oxygen").textContent = Math.round(sub.oxygen);
    document.getElementById("tile-comm").textContent = Math.round(sub.communication);
    const progressVal = mission.progressPercentage !== undefined ? mission.progressPercentage : (mission.progress || 68);
    document.getElementById("tile-progress").textContent = Math.round(progressVal);

    // Progress bar fills
    updateTileBar("bar-battery", sub.battery, sub.battery <= 20 ? "critical" : sub.battery <= 40 ? "warning" : "");
    updateTileBar("bar-oxygen", sub.oxygen, sub.oxygen <= 25 ? "critical" : sub.oxygen <= 50 ? "warning" : "");
    updateTileBar("bar-comm", sub.communication, sub.communication <= 30 ? "critical" : "");
    updateTileBar("bar-progress", progressVal);

    // 3. Mission Health Score
    const hScore = mission.health?.score !== undefined ? mission.health.score : (mission.healthScore || 84);
    const hCat = mission.health?.category || mission.healthCategory || "OPTIMAL";
    updateHealthDial(hScore, hCat);

    // 4. Interactive Exploration Map
    if (!globalMap) {
      globalMap = new ExplorationMap("dashboard-map-container");
    }
    globalMap.render(mission, { submersible: sub, progress: progressVal });

    // 5. Recent Anomalies & Discoveries Quick Strip
    renderQuickAnomalies(mission.anomalies || []);
    renderQuickDiscoveries(mission.discoveries || []);

    // 6. Action Button States
    const btnEmergency = document.getElementById("btn-dash-emergency");
    if (btnEmergency) {
      btnEmergency.disabled = (mission.status === "RETURNING" || mission.status === "RECOVERED" || mission.status === "COMPLETED");
    }

    refreshGlobalHeader();
  } catch (err) {
    console.error("Dashboard load failed:", err);
    showToast("Connection Error", "Could not synchronize with Mission Control server.", "danger");
  }
}

function updateTileBar(barId, percentage, alertClass = "") {
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
  bar.className = `tile-progress-fill ${alertClass}`;
}

function updateHealthDial(score, category) {
  const dialBar = document.getElementById("dash-health-bar");
  const numEl = document.getElementById("dash-health-num");
  const catEl = document.getElementById("dash-health-cat");

  if (numEl) numEl.textContent = Math.round(score);
  if (catEl) {
    catEl.textContent = category;
    catEl.style.background = score >= 75 ? "rgba(0, 245, 212, 0.15)" : score >= 50 ? "rgba(254, 228, 64, 0.2)" : "rgba(247, 37, 133, 0.25)";
    catEl.style.color = score >= 75 ? "#00f5d4" : score >= 50 ? "#fee440" : "#f72585";
  }

  if (dialBar) {
    const circumference = 377;
    const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
    dialBar.style.strokeDashoffset = offset;
    dialBar.style.stroke = score >= 75 ? "#00f5d4" : score >= 50 ? "#fee440" : "#f72585";
  }
}

function renderQuickAnomalies(anomalies) {
  const container = document.getElementById("dash-anom-list");
  if (!container) return;

  const active = anomalies.filter(a => a.status !== "RESOLVED");
  if (active.length === 0) {
    container.innerHTML = `<div style="color: #537095; font-size: 0.85rem; padding: 0.5rem 0;">All vehicle systems optimal. No unresolved anomalies.</div>`;
    return;
  }

  container.innerHTML = active.slice(0, 4).map(a => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div>
        <span class="badge severity-${a.severity.toLowerCase()}">${a.severity}</span>
        <strong style="margin-left: 0.5rem; font-size: 0.82rem; color: #fff;">${a.type}</strong>
        <div style="font-size: 0.72rem; color: #8da4c4; margin-top: 2px;">${a.description}</div>
      </div>
      <a href="anomalies.html" class="btn btn-secondary btn-sm">Inspect</a>
    </div>
  `).join("");
}

function renderQuickDiscoveries(discoveries) {
  const container = document.getElementById("dash-disc-list");
  if (!container) return;

  if (discoveries.length === 0) {
    container.innerHTML = `<div style="color: #537095; font-size: 0.85rem; padding: 0.5rem 0;">No discoveries recorded yet. Conduct exploration dives.</div>`;
    return;
  }

  container.innerHTML = discoveries.slice(0, 4).map(d => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div>
        <span class="importance-${d.importance.toLowerCase()}" style="font-size: 0.75rem;">[${d.importance}]</span>
        <strong style="margin-left: 0.35rem; font-size: 0.85rem; color: #00f5d4;">${d.name}</strong>
        <div style="font-size: 0.72rem; color: #8da4c4; margin-top: 2px;">${d.type} &bull; ${d.depth?.toLocaleString()}m</div>
      </div>
      <a href="discoveries.html" class="btn btn-secondary btn-sm">View</a>
    </div>
  `).join("");
}

function renderEmptyMissionState() {
  const card = document.getElementById("dashboard-main-content");
  if (card) {
    card.innerHTML = `
      <div class="ocean-card" style="text-align: center; padding: 4rem 2rem;">
        <h2 style="color: #00f5d4; font-size: 1.8rem; margin-bottom: 1rem;">No Active Mission Initialized</h2>
        <p style="color: #8da4c4; max-width: 500px; margin: 0 auto 2rem;">
          There is currently no marine mission loaded in Mission Control memory. Load the pre-configured mission or configure a new expedition.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-primary" onclick="handleRestoreSample()">Restore Sample Mission</button>
          <button class="btn btn-secondary" onclick="openModal('modal-create-mission')">Create New Mission</button>
        </div>
      </div>
    `;
  }
}

// Actions
async function handleAdvanceStep() {
  try {
    const res = await api.simulate();
    if (res.success) {
      window.soundFx.playSonarPing();
      showToast("Mission Stepped", `Elapsed: ${res.data.telemetry.elapsedHours}h | Depth: ${res.data.telemetry.submersible.depth.toLocaleString()}m`, "info");
      loadDashboard();
    }
  } catch (err) {
    showToast("Simulation Failed", err.message, "danger");
  }
}

async function handleEmergencyReturn() {
  if (!confirm("Are you sure you want to trigger EMERGENCY RETURN? The submersible will abort current exploration and begin ascent immediately.")) return;
  try {
    const res = await api.emergencyReturn();
    if (res.success) {
      window.soundFx.playAlarm();
      showToast("EMERGENCY RETURN INITIATED", "Submersible ascending at maximum safe ascent rate.", "danger", 6000);
      loadDashboard();
    }
  } catch (err) {
    showToast("Command Error", err.message, "danger");
  }
}

async function handleRestoreSample() {
  try {
    await api.restoreSample();
    showToast("Sample Restored", "Mariana Arc Abyss Explorer 07 expedition loaded.", "success");
    window.location.reload();
  } catch (err) {
    showToast("Restore Error", err.message, "danger");
  }
}

async function handleResetMission() {
  if (!confirm("Reset mission to PLANNED pre-launch state? All telemetry and logs will be reset.")) return;
  try {
    await api.resetMission();
    showToast("Mission Reset", "Mission reverted to pre-launch state.", "info");
    loadDashboard();
  } catch (err) {
    showToast("Reset Error", err.message, "danger");
  }
}

async function handleCreateMissionSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value,
    region: form.region.value,
    objective: form.objective.value,
    submersible: form.submersible.value,
    leadResearcher: form.leadResearcher.value,
    plannedDuration: Number(form.plannedDuration.value),
    targetDepth: Number(form.targetDepth.value),
    priority: form.priority.value
  };

  try {
    const res = await api.createMission(payload);
    if (res.success) {
      closeModal("modal-create-mission");
      showToast("Mission Created", `Expedition ${res.data.name} initialized in PLANNED state.`, "success");
      loadDashboard();
    }
  } catch (err) {
    showToast("Validation Error", err.message, "danger");
  }
}

// Auto Telemetry Refresh Toggle
function toggleAutoRefresh(e) {
  const isChecked = e.target.checked;
  if (isChecked) {
    pollInterval = setInterval(loadDashboard, 3000);
    showToast("Live Stream Active", "Telemetry auto-refreshing every 3 seconds.", "info");
  } else {
    clearInterval(pollInterval);
    pollInterval = null;
    showToast("Live Stream Paused", "Manual telemetry sync enabled.", "info");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});
