/**
 * OceanX — Submersible Diagnostics & Subsystem Telemetry
 */

async function loadSubmersibleData() {
  try {
    const res = await api.fetchTelemetry();
    if (!res.success || !res.data) return;

    const sub = res.data.submersible;
    const mission = res.data;

    // Submersible Info
    document.getElementById("sub-vehicle-name").textContent = sub.name;
    document.getElementById("sub-vehicle-id").textContent = sub.id;
    document.getElementById("sub-status").textContent = sub.status;
    document.getElementById("sub-status").className = `badge badge-${sub.status.toLowerCase().replace(/_/g, "-")}`;
    document.getElementById("sub-depth").textContent = `${sub.depth.toLocaleString()} m`;
    document.getElementById("sub-speed").textContent = `${sub.speed.toFixed(1)} kt`;
    document.getElementById("sub-pressure").textContent = `${sub.pressure.toFixed(1)} bar`;
    document.getElementById("sub-temp").textContent = `${sub.temperature.toFixed(1)} °C`;
    document.getElementById("sub-hull").textContent = `${sub.hullCondition.toFixed(1)} %`;

    // Render Gauges
    TelemetryCharts.renderCircularGauge("gauge-battery", sub.battery, {
      label: "BATTERY",
      color: sub.battery <= 20 ? "#f72585" : sub.battery <= 40 ? "#fee440" : "#00f5d4"
    });

    TelemetryCharts.renderCircularGauge("gauge-oxygen", sub.oxygen, {
      label: "OXYGEN",
      color: sub.oxygen <= 25 ? "#f72585" : sub.oxygen <= 50 ? "#fee440" : "#00bbf9"
    });

    TelemetryCharts.renderCircularGauge("gauge-comm", sub.communication, {
      label: "ACOUSTIC COMMS",
      color: sub.communication <= 30 ? "#f72585" : "#3a86ff"
    });

    TelemetryCharts.renderCircularGauge("gauge-hull", sub.hullCondition, {
      label: "HULL INTEGRITY",
      color: sub.hullCondition <= 80 ? "#f72585" : "#00f5d4"
    });

    // Subsystem Health Indicators
    renderSubsystems(sub);

    refreshGlobalHeader();
  } catch (err) {
    console.error("Submersible telemetry load error:", err);
  }
}

function renderSubsystems(sub) {
  const container = document.getElementById("subsystems-container");
  if (!container) return;

  const systems = [
    { name: "Acoustic Transceiver", status: sub.communication > 30 ? "OPTIMAL" : "DEGRADED", val: `${Math.round(sub.communication)}% Signal`, ok: sub.communication > 30 },
    { name: "Titanium Pressure Hull", status: sub.hullCondition >= 90 ? "NOMINAL" : "STRESSED", val: `${sub.hullCondition}% Integrity`, ok: sub.hullCondition >= 90 },
    { name: "Atmospheric Scrubber", status: sub.oxygen > 50 ? "NOMINAL" : "LOW O2", val: `${Math.round(sub.oxygen)}% O2`, ok: sub.oxygen > 50 },
    { name: "Lithium-Ion Propulsion Bank", status: sub.battery > 20 ? "ONLINE" : "CRITICAL", val: `${Math.round(sub.battery)}% Remaining`, ok: sub.battery > 20 },
    { name: "Hydrodynamic Thrusters", status: "ACTIVE", val: `${sub.speed.toFixed(1)} Knots (Vector 084°)`, ok: true },
    { name: "External Sonar Suite", status: "ACTIVE", val: "Continuous Ping Sweep", ok: true }
  ];

  container.innerHTML = systems.map(s => `
    <div style="background: rgba(10, 24, 50, 0.6); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem 1.2rem; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${s.name}</div>
        <div style="font-size: 0.75rem; color: #8da4c4; margin-top: 2px;">${s.val}</div>
      </div>
      <span class="badge ${s.ok ? 'badge-ready' : 'badge-emergency'}">${s.status}</span>
    </div>
  `).join("");
}

async function handleLifecycleTransition(targetStatus) {
  try {
    const res = await api.updateMissionStatus(targetStatus);
    if (res.success) {
      showToast("Lifecycle Updated", `Vehicle transition to ${targetStatus} acknowledged.`, "success");
      loadSubmersibleData();
    }
  } catch (err) {
    showToast("Transition Rejected", err.message, "danger");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSubmersibleData();
  setInterval(loadSubmersibleData, 4000);
});
