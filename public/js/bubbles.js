/**
 * OceanX — Dynamic Deep-Sea Bubbles & Marine Atmosphere Particle Engine
 * Renders rising bioluminescent bubbles, hydrodynamic wake, and ambient marine particles.
 */

class OceanAtmosphere {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.bubbles = [];
    this.sparkles = [];
    this.maxBubbles = 45;
    this.mouseX = -1000;
    this.mouseY = -1000;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.init();
  }

  init() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "ocean-atmosphere-canvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "1";
    this.canvas.style.opacity = "0.75";

    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Spawn initial bubbles
    for (let i = 0; i < this.maxBubbles; i++) {
      this.bubbles.push(this.createBubble(Math.random() * this.height));
    }

    // Mouse movement interaction (creates subtle underwater wake)
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (Math.random() < 0.2) {
        this.bubbles.push({
          x: this.mouseX + (Math.random() - 0.5) * 20,
          y: this.mouseY + (Math.random() - 0.5) * 20,
          radius: Math.random() * 4 + 2,
          speedY: Math.random() * 1.5 + 1.2,
          wobbleSpeed: Math.random() * 0.05 + 0.02,
          wobbleAmp: Math.random() * 20 + 8,
          wobbleOffset: Math.random() * Math.PI * 2,
          opacity: Math.random() * 0.5 + 0.3,
          color: Math.random() > 0.4 ? "rgba(0, 245, 212, " : "rgba(0, 187, 249, "
        });
      }
    });

    // Click burst (spawns cluster of tiny bubbles)
    window.addEventListener("click", (e) => {
      for (let i = 0; i < 8; i++) {
        this.bubbles.push({
          x: e.clientX + (Math.random() - 0.5) * 35,
          y: e.clientY + (Math.random() - 0.5) * 35,
          radius: Math.random() * 4 + 1.5,
          speedY: Math.random() * 2.2 + 1.5,
          wobbleSpeed: Math.random() * 0.08 + 0.03,
          wobbleAmp: Math.random() * 25 + 10,
          wobbleOffset: Math.random() * Math.PI * 2,
          opacity: 0.8,
          color: "rgba(0, 245, 212, "
        });
      }
    });

    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  createBubble(initialY = null) {
    return {
      x: Math.random() * this.width,
      y: initialY !== null ? initialY : this.height + Math.random() * 40,
      radius: Math.random() * 6 + 2, // 2px to 8px
      speedY: Math.random() * 1.2 + 0.6,
      wobbleSpeed: Math.random() * 0.03 + 0.015,
      wobbleAmp: Math.random() * 30 + 10,
      wobbleOffset: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.45 + 0.2,
      color: Math.random() > 0.3 ? "rgba(0, 245, 212, " : "rgba(0, 187, 249, "
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const time = Date.now() * 0.002;

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];

      b.y -= b.speedY;
      const wobbleX = Math.sin(time * b.wobbleSpeed * 60 + b.wobbleOffset) * b.wobbleAmp * 0.03;
      b.x += wobbleX;

      // Mouse repulsion
      const dx = b.x - this.mouseX;
      const dy = b.y - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        const force = (80 - dist) / 80;
        b.x += (dx / dist) * force * 3;
        b.y += (dy / dist) * force * 3;
      }

      // Draw bubble with realistic bioluminescent highlight
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

      // Bubble rim
      this.ctx.strokeStyle = `${b.color}${b.opacity})`;
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();

      // Translucent inner glow
      const grad = this.ctx.createRadialGradient(
        b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1,
        b.x, b.y, b.radius
      );
      grad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
      grad.addColorStop(0.5, `${b.color}${b.opacity * 0.3})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Tiny white refraction spec
      this.ctx.beginPath();
      this.ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.22, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      this.ctx.fill();

      this.ctx.restore();

      // Reset when reaching top
      if (b.y < -20) {
        if (this.bubbles.length > this.maxBubbles) {
          this.bubbles.splice(i, 1);
        } else {
          this.bubbles[i] = this.createBubble();
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.oceanAtmosphere = new OceanAtmosphere();
});
