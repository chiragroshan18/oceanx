/**
 * OceanX — Scientific Discoveries Log & Catalog Controller
 */

let currentDiscoveries = [];

function getZoneName(depth) {
  const d = Number(depth) || 0;
  if (d < 200) return "Epipelagic";
  if (d < 1000) return "Mesopelagic";
  if (d < 4000) return "Bathypelagic";
  if (d < 6000) return "Abyssopelagic";
  return "Hadal Zone";
}

function formatLogTime(t) {
  if (!t) return "12:00";
  if (typeof t === "string" && t.length <= 8 && t.includes(":")) return t;
  const dt = new Date(t);
  return isNaN(dt.getTime()) ? t : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function loadDiscoveriesView() {
  try {
    const typeFilter = document.getElementById("filter-disc-type")?.value || "";
    const impFilter = document.getElementById("filter-disc-imp")?.value || "";

    const res = await api.fetchDiscoveries(typeFilter || null, impFilter || null);
    if (!res.success) return;

    currentDiscoveries = res.data.discoveries || [];
    const stats = res.data.stats || {};

    // Calculate fallback metrics if needed
    const highCount = currentDiscoveries.filter(d => d.importance === "HIGH" || d.importance === "CRITICAL").length;
    const speciesCount = currentDiscoveries.filter(d => d.type === "Marine Species").length;
    const geoCount = currentDiscoveries.filter(d => d.type === "Geological Formation" || d.type === "Hydrothermal Vent").length;
    const deepest = currentDiscoveries.reduce((max, d) => Math.max(max, d.depth || 0), 0);

    // Render Stats Strip
    document.getElementById("disc-stat-total").textContent = stats.totalDiscoveries ?? currentDiscoveries.length;
    document.getElementById("disc-stat-high").textContent = stats.highImportanceCount ?? highCount;
    document.getElementById("disc-stat-species").textContent = stats.speciesCount ?? speciesCount;
    document.getElementById("disc-stat-geo").textContent = stats.geologicalCount ?? geoCount;
    document.getElementById("disc-stat-deepest").textContent = `${(stats.deepestDiscoveryMeters ?? deepest).toLocaleString()} m`;

    // Render Grid / Table
    renderDiscoveriesList(currentDiscoveries);

    refreshGlobalHeader();
  } catch (err) {
    console.error("Load discoveries error:", err);
  }
}

function renderDiscoveriesList(discoveries) {
  const container = document.getElementById("discoveries-grid");
  if (!container) return;

  if (discoveries.length === 0) {
    container.innerHTML = `
      <div class="col-12" style="text-align: center; padding: 3rem; color: #537095;">
        <h3>No discoveries matching the selected criteria</h3>
        <p style="margin-top: 0.5rem;">Try clearing filters or conduct a dive simulation step.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = discoveries.map(d => {
    const badgeColor = d.importance === "CRITICAL" ? "badge-emergency" : d.importance === "HIGH" ? "badge-returning" : "badge-ready";
    const zoneName = getZoneName(d.depth || 4000);
    const timeDisplay = formatLogTime(d.timestamp || d.time);

    return `
      <div class="col-4">
        <div class="ocean-card card-tilt">
          <div class="ocean-card-header">
            <div>
              <span class="badge ${badgeColor}">${d.importance}</span>
              <span style="font-size: 0.75rem; color: #537095; margin-left: 0.4rem;">DISC #${d.id}</span>
            </div>
            <span class="font-mono" style="font-size: 0.85rem; color: #00f5d4;">${Number(d.depth || 0).toLocaleString()} m</span>
          </div>

          <h3 style="color: #ffffff; font-size: 1.15rem; margin-bottom: 0.4rem;">${d.name}</h3>
          <div style="font-size: 0.78rem; color: #00bbf9; margin-bottom: 0.8rem; font-weight: 600;">
            ${d.type} &bull; <span style="color: #8da4c4;">${d.locationMarker || d.location?.label || 'Station Delta'}</span>
          </div>

          <p style="font-size: 0.82rem; color: #8da4c4; line-height: 1.5; margin-bottom: 1.2rem; min-height: 48px;">
            ${d.description}
          </p>

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; color: #537095; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
            <span>Logged: ${timeDisplay}</span>
            <span class="font-mono">Zone: ${zoneName}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Re-apply tilt physics to newly created cards
  if (typeof initCardTilt === "function") {
    initCardTilt();
  }
}

async function handleRecordDiscoverySubmit(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value,
    type: form.type.value,
    depth: Number(form.depth.value) || 4280,
    importance: form.importance.value,
    locationMarker: form.locationMarker.value || "Field Point",
    description: form.description.value
  };

  try {
    const res = await api.logDiscovery(payload);
    if (res.success) {
      window.soundFx?.playSonarPing?.();
      closeModal("modal-record-discovery");
      form.reset();
      showToast("Discovery Logged", `Cataloged ${res.data.name} at ${res.data.depth}m.`, "success");
      loadDiscoveriesView();
    }
  } catch (err) {
    showToast("Logging Error", err.message, "danger");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadDiscoveriesView();

  document.getElementById("filter-disc-type")?.addEventListener("change", loadDiscoveriesView);
  document.getElementById("filter-disc-imp")?.addEventListener("change", loadDiscoveriesView);
});
