/**
 * Apartment Dragon - Interactive Play Systems & Skyline Minigame
 * Includes:
 * 1. Ball toss physics & dragon chasing
 * 2. Ember laser spark pointer
 * 3. Interactive scale grooming brush
 * 4. Skyline Spark Catcher canvas arcade game
 */

class ApartmentPlaySystem {
  constructor(game) {
    this.game = game;
    this.activeMode = null; // null | 'ball' | 'laser' | 'groom'

    // Ball physics state
    this.ballEl = document.getElementById('dragon-ball');
    this.ballX = 200;
    this.ballY = 80;
    this.ballVx = 0;
    this.ballVy = 0;
    this.ballActive = false;
    this.ballAnimFrame = null;

    // Laser spark state
    this.laserEl = document.getElementById('laser-pointer-dot');
    this.laserActive = false;

    // Grooming state
    this.brushCursor = document.getElementById('groom-brush-cursor');
    this.groomActive = false;
    this.lastGroomX = 0;
    this.lastGroomY = 0;
    this.groomStrokeDistance = 0;

    // Mode Banner
    this.modeBanner = document.getElementById('mode-banner');
    this.modeBannerText = document.getElementById('mode-banner-text');
    this.btnExitMode = document.getElementById('btn-exit-mode');

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Mode exit button
    if (this.btnExitMode) {
      this.btnExitMode.addEventListener('click', () => this.exitCurrentMode());
    }

    const roomFloor = document.getElementById('apartment-room');

    // Laser pointer mouse tracking
    if (roomFloor) {
      roomFloor.addEventListener('mousemove', (e) => {
        if (this.laserActive && this.laserEl) {
          const rect = roomFloor.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          this.laserEl.style.left = `${x}px`;
          this.laserEl.style.top = `${y}px`;

          // Dragon playful tracking
          this.trackLaser(x, y, rect.width, rect.height);
        }

        if (this.groomActive && this.brushCursor) {
          this.brushCursor.style.left = `${e.clientX}px`;
          this.brushCursor.style.top = `${e.clientY}px`;

          // Check if hovering over dragon
          this.handleGroomStroke(e.clientX, e.clientY);
        }
      });
    }

    // Ball click/toss
    if (this.ballEl) {
      this.ballEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.kickBall();
      });
    }
  }

  /* ================= Ball Play System ================= */

  startBallPlay() {
    this.exitCurrentMode();
    this.activeMode = 'ball';
    this.ballActive = true;

    if (this.ballEl) {
      this.ballEl.style.display = 'block';
      this.ballX = 220;
      this.ballY = 20;
      this.ballVx = (Math.random() - 0.5) * 8;
      this.ballVy = 3;
    }

    this.showBanner('⚽ Ball Play: Click the ball to bounce and toss it for your dragon!');
    this.runBallPhysics();

    if (this.game.dragon) {
      this.game.dragon.speak('Ooh! My toy ball! *Tail wags excitedly* ⚽', 2000);
    }
  }

  kickBall() {
    if (!this.ballActive) return;

    this.ballVy = -11 - Math.random() * 5;
    this.ballVx = (Math.random() - 0.5) * 14;

    if (window.soundEngine) window.soundEngine.playBoing();

    if (this.game.dragon) {
      this.game.dragon.play(12);

      // Dragon leaps toward the ball
      const container = this.game.dragon.container;
      if (container) {
        container.style.transition = 'left 0.4s ease-out';
        const targetLeft = Math.max(120, Math.min(600, this.ballX));
        container.style.left = `${targetLeft}px`;

        setTimeout(() => {
          container.style.transition = '';
        }, 500);
      }
    }

    if (this.game) {
      this.game.spawnReaction('🎾');
    }
  }

  runBallPhysics() {
    if (!this.ballActive) return;

    const room = document.getElementById('apartment-room');
    if (!room) return;

    const gravity = 0.5;
    const bounceFriction = 0.75;
    const floorY = 410; // floor ground boundary
    const ceilingY = 25;
    const leftWall = 20;
    const rightWall = room.clientWidth - 50;

    this.ballVy += gravity;
    this.ballX += this.ballVx;
    this.ballY += this.ballVy;

    // Floor collision
    if (this.ballY >= floorY) {
      this.ballY = floorY;
      this.ballVy = -this.ballVy * bounceFriction;
      this.ballVx *= 0.95;

      if (Math.abs(this.ballVy) > 2 && window.soundEngine) {
        // Soft bounce tone
      }
    }

    // Ceiling collision
    if (this.ballY <= ceilingY) {
      this.ballY = ceilingY;
      this.ballVy = -this.ballVy;
    }

    // Wall collisions
    if (this.ballX <= leftWall) {
      this.ballX = leftWall;
      this.ballVx = -this.ballVx * bounceFriction;
    } else if (this.ballX >= rightWall) {
      this.ballX = rightWall;
      this.ballVx = -this.ballVx * bounceFriction;
    }

    if (this.ballEl) {
      this.ballEl.style.left = `${this.ballX}px`;
      this.ballEl.style.top = `${this.ballY}px`;
    }

    this.ballAnimFrame = requestAnimationFrame(() => this.runBallPhysics());
  }

  /* ================= Laser / Spark Chase System ================= */

  startLaserPlay() {
    this.exitCurrentMode();
    this.activeMode = 'laser';
    this.laserActive = true;

    if (this.laserEl) {
      this.laserEl.style.display = 'block';
    }

    this.showBanner('✨ Ember Spark Chase: Move your cursor around the room to play!');

    if (this.game.dragon) {
      this.game.dragon.speak('A glowing ember spark?! Must... catch it! 🐾', 2500);
    }
  }

  trackLaser(mouseX, mouseY, roomW, roomH) {
    if (!this.laserActive || !this.game.dragon) return;

    const container = this.game.dragon.container;
    if (!container) return;

    // Calculate distance between dragon and spark
    const dragonRect = container.getBoundingClientRect();
    const roomRect = document.getElementById('apartment-room').getBoundingClientRect();
    const dragonCenterX = (dragonRect.left + dragonRect.width / 2) - roomRect.left;
    const dragonCenterY = (dragonRect.top + dragonRect.height / 2) - roomRect.top;

    const dx = mouseX - dragonCenterX;
    const dy = mouseY - dragonCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If spark is close, dragon pounces!
    if (dist < 70) {
      if (Math.random() < 0.08) {
        if (window.soundEngine) window.soundEngine.playChirp();
        this.game.dragon.play(8);
        this.game.spawnReaction('✨');
        container.classList.add('petting');
        setTimeout(() => container.classList.remove('petting'), 400);
      }
    } else {
      // Dragon smoothly follows mouse horizontally
      const moveStep = dx > 0 ? 3 : -3;
      const currentLeft = parseFloat(container.style.left) || (roomW * 0.45);
      const newLeft = Math.max(120, Math.min(roomW - 120, currentLeft + moveStep));
      container.style.left = `${newLeft}px`;
    }
  }

  /* ================= Interactive Grooming Brush ================= */

  startGrooming() {
    this.exitCurrentMode();
    this.activeMode = 'groom';
    this.groomActive = true;

    if (this.brushCursor) {
      this.brushCursor.style.display = 'block';
    }

    const room = document.getElementById('apartment-room');
    if (room) room.style.cursor = 'none';

    this.showBanner('🪮 Grooming Mode: Stroke over your dragon to brush scales & polish horns!');

    if (this.game.dragon) {
      this.game.dragon.speak('Oooh, brush time! Purrrrr... ✨', 2500);
    }
  }

  handleGroomStroke(clientX, clientY) {
    if (!this.groomActive || !this.game.dragon) return;

    const hitbox = document.getElementById('dragon-hitbox');
    if (!hitbox) return;

    const rect = hitbox.getBoundingClientRect();
    const isOverDragon = (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );

    if (isOverDragon) {
      const dist = Math.hypot(clientX - this.lastGroomX, clientY - this.lastGroomY);
      this.groomStrokeDistance += dist;

      // Spawn sparkle particle every 40px of stroke movement
      if (this.groomStrokeDistance > 45) {
        this.groomStrokeDistance = 0;
        if (window.soundEngine) window.soundEngine.playSparkle();

        if (this.game) {
          const roomRect = document.getElementById('apartment-room').getBoundingClientRect();
          this.game.addParticle(
            clientX - roomRect.left,
            clientY - roomRect.top,
            'sparkle'
          );
        }

        this.game.dragon.groom(3);
      }
    }

    this.lastGroomX = clientX;
    this.lastGroomY = clientY;
  }

  /* ================= General Mode Management ================= */

  showBanner(text) {
    if (this.modeBanner && this.modeBannerText) {
      this.modeBannerText.textContent = text;
      this.modeBanner.style.display = 'flex';
    }
  }

  exitCurrentMode() {
    this.activeMode = null;
    this.ballActive = false;
    this.laserActive = false;
    this.groomActive = false;

    if (this.ballEl) this.ballEl.style.display = 'none';
    if (this.laserEl) this.laserEl.style.display = 'none';
    if (this.brushCursor) this.brushCursor.style.display = 'none';

    const room = document.getElementById('apartment-room');
    if (room) room.style.cursor = 'default';

    if (this.modeBanner) this.modeBanner.style.display = 'none';
    if (this.ballAnimFrame) cancelAnimationFrame(this.ballAnimFrame);
  }
}

/* ================= Skyline Spark Catcher Arcade Minigame ================= */

class SkylineArcadeGame {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('minigame-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.modal = document.getElementById('modal-minigame');
    this.scoreEl = document.getElementById('minigame-score');
    this.timeEl = document.getElementById('minigame-time');
    this.btnStart = document.getElementById('btn-start-minigame');
    this.overlay = document.getElementById('minigame-overlay');

    this.score = 0;
    this.timeLeft = 20;
    this.isRunning = false;
    this.gameTimer = null;
    this.animFrame = null;

    // Basket / Catcher
    this.basket = {
      x: 200,
      y: 280,
      width: 80,
      height: 24,
      targetX: 200
    };

    // Falling items: embers, stars, drops
    this.items = [];
    this.particles = [];

    this.init();
  }

  init() {
    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => this.startGame());
    }

    if (this.canvas) {
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        this.basket.targetX = (e.clientX - rect.left) * scaleX - this.basket.width / 2;
      });

      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          const rect = this.canvas.getBoundingClientRect();
          const scaleX = this.canvas.width / rect.width;
          this.basket.targetX = (e.touches[0].clientX - rect.left) * scaleX - this.basket.width / 2;
        }
      }, { passive: true });
    }

    // Keyboard arrow keys
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (e.key === 'ArrowLeft') {
        this.basket.targetX = Math.max(0, this.basket.targetX - 25);
      } else if (e.key === 'ArrowRight') {
        this.basket.targetX = Math.min(this.canvas.width - this.basket.width, this.basket.targetX + 25);
      }
    });
  }

  open() {
    if (this.modal) this.modal.style.display = 'flex';
    this.reset();
    this.drawInitial();
  }

  close() {
    this.stopGame();
    if (this.modal) this.modal.style.display = 'none';
  }

  reset() {
    this.score = 0;
    this.timeLeft = 20;
    this.items = [];
    this.particles = [];
    this.basket.x = (this.canvas.width - this.basket.width) / 2;
    this.basket.targetX = this.basket.x;

    if (this.scoreEl) this.scoreEl.textContent = '0';
    if (this.timeEl) this.timeEl.textContent = '20s';
    if (this.overlay) this.overlay.style.display = 'flex';
  }

  startGame() {
    if (this.overlay) this.overlay.style.display = 'none';
    this.isRunning = true;
    this.score = 0;
    this.timeLeft = 20;
    this.items = [];
    this.particles = [];

    if (window.soundEngine) window.soundEngine.playClick();

    // 1-second countdown timer
    this.gameTimer = setInterval(() => {
      this.timeLeft--;
      if (this.timeEl) this.timeEl.textContent = `${this.timeLeft}s`;

      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    this.loop();
  }

  stopGame() {
    this.isRunning = false;
    if (this.gameTimer) clearInterval(this.gameTimer);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  endGame() {
    this.stopGame();
    if (window.soundEngine) window.soundEngine.playFanfare();

    // Reward the dragon!
    if (this.game.dragon) {
      const playReward = Math.min(45, Math.max(15, Math.floor(this.score / 2)));
      const careReward = Math.min(25, Math.max(10, Math.floor(this.score / 4)));

      this.game.dragon.play(playReward);
      this.game.dragon.groom(careReward);
      this.game.dragon.addGrowth(6);

      this.game.dragon.speak(`✨ Amazing catch! We scored ${this.score} points together! 🏙️🎉`, 3500);
      this.game.showToast(`🏆 Minigame complete! Score: ${this.score} (+${playReward} Play, +${careReward} Care)`);
    }

    if (this.overlay) {
      this.overlay.innerHTML = `
        <div style="text-align:center; color:#fff;">
          <h3 style="font-size:1.4rem; margin-bottom:8px;">🏙️ Great Catch!</h3>
          <p style="font-size:1.1rem; margin-bottom:14px;">Final Score: <b>${this.score}</b></p>
          <button id="btn-restart-minigame" class="btn-primary">Play Again</button>
        </div>
      `;
      this.overlay.style.display = 'flex';

      const btnRestart = document.getElementById('btn-restart-minigame');
      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          this.overlay.innerHTML = '<button id="btn-start-minigame" class="btn-primary pulse">Catch Embers!</button>';
          this.btnStart = document.getElementById('btn-start-minigame');
          this.btnStart.addEventListener('click', () => this.startGame());
          this.startGame();
        });
      }
    }
  }

  loop() {
    if (!this.isRunning) return;

    this.update();
    this.render();

    this.animFrame = requestAnimationFrame(() => this.loop());
  }

  update() {
    // Smooth basket movement toward target
    this.basket.x += (this.basket.targetX - this.basket.x) * 0.25;
    this.basket.x = Math.max(0, Math.min(this.canvas.width - this.basket.width, this.basket.x));

    // Spawn falling items
    if (Math.random() < 0.08) {
      const types = [
        { type: 'ember', val: 10, speed: 2.2 + Math.random() * 1.5, color: '#feca57', radius: 9 },
        { type: 'star', val: 25, speed: 2.8 + Math.random() * 1.8, color: '#ff6b6b', radius: 11 },
        { type: 'drop', val: -5, speed: 3.5 + Math.random() * 1.5, color: '#48dbfb', radius: 8 }
      ];

      const r = Math.random();
      const chosen = r < 0.65 ? types[0] : (r < 0.85 ? types[1] : types[2]);

      this.items.push({
        x: 20 + Math.random() * (this.canvas.width - 40),
        y: -10,
        ...chosen
      });
    }

    // Update items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed;

      // Collision with basket
      if (
        item.y + item.radius >= this.basket.y &&
        item.y - item.radius <= this.basket.y + this.basket.height &&
        item.x >= this.basket.x - 5 &&
        item.x <= this.basket.x + this.basket.width + 5
      ) {
        // Caught!
        this.score = Math.max(0, this.score + item.val);
        if (this.scoreEl) this.scoreEl.textContent = this.score;

        if (item.val > 0 && window.soundEngine) {
          window.soundEngine.playSparkle();
        }

        // Spawn particles
        this.spawnCatchParticles(item.x, item.y, item.color);
        this.items.splice(i, 1);
        continue;
      }

      // Off screen
      if (item.y > this.canvas.height + 20) {
        this.items.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnCatchParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        alpha: 1
      });
    }
  }

  render() {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background: Evening City Skyline
    this.ctx.fillStyle = '#101420';
    this.ctx.fillRect(0, 0, w, h);

    // City building silhouettes
    this.ctx.fillStyle = '#1e2538';
    this.ctx.fillRect(20, 160, 60, 160);
    this.ctx.fillRect(95, 120, 75, 200);
    this.ctx.fillRect(185, 140, 50, 180);
    this.ctx.fillRect(250, 100, 85, 220);
    this.ctx.fillRect(350, 130, 65, 190);
    this.ctx.fillRect(430, 150, 45, 170);

    // Falling items
    this.items.forEach(item => {
      this.ctx.save();
      this.ctx.fillStyle = item.color;
      this.ctx.shadowColor = item.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Basket / Hearth
    this.ctx.save();
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.shadowColor = '#f39c12';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.roundRect(this.basket.x, this.basket.y, this.basket.width, this.basket.height, [8, 8, 16, 16]);
    this.ctx.fill();

    // Basket rim gold trim
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.fillRect(this.basket.x - 2, this.basket.y, this.basket.width + 4, 4);
    this.ctx.restore();
  }

  drawInitial() {
    if (!this.ctx) return;
    this.render();
  }
}

window.ApartmentPlaySystem = ApartmentPlaySystem;
window.SkylineArcadeGame = SkylineArcadeGame;
