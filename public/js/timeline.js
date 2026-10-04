/**
 * OceanX — Chronological Mission Timeline & Command Log
 */

let allTimelineEvents = [];

async function loadTimelineView() {
  try {
    const res = await api.fetchTimeline();
    if (res.success && res.data && Array.isArray(res.data.timeline)) {
      allTimelineEvents = res.data.timeline;
    } else {
      // Fallback to full mission object if needed
      const mRes = await api.fetchMission();
      if (mRes.success && mRes.data && Array.isArray(mRes.data.timeline)) {
        allTimelineEvents = mRes.data.timeline;
      }
    }

    renderTimeline(allTimelineEvents);
    refreshGlobalHeader();
  } catch (err) {
    console.error("Timeline view load error:", err);
  }
}

function formatEventTime(ev) {
  if (ev.time) return ev.time;
  if (ev.timestamp) {
    if (typeof ev.timestamp === "string" && ev.timestamp.length <= 8 && ev.timestamp.includes(":")) {
      return ev.timestamp;
    }
    const dt = new Date(ev.timestamp);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  return "12:00";
}

function renderTimeline(events) {
  const container = document.getElementById("timeline-feed");
  if (!container) return;

  const categoryFilter = document.getElementById("filter-timeline-cat")?.value || "ALL";
  const filtered = categoryFilter === "ALL" 
    ? events 
    : events.filter(e => {
        const cat = (e.category || "").toUpperCase();
        if (categoryFilter === "MILESTONE") return cat === "MILESTONE" || cat === "LIFECYCLE";
        return cat === categoryFilter;
      });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="color: #537095; padding: 3rem 1rem; text-align: center;">No timeline events found in this category.</div>`;
    return;
  }

  // Display newest events first
  const displayEvents = [...filtered].reverse();

  container.innerHTML = displayEvents.map(ev => {
    const timeStr = formatEventTime(ev);
    const titleStr = ev.event || ev.title || "Mission Operation Event";
    const detailStr = ev.detail || ev.description || "Submersible operational metrics recorded within expected envelope.";
    const cat = (ev.category || "EVENT").toUpperCase();

    const isDanger = cat === "ANOMALY" || titleStr.toUpperCase().includes("CRITICAL") || titleStr.toUpperCase().includes("EMERGENCY");
    const dotClass = isDanger ? "timeline-dot danger" : "timeline-dot";

    const badgeCategory = cat === "DISCOVERY" 
      ? "badge-ready" 
      : cat === "ANOMALY" 
      ? "badge-emergency" 
      : cat === "TELEMETRY"
      ? "badge-exploring"
      : "badge-planned";

    return `
      <div class="timeline-item">
        <div class="${dotClass}"></div>
        <div class="timeline-content card-tilt">
          <div class="timeline-meta">
            <span class="badge ${badgeCategory}">${cat}</span>
            <span class="font-mono" style="color: #00f5d4; font-weight: 600;">${timeStr}</span>
          </div>
          <h4 style="color: #ffffff; font-size: 1.05rem; margin-bottom: 0.4rem; font-weight: 600;">${titleStr}</h4>
          <p style="font-size: 0.85rem; color: #8da4c4; line-height: 1.5;">${detailStr}</p>
        </div>
      </div>
    `;
  }).join("");

  if (typeof initCardTilt === "function") {
    initCardTilt();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadTimelineView();
  document.getElementById("filter-timeline-cat")?.addEventListener("change", () => renderTimeline(allTimelineEvents));
});
