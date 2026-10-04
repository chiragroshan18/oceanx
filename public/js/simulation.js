/**
 * OceanX — Mission Simulation Center Controller
 */

async function handleRunSimulation(actionName) {
  try {
    const res = await api.simulate(actionName);
    if (!res.success) throw new Error(res.error || "Simulation action rejected");

    const sim = res.simulation || {};
    const sub = res.data?.submersible || res.data?.telemetry?.submersible;
    const depthStr = sub ? `${sub.depth.toLocaleString()} m` : "";

    // Play appropriate sound fx
    if (actionName === "CRITICAL_ANOMALY" || actionName === "EMERGENCY_RETURN" || actionName === "PRESSURE_SPIKE") {
      window.soundFx?.playAlarm?.();
    } else {
      window.soundFx?.playSonarPing?.();
    }

    showToast(
      `Simulation: ${actionName}`,
      sim.description || sim.message || `Action executed successfully. Submersible depth: ${depthStr}`,
      (actionName === "CRITICAL_ANOMALY" || actionName === "EMERGENCY_RETURN") ? "danger" : "success"
    );

    // Update Telemetry Display on Simulation Page
    if (res.data) {
      updateSimulationStateDisplay(res.data);
    }
    refreshGlobalHeader();
  } catch (err) {
    showToast("Simulation Failure", err.message, "danger");
  }
}

async function handleStepAdvance(steps = 1) {
  try {
    for (let i = 0; i < steps; i++) {
      const res = await api.simulate();
      if (i === steps - 1) {
        window.soundFx.playSonarPing();
        showToast("Simulation Stepped", `Advanced ${steps} mission hour(s).`, "info");
        updateSimulationStateDisplay(res.data);
      }
    }
    refreshGlobalHeader();
  } catch (err) {
    showToast("Advance Step Error", err.message, "danger");
  }
}

async function loadSimulationView() {
  try {
    const res = await api.fetchTelemetry();
    if (res.success && res.data) {
      updateSimulationStateDisplay(res.data);
    }
  } catch (err) {
    console.error("Load simulation error:", err);
  }
}

function updateSimulationStateDisplay(data) {
  const sub = data.telemetry?.submersible || data.submersible;
  if (!sub) return;

  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setEl("sim-depth", `${sub.depth.toLocaleString()} m`);
  setEl("sim-pressure", `${sub.pressure.toFixed(1)} bar`);
  setEl("sim-temp", `${sub.temperature.toFixed(1)} °C`);
  setEl("sim-battery", `${Math.round(sub.battery)} %`);
  setEl("sim-oxygen", `${Math.round(sub.oxygen)} %`);
  setEl("sim-comm", `${Math.round(sub.communication)} %`);
  setEl("sim-hull", `${sub.hullCondition.toFixed(1)} %`);

  const statusEl = document.getElementById("sim-status");
  if (statusEl) {
    statusEl.textContent = sub.status;
    statusEl.className = `badge badge-${sub.status.toLowerCase().replace(/_/g, "-")}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSimulationView();
});
