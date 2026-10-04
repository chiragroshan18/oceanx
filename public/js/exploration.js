/**
 * OceanX — Exploration Map & Waypoint Navigation Controller
 */

let expMap = null;

async function loadExplorationView() {
  try {
    const res = await api.fetchMission();
    if (!res.success || !res.data) return;

    const mission = res.data;
    const sub = mission.submersible;

    // Header info
    document.getElementById("exp-mission-name").textContent = mission.name;
    document.getElementById("exp-region").textContent = mission.region;
    document.getElementById("exp-target-depth").textContent = `${mission.targetDepth.toLocaleString()} m`;
    document.getElementById("exp-current-depth").textContent = `${sub.depth.toLocaleString()} m`;

    // Calculate distance to target depth
    const remainingDepth = Math.max(0, mission.targetDepth - sub.depth);
    document.getElementById("exp-dist-target").textContent = `${remainingDepth.toLocaleString()} m`;

    // Render full exploration map
    if (!expMap) {
      expMap = new ExplorationMap("exploration-full-map-container", {
        height: 600,
        width: 1200
      });
    }
    expMap.render(mission, { submersible: sub, progress: mission.progress });

    // Render Waypoints & Discovery Coordinates List
    renderWaypointsList(mission);

    refreshGlobalHeader();
  } catch (err) {
    console.error("Exploration view load error:", err);
  }
}

function renderWaypointsList(mission) {
  const container = document.getElementById("waypoints-list-body");
  if (!container) return;

  const discoveries = mission.discoveries || [];
  const anomalies = (mission.anomalies || []).filter(a => a.status !== "RESOLVED");

  let rows = [];

  // Launch waypoint
  rows.push(`
    <tr>
      <td><span class="badge badge-planned">WP-00</span></td>
      <td><strong>Ocean Surface Launch Point</strong></td>
      <td>0 m</td>
      <td>Surface Zone</td>
      <td>Initial Deployment Point</td>
    </tr>
  `);

  // Discoveries waypoints
  discoveries.forEach((d, idx) => {
    rows.push(`
      <tr>
        <td><span class="badge badge-ready">DISC-${idx + 1}</span></td>
        <td><strong>${d.name}</strong></td>
        <td>${d.depth?.toLocaleString()} m</td>
        <td>${d.type}</td>
        <td><span class="importance-${d.importance.toLowerCase()}">${d.importance} Importance</span></td>
      </tr>
    `);
  });

  // Anomalies waypoints
  anomalies.forEach((a, idx) => {
    rows.push(`
      <tr>
        <td><span class="badge badge-emergency">ANOM-${idx + 1}</span></td>
        <td><strong style="color: #f72585;">${a.type}</strong></td>
        <td>${mission.submersible.depth.toLocaleString()} m</td>
        <td>Hazard Zone</td>
        <td><span class="badge severity-${a.severity.toLowerCase()}">${a.severity}</span></td>
      </tr>
    `);
  });

  // Target waypoint
  rows.push(`
    <tr>
      <td><span class="badge badge-returning">TARGET</span></td>
      <td><strong>Primary Survey Objective</strong></td>
      <td>${mission.targetDepth.toLocaleString()} m</td>
      <td>Abyssal Plain Target</td>
      <td>${mission.objective}</td>
    </tr>
  `);

  container.innerHTML = rows.join("");
}

document.addEventListener("DOMContentLoaded", () => {
  loadExplorationView();
  setInterval(loadExplorationView, 5000);
});
