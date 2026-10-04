/**
 * OceanX — Curated Pristine Sample Mission Data
 * Fictional deep-sea mission: "Abyss Explorer 07"
 */

function createSampleMission() {
  const now = Date.now();
  const startTime = new Date(now - 4.2 * 3600 * 1000).toISOString();

  return {
    id: "MSN-PAC-0742",
    name: "Abyss Explorer 07",
    region: "Pacific Deep Zone (Mariana Arc Sector)",
    objective: "Deep-sea abyssal ecosystem & hydrothermal vent chimney survey",
    leadResearcher: "Dr. Maya Lin",
    priority: "HIGH",
    status: "EXPLORING",
    targetDepth: 4500,
    maxDepthReached: 4280,
    plannedDurationMinutes: 360,
    elapsedMinutes: 252,
    plannedAreaSqKm: 12.5,
    exploredAreaSqKm: 8.5,
    progressPercentage: 68,
    createdAt: startTime,
    updatedAt: new Date(now).toISOString(),

    // Vehicle Telemetry State
    submersible: {
      id: "SUB-NTX-01",
      name: "Nautilus-X",
      status: "EXPLORING",
      depth: 4280,
      depthZone: "Abyssopelagic",
      speed: 2.4,
      pressure: 429.0,
      temperature: 2.6,
      battery: 67,
      oxygen: 81,
      communication: 74,
      hullCondition: 92,
      headingDegrees: 184,
      coordinates: { x: 420, y: 310 }, // Relative exploration grid
      subsystems: {
        propulsion: { status: "OPTIMAL", health: 94, detail: "Quad magnetic azimuth thrusters active" },
        lifeSupport: { status: "OPTIMAL", health: 96, detail: "Dual closed-circuit O2 scrubbers nominal" },
        hullIntegrity: { status: "OPTIMAL", health: 92, detail: "Titanium-carbon composite hull nominal" },
        commsArray: { status: "STABLE", health: 74, detail: "VLF & acoustic hydrophone telemetry active" },
        sonarMultiBeam: { status: "ACTIVE", health: 98, detail: "Forward bathymetric 3D mapping operational" }
      }
    },

    // Telemetry Time-Series (for analytical sparklines & profiles)
    telemetryHistory: [
      { timestamp: "09:00", elapsedMin: 0, depth: 0, pressure: 1.0, temperature: 22.0, battery: 100, oxygen: 100, communication: 100, speed: 1.2, healthScore: 98 },
      { timestamp: "09:20", elapsedMin: 20, depth: 320, pressure: 33.0, temperature: 11.2, battery: 96, oxygen: 98, communication: 98, speed: 2.0, healthScore: 98 },
      { timestamp: "09:40", elapsedMin: 40, depth: 750, pressure: 76.0, temperature: 6.8, battery: 92, oxygen: 96, communication: 95, speed: 2.2, healthScore: 96 },
      { timestamp: "10:00", elapsedMin: 60, depth: 1200, pressure: 121.0, temperature: 4.1, battery: 89, oxygen: 94, communication: 92, speed: 2.5, healthScore: 95 },
      { timestamp: "10:25", elapsedMin: 85, depth: 1850, pressure: 186.0, temperature: 3.7, battery: 85, oxygen: 92, communication: 89, speed: 2.3, healthScore: 94 },
      { timestamp: "10:50", elapsedMin: 110, depth: 2400, pressure: 241.0, temperature: 3.4, battery: 82, oxygen: 90, communication: 86, speed: 2.1, healthScore: 92 },
      { timestamp: "11:15", elapsedMin: 135, depth: 2950, pressure: 296.0, temperature: 3.2, battery: 78, oxygen: 88, communication: 82, speed: 2.4, healthScore: 90 },
      { timestamp: "11:40", elapsedMin: 160, depth: 3450, pressure: 346.0, temperature: 2.9, battery: 75, oxygen: 86, communication: 79, speed: 2.2, healthScore: 89 },
      { timestamp: "12:05", elapsedMin: 185, depth: 3820, pressure: 383.0, temperature: 2.8, battery: 72, oxygen: 84, communication: 76, speed: 2.3, healthScore: 87 },
      { timestamp: "12:30", elapsedMin: 210, depth: 4050, pressure: 406.0, temperature: 2.7, battery: 69, oxygen: 83, communication: 75, speed: 2.5, healthScore: 86 },
      { timestamp: "12:55", elapsedMin: 235, depth: 4210, pressure: 422.0, temperature: 2.6, battery: 68, oxygen: 82, communication: 74, speed: 2.3, healthScore: 85 },
      { timestamp: "13:12", elapsedMin: 252, depth: 4280, pressure: 429.0, temperature: 2.6, battery: 67, oxygen: 81, communication: 74, speed: 2.4, healthScore: 84 }
    ],

    // Marine Discoveries
    discoveries: [
      {
        id: "DSC-001",
        name: "Abyssal Chimera (Hydrolagus bathyalis)",
        type: "Marine Species",
        depth: 2150,
        location: { x: 210, y: 180, label: "Trench Terrace Alpha" },
        importance: "HIGH",
        timestamp: "10:38",
        description: "Rare cartilaginous ghost shark specimen displaying bioluminescent lateral line sensory organ."
      },
      {
        id: "DSC-002",
        name: "Black Smoker Hydrothermal Chimney",
        type: "Hydrothermal Vent",
        depth: 3780,
        location: { x: 345, y: 260, label: "Ridge Caldera 4" },
        importance: "CRITICAL",
        timestamp: "12:01",
        description: "Active sulfur-rich hydrothermal tower expelling mineral-dense 280°C superheated fluid clusters."
      },
      {
        id: "DSC-003",
        name: "Deep-Sea Hexactinellid Glass Sponge Reef",
        type: "Coral Formation",
        depth: 3950,
        location: { x: 380, y: 290, label: "Silica Terrace East" },
        importance: "HIGH",
        timestamp: "12:22",
        description: "Extensive silicate bioskeletal formation providing habitat for symbiotic decapods and polychaete worms."
      },
      {
        id: "DSC-004",
        name: "Basalt Pillow Lava Fault Scarp",
        type: "Geological Formation",
        depth: 4280,
        location: { x: 420, y: 310, label: "Abyssal Valley Base" },
        importance: "MEDIUM",
        timestamp: "13:05",
        description: "Rapidly cooled volcanic seafloor morphology indicating recent tectonic plate spreading activity."
      }
    ],

    // Environmental & Vehicle Anomalies
    anomalies: [
      {
        id: "ANM-001",
        type: "Acoustic Signal Scattering",
        severity: "INFO",
        timestamp: "10:14",
        description: "Thermocline micro-boundary caused minor 8% telemetry packet fluctuation.",
        triggerValue: "Signal drop to 89%",
        status: "RESOLVED"
      },
      {
        id: "ANM-002",
        type: "Localized Thermal Inversion",
        severity: "WARNING",
        timestamp: "11:58",
        description: "Transient +1.4°C plume detected prior to discovery of Hydrothermal Vent DSC-002.",
        triggerValue: "+1.4°C / 30s shift",
        status: "ACTIVE"
      }
    ],

    // Chronological Mission Event Log
    timeline: [
      { time: "09:00", timestamp: "09:00", event: "Mission Deployed", title: "Mission Deployed", category: "LIFECYCLE", detail: "Nautilus-X launched from Research Vessel Okeanos.", description: "Nautilus-X launched from Research Vessel Okeanos." },
      { time: "09:18", timestamp: "09:18", event: "Thermocline Ingress", title: "Thermocline Ingress", category: "TELEMETRY", detail: "Passed 200m boundary into Mesopelagic Twilight Zone.", description: "Passed 200m boundary into Mesopelagic Twilight Zone." },
      { time: "09:55", timestamp: "09:55", event: "Bathypelagic Entry", title: "Bathypelagic Entry", category: "TELEMETRY", detail: "Passed 1,000m mark. Pressure reached 101 bar.", description: "Passed 1,000m mark. Pressure reached 101 bar." },
      { time: "10:14", timestamp: "10:14", event: "Acoustic Scattering Alert", title: "Acoustic Scattering Alert", category: "ANOMALY", detail: "Minor telemetry jitter detected; hydrophone array re-calibrated.", description: "Minor telemetry jitter detected; hydrophone array re-calibrated." },
      { time: "10:38", timestamp: "10:38", event: "Discovery: Abyssal Chimera", title: "Discovery: Abyssal Chimera", category: "DISCOVERY", detail: "Captured high-definition footage of rare ghost shark at 2,150m.", description: "Captured high-definition footage of rare ghost shark at 2,150m." },
      { time: "11:22", timestamp: "11:22", event: "Mid-Mission Subsystem Check", title: "Mid-Mission Subsystem Check", category: "TELEMETRY", detail: "Hull integrity 94%, battery 77%, oxygen 87% nominal.", description: "Hull integrity 94%, battery 77%, oxygen 87% nominal." },
      { time: "12:01", timestamp: "12:01", event: "Discovery: Hydrothermal Vent", title: "Discovery: Hydrothermal Vent", category: "DISCOVERY", detail: "Active black smoker chimney located at 3,780m depth.", description: "Active black smoker chimney located at 3,780m depth." },
      { time: "12:22", timestamp: "12:22", event: "Discovery: Glass Sponge Reef", title: "Discovery: Glass Sponge Reef", category: "DISCOVERY", detail: "Silicate ecosystem surveyed along ridge flank at 3,950m.", description: "Silicate ecosystem surveyed along ridge flank at 3,950m." },
      { time: "12:45", timestamp: "12:45", event: "Abyss Zone Milestone (4,000m)", title: "Abyss Zone Milestone (4,000m)", category: "TELEMETRY", detail: "Hydrostatic pressure exceeded 400 bar. Hull stress stable.", description: "Hydrostatic pressure exceeded 400 bar. Hull stress stable." },
      { time: "13:05", timestamp: "13:05", event: "Discovery: Basalt Pillow Lava", title: "Discovery: Basalt Pillow Lava", category: "DISCOVERY", detail: "Geological formation documented at current bottom depth of 4,280m.", description: "Geological formation documented at current bottom depth of 4,280m." }
    ],

    // Tactical Actions & Commands Executed
    commandLog: [
      { id: "CMD-01", timestamp: "09:05", action: "Calibrate Sonar Transducer", executedBy: "Dr. Maya Lin" },
      { id: "CMD-02", timestamp: "11:30", action: "Switch to Low-Power Telemetry Buoy", executedBy: "Operations Desk" },
      { id: "CMD-03", timestamp: "12:05", action: "Engage External Halogen Floodlights", executedBy: "Pilot T. Vance" }
    ]
  };
}

module.exports = { createSampleMission };
