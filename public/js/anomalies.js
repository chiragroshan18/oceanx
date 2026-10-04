/**
 * OceanX — Anomaly Detection & Incident Command Controller
 */

async function loadAnomaliesView() {
  try {
    const statusFilter = document.getElementById("filter-anom-status")?.value || "";
    const sevFilter = document.getElementById("filter-anom-sev")?.value || "";

    const res = await api.fetchAnomalies(statusFilter || null, sevFilter || null);
    if (!res.success) return;

    const anomalies = res.data.anomalies || [];
    const stats = res.data.stats || {};

    const activeCount = anomalies.filter(a => a.status === "ACTIVE").length;
    const criticalCount = anomalies.filter(a => a.severity === "CRITICAL").length;
    const warningCount = anomalies.filter(a => a.severity === "WARNING").length;
    const resolvedCount = anomalies.filter(a => a.status === "RESOLVED").length;

    // Update Counts
    document.getElementById("anom-count-active").textContent = stats.active ?? activeCount;
    document.getElementById("anom-count-critical").textContent = stats.critical ?? criticalCount;
    document.getElementById("anom-count-warning").textContent = stats.warning ?? warningCount;
    document.getElementById("anom-count-resolved").textContent = stats.resolved ?? resolvedCount;

    // Render Table
    renderAnomaliesTable(anomalies);

    // Play warning sound if active critical anomalies exist
    if ((stats.critical ?? criticalCount) > 0) {
      window.soundFx?.playAlarm?.();
    }

    refreshGlobalHeader();
  } catch (err) {
    console.error("Load anomalies error:", err);
  }
}

function renderAnomaliesTable(anomalies) {
  const container = document.getElementById("anomalies-table-body");
  if (!container) return;

  if (anomalies.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem; color: #537095;">
          No anomalies matching filter criteria. All telemetry parameters within safe operational tolerances.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = anomalies.map(a => {
    const sevBadge = `<span class="badge severity-${a.severity.toLowerCase()}">${a.severity}</span>`;
    const statusBadge = `<span class="badge ${a.status === 'RESOLVED' ? 'badge-recovered' : a.status === 'ACKNOWLEDGED' ? 'badge-planned' : 'badge-emergency'}">${a.status}</span>`;

    const canAck = a.status === "ACTIVE";
    const canResolve = a.status !== "RESOLVED";

    return `
      <tr>
        <td class="font-mono"><strong>#${a.id}</strong></td>
        <td>${sevBadge}</td>
        <td><strong style="color: #ffffff;">${a.type}</strong></td>
        <td style="color: #8da4c4; max-width: 320px; font-size: 0.82rem;">${a.description}</td>
        <td class="font-mono" style="color: #00f5d4;">${a.triggerValue !== undefined ? a.triggerValue : 'Threshold'}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            ${canAck ? `<button class="btn btn-secondary btn-sm" onclick="handleAckAnomaly('${a.id}')">Acknowledge</button>` : ''}
            ${canResolve ? `<button class="btn btn-primary btn-sm" onclick="handleResolveAnomaly('${a.id}')">Resolve</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function handleAckAnomaly(id) {
  try {
    const res = await api.acknowledgeAnomaly(id);
    if (res.success) {
      showToast("Anomaly Acknowledged", `Incident #${id} acknowledged by operator.`, "info");
      loadAnomaliesView();
    }
  } catch (err) {
    showToast("Acknowledgment Error", err.message, "danger");
  }
}

async function handleResolveAnomaly(id) {
  try {
    const res = await api.resolveAnomaly(id);
    if (res.success) {
      showToast("Anomaly Resolved", `Incident #${id} marked as resolved and stabilized.`, "success");
      loadAnomaliesView();
    }
  } catch (err) {
    showToast("Resolution Error", err.message, "danger");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadAnomaliesView();

  document.getElementById("filter-anom-status")?.addEventListener("change", loadAnomaliesView);
  document.getElementById("filter-anom-sev")?.addEventListener("change", loadAnomaliesView);
});
