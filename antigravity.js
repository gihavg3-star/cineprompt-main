/**
 * Antigravity Particle System
 * Inspired by Google Antigravity and Neural Networks
 */

class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('antigravity-bg');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.particleCount = this.calculateParticleCount();
        
        this.init();
        this.animate();
        this.setupEventListeners();
    }

    calculateParticleCount() {
        // Adjust particle count based on screen size for performance
        const area = window.innerWidth * window.innerHeight;
        return Math.floor(area / 10000); // 1 particle per 10000 pixels
    }

    init() {
        this.resize();
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new Particle(this.canvas.width, this.canvas.height));
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('resize', () => {
            this.resize();
            this.init();
        });

        // Clear mouse position when it leaves the window
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update(this.mouse);
            this.particles[i].draw(this.ctx);
            
            // Draw connections near mouse
            this.drawConnections(i);
        }
        
        requestAnimationFrame(() => this.animate());
    }

    drawConnections(index) {
        if (this.mouse.x === null) return;

        const p1 = this.particles[index];
        // Only connect if particle is near mouse
        const dxMouse = p1.x - this.mouse.x;
        const dyMouse = p1.y - this.mouse.y;
        const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distanceMouse < this.mouse.radius) {
            for (let j = index + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    const opacity = (1 - distance / 100) * (1 - distanceMouse / this.mouse.radius) * 0.2;
                    this.ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
    }
}

class Particle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
        
        // Random velocity for floating effect
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        
        // Color: Mix of Sky Blue and White
        this.color = Math.random() > 0.5 ? 'rgba(0, 212, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)';
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    update(mouse) {
        // Floating movement
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > this.width) this.vx *= -1;
        if (this.y < 0 || this.y > this.height) this.vy *= -1;

        // Mouse interaction (Antigravity effect)
        if (mouse.x !== null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let maxDistance = mouse.radius;
            let force = (maxDistance - distance) / maxDistance;
            
            if (distance < maxDistance) {
                // Gently move towards mouse
                this.x += forceDirectionX * force * 2;
                this.y += forceDirectionY * force * 2;
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParticleSystem();
});
