/**
 * OceanX — Interactive Bathymetric SVG Exploration Map
 * Renders depth zones, vessel coordinates, trajectory trail, discovery pins, and sonar sweeps.
 */

class ExplorationMap {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      interactive: true,
      showGrid: true,
      showSonar: true,
      maxDepth: 6500, // meters
      width: 1000,
      height: 520
    }, options);

    this.tooltip = null;
    this.svg = null;
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = "";
    this.container.classList.add("map-container");

    // Tooltip
    this.tooltip = document.createElement("div");
    this.tooltip.className = "map-tooltip";
    this.container.appendChild(this.tooltip);

    // SVG Element
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("viewBox", `0 0 ${this.options.width} ${this.options.height}`);
    this.svg.setAttribute("class", "exploration-svg");
    this.container.appendChild(this.svg);

    // Depth Zones Legend
    this.renderLegend();
  }

  renderLegend() {
    const legend = document.createElement("div");
    legend.className = "map-depth-legend";
    legend.innerHTML = `
      <div style="font-weight: 700; color: #00f5d4; margin-bottom: 2px;">BATHYMETRIC ZONES</div>
      <div class="legend-row"><span class="legend-color" style="background:#0c4a6e;"></span> Epipelagic (0–200m)</div>
      <div class="legend-row"><span class="legend-color" style="background:#082f49;"></span> Mesopelagic (200–1,000m)</div>
      <div class="legend-row"><span class="legend-color" style="background:#051e36;"></span> Bathypelagic (1k–4,000m)</div>
      <div class="legend-row"><span class="legend-color" style="background:#030f21;"></span> Abyssopelagic (4k–6,000m)</div>
      <div class="legend-row"><span class="legend-color" style="background:#010712;"></span> Hadal Zone (>6,000m)</div>
    `;
    this.container.appendChild(legend);
  }

  // Convert depth and coordinate progress to SVG (x, y)
  getCoordinates(depth, progress = 0.5) {
    const W = this.options.width;
    const H = this.options.height;
    // X spans from 80 to W - 80 based on exploration progress & path
    const x = 90 + Math.min(progress, 1) * (W - 180);
    // Y mapped according to depth (0m = top 60px, 6000m = bottom 460px)
    const y = 60 + (Math.min(depth, this.options.maxDepth) / this.options.maxDepth) * (H - 120);
    return { x, y };
  }

  render(mission, telemetry) {
    if (!this.svg) return;
    const W = this.options.width;
    const H = this.options.height;

    const currentDepth = telemetry?.submersible?.depth ?? mission?.submersible?.depth ?? 4280;
    const progressVal = (telemetry?.progress ?? mission?.progress ?? 50) / 100;
    const discoveries = mission?.discoveries || [];
    const anomalies = mission?.anomalies || [];

    // Clear SVG
    this.svg.innerHTML = `
      <defs>
        <!-- Gradients for depth layers -->
        <linearGradient id="oceanDepthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#075985" stop-opacity="0.35"/>
          <stop offset="25%" stop-color="#0c4a6e" stop-opacity="0.5"/>
          <stop offset="55%" stop-color="#082f49" stop-opacity="0.75"/>
          <stop offset="85%" stop-color="#030c1e" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#01050e" stop-opacity="1"/>
        </linearGradient>

        <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3a86ff" stop-opacity="0.2"/>
          <stop offset="80%" stop-color="#00f5d4" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#00f5d4" stop-opacity="1"/>
        </linearGradient>

        <!-- Submarine Marker Glow -->
        <filter id="sonarGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Background Depth Layers -->
      <rect width="${W}" height="${H}" fill="url(#oceanDepthGrad)"/>

      <!-- Bathymetric Depth Contours -->
      <path d="M 0,90 Q 250,70 500,100 T ${W},85" fill="none" stroke="rgba(0, 245, 212, 0.08)" stroke-width="1.5" stroke-dasharray="4,4"/>
      <path d="M 0,170 Q 300,190 600,160 T ${W},180" fill="none" stroke="rgba(0, 245, 212, 0.08)" stroke-width="1.5" stroke-dasharray="4,4"/>
      <path d="M 0,270 Q 200,250 550,290 T ${W},265" fill="none" stroke="rgba(0, 245, 212, 0.08)" stroke-width="1.5" stroke-dasharray="4,4"/>
      <path d="M 0,380 Q 350,410 700,370 T ${W},395" fill="none" stroke="rgba(0, 245, 212, 0.08)" stroke-width="1.5" stroke-dasharray="4,4"/>
      <path d="M 0,470 Q 400,450 750,480 T ${W},465" fill="none" stroke="rgba(0, 245, 212, 0.08)" stroke-width="1.5" stroke-dasharray="4,4"/>

      <!-- Depth Zone Labels on right axis -->
      <text x="${W - 25}" y="85" fill="rgba(141, 164, 196, 0.4)" font-size="11" text-anchor="end" font-family="monospace">200m (Sunlight)</text>
      <text x="${W - 25}" y="170" fill="rgba(141, 164, 196, 0.4)" font-size="11" text-anchor="end" font-family="monospace">1,000m (Twilight)</text>
      <text x="${W - 25}" y="320" fill="rgba(141, 164, 196, 0.4)" font-size="11" text-anchor="end" font-family="monospace">4,000m (Midnight)</text>
      <text x="${W - 25}" y="450" fill="rgba(141, 164, 196, 0.4)" font-size="11" text-anchor="end" font-family="monospace">6,000m (Abyssal Plain)</text>

      <!-- Seabed Trench Profile at Bottom -->
      <path d="M 0,${H} L 0,480 Q 200,470 350,490 T 700,460 Q 850,510 ${W},475 L ${W},${H} Z" fill="#020815" stroke="rgba(0, 245, 212, 0.2)" stroke-width="2"/>
    `;

    // Exploration Starting Point (Vessel Launch)
    const startX = 90;
    const startY = 60;
    const startPin = `
      <g class="map-start-point">
        <circle cx="${startX}" cy="${startY}" r="5" fill="#3a86ff"/>
        <circle cx="${startX}" cy="${startY}" r="11" fill="none" stroke="#3a86ff" stroke-width="1.5" opacity="0.6"/>
        <text x="${startX}" y="${startY - 14}" fill="#8da4c4" font-size="10" font-family="monospace" text-anchor="middle">LAUNCH POINT (0m)</text>
      </g>
    `;
    this.svg.innerHTML += startPin;

    // Target Location Pin
    const targetDepth = mission?.targetDepth || 4500;
    const targetCoords = this.getCoordinates(targetDepth, 0.9);
    const targetPin = `
      <g class="map-target-point">
        <polygon points="${targetCoords.x},${targetCoords.y - 12} ${targetCoords.x + 8},${targetCoords.y + 6} ${targetCoords.x - 8},${targetCoords.y + 6}" fill="rgba(254, 228, 64, 0.3)" stroke="#fee440" stroke-width="1.5"/>
        <text x="${targetCoords.x}" y="${targetCoords.y + 20}" fill="#fee440" font-size="10" font-family="monospace" text-anchor="middle">TARGET: ${targetDepth.toLocaleString()}m</text>
      </g>
    `;
    this.svg.innerHTML += targetPin;

    // Submersible Coordinates
    const subPos = this.getCoordinates(currentDepth, Math.max(0.12, progressVal));

    // Dynamic Waypoint Trail from Start to Submersible
    const midX1 = startX + (subPos.x - startX) * 0.35;
    const midY1 = startY + (subPos.y - startY) * 0.45 + 20;
    const midX2 = startX + (subPos.x - startX) * 0.7;
    const midY2 = startY + (subPos.y - startY) * 0.75 - 15;

    const trailPath = `M ${startX},${startY} C ${midX1},${midY1} ${midX2},${midY2} ${subPos.x},${subPos.y}`;
    this.svg.innerHTML += `
      <path d="${trailPath}" fill="none" stroke="url(#trailGrad)" stroke-width="3" stroke-linecap="round" stroke-dasharray="6,4"/>
    `;

    // Render Discovery Pins along trajectory
    discoveries.forEach((d, idx) => {
      // Approximate map position along trail or depth
      const dRatio = 0.2 + (idx * 0.18) % 0.65;
      const dCoords = this.getCoordinates(d.depth || 3500, dRatio);

      const dColor = d.importance === "CRITICAL" ? "#f72585" : d.importance === "HIGH" ? "#fee440" : "#00f5d4";
      const markerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      markerGroup.setAttribute("class", "discovery-marker");
      markerGroup.style.cursor = "pointer";

      markerGroup.innerHTML = `
        <circle cx="${dCoords.x}" cy="${dCoords.y}" r="6" fill="${dColor}" filter="url(#sonarGlow)"/>
        <circle cx="${dCoords.x}" cy="${dCoords.y}" r="12" fill="none" stroke="${dColor}" stroke-width="1" opacity="0.6"/>
        <text x="${dCoords.x + 9}" y="${dCoords.y - 8}" fill="${dColor}" font-size="9" font-family="monospace" font-weight="bold">#${d.id || idx + 1}</text>
      `;

      // Interactive Tooltip
      markerGroup.addEventListener("mouseenter", (e) => {
        this.showTooltip(e, `
          <strong style="color:${dColor}">DISCOVERY #${d.id || idx + 1}: ${d.name}</strong><br/>
          <span style="color:#8da4c4">Type:</span> ${d.type}<br/>
          <span style="color:#8da4c4">Depth:</span> ${d.depth?.toLocaleString()} m<br/>
          <span style="color:#8da4c4">Importance:</span> <strong>${d.importance}</strong>
        `);
      });

      markerGroup.addEventListener("mouseleave", () => this.hideTooltip());
      this.svg.appendChild(markerGroup);
    });

    // Render Anomaly Markers
    anomalies.filter(a => a.status !== "RESOLVED").forEach((a, idx) => {
      const aCoords = this.getCoordinates(currentDepth - (idx * 300 + 150), Math.max(0.15, progressVal - 0.12 * (idx + 1)));
      const anomColor = a.severity === "CRITICAL" ? "#f72585" : "#fee440";

      const aGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      aGroup.setAttribute("class", "anomaly-marker");
      aGroup.style.cursor = "pointer";

      aGroup.innerHTML = `
        <circle cx="${aCoords.x}" cy="${aCoords.y}" r="7" fill="${anomColor}">
          <animate attributeName="r" values="6;14;6" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite"/>
        </circle>
        <polygon points="${aCoords.x},${aCoords.y - 6} ${aCoords.x + 5},${aCoords.y + 4} ${aCoords.x - 5},${aCoords.y + 4}" fill="#050c1a"/>
      `;

      aGroup.addEventListener("mouseenter", (e) => {
        this.showTooltip(e, `
          <strong style="color:${anomColor}">🚨 ${a.type}</strong><br/>
          <span style="color:#8da4c4">Severity:</span> ${a.severity}<br/>
          <span style="color:#8da4c4">Status:</span> ${a.status}<br/>
          <span style="color:#ffccd5">${a.description}</span>
        `);
      });

      aGroup.addEventListener("mouseleave", () => this.hideTooltip());
      this.svg.appendChild(aGroup);
    });

    // Render Submersible Icon & Active Sonar Wave
    const subGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    subGroup.setAttribute("class", "submersible-position-group");
    subGroup.innerHTML = `
      <!-- Expanding Sonar Ping Waves -->
      <circle cx="${subPos.x}" cy="${subPos.y}" r="15" fill="none" stroke="#00f5d4" stroke-width="1.5" opacity="0.8">
        <animate attributeName="r" values="12;48" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${subPos.x}" cy="${subPos.y}" r="15" fill="none" stroke="#00bbf9" stroke-width="1.2" opacity="0.6">
        <animate attributeName="r" values="12;65" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
      </circle>

      <!-- Submersible Hull Marker -->
      <circle cx="${subPos.x}" cy="${subPos.y}" r="8" fill="#00f5d4" filter="url(#sonarGlow)"/>
      <circle cx="${subPos.x}" cy="${subPos.y}" r="3" fill="#020610"/>

      <!-- Direction Heading Ray -->
      <line x1="${subPos.x}" y1="${subPos.y}" x2="${subPos.x + 22}" y2="${subPos.y + 6}" stroke="#00f5d4" stroke-width="2" stroke-linecap="round"/>

      <!-- Telemetry Floating Label -->
      <rect x="${subPos.x - 55}" y="${subPos.y - 36}" width="110" height="24" rx="4" fill="rgba(5, 12, 26, 0.9)" stroke="#00f5d4" stroke-width="1"/>
      <text x="${subPos.x}" y="${subPos.y - 20}" fill="#00f5d4" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">${currentDepth.toLocaleString()}m | ${(telemetry?.speed || 2.4).toFixed(1)}kt</text>
    `;

    this.svg.appendChild(subGroup);
  }

  showTooltip(event, html) {
    if (!this.tooltip) return;
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.tooltip.innerHTML = html;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.style.display = "block";
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = "none";
    }
  }
}

window.ExplorationMap = ExplorationMap;
