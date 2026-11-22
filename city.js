/**
 * Apartment Dragon - City Environment & Day/Night Cycle Engine
 * Reads system time or manual override, updates window sky,
 * celestial bodies, stars, skyscraper windows, and room lighting.
 */

class CityEnvironment {
  constructor() {
    this.timeMode = 'system'; // 'system' | 'dawn' | 'day' | 'sunset' | 'night'
    this.currentPhase = 'day';
    this.hours = 12;
    this.minutes = 0;
    this.starsGenerated = false;

    // Elements
    this.clockDisplay = document.getElementById('clock-display');
    this.timePhaseLabel = document.getElementById('time-phase-label');
    this.timeIcon = document.getElementById('time-icon');
    this.timeModeSelect = document.getElementById('time-mode-select');
    this.sunEl = document.getElementById('sun');
    this.moonEl = document.getElementById('moon');
    this.starsLayer = document.getElementById('stars-layer');
    this.skylineFar = document.getElementById('skyline-far');
    this.skylineMid = document.getElementById('skyline-mid');
    this.skylineFore = document.getElementById('skyline-fore');
    this.floorLamp = document.getElementById('floor-lamp');
    this.floorLightBeam = document.getElementById('floor-light-beam');
    this.roomLightingOverlay = document.getElementById('room-lighting-overlay');

    this.init();
  }

  init() {
    this.generateSkylineLayers();
    this.generateStars();
    this.bindEvents();
    this.update();

    // Regular interval to check clock
    setInterval(() => this.update(), 1000);
  }

  bindEvents() {
    if (this.timeModeSelect) {
      this.timeModeSelect.addEventListener('change', (e) => {
        this.timeMode = e.target.value;
        this.update();
        if (window.soundEngine) window.soundEngine.playClick();
      });
    }

    // Window sill interaction
    const windowSill = document.getElementById('window-sill');
    if (windowSill) {
      windowSill.addEventListener('click', () => {
        if (window.gameInstance) {
          window.gameInstance.triggerWindowWatch();
        }
      });
    }
  }

  /**
   * Determine current hour and minute based on system time or preset
   */
  getTimeValues() {
    if (this.timeMode === 'system') {
      const now = new Date();
      return {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds()
      };
    }

    // Manual overrides for testing/previewing
    switch (this.timeMode) {
      case 'dawn':
        return { hours: 6, minutes: 15, seconds: 0 };
      case 'day':
        return { hours: 13, minutes: 30, seconds: 0 };
      case 'sunset':
        return { hours: 18, minutes: 45, seconds: 0 };
      case 'night':
        return { hours: 22, minutes: 15, seconds: 0 };
      default:
        return { hours: 12, minutes: 0, seconds: 0 };
    }
  }

  /**
   * Determine the atmosphere phase based on hour (0-23)
   * 05:00 - 08:59: Dawn / Sunrise
   * 09:00 - 17:29: Daytime
   * 17:30 - 20:29: Sunset / Golden Hour / Dusk
   * 20:30 - 04:59: Night
   */
  getPhase(hours, minutes) {
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 5 * 60 && totalMinutes < 9 * 60) {
      return 'dawn';
    } else if (totalMinutes >= 9 * 60 && totalMinutes < 17 * 60 + 30) {
      return 'day';
    } else if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 20 * 60 + 30) {
      return 'sunset';
    } else {
      return 'night';
    }
  }

  /**
   * Main update tick for environment
   */
  update() {
    const { hours, minutes, seconds } = this.getTimeValues();
    this.hours = hours;
    this.minutes = minutes;
    const phase = this.getPhase(hours, minutes);
    this.currentPhase = phase;

    // Format 12-hour clock
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    if (this.clockDisplay) {
      this.clockDisplay.textContent = `${displayHours}:${displayMinutes} ${period}`;
    }

    // Update labels and atmospheric CSS variables
    this.applyAtmosphere(phase, hours, minutes);
  }

  applyAtmosphere(phase, hours, minutes) {
    const root = document.documentElement;

    let phaseName = 'Daytime';
    let icon = '☀️';
    let skyGradient = '';
    let ambientTint = '';
    let sunbeamOpacity = '0.25';
    let lampGlow = '0';
    let fairyBrightness = '0.2';
    let isNight = false;

    switch (phase) {
      case 'dawn':
        phaseName = 'Dawn / Sunrise';
        icon = '🌄';
        skyGradient = 'linear-gradient(180deg, #6c5ce7 0%, #fd79a8 45%, #ffeaa7 100%)';
        ambientTint = 'rgba(253, 121, 168, 0.08)';
        sunbeamOpacity = '0.18';
        lampGlow = '0.3';
        fairyBrightness = '0.5';

        // Sun rising
        if (this.sunEl) {
          this.sunEl.style.opacity = '0.9';
          this.sunEl.style.top = '65px';
          this.sunEl.style.left = '18%';
        }
        if (this.moonEl) {
          this.moonEl.style.opacity = '0.2';
          this.moonEl.style.top = '20px';
          this.moonEl.style.right = '20%';
        }
        if (this.starsLayer) this.starsLayer.style.opacity = '0.2';
        break;

      case 'day':
        phaseName = 'Daytime';
        icon = '☀️';
        skyGradient = 'linear-gradient(180deg, #3498db 0%, #74b9ff 55%, #dfe6e9 100%)';
        ambientTint = 'rgba(255, 245, 220, 0.03)';
        sunbeamOpacity = '0.35';
        lampGlow = '0';
        fairyBrightness = '0.1';

        // High Sun
        if (this.sunEl) {
          this.sunEl.style.opacity = '1';
          this.sunEl.style.top = '25px';
          this.sunEl.style.left = '25%';
        }
        if (this.moonEl) {
          this.moonEl.style.opacity = '0';
          this.moonEl.style.top = '-50px';
        }
        if (this.starsLayer) this.starsLayer.style.opacity = '0';
        break;

      case 'sunset':
        phaseName = 'Sunset / Dusk';
        icon = '🌅';
        skyGradient = 'linear-gradient(180deg, #4834d4 0%, #be2edd 40%, #ff7979 75%, #f9ca24 100%)';
        ambientTint = 'rgba(255, 121, 121, 0.12)';
        sunbeamOpacity = '0.28';
        lampGlow = '0.6';
        fairyBrightness = '0.7';

        // Setting Sun
        if (this.sunEl) {
          this.sunEl.style.opacity = '1';
          this.sunEl.style.top = '110px';
          this.sunEl.style.left = '60%';
        }
        if (this.moonEl) {
          this.moonEl.style.opacity = '0.5';
          this.moonEl.style.top = '35px';
          this.moonEl.style.right = '25%';
        }
        if (this.starsLayer) this.starsLayer.style.opacity = '0.3';
        break;

      case 'night':
        phaseName = 'Night / Starry';
        icon = '🌙';
        skyGradient = 'linear-gradient(180deg, #0c1022 0%, #151e3f 50%, #202b56 100%)';
        ambientTint = 'rgba(15, 25, 55, 0.35)';
        sunbeamOpacity = '0.12';
        lampGlow = '1';
        fairyBrightness = '1';
        isNight = true;

        // Hidden sun, glowing moon
        if (this.sunEl) {
          this.sunEl.style.opacity = '0';
          this.sunEl.style.top = '200px';
        }
        if (this.moonEl) {
          this.moonEl.style.opacity = '1';
          this.moonEl.style.top = '25px';
          this.moonEl.style.right = '22%';
        }
        if (this.starsLayer) this.starsLayer.style.opacity = '0.9';
        break;
    }

    if (this.timePhaseLabel) this.timePhaseLabel.textContent = phaseName;
    if (this.timeIcon) this.timeIcon.textContent = icon;

    // Apply CSS custom properties
    root.style.setProperty('--sky-gradient', skyGradient);
    root.style.setProperty('--room-ambient-tint', ambientTint);
    root.style.setProperty('--sunbeam-opacity', sunbeamOpacity);
    root.style.setProperty('--lamp-glow-opacity', lampGlow);
    root.style.setProperty('--fairy-light-brightness', fairyBrightness);

    // Toggle lit windows on skyscrapers
    this.updateCityWindows(isNight, phase);
  }

  /**
   * Procedural Sky and Stars
   */
  generateStars() {
    if (!this.starsLayer || this.starsGenerated) return;
    this.starsLayer.innerHTML = '';

    const starCount = 42;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() < 0.2 ? 3 : (Math.random() < 0.6 ? 2 : 1.5);
      const top = Math.random() * 70; // upper 70% of sky
      const left = Math.random() * 98;
      const duration = 1.5 + Math.random() * 3;
      const delay = Math.random() * 2;

      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.top = `${top}%`;
      star.style.left = `${left}%`;
      star.style.setProperty('--duration', `${duration}s`);
      star.style.animationDelay = `${delay}s`;

      this.starsLayer.appendChild(star);
    }
    this.starsGenerated = true;
  }

  /**
   * Generate vector SVG skyline layers with skyscrapers, roofs, antennas, and window grids
   */
  generateSkylineLayers() {
    if (this.skylineFar) {
      this.skylineFar.innerHTML = this.buildFarSkylineSVG();
    }
    if (this.skylineMid) {
      this.skylineMid.innerHTML = this.buildMidSkylineSVG();
    }
    if (this.skylineFore) {
      this.skylineFore.innerHTML = this.buildForeSkylineSVG();
    }
  }

  buildFarSkylineSVG() {
    return `
      <svg viewBox="0 0 800 140" preserveAspectRatio="none" style="width:100%; height:100%; display:block;">
        <!-- Distant towers & bridges -->
        <polygon points="20,140 20,40 50,40 50,140" fill="#2d3f52" opacity="0.6"/>
        <polygon points="55,140 55,20 65,10 75,20 85,20 85,140" fill="#293949" opacity="0.6"/>
        <line x1="70" y1="10" x2="70" y2="2" stroke="#e74c3c" stroke-width="1.5" class="antenna-beacon"/>
        <polygon points="110,140 110,50 160,50 160,140" fill="#324558" opacity="0.6"/>
        <polygon points="180,140 180,30 220,30 220,140" fill="#293949" opacity="0.6"/>
        <polygon points="240,140 240,60 280,60 280,140" fill="#324558" opacity="0.6"/>
        <polygon points="310,140 310,15 325,5 340,15 350,15 350,140" fill="#243240" opacity="0.7"/>
        <line x1="332" y1="5" x2="332" y2="-2" stroke="#e74c3c" stroke-width="1.5" class="antenna-beacon"/>
        <polygon points="380,140 380,45 430,45 430,140" fill="#2d3f52" opacity="0.6"/>
        <polygon points="460,140 460,35 500,35 500,140" fill="#324558" opacity="0.6"/>
        <polygon points="530,140 530,18 545,8 560,18 570,18 570,140" fill="#243240" opacity="0.7"/>
        <line x1="552" y1="8" x2="552" y2="0" stroke="#e74c3c" stroke-width="1.5" class="antenna-beacon"/>
        <polygon points="600,140 600,55 650,55 650,140" fill="#2d3f52" opacity="0.6"/>
        <polygon points="680,140 680,40 720,40 720,140" fill="#324558" opacity="0.6"/>
        <polygon points="740,140 740,25 780,25 780,140" fill="#293949" opacity="0.6"/>
      </svg>
    `;
  }

  buildMidSkylineSVG() {
    let windowRects = '';
    const buildings = [
      { x: 35, y: 35, w: 60, h: 75, cols: 3, rows: 6 },
      { x: 125, y: 15, w: 75, h: 95, cols: 4, rows: 8, spire: true },
      { x: 230, y: 45, w: 55, h: 65, cols: 3, rows: 5 },
      { x: 320, y: 25, w: 85, h: 85, cols: 5, rows: 7 },
      { x: 440, y: 38, w: 65, h: 72, cols: 3, rows: 6 },
      { x: 535, y: 18, w: 70, h: 92, cols: 4, rows: 8, spire: true },
      { x: 635, y: 48, w: 60, h: 62, cols: 3, rows: 5 },
      { x: 715, y: 28, w: 75, h: 82, cols: 4, rows: 7 }
    ];

    let buildingShapes = '';
    buildings.forEach((b) => {
      buildingShapes += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#1a2530" />`;
      if (b.spire) {
        buildingShapes += `<polygon points="${b.x + b.w / 2 - 4},${b.y} ${b.x + b.w / 2},${b.y - 14} ${b.x + b.w / 2 + 4},${b.y}" fill="#141d26" />`;
        buildingShapes += `<circle cx="${b.x + b.w / 2}" cy="${b.y - 14}" r="2" fill="#ff3838" class="beacon-light" />`;
      }

      // Windows
      const winW = (b.w - (b.cols + 1) * 4) / b.cols;
      const winH = 4;
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          const wx = b.x + 4 + c * (winW + 4);
          const wy = b.y + 8 + r * (winH + 4);
          const rand = Math.sin(wx * 11 + wy * 17);
          const isLitByDefault = rand > 0.1;
          const litColor = rand > 0.7 ? '#ffeaa7' : (rand > 0.4 ? '#feca57' : '#55efc4');
          windowRects += `<rect x="${wx}" y="${wy}" width="${winW}" height="${winH}" class="city-window-unit ${isLitByDefault ? 'lit' : ''}" data-litcolor="${litColor}" fill="#2c3e50" rx="1" />`;
        }
      }
    });

    return `
      <svg viewBox="0 0 800 110" preserveAspectRatio="none" style="width:100%; height:100%; display:block;">
        ${buildingShapes}
        ${windowRects}
      </svg>
    `;
  }

  buildForeSkylineSVG() {
    return `
      <svg viewBox="0 0 800 75" preserveAspectRatio="none" style="width:100%; height:100%; display:block;">
        <rect x="0" y="30" width="85" height="45" fill="#131b24" />
        <rect x="95" y="18" width="110" height="57" fill="#0f161e" />
        <rect x="225" y="35" width="90" height="40" fill="#131b24" />
        <rect x="335" y="12" width="120" height="63" fill="#0b1016" />
        <rect x="475" y="28" width="95" height="47" fill="#131b24" />
        <rect x="590" y="20" width="105" height="55" fill="#0f161e" />
        <rect x="710" y="32" width="90" height="43" fill="#131b24" />
      </svg>
    `;
  }

  /**
   * Update lit building windows depending on time of day
   */
  updateCityWindows(isNight, phase) {
    const windows = document.querySelectorAll('.city-window-unit');
    if (!windows || windows.length === 0) return;

    windows.forEach((win) => {
      const isLitClass = win.classList.contains('lit');
      const litColor = win.getAttribute('data-litcolor') || '#feca57';

      if (isNight) {
        if (isLitClass) {
          win.setAttribute('fill', litColor);
          win.style.filter = 'drop-shadow(0 0 3px ' + litColor + ')';
        } else {
          win.setAttribute('fill', '#1e272e');
          win.style.filter = 'none';
        }
      } else if (phase === 'sunset') {
        if (isLitClass) {
          win.setAttribute('fill', '#ff9f43');
          win.style.filter = 'drop-shadow(0 0 2px #ff9f43)';
        } else {
          win.setAttribute('fill', '#57606f');
          win.style.filter = 'none';
        }
      } else if (phase === 'dawn') {
        if (isLitClass) {
          win.setAttribute('fill', '#f7d794');
          win.style.filter = 'none';
        } else {
          win.setAttribute('fill', '#747d8c');
          win.style.filter = 'none';
        }
      } else {
        // Bright day
        win.setAttribute('fill', '#747d8c');
        win.style.filter = 'none';
      }
    });
  }
}

// Instantiate singleton
window.cityEnvironment = new CityEnvironment();
