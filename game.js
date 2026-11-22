/**
 * Apartment Dragon - Main Game Controller
 * Handles Game Loop, Save/Load, Offline Time Tracking, Particles, Journal, and UI Events
 */

class ApartmentDragonGame {
  constructor() {
    this.dragon = null;
    this.playSystem = null;
    this.arcadeGame = null;
    this.journalEntries = [];
    this.particles = [];
    this.lastTickTime = Date.now();
    this.autoSaveTimer = null;
    this.lastSavedTimeStr = 'Just now';

    // Particle canvas
    this.particleCanvas = document.getElementById('particle-canvas');
    this.particleCtx = this.particleCanvas ? this.particleCanvas.getContext('2d') : null;

    this.init();
  }

  init() {
    this.resizeParticleCanvas();
    window.addEventListener('resize', () => this.resizeParticleCanvas());

    // Load saved game or create new dragon
    this.loadInitialGame();

    // Initialize subsystems
    this.playSystem = new ApartmentPlaySystem(this);
    this.arcadeGame = new SkylineArcadeGame(this);

    // Bind UI actions
    this.bindEvents();

    // Start Main Loops
    this.startMainLoop();
    this.startParticleLoop();
    this.startAutoSaveLoop();
  }

  resizeParticleCanvas() {
    if (!this.particleCanvas) return;
    const room = document.getElementById('apartment-room');
    if (room) {
      this.particleCanvas.width = room.clientWidth;
      this.particleCanvas.height = room.clientHeight;
    }
  }

  /* ================= Save & Load System ================= */

  /**
   * Serialize game state
   */
  getSaveData() {
    return {
      version: 1,
      dragon: {
        name: this.dragon.name,
        palette: this.dragon.palette,
        growthPoints: this.dragon.growthPoints,
        birthTimestamp: this.dragon.birthTimestamp,
        lastCareTimestamp: this.dragon.lastCareTimestamp,
        lastSavedTimestamp: Date.now(),
        stats: this.dragon.stats,
        meters: this.dragon.meters
      },
      journal: this.journalEntries
    };
  }

  /**
   * Load initial game on start
   */
  loadInitialGame() {
    const rawAutoSave = localStorage.getItem('apartment_dragon_autosave');
    if (rawAutoSave) {
      try {
        const data = JSON.parse(rawAutoSave);
        this.applySaveData(data, true);
        return;
      } catch (err) {
        console.warn('Failed to parse autosave:', err);
      }
    }

    // New game defaults
    this.startNewDragon('Ember', 'ruby', false);
  }

  startNewDragon(name = 'Ember', palette = 'ruby', shouldConfirm = true) {
    if (shouldConfirm) {
      const ok = confirm(`Adopt a brand new baby dragon in your apartment? This will replace your current pet.`);
      if (!ok) return;
    }

    this.journalEntries = [
      {
        id: Date.now(),
        type: 'milestone',
        icon: '🥚',
        timestamp: Date.now(),
        text: `Adopted a warm little dragon hatchling in the high-rise apartment!`
      }
    ];

    this.dragon = new DragonPet({
      name,
      palette,
      growthPoints: 0,
      birthTimestamp: Date.now(),
      meters: { food: 90, water: 95, play: 85, care: 85 }
    });

    this.saveToStorage('apartment_dragon_autosave');
    this.updateSaveSlotsUI();
    this.updateJournalUI();
    this.showToast(`✨ Welcome your new dragon, ${name}!`);
  }

  /**
   * Apply loaded save data and calculate offline time
   */
  applySaveData(data, isInitialLaunch = false) {
    if (!data || !data.dragon) return;

    this.journalEntries = data.journal || [];

    const now = Date.now();
    const lastSaved = data.dragon.lastSavedTimestamp || now;
    const elapsedMs = Math.max(0, now - lastSaved);
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

    // Initialize Dragon
    this.dragon = new DragonPet(data.dragon);

    // If away for more than 2 minutes, calculate offline progression!
    if (elapsedMinutes >= 2) {
      this.processOfflineProgress(elapsedMinutes, elapsedMs);
    }

    this.updateSaveSlotsUI();
    this.updateJournalUI();
    this.updatePaletteChoicesUI();
  }

  /**
   * Offline Progress & Acknowledgment of Time Passed
   */
  processOfflineProgress(minutesAway, msAway) {
    const hoursAway = Math.floor(minutesAway / 60);
    const remainingMins = minutesAway % 60;

    let timeText = '';
    if (hoursAway > 0) {
      timeText = `${hoursAway} hour${hoursAway === 1 ? '' : 's'} and ${remainingMins} minute${remainingMins === 1 ? '' : 's'}`;
    } else {
      timeText = `${minutesAway} minutes`;
    }

    // Graceful meter decay during absence (protective floor of 15% so pet never perishes)
    const decayRatio = Math.min(1.0, minutesAway / 360); // caps at 6 hours of full decay
    this.dragon.meters.food = Math.max(15, this.dragon.meters.food - Math.round(50 * decayRatio));
    this.dragon.meters.water = Math.max(15, this.dragon.meters.water - Math.round(60 * decayRatio));
    this.dragon.meters.play = Math.max(15, this.dragon.meters.play - Math.round(45 * decayRatio));
    this.dragon.meters.care = Math.max(20, this.dragon.meters.care - Math.round(35 * decayRatio));

    // Passive offline growth if away for a while
    const offlineGrowth = Math.min(25, Math.floor(minutesAway / 15));
    if (offlineGrowth > 0) {
      this.dragon.addGrowth(offlineGrowth);
    }

    // Generate dynamic offline events
    const offlineEvents = [];
    offlineEvents.push(`💤 ${this.dragon.name} took a long nap curled up in the warm ember nest.`);
    if (minutesAway > 30) {
      offlineEvents.push(`🏙️ Sat at the window sill watching the city traffic and floating clouds.`);
    }
    if (minutesAway > 120) {
      offlineEvents.push(`🪙 Reorganized their hoard of shiny coins and keys on the rug.`);
    }
    offlineEvents.push(`✨ Ran excitedly to the apartment door as soon as you came back!`);

    // Journal Entry
    this.addJournalEntry(
      'return',
      '🚪',
      `You returned after being away for ${timeText}. ${this.dragon.name} was overjoyed to see you!`
    );

    // Show Welcome Back Modal
    this.showWelcomeBackModal(timeText, offlineEvents);
  }

  showWelcomeBackModal(timeText, events) {
    const modal = document.getElementById('modal-welcome-back');
    const timeEl = document.getElementById('welcome-back-time-text');
    const listEl = document.getElementById('offline-events-list');
    const nameEl = document.getElementById('welcome-dragon-name');

    if (timeEl) timeEl.textContent = `You were away from your apartment for ${timeText}.`;
    if (nameEl) nameEl.textContent = this.dragon.name;

    if (listEl) {
      listEl.innerHTML = events.map(e => `<div>${e}</div>`).join('');
    }

    if (modal) modal.style.display = 'flex';

    const btnAcknowledge = document.getElementById('btn-acknowledge-return');
    if (btnAcknowledge) {
      btnAcknowledge.onclick = () => {
        modal.style.display = 'none';
        this.dragon.pet();
      };
    }
  }

  /**
   * Save to LocalStorage by key
   */
  saveToStorage(storageKey) {
    const data = this.getSaveData();
    localStorage.setItem(storageKey, JSON.stringify(data));
    this.lastSavedTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const autoSaveText = document.getElementById('auto-save-text');
    if (autoSaveText) {
      autoSaveText.textContent = `Auto-save: Active (Saved at ${this.lastSavedTimeStr})`;
    }

    this.updateSaveSlotsUI();
  }

  /**
   * Load from LocalStorage by key
   */
  loadFromStorage(storageKey) {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      this.applySaveData(data, false);
      if (window.soundEngine) window.soundEngine.playFanfare();
      this.showToast(`💾 Successfully loaded save for ${data.dragon.name}!`);
      return true;
    } catch (err) {
      console.error('Failed to load save:', err);
      this.showToast('❌ Failed to load save file.');
      return false;
    }
  }

  /**
   * Save slots (Slot 1, 2, 3)
   */
  saveToSlot(slotNumber) {
    const key = `apartment_dragon_slot_${slotNumber}`;
    this.saveToStorage(key);
    if (window.soundEngine) window.soundEngine.playClick();
    this.showToast(`💾 Saved game to Slot ${slotNumber}!`);
  }

  loadFromSlot(slotNumber) {
    const key = `apartment_dragon_slot_${slotNumber}`;
    this.loadFromStorage(key);
  }

  updateSaveSlotsUI() {
    for (let slot = 1; slot <= 3; slot++) {
      const key = `apartment_dragon_slot_${slot}`;
      const raw = localStorage.getItem(key);
      const descEl = document.getElementById(`slot-desc-${slot}`);
      const loadBtn = document.querySelector(`.btn-slot-load[data-slot="${slot}"]`);

      if (raw && descEl) {
        try {
          const d = JSON.parse(raw);
          const stageName = DRAGON_STAGES[Math.min(3, Math.floor(d.dragon.growthPoints / 100))].name;
          const dateStr = new Date(d.dragon.lastSavedTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          descEl.textContent = `${d.dragon.name} (${stageName}) • ${dateStr}`;
          if (loadBtn) loadBtn.disabled = false;
        } catch (e) {
          descEl.textContent = 'Empty Slot';
          if (loadBtn) loadBtn.disabled = true;
        }
      } else if (descEl) {
        descEl.textContent = 'Empty Slot';
        if (loadBtn) loadBtn.disabled = true;
      }
    }
  }

  /**
   * Export Save to JSON File
   */
  exportSaveFile() {
    const data = this.getSaveData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `apartment_dragon_${this.dragon.name.toLowerCase()}_save.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.soundEngine) window.soundEngine.playClick();
    this.showToast('📥 Save file exported successfully!');
  }

  /**
   * Import Save from JSON File
   */
  importSaveFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.dragon || typeof data.dragon.growthPoints !== 'number') {
          throw new Error('Invalid save file format.');
        }

        this.applySaveData(data, false);
        this.saveToStorage('apartment_dragon_autosave');
        if (window.soundEngine) window.soundEngine.playFanfare();
        this.showToast(`🎉 Imported save for ${data.dragon.name}!`);
      } catch (err) {
        alert('Could not parse save file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ================= Journal & Memories ================= */

  addJournalEntry(type, icon, text) {
    const entry = {
      id: Date.now(),
      type,
      icon,
      timestamp: Date.now(),
      text
    };
    this.journalEntries.unshift(entry);

    // Keep last 40 entries
    if (this.journalEntries.length > 40) {
      this.journalEntries.pop();
    }

    this.updateJournalUI();

    // Show dot notification on journal button
    const dot = document.getElementById('journal-dot');
    if (dot) dot.style.display = 'block';
  }

  updateJournalUI() {
    const timeline = document.getElementById('journal-timeline');
    const birthDateEl = document.getElementById('journal-birth-date');
    const totalTimeEl = document.getElementById('journal-total-time');
    const stageEl = document.getElementById('journal-current-stage');
    const feedCountEl = document.getElementById('journal-feed-count');

    if (!this.dragon) return;

    if (birthDateEl) {
      birthDateEl.textContent = new Date(this.dragon.birthTimestamp).toLocaleDateString([], {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }

    if (totalTimeEl) totalTimeEl.textContent = this.dragon.getAgeString().replace('Age: ', '');
    if (stageEl) stageEl.textContent = this.dragon.getStageInfo().name;
    if (feedCountEl) feedCountEl.textContent = this.dragon.stats.timesFed || 0;

    if (timeline) {
      timeline.innerHTML = this.journalEntries.map(e => {
        const timeStr = new Date(e.timestamp).toLocaleDateString([], {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const isMilestone = e.type === 'milestone';
        return `
          <div class="timeline-entry ${isMilestone ? 'milestone' : ''}">
            <span class="timeline-icon">${e.icon}</span>
            <div class="timeline-content">
              <span class="timeline-time">${timeStr}</span>
              <span class="timeline-text">${e.text}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /* ================= Main Game Loops ================= */

  startMainLoop() {
    setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      if (this.dragon) {
        this.dragon.decayMeters(deltaSeconds);
      }
    }, 1000);
  }

  startAutoSaveLoop() {
    // Auto-save every 12 seconds
    this.autoSaveTimer = setInterval(() => {
      if (this.dragon) {
        this.saveToStorage('apartment_dragon_autosave');
      }
    }, 12000);
  }

  /* ================= Particle Effects System ================= */

  startParticleLoop() {
    const loop = () => {
      this.updateAndDrawParticles();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // Ambient floating dust motes and soft window embers
    setInterval(() => {
      if (this.particles.length < 25) {
        const w = this.particleCanvas ? this.particleCanvas.width : 600;
        const h = this.particleCanvas ? this.particleCanvas.height : 400;
        this.particles.push({
          x: Math.random() * w,
          y: h + 10,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3 - Math.random() * 0.5,
          color: 'rgba(254, 202, 87, 0.4)',
          size: 1 + Math.random() * 2,
          alpha: 0.6,
          life: 1,
          decay: 0.003
        });
      }
    }, 400);
  }

  addParticle(x, y, type = 'sparkle') {
    const colors = type === 'sparkle'
      ? ['#feca57', '#ffffff', '#ff9ff3', '#54a0ff']
      : ['#ff6b6b', '#ff9f43', '#feca57'];

    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
        alpha: 1,
        life: 1,
        decay: 0.03
      });
    }
  }

  triggerCelebrationParticles() {
    const w = this.particleCanvas ? this.particleCanvas.width : 600;
    const h = this.particleCanvas ? this.particleCanvas.height : 400;

    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: w * 0.45,
        y: h * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: ['#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#9b59b6'][Math.floor(Math.random() * 5)],
        size: 3 + Math.random() * 4,
        alpha: 1,
        life: 1,
        decay: 0.015
      });
    }
  }

  updateAndDrawParticles() {
    if (!this.particleCtx || !this.particleCanvas) return;
    const ctx = this.particleCtx;
    ctx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha * p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Reaction Emoji Animation over dragon
   */
  spawnReaction(emoji) {
    const layer = document.getElementById('reaction-layer');
    if (!layer) return;

    const el = document.createElement('div');
    el.className = 'reaction-particle';
    el.textContent = emoji;
    el.style.left = `${40 + Math.random() * 30}%`;
    el.style.bottom = `${50 + Math.random() * 20}%`;

    layer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1400);
  }

  /* ================= UI Events & Bindings ================= */

  bindEvents() {
    // Dragon Hitbox (Petting)
    const hitbox = document.getElementById('dragon-hitbox');
    if (hitbox) {
      hitbox.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.playSystem && this.playSystem.activeMode === 'groom') {
          // Handled by grooming stroke
          return;
        }
        if (this.dragon) this.dragon.pet();
      });
    }

    // Bowls (Clicking directly on bowls triggers Feed or Water)
    const foodBowlWrap = document.getElementById('food-bowl-wrap');
    if (foodBowlWrap) {
      foodBowlWrap.addEventListener('click', () => {
        this.toggleFoodDrawer();
      });
    }

    const waterBowlWrap = document.getElementById('water-bowl-wrap');
    if (waterBowlWrap) {
      waterBowlWrap.addEventListener('click', () => {
        if (this.dragon) this.dragon.giveWater();
      });
    }

    // Action Buttons
    const btnFeed = document.getElementById('btn-action-feed');
    if (btnFeed) {
      btnFeed.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFoodDrawer();
      });
    }

    const btnWater = document.getElementById('btn-action-water');
    if (btnWater) {
      btnWater.addEventListener('click', () => {
        if (this.dragon) this.dragon.giveWater();
      });
    }

    const btnPlay = document.getElementById('btn-action-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlayDrawer();
      });
    }

    const btnGroom = document.getElementById('btn-action-groom');
    if (btnGroom) {
      btnGroom.addEventListener('click', () => {
        if (this.playSystem) {
          if (this.playSystem.activeMode === 'groom') {
            this.playSystem.exitCurrentMode();
          } else {
            this.playSystem.startGrooming();
          }
        }
      });
    }

    const btnNap = document.getElementById('btn-action-nap');
    if (btnNap) {
      btnNap.addEventListener('click', () => {
        if (this.dragon) this.dragon.toggleNap();
      });
    }

    const btnWindow = document.getElementById('btn-action-window');
    if (btnWindow) {
      btnWindow.addEventListener('click', () => {
        this.triggerWindowWatch();
      });
    }

    // Food Drawer Items
    const foodButtons = document.querySelectorAll('.food-item-btn');
    foodButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const foodType = btn.getAttribute('data-food') || 'meat';
        this.triggerFlyingFood(foodType);
        this.closeAllDrawers();
      });
    });

    // Play Drawer Items
    const btnPlayBall = document.getElementById('btn-play-ball');
    if (btnPlayBall) {
      btnPlayBall.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllDrawers();
        if (this.playSystem) this.playSystem.startBallPlay();
      });
    }

    const btnPlayLaser = document.getElementById('btn-play-laser');
    if (btnPlayLaser) {
      btnPlayLaser.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllDrawers();
        if (this.playSystem) this.playSystem.startLaserPlay();
      });
    }

    const btnPlayMinigame = document.getElementById('btn-play-minigame');
    if (btnPlayMinigame) {
      btnPlayMinigame.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllDrawers();
        if (this.arcadeGame) this.arcadeGame.open();
      });
    }

    // Close drawers when clicking outside
    document.addEventListener('click', () => {
      this.closeAllDrawers();
    });

    // Top Bar Modals
    const btnJournal = document.getElementById('btn-journal');
    if (btnJournal) {
      btnJournal.addEventListener('click', () => {
        const dot = document.getElementById('journal-dot');
        if (dot) dot.style.display = 'none';
        this.updateJournalUI();
        this.openModal('modal-journal');
      });
    }

    const btnProfile = document.getElementById('btn-profile');
    if (btnProfile) {
      btnProfile.addEventListener('click', () => {
        this.populateProfileModal();
        this.openModal('modal-profile');
      });
    }

    const btnSaveLoad = document.getElementById('btn-save-load');
    if (btnSaveLoad) {
      btnSaveLoad.addEventListener('click', () => {
        this.updateSaveSlotsUI();
        this.openModal('modal-save-load');
      });
    }

    const btnAudio = document.getElementById('btn-audio');
    const audioIcon = document.getElementById('audio-icon');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        if (window.soundEngine) {
          const isUnmuted = window.soundEngine.toggleMute();
          if (audioIcon) audioIcon.textContent = isUnmuted ? '🔊' : '🔇';
          this.showToast(isUnmuted ? 'Sound Effects Enabled' : 'Sound Effects Muted');
        }
      });
    }

    // Modal Close Buttons
    const closeButtons = document.querySelectorAll('.close-modal-btn');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        this.closeModal(modalId);
        if (modalId === 'modal-minigame' && this.arcadeGame) {
          this.arcadeGame.close();
        }
      });
    });

    // Slot Save / Load buttons
    const saveBtns = document.querySelectorAll('.btn-slot-save');
    saveBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = btn.getAttribute('data-slot');
        this.saveToSlot(slot);
      });
    });

    const loadBtns = document.querySelectorAll('.btn-slot-load');
    loadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = btn.getAttribute('data-slot');
        this.loadFromSlot(slot);
      });
    });

    // File Export & Import
    const btnExport = document.getElementById('btn-export-save');
    if (btnExport) btnExport.addEventListener('click', () => this.exportSaveFile());

    const importInput = document.getElementById('import-save-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.importSaveFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // New Game Button
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
      btnNewGame.addEventListener('click', () => {
        this.startNewDragon('Ember', 'ruby', true);
        this.closeModal('modal-save-load');
      });
    }

    // Rename Dragon
    const btnSaveName = document.getElementById('btn-save-name');
    const nameInput = document.getElementById('dragon-name-input');
    if (btnSaveName && nameInput) {
      btnSaveName.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName && this.dragon) {
          this.dragon.name = newName;
          this.dragon.updateUI();
          this.addJournalEntry('milestone', '🏷️', `Renamed dragon to ${newName}!`);
          this.showToast(`✨ Dragon is now named ${newName}!`);
          this.saveToStorage('apartment_dragon_autosave');
        }
      });
    }

    // Palette Selection
    const paletteButtons = document.querySelectorAll('.palette-choice');
    paletteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const paletteKey = btn.getAttribute('data-palette');
        if (this.dragon) {
          this.dragon.setPalette(paletteKey);
          this.updatePaletteChoicesUI();
          this.saveToStorage('apartment_dragon_autosave');
          if (window.soundEngine) window.soundEngine.playSparkle();
        }
      });
    });

    // Growth Acceleration preview buttons (for testing / demo)
    const btnGrowStage = document.getElementById('btn-grow-stage');
    if (btnGrowStage) {
      btnGrowStage.addEventListener('click', () => {
        if (this.dragon) {
          this.dragon.addGrowth(35);
          if (window.soundEngine) window.soundEngine.playSparkle();
          this.showToast('✨ Granted +35 Growth Spark!');
        }
      });
    }

    const btnGrowMax = document.getElementById('btn-grow-max');
    if (btnGrowMax) {
      btnGrowMax.addEventListener('click', () => {
        if (this.dragon) {
          const curr = this.dragon.getStageIndex();
          if (curr < 3) {
            this.dragon.addGrowth(DRAGON_STAGES[curr + 1].minGrowth - this.dragon.growthPoints + 5);
          } else {
            this.showToast('👑 Dragon has already reached Majestic Adult Stage!');
          }
        }
      });
    }
  }

  triggerWindowWatch() {
    if (this.dragon) {
      this.dragon.watchWindow();
      this.addJournalEntry(
        'window',
        '🏙️',
        `${this.dragon.name} gazed out the apartment window at the city skyline.`
      );
    }
  }

  triggerFlyingFood(foodType) {
    const flyingEl = document.getElementById('flying-food');
    const foodIcons = {
      meat: '🥩',
      fish: '🐟',
      berry: '🌶️',
      cracker: '🍪'
    };

    if (flyingEl) {
      flyingEl.textContent = foodIcons[foodType] || '🍖';
      flyingEl.style.display = 'block';
      flyingEl.style.left = '100px';
      flyingEl.style.top = '400px';

      // Arc towards dragon
      setTimeout(() => {
        flyingEl.style.left = '280px';
        flyingEl.style.top = '300px';
      }, 50);

      setTimeout(() => {
        flyingEl.style.display = 'none';
        if (this.dragon) this.dragon.feed(foodType);
      }, 600);
    } else {
      if (this.dragon) this.dragon.feed(foodType);
    }
  }

  toggleFoodDrawer() {
    const drawer = document.getElementById('food-drawer');
    const playDrawer = document.getElementById('play-drawer');
    if (playDrawer) playDrawer.style.display = 'none';

    if (drawer) {
      drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
    }
  }

  togglePlayDrawer() {
    const drawer = document.getElementById('play-drawer');
    const foodDrawer = document.getElementById('food-drawer');
    if (foodDrawer) foodDrawer.style.display = 'none';

    if (drawer) {
      drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
    }
  }

  closeAllDrawers() {
    const foodDrawer = document.getElementById('food-drawer');
    const playDrawer = document.getElementById('play-drawer');
    if (foodDrawer) foodDrawer.style.display = 'none';
    if (playDrawer) playDrawer.style.display = 'none';
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
    if (window.soundEngine) window.soundEngine.playClick();
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  populateProfileModal() {
    if (!this.dragon) return;
    const nameInput = document.getElementById('dragon-name-input');
    if (nameInput) nameInput.value = this.dragon.name;
    this.updatePaletteChoicesUI();
  }

  updatePaletteChoicesUI() {
    if (!this.dragon) return;
    const buttons = document.querySelectorAll('.palette-choice');
    buttons.forEach(btn => {
      const palette = btn.getAttribute('data-palette');
      if (palette === this.dragon.palette) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  showToast(message) {
    const container = document.getElementById('notification-toaster');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 3200);
  }
}

// Start game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new ApartmentDragonGame();
});
