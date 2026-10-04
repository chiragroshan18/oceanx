/**
 * OceanX — Core Client API, UI Micro-Interactions & State Synchronizer
 */

// Global State Cache
window.OceanX = {
  mission: null,
  telemetry: null,
  health: null,
  anomalies: [],
  discoveries: [],
  autoRefreshTimer: null
};

// ==========================================================================
// REST API CLIENT
// ==========================================================================
const api = {
  async get(endpoint) {
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
      return data;
    } catch (err) {
      console.error(`API GET error on ${endpoint}:`, err);
      throw err;
    }
  },

  async post(endpoint, body = {}) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
      return data;
    } catch (err) {
      console.error(`API POST error on ${endpoint}:`, err);
      throw err;
    }
  },

  async patch(endpoint, body = {}) {
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
      return data;
    } catch (err) {
      console.error(`API PATCH error on ${endpoint}:`, err);
      throw err;
    }
  },

  async delete(endpoint) {
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
      return data;
    } catch (err) {
      console.error(`API DELETE error on ${endpoint}:`, err);
      throw err;
    }
  },

  // High-level API calls
  fetchMission() { return this.get("/api/mission"); },
  createMission(payload) { return this.post("/api/mission", payload); },
  updateMissionStatus(status) { return this.patch("/api/mission/status", { status }); },
  fetchTelemetry() { return this.get("/api/mission/telemetry"); },
  simulate(action = null) { return this.post("/api/mission/simulate", action ? { action } : {}); },
  fetchHealth() { return this.get("/api/mission/health"); },
  fetchAnomalies(status = null, severity = null) {
    let url = "/api/mission/anomalies";
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (severity) params.append("severity", severity);
    const qs = params.toString();
    return this.get(qs ? `${url}?${qs}` : url);
  },
  acknowledgeAnomaly(id) { return this.patch(`/api/mission/anomalies/${id}/acknowledge`); },
  resolveAnomaly(id) { return this.patch(`/api/mission/anomalies/${id}/resolve`); },
  fetchDiscoveries(type = null, importance = null) {
    let url = "/api/mission/discoveries";
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (importance) params.append("importance", importance);
    const qs = params.toString();
    return this.get(qs ? `${url}?${qs}` : url);
  },
  logDiscovery(payload) { return this.post("/api/mission/discoveries", payload); },
  fetchTimeline() { return this.get("/api/mission/timeline"); },
  fetchAnalytics() { return this.get("/api/mission/analytics"); },
  emergencyReturn() { return this.post("/api/mission/emergency-return"); },
  fetchReport() { return this.get("/api/mission/report"); },
  resetMission() { return this.post("/api/mission/reset"); },
  restoreSample() { return this.post("/api/mission/sample"); },
  clearMission() { return this.delete("/api/mission"); }
};

window.api = api;

// ==========================================================================
// TOAST NOTIFICATION SYSTEM
// ==========================================================================
function showToast(title, message, type = "info", duration = 4000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    info: "📡",
    success: "✅",
    warning: "⚠️",
    danger: "🚨"
  };

  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || "ℹ️"}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // Trigger entrance
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

window.showToast = showToast;

// ==========================================================================
// MODAL DIALOG CONTROLLER
// ==========================================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("open");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("open");
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

// ==========================================================================
// HYDRODYNAMIC SONAR CURSOR CONTROLLER
// ==========================================================================
function initCustomCursor() {
  if (window.innerWidth <= 768) return; // Disable on touch devices

  let dot = document.querySelector(".custom-cursor-dot");
  let ring = document.querySelector(".custom-cursor-ring");

  if (!dot) {
    dot = document.createElement("div");
    dot.className = "custom-cursor-dot";
    document.body.appendChild(dot);
  }

  if (!ring) {
    ring = document.createElement("div");
    ring.className = "custom-cursor-ring";
    document.body.appendChild(ring);
  }

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  // Smooth trailing ring loop
  function renderRing() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(renderRing);
  }
  requestAnimationFrame(renderRing);

  // Hover states
  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("button, a, .ocean-card, input, select, textarea, .telemetry-tile");
    if (target) {
      ring.classList.add("active");
      if (target.classList.contains("btn-danger") || target.dataset.danger) {
        ring.classList.add("hover-danger");
      }
    }
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("button, a, .ocean-card, input, select, textarea, .telemetry-tile");
    if (target) {
      ring.classList.remove("active");
      ring.classList.remove("hover-danger");
    }
  });
}

// ==========================================================================
// 3D CARD TILT PHYSICS (SPRING & LIGHTING)
// ==========================================================================
function initCardTilt() {
  const cards = document.querySelectorAll(".card-tilt, .ocean-card, .telemetry-tile");

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6; // max 6 deg
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    });
  });
}

// ==========================================================================
// WEB AUDIO SYNTHESIZED SONAR SOUND (SUBTLE AMBIENCE)
// ==========================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playSonarPing() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // High pitch underwater acoustic
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playAlarm() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.setValueAtTime(700, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }
}

window.soundFx = new SoundFX();

// ==========================================================================
// UNIVERSAL NAVBAR & MISSION STATUS MONITOR
// ==========================================================================
async function refreshGlobalHeader() {
  try {
    const res = await api.fetchMission();
    if (!res.success || !res.data) return;

    const mission = res.data;
    window.OceanX.mission = mission;

    // Update Live chip in Header
    const nameEl = document.getElementById("header-mission-name");
    const statusBadgeEl = document.getElementById("header-status-badge");
    const pulseEl = document.getElementById("header-pulse");

    if (nameEl) nameEl.textContent = mission.name;
    if (statusBadgeEl) {
      statusBadgeEl.textContent = mission.status;
      statusBadgeEl.className = `badge badge-${mission.status.toLowerCase().replace(/_/g, "-")}`;
    }

    if (pulseEl) {
      if (mission.status === "EMERGENCY_RETURN") {
        pulseEl.className = "pulse-indicator critical";
      } else if (mission.status === "RETURNING" || mission.submersible.battery <= 20) {
        pulseEl.className = "pulse-indicator warning";
      } else {
        pulseEl.className = "pulse-indicator";
      }
    }

    // Update active anomaly count badge in navbar
    const anomBadge = document.getElementById("nav-anom-count");
    if (anomBadge) {
      const activeCount = mission.activeAnomaliesCount || 0;
      anomBadge.textContent = activeCount;
      anomBadge.style.display = activeCount > 0 ? "inline-block" : "none";
    }
  } catch (err) {
    console.warn("Global header status refresh failed:", err.message);
  }
}

// Global initialization
document.addEventListener("DOMContentLoaded", () => {
  initCustomCursor();
  initCardTilt();
  refreshGlobalHeader();

  // Setup click listener to resume Web Audio API on first user interaction
  document.addEventListener("click", () => {
    if (window.soundFx && window.soundFx.ctx && window.soundFx.ctx.state === "suspended") {
      window.soundFx.ctx.resume();
    }
  }, { once: true });
});
