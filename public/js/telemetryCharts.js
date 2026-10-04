/**
 * OceanX — Native SVG Telemetry Charts & Circular Gauges Engine
 * Pure ES6 + SVG rendering with zero external library dependencies.
 */

class TelemetryCharts {
  /**
   * Render a sleek SVG Time-Series Area/Line Chart
   * @param {string} containerId Container element ID
   * @param {Array<number>} data Array of numeric values
   * @param {Object} options Configuration options
   */
  static renderTimeSeries(containerId, data = [], options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const opts = Object.assign({
      title: "Telemetry Stream",
      unit: "",
      color: "#00f5d4",
      gradientStart: "#00f5d4",
      gradientEnd: "transparent",
      min: null,
      max: null,
      height: 200,
      invertY: false // Useful for depth where larger depth goes downwards
    }, options);

    if (!data || data.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 2rem; color: #537095;">No telemetry data available</div>`;
      return;
    }

    // Clean and normalize incoming data (support numbers or objects)
    const cleanData = data.map(item => {
      if (typeof item === 'number') return isNaN(item) ? 0 : item;
      if (typeof item === 'object' && item !== null) {
        const val = item.depth ?? item.battery ?? item.temperature ?? item.pressure ?? item.communication ?? item.score ?? item.val ?? item.value ?? 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
      const parsed = parseFloat(item);
      return isNaN(parsed) ? 0 : parsed;
    });

    const W = container.clientWidth || 450;
    const H = opts.height;
    const padding = { top: 25, right: 25, bottom: 30, left: 55 };

    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const minVal = opts.min !== null ? opts.min : Math.min(...cleanData);
    const maxVal = opts.max !== null ? opts.max : Math.max(...cleanData);
    const range = (maxVal - minVal) === 0 ? 1 : (maxVal - minVal);

    // Compute coordinate points
    const points = cleanData.map((val, idx) => {
      const x = padding.left + (idx / Math.max(1, cleanData.length - 1)) * chartW;
      const normalized = (val - minVal) / range;
      const y = opts.invertY 
        ? padding.top + normalized * chartH
        : padding.top + (1 - normalized) * chartH;
      return { x, y, val };
    });

    // Build SVG path
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic curve approximation
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      pathD += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
    }

    // Build Area Path
    const baselineY = opts.invertY ? padding.top : padding.top + chartH;
    const areaD = `${pathD} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`;

    const gradId = `grad_${containerId}_${Math.floor(Math.random() * 10000)}`;

    container.innerHTML = `
      <div style="position: relative; width: 100%; height: ${H}px;">
        <svg viewBox="0 0 ${W} ${H}" style="width: 100%; height: 100%; overflow: visible;">
          <defs>
            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${opts.gradientStart}" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="${opts.gradientEnd}" stop-opacity="0.0"/>
            </linearGradient>
          </defs>

          <!-- Horizontal Grid Lines -->
          <line x1="${padding.left}" y1="${padding.top}" x2="${W - padding.right}" y2="${padding.top}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>
          <line x1="${padding.left}" y1="${padding.top + chartH * 0.5}" x2="${W - padding.right}" y2="${padding.top + chartH * 0.5}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>
          <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${W - padding.right}" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>

          <!-- Axis Labels -->
          <text x="${padding.left - 8}" y="${padding.top + 4}" fill="#8da4c4" font-size="10" font-family="monospace" text-anchor="end">${opts.invertY ? minVal.toFixed(0) : maxVal.toFixed(0)}${opts.unit}</text>
          <text x="${padding.left - 8}" y="${padding.top + chartH * 0.5 + 4}" fill="#537095" font-size="10" font-family="monospace" text-anchor="end">${((minVal + maxVal) / 2).toFixed(0)}${opts.unit}</text>
          <text x="${padding.left - 8}" y="${padding.top + chartH + 4}" fill="#8da4c4" font-size="10" font-family="monospace" text-anchor="end">${opts.invertY ? maxVal.toFixed(0) : minVal.toFixed(0)}${opts.unit}</text>

          <!-- Area Fill -->
          <path d="${areaD}" fill="url(#${gradId})"/>

          <!-- Main Stroke Line -->
          <path d="${pathD}" fill="none" stroke="${opts.color}" stroke-width="2.5" stroke-linecap="round"/>

          <!-- Latest Value Pin Marker -->
          <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="4" fill="${opts.color}"/>
          <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="9" fill="none" stroke="${opts.color}" stroke-width="1.2" opacity="0.6"/>
        </svg>
      </div>
    `;
  }

  /**
   * Render a sleek Circular Dial Gauge
   * @param {string} containerId Container ID
   * @param {number} value 0-100 value
   * @param {Object} options Configuration options
   */
  static renderCircularGauge(containerId, value = 0, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const opts = Object.assign({
      label: "METRIC",
      unit: "%",
      color: "#00f5d4",
      size: 130,
      strokeWidth: 9
    }, options);

    const radius = (opts.size - opts.strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedVal = Math.max(0, Math.min(100, value));
    const offset = circumference - (clampedVal / 100) * circumference;

    container.innerHTML = `
      <div style="position: relative; width: ${opts.size}px; height: ${opts.size}px; margin: 0 auto;">
        <svg width="${opts.size}" height="${opts.size}" style="transform: rotate(-90deg);">
          <circle
            cx="${opts.size / 2}" cy="${opts.size / 2}" r="${radius}"
            fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="${opts.strokeWidth}"
          />
          <circle
            cx="${opts.size / 2}" cy="${opts.size / 2}" r="${radius}"
            fill="none" stroke="${opts.color}" stroke-width="${opts.strokeWidth}"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            stroke-linecap="round"
            style="transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease;"
          />
        </svg>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 800; color: #ffffff; line-height: 1;" class="font-mono">
            ${Math.round(clampedVal)}<span style="font-size: 0.85rem; color: ${opts.color};">${opts.unit}</span>
          </div>
          <div style="font-size: 0.65rem; color: #8da4c4; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 3px;">
            ${opts.label}
          </div>
        </div>
      </div>
    `;
  }
}

window.TelemetryCharts = TelemetryCharts;
