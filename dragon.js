/**
 * Apartment Dragon - Pet Model, Growth Stages & Dynamic SVG Renderer
 */

const DRAGON_STAGES = [
  { id: 0, name: 'Baby Hatchling', title: 'Hatchling', minGrowth: 0, scaleFactor: 0.75, wingspan: 'small' },
  { id: 1, name: 'Playful Juvenile', title: 'Juvenile', minGrowth: 100, scaleFactor: 0.88, wingspan: 'medium' },
  { id: 2, name: 'Adolescent Drake', title: 'Adolescent', minGrowth: 250, scaleFactor: 1.0, wingspan: 'large' },
  { id: 3, name: 'Majestic City Dragon', title: 'Adult Dragon', minGrowth: 500, scaleFactor: 1.15, wingspan: 'magnificent' }
];

const PALETTES = {
  ruby: {
    name: 'Ruby Ember',
    primary: '#e74c3c',
    primaryDark: '#c0392b',
    primaryLight: '#ff7675',
    belly: '#feca57',
    bellyDark: '#f39c12',
    wingMembrane: '#ff9f43',
    horns: '#2c3e50',
    eye: '#f1c40f',
    runeGlow: '#ff9f43'
  },
  emerald: {
    name: 'Emerald Jade',
    primary: '#27ae60',
    primaryDark: '#218c53',
    primaryLight: '#2ecc71',
    belly: '#f9ca24',
    bellyDark: '#f0932b',
    wingMembrane: '#badc58',
    horns: '#2f3542',
    eye: '#e67e22',
    runeGlow: '#6ab04c'
  },
  sapphire: {
    name: 'Sapphire Sky',
    primary: '#2980b9',
    primaryDark: '#1b6ca8',
    primaryLight: '#48dbfb',
    belly: '#7ed6df',
    bellyDark: '#22a6b3',
    wingMembrane: '#00d2d3',
    horns: '#130f40',
    eye: '#f9ca24',
    runeGlow: '#00cec9'
  },
  amethyst: {
    name: 'Amethyst Dusk',
    primary: '#8e44ad',
    primaryDark: '#6c3483',
    primaryLight: '#be2edd',
    belly: '#f8a5c2',
    bellyDark: '#e77f67',
    wingMembrane: '#e056fd',
    horns: '#1e272e',
    eye: '#686de0',
    runeGlow: '#e056fd'
  },
  gold: {
    name: 'Golden Sol',
    primary: '#f39c12',
    primaryDark: '#d68910',
    primaryLight: '#f1c40f',
    belly: '#fef160',
    bellyDark: '#f9ca24',
    wingMembrane: '#ffbe76',
    horns: '#795548',
    eye: '#d35400',
    runeGlow: '#f6e58d'
  },
  obsidian: {
    name: 'Obsidian Neon',
    primary: '#2c3e50',
    primaryDark: '#1a252f',
    primaryLight: '#34495e',
    belly: '#00cec9',
    bellyDark: '#0984e3',
    wingMembrane: '#0984e3',
    horns: '#0a0d11',
    eye: '#55efc4',
    runeGlow: '#00cec9'
  }
};

class DragonPet {
  constructor(data = {}) {
    this.name = data.name || 'Ember';
    this.palette = data.palette || 'ruby';
    this.growthPoints = data.growthPoints || 0;
    this.birthTimestamp = data.birthTimestamp || Date.now();
    this.lastCareTimestamp = data.lastCareTimestamp || Date.now();
    this.lastSavedTimestamp = data.lastSavedTimestamp || Date.now();

    // Stats / Counters
    this.stats = Object.assign({
      timesFed: 0,
      timesWatered: 0,
      timesPlayed: 0,
      timesGroomed: 0,
      timesNapped: 0,
      timesWindowWatched: 0,
      timesPet: 0
    }, data.stats || {});

    // Core 4 Meters (0 - 100)
    this.meters = Object.assign({
      food: 85,
      water: 90,
      play: 75,
      care: 80
    }, data.meters || {});

    // State machine
    this.currentAction = 'idle'; // 'idle' | 'eating' | 'drinking' | 'playing' | 'grooming' | 'sleeping' | 'windowWatching'
    this.isBlinking = false;
    this.isSpeaking = false;
    this.bubbleTimeout = null;

    // Cache elements
    this.container = document.getElementById('dragon-container');
    this.character = document.getElementById('dragon-character');
    this.svgElement = document.getElementById('dragon-svg');
    this.nameDisplay = document.getElementById('dragon-name-display');
    this.stageBadge = document.getElementById('dragon-stage-badge');
    this.ageDisplay = document.getElementById('dragon-age-display');
    this.moodDisplay = document.getElementById('dragon-mood-display');
    this.growthMeterFill = document.getElementById('growth-meter-fill');
    this.growthCurrStage = document.getElementById('growth-curr-stage');
    this.growthTargetInfo = document.getElementById('growth-target-info');
    this.growthProgressDisplay = document.getElementById('dragon-growth-progress-display');
    this.speechBubble = document.getElementById('speech-bubble');
    this.bubbleText = document.getElementById('bubble-text');

    this.init();
  }

  init() {
    this.renderSVG();
    this.updateUI();
    this.startBlinkLoop();
    this.startIdleChatter();
  }

  getStageInfo() {
    if (this.growthPoints >= DRAGON_STAGES[3].minGrowth) return DRAGON_STAGES[3];
    if (this.growthPoints >= DRAGON_STAGES[2].minGrowth) return DRAGON_STAGES[2];
    if (this.growthPoints >= DRAGON_STAGES[1].minGrowth) return DRAGON_STAGES[1];
    return DRAGON_STAGES[0];
  }

  getStageIndex() {
    return this.getStageInfo().id;
  }

  /**
   * Calculate age in real-world days and hours
   */
  getAgeString() {
    const elapsedMs = Math.max(0, Date.now() - this.birthTimestamp);
    const totalMinutes = Math.floor(elapsedMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days === 0 && hours === 0) {
      return `Age: ${minutes} min${minutes === 1 ? '' : 's'}`;
    } else if (days === 0) {
      return `Age: ${hours} hr${hours === 1 ? '' : 's'}, ${minutes} min`;
    } else {
      return `Age: ${days} day${days === 1 ? '' : 's'}, ${hours} hr${hours === 1 ? '' : 's'}`;
    }
  }

  /**
   * Overall well-being / mood determination
   */
  getMood() {
    const avg = (this.meters.food + this.meters.water + this.meters.play + this.meters.care) / 4;

    if (this.currentAction === 'sleeping') return { text: 'Sweet Dreams 💤', type: 'sleepy' };
    if (this.meters.food < 25) return { text: 'Hungry for Treats 🍖', type: 'hungry' };
    if (this.meters.water < 25) return { text: 'Thirsty for Spring Water 💧', type: 'thirsty' };
    if (this.meters.play < 25) return { text: 'Restless & Bored 🎾', type: 'bored' };
    if (this.meters.care < 25) return { text: 'Scales Need Brushing ✨', type: 'scruffy' };

    if (avg >= 85) return { text: 'Overjoyed & Thriving! 💖', type: 'ecstatic' };
    if (avg >= 65) return { text: 'Happy & Playful 😊', type: 'happy' };
    if (avg >= 40) return { text: 'Calm & Cozy 🛋️', type: 'content' };
    return { text: 'Needs a Little Love 🥺', type: 'grumpy' };
  }

  /**
   * Add growth points from caring
   */
  addGrowth(points) {
    const prevStage = this.getStageIndex();
    this.growthPoints += points;
    const newStage = this.getStageIndex();

    if (newStage > prevStage) {
      // Stage Up Evolution!
      this.onEvolve(DRAGON_STAGES[newStage]);
    }
    this.updateUI();
  }

  onEvolve(stageInfo) {
    if (window.soundEngine) window.soundEngine.playFanfare();

    this.renderSVG();
    this.speak(`✨ ROAAAR! I grew into a ${stageInfo.title}! ✨`, 4500);

    // Particle explosion
    if (window.gameInstance) {
      window.gameInstance.triggerCelebrationParticles();
      window.gameInstance.addJournalEntry(
        'milestone',
        '👑',
        `${this.name} evolved into a majestic ${stageInfo.title}! Their wings and horns look spectacular.`
      );
      window.gameInstance.showToast(`🎉 ${this.name} grew into a ${stageInfo.title}!`);
    }
  }

  /**
   * Meter Decay Tick (runs continuously in real-time)
   */
  decayMeters(deltaSeconds = 1) {
    if (this.currentAction === 'sleeping') {
      // Slower decay during sleep + slow care recovery
      this.meters.food = Math.max(0, this.meters.food - (0.015 * deltaSeconds));
      this.meters.water = Math.max(0, this.meters.water - (0.02 * deltaSeconds));
      this.meters.play = Math.max(0, this.meters.play - (0.01 * deltaSeconds));
      this.meters.care = Math.min(100, this.meters.care + (0.04 * deltaSeconds));
    } else {
      // Normal activity decay (~1-2% every couple minutes)
      this.meters.food = Math.max(0, this.meters.food - (0.045 * deltaSeconds));
      this.meters.water = Math.max(0, this.meters.water - (0.055 * deltaSeconds));
      this.meters.play = Math.max(0, this.meters.play - (0.05 * deltaSeconds));
      this.meters.care = Math.max(0, this.meters.care - (0.035 * deltaSeconds));
    }

    // Steady passive growth when all meters are well cared for (>60%)
    if (this.meters.food > 60 && this.meters.water > 60 && this.meters.play > 60 && this.meters.care > 60) {
      this.addGrowth(0.01 * deltaSeconds);
    }

    this.updateUI();
  }

  /**
   * Action: Feed
   */
  feed(foodType = 'meat') {
    if (this.currentAction === 'sleeping') {
      this.wake();
    }

    let foodVal = 25;
    let waterVal = 0;
    let playVal = 0;
    let careVal = 0;
    let quote = 'Munch munch! So tasty!';

    switch (foodType) {
      case 'meat':
        foodVal = 30;
        careVal = 5;
        quote = 'Crunch! Tender roast steak is the best!';
        break;
      case 'fish':
        foodVal = 20;
        waterVal = 10;
        quote = 'Yum! Fresh river salmon!';
        break;
      case 'berry':
        foodVal = 15;
        playVal = 15;
        quote = 'Spicy fire berries! *Poofs smoke* 🔥';
        break;
      case 'cracker':
        foodVal = 12;
        careVal = 15;
        quote = 'Sweet city honey biscuit! Purrrr!';
        break;
    }

    this.meters.food = Math.min(100, this.meters.food + foodVal);
    if (waterVal) this.meters.water = Math.min(100, this.meters.water + waterVal);
    if (playVal) this.meters.play = Math.min(100, this.meters.play + playVal);
    if (careVal) this.meters.care = Math.min(100, this.meters.care + careVal);

    this.stats.timesFed++;
    this.addGrowth(4);

    // Audio & Action
    if (window.soundEngine) window.soundEngine.playMunch();
    this.setAction('eating', 1800);
    this.speak(quote, 2400);

    // Move slightly towards food bowl
    if (this.container) {
      this.container.classList.add('at-bowl');
      setTimeout(() => {
        if (this.currentAction !== 'sleeping') {
          this.container.classList.remove('at-bowl');
        }
      }, 2000);
    }

    this.updateUI();
  }

  /**
   * Action: Water
   */
  giveWater() {
    if (this.currentAction === 'sleeping') {
      this.wake();
    }

    this.meters.water = Math.min(100, this.meters.water + 35);
    this.stats.timesWatered++;
    this.addGrowth(3);

    if (window.soundEngine) window.soundEngine.playSlurp();
    this.setAction('drinking', 1800);
    this.speak('Slurp slurp! Pure fresh spring water hits the spot! 💧', 2400);

    if (this.container) {
      this.container.classList.add('at-bowl');
      setTimeout(() => {
        if (this.currentAction !== 'sleeping') {
          this.container.classList.remove('at-bowl');
        }
      }, 2000);
    }

    this.updateUI();
  }

  /**
   * Action: Play
   */
  play(amount = 25) {
    if (this.currentAction === 'sleeping') {
      this.wake();
    }

    this.meters.play = Math.min(100, this.meters.play + amount);
    this.meters.food = Math.max(0, this.meters.food - 3); // burning energy
    this.stats.timesPlayed++;
    this.addGrowth(4);

    if (window.soundEngine) window.soundEngine.playBoing();
    this.setAction('playing', 1800);
    this.speak('Wheeee! That was so much fun! 🎾', 2200);

    this.updateUI();
  }

  /**
   * Action: Groom / Polish Scales
   */
  groom(amount = 15) {
    this.meters.care = Math.min(100, this.meters.care + amount);
    this.stats.timesGroomed++;
    this.addGrowth(3);

    if (window.soundEngine) window.soundEngine.playSparkle();
    this.setAction('grooming', 1200);

    const compliments = [
      'Ooh, my scales feel so sleek and shiny! ✨',
      'Right behind the horns... that feels divine! 💖',
      'City dust all gone! Purrrrr!',
      'Gleaming like city lights at night! ✨'
    ];
    this.speak(compliments[Math.floor(Math.random() * compliments.length)], 2000);

    this.updateUI();
  }

  /**
   * Action: Pet Dragon
   */
  pet() {
    if (this.currentAction === 'sleeping') {
      this.speak('*Snuffles softly and smiles* 💤', 1800);
      return;
    }

    this.meters.care = Math.min(100, this.meters.care + 5);
    this.meters.play = Math.min(100, this.meters.play + 3);
    this.stats.timesPet++;
    this.addGrowth(1);

    if (window.soundEngine) window.soundEngine.playChirp();

    if (this.container) {
      this.container.classList.add('petting');
      setTimeout(() => this.container.classList.remove('petting'), 400);
    }

    const petLines = [
      'Rrr-chirp! *Happy tail wag* 💖',
      '*Nuzzles against your hand warmly*',
      'I love living in this apartment with you! 🏙️',
      'Purrrr... warm dragon vibes!'
    ];
    this.speak(petLines[Math.floor(Math.random() * petLines.length)], 2000);

    if (window.gameInstance) {
      window.gameInstance.spawnReaction('💖');
    }

    this.updateUI();
  }

  /**
   * Action: Nap / Sleep in Nest
   */
  toggleNap() {
    if (this.currentAction === 'sleeping') {
      this.wake();
    } else {
      this.sleep();
    }
  }

  sleep() {
    this.currentAction = 'sleeping';
    this.stats.timesNapped++;
    this.speak('Yaaawn... curling up in my warm ember nest... 💤', 2400);

    if (this.container) {
      this.container.classList.add('at-nest', 'sleeping');
      this.container.classList.remove('at-bowl', 'at-window');
    }
    this.renderSVG();
    this.updateUI();
  }

  wake() {
    this.currentAction = 'idle';
    if (this.container) {
      this.container.classList.remove('sleeping', 'at-nest');
    }
    this.renderSVG();
    this.speak('*Stretches wings* Ready to explore the day! ☀️', 2200);
    this.updateUI();
  }

  /**
   * Action: Gaze out the apartment window
   */
  watchWindow() {
    if (this.currentAction === 'sleeping') this.wake();

    this.currentAction = 'windowWatching';
    this.stats.timesWindowWatched++;
    this.addGrowth(2);

    if (this.container) {
      this.container.classList.add('at-window');
      this.container.classList.remove('at-bowl', 'at-nest');
    }

    const envPhase = window.cityEnvironment ? window.cityEnvironment.currentPhase : 'day';
    let line = 'Watching the cars and birds down on the avenue...';
    if (envPhase === 'night') {
      line = 'The city streetlights look like a galaxy below! 🌙';
    } else if (envPhase === 'sunset') {
      line = 'The sunset glinting off the skyscraper glass is gorgeous! 🌇';
    } else if (envPhase === 'dawn') {
      line = 'Morning pigeons are starting to fly past our window! 🌄';
    }

    this.speak(line, 3500);

    setTimeout(() => {
      if (this.currentAction === 'windowWatching') {
        this.currentAction = 'idle';
        if (this.container) this.container.classList.remove('at-window');
      }
    }, 4500);
  }

  setAction(actionName, duration = 1500) {
    if (this.currentAction === 'sleeping') return;
    this.currentAction = actionName;
    setTimeout(() => {
      if (this.currentAction === actionName) {
        this.currentAction = 'idle';
      }
    }, duration);
  }

  /**
   * Thought / Speech Bubble
   */
  speak(text, duration = 3000) {
    if (!this.speechBubble || !this.bubbleText) return;

    this.bubbleText.textContent = text;
    this.speechBubble.style.display = 'flex';
    this.speechBubble.style.opacity = '1';
    this.isSpeaking = true;

    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubbleTimeout = setTimeout(() => {
      this.speechBubble.style.opacity = '0';
      setTimeout(() => {
        if (!this.isSpeaking) return;
        this.speechBubble.style.display = 'none';
        this.isSpeaking = false;
      }, 300);
    }, duration);
  }

  /**
   * Periodic idle speech
   */
  startIdleChatter() {
    setInterval(() => {
      if (this.isSpeaking || this.currentAction === 'sleeping') return;

      const rand = Math.random();
      if (rand < 0.25) {
        const stage = this.getStageIndex();
        const stageComments = [
          ['Chirp? I am a tiny city dragon! 🐣', 'Can you teach me how to toast marshmallows?', 'My little wings tickle!'],
          ['I bet I can fly to the next balcony soon! 🏙️', 'Look at that helicopter flying by!', 'Wanna toss my ball?'],
          ['I love the view of the skyline from up here.', 'My chest runes glow brighter when we hang out.', 'Let me help you reheat your tea! ☕'],
          ['We have made this apartment a true dragon sanctuary.', 'No city skyscraper is taller than our friendship.', 'I watch over our city night and day. 👑']
        ];
        const lines = stageComments[stage];
        const chosen = lines[Math.floor(Math.random() * lines.length)];
        this.speak(chosen, 3200);
      }
    }, 15000);
  }

  /**
   * Natural eye blinking loop
   */
  startBlinkLoop() {
    setInterval(() => {
      if (this.currentAction === 'sleeping') return;
      this.triggerBlink();
    }, 3500 + Math.random() * 2500);
  }

  triggerBlink() {
    const eyePupils = document.querySelectorAll('.dragon-eye-pupil');
    const eyeHighlights = document.querySelectorAll('.dragon-eye-highlight');
    const eyeLids = document.querySelectorAll('.dragon-eyelid');

    eyeLids.forEach(lid => lid.style.opacity = '1');
    eyePupils.forEach(pupil => pupil.style.opacity = '0');
    eyeHighlights.forEach(hl => hl.style.opacity = '0');

    setTimeout(() => {
      if (this.currentAction === 'sleeping') return;
      eyeLids.forEach(lid => lid.style.opacity = '0');
      eyePupils.forEach(pupil => pupil.style.opacity = '1');
      eyeHighlights.forEach(hl => hl.style.opacity = '1');
    }, 180);
  }

  /**
   * Update Dashboard UI Elements
   */
  updateUI() {
    if (this.nameDisplay) this.nameDisplay.textContent = this.name;

    const stageInfo = this.getStageInfo();
    if (this.stageBadge) this.stageBadge.textContent = stageInfo.name;
    if (this.ageDisplay) this.ageDisplay.textContent = this.getAgeString();

    const mood = this.getMood();
    if (this.moodDisplay) this.moodDisplay.textContent = `Mood: ${mood.text}`;

    // Growth meter calculations
    const currStageIndex = this.getStageIndex();
    let growthPercent = 100;
    let nextStageTitle = 'Maximum Growth Reached 👑';

    if (currStageIndex < DRAGON_STAGES.length - 1) {
      const nextStage = DRAGON_STAGES[currStageIndex + 1];
      const stageStart = stageInfo.minGrowth;
      const stageEnd = nextStage.minGrowth;
      const ptsInStage = Math.max(0, this.growthPoints - stageStart);
      const totalStagePts = stageEnd - stageStart;
      growthPercent = Math.min(100, Math.floor((ptsInStage / totalStagePts) * 100));
      nextStageTitle = `Next Stage: ${nextStage.title} (${growthPercent}%)`;
    }

    if (this.growthMeterFill) this.growthMeterFill.style.width = `${growthPercent}%`;
    if (this.growthCurrStage) this.growthCurrStage.textContent = stageInfo.title;
    if (this.growthTargetInfo) this.growthTargetInfo.textContent = nextStageTitle;
    if (this.growthProgressDisplay) this.growthProgressDisplay.textContent = `Growth: ${growthPercent}%`;

    // 4 Core Meters
    this.updateMeterBar('food', this.meters.food, 'Well Fed', 'Hungry');
    this.updateMeterBar('water', this.meters.water, 'Hydrated', 'Parched');
    this.updateMeterBar('play', this.meters.play, 'Energetic', 'Bored');
    this.updateMeterBar('care', this.meters.care, 'Gleaming', 'Dusty');
  }

  updateMeterBar(meterName, val, goodLabel, badLabel) {
    const valEl = document.getElementById(`val-${meterName}`);
    const barEl = document.getElementById(`bar-${meterName}`);
    const statusEl = document.getElementById(`status-${meterName}`);
    const cardEl = document.getElementById(`meter-card-${meterName}`);

    const roundedVal = Math.round(val);
    if (valEl) valEl.textContent = `${roundedVal}%`;
    if (barEl) barEl.style.width = `${roundedVal}%`;

    if (statusEl) {
      if (roundedVal >= 70) statusEl.textContent = goodLabel;
      else if (roundedVal >= 35) statusEl.textContent = 'Normal';
      else statusEl.textContent = badLabel;
    }

    if (cardEl) {
      if (roundedVal < 25) cardEl.classList.add('low');
      else cardEl.classList.remove('low');
    }
  }

  /**
   * Set Dragon Scale Palette
   */
  setPalette(paletteKey) {
    if (PALETTES[paletteKey]) {
      this.palette = paletteKey;
      this.renderSVG();
    }
  }

  /**
   * Dynamic Procedural SVG Generator for Dragon
   */
  renderSVG() {
    if (!this.svgElement) return;

    const p = PALETTES[this.palette] || PALETTES.ruby;
    const stage = this.getStageIndex();
    const isSleeping = this.currentAction === 'sleeping';

    let svgContent = '';

    // Switch between the 4 Life Stages
    switch (stage) {
      case 0:
        svgContent = this.getHatchlingSVG(p, isSleeping);
        break;
      case 1:
        svgContent = this.getJuvenileSVG(p, isSleeping);
        break;
      case 2:
        svgContent = this.getAdolescentSVG(p, isSleeping);
        break;
      case 3:
        svgContent = this.getAdultSVG(p, isSleeping);
        break;
      default:
        svgContent = this.getHatchlingSVG(p, isSleeping);
    }

    this.svgElement.innerHTML = svgContent;
  }

  /**
   * STAGE 0: BABY HATCHLING (Chubby, stubby wings, big sparkling eyes, baby horns)
   */
  getHatchlingSVG(p, isSleeping) {
    return `
      <defs>
        <radialGradient id="bodyGrad0" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${p.primaryLight}" />
          <stop offset="70%" stop-color="${p.primary}" />
          <stop offset="100%" stop-color="${p.primaryDark}" />
        </radialGradient>
        <linearGradient id="bellyGrad0" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${p.belly}" />
          <stop offset="100%" stop-color="${p.bellyDark}" />
        </linearGradient>
      </defs>

      <!-- Tail -->
      <g class="dragon-tail">
        <path d="M 120 190 Q 70 200 55 170 Q 50 155 40 160 Q 55 185 110 215 Z" fill="${p.primaryDark}" />
        <!-- Tail Tip Spade / Flame -->
        <path d="M 40 160 Q 32 145 42 140 Q 52 152 40 160 Z" fill="${p.wingMembrane}" />
      </g>

      <!-- Back Wing -->
      <g class="dragon-wing back-wing">
        <path d="M 175 140 Q 150 95 130 90 Q 140 120 155 145 Z" fill="${p.primaryDark}" />
        <path d="M 130 90 Q 145 110 155 145 Q 140 120 130 90 Z" fill="${p.wingMembrane}" opacity="0.8" />
      </g>

      <!-- Main Chubby Body -->
      <ellipse cx="160" cy="180" rx="55" ry="45" fill="url(#bodyGrad0)" />

      <!-- Cute Belly -->
      <ellipse cx="175" cy="188" rx="36" ry="30" fill="url(#bellyGrad0)" />
      <!-- Belly ridges -->
      <path d="M 152 178 Q 175 186 198 178" stroke="${p.bellyDark}" stroke-width="2.5" fill="none" opacity="0.5" />
      <path d="M 154 192 Q 175 200 196 192" stroke="${p.bellyDark}" stroke-width="2.5" fill="none" opacity="0.5" />

      <!-- Cute Chubby Feet -->
      <ellipse cx="130" cy="218" rx="18" ry="12" fill="${p.primaryDark}" />
      <ellipse cx="195" cy="220" rx="18" ry="12" fill="${p.primaryDark}" />
      <!-- Baby Claws -->
      <circle cx="120" cy="222" r="3" fill="${p.horns}" />
      <circle cx="128" cy="225" r="3" fill="${p.horns}" />
      <circle cx="136" cy="224" r="3" fill="${p.horns}" />
      <circle cx="188" cy="224" r="3" fill="${p.horns}" />
      <circle cx="196" cy="226" r="3" fill="${p.horns}" />
      <circle cx="204" cy="223" r="3" fill="${p.horns}" />

      <!-- Big Baby Head -->
      <circle cx="190" cy="125" r="46" fill="url(#bodyGrad0)" />
      <!-- Chubby Cheeks -->
      <circle cx="222" cy="140" r="14" fill="${p.primaryLight}" opacity="0.4" />

      <!-- Cute Baby Horns -->
      <path d="M 165 92 Q 155 68 142 65 Q 155 78 172 90 Z" fill="${p.horns}" />
      <path d="M 188 84 Q 185 58 175 52 Q 185 70 196 82 Z" fill="${p.horns}" />

      <!-- Baby Front Wing -->
      <g class="dragon-wing front-wing">
        <path d="M 145 155 Q 115 110 95 105 Q 105 135 125 165 Z" fill="${p.primary}" />
        <path d="M 95 105 Q 110 128 125 165 Q 110 135 95 105 Z" fill="${p.wingMembrane}" />
      </g>

      <!-- Eyes & Face Expression -->
      <g class="dragon-face">
        <!-- Snout -->
        <ellipse cx="228" cy="136" rx="16" ry="12" fill="${p.primaryLight}" />
        <!-- Cute Nostril -->
        <circle cx="236" cy="133" r="2.5" fill="${p.primaryDark}" />
        <!-- Smile -->
        <path d="M 226 142 Q 235 148 240 142" stroke="${p.primaryDark}" stroke-width="2.5" fill="none" stroke-linecap="round" />

        ${isSleeping ? `
          <!-- Sleeping Eyelid -->
          <path d="M 190 126 Q 205 136 218 126" stroke="${p.primaryDark}" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M 194 130 Q 205 138 214 130" stroke="${p.primaryDark}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6" />
        ` : `
          <!-- Big Glossy Shiny Eye -->
          <ellipse cx="204" cy="122" rx="14" ry="16" fill="#ffffff" />
          <ellipse cx="207" cy="122" rx="11" ry="13" fill="${p.eye}" />
          <!-- Pupil -->
          <ellipse cx="208" cy="122" rx="7" ry="10" fill="#1e272e" class="dragon-eye-pupil" />
          <!-- Sparkle Highlights -->
          <circle cx="205" cy="116" r="4.5" fill="#ffffff" class="dragon-eye-highlight" />
          <circle cx="212" cy="126" r="2" fill="#ffffff" class="dragon-eye-highlight" />
          <!-- Eyelid for blinking -->
          <ellipse cx="204" cy="122" rx="15" ry="17" fill="${p.primary}" class="dragon-eyelid" style="opacity:0; transition: opacity 0.1s;" />
        `}
      </g>
    `;
  }

  /**
   * STAGE 1: PLAYFUL JUVENILE (Developing limbs, crest, wider wings, energetic)
   */
  getJuvenileSVG(p, isSleeping) {
    return `
      <defs>
        <radialGradient id="bodyGrad1" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stop-color="${p.primaryLight}" />
          <stop offset="65%" stop-color="${p.primary}" />
          <stop offset="100%" stop-color="${p.primaryDark}" />
        </radialGradient>
        <linearGradient id="bellyGrad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${p.belly}" />
          <stop offset="100%" stop-color="${p.bellyDark}" />
        </linearGradient>
      </defs>

      <!-- Longer Tail with Crest -->
      <g class="dragon-tail">
        <path d="M 115 185 Q 50 195 25 150 Q 15 130 5 135 Q 25 175 105 210 Z" fill="${p.primaryDark}" />
        <!-- Tail Flame Spade -->
        <path d="M 5 135 Q -8 115 6 108 Q 18 122 5 135 Z" fill="${p.wingMembrane}" />
        <circle cx="6" cy="122" r="3" fill="${p.belly}" />
      </g>

      <!-- Back Wing (Juvenile) -->
      <g class="dragon-wing back-wing">
        <path d="M 170 135 Q 135 60 100 50 Q 120 100 145 145 Z" fill="${p.primaryDark}" />
        <path d="M 100 50 Q 125 80 145 145 Q 120 100 100 50 Z" fill="${p.wingMembrane}" opacity="0.8" />
        <path d="M 115 70 L 140 120" stroke="${p.primaryDark}" stroke-width="2" />
      </g>

      <!-- Juvenile Sleek Body -->
      <ellipse cx="160" cy="175" rx="58" ry="46" fill="url(#bodyGrad1)" />

      <!-- Neck -->
      <path d="M 160 140 Q 180 105 200 95 L 220 115 Q 195 145 185 160 Z" fill="url(#bodyGrad1)" />

      <!-- Belly Plates -->
      <path d="M 155 165 Q 180 160 195 140 Q 205 180 190 205 Q 165 210 155 195 Z" fill="url(#bellyGrad1)" />
      <path d="M 168 175 Q 185 178 195 170" stroke="${p.bellyDark}" stroke-width="2.5" fill="none" />
      <path d="M 164 190 Q 182 193 192 185" stroke="${p.bellyDark}" stroke-width="2.5" fill="none" />

      <!-- Legs & Claws -->
      <ellipse cx="120" cy="215" rx="20" ry="14" fill="${p.primaryDark}" />
      <ellipse cx="195" cy="218" rx="20" ry="14" fill="${p.primaryDark}" />
      <path d="M 110 220 L 105 225 M 118 223 L 115 228 M 126 221 L 125 226" stroke="${p.horns}" stroke-width="3" stroke-linecap="round" />
      <path d="M 188 223 L 185 228 M 196 225 L 195 230 M 204 222 L 205 227" stroke="${p.horns}" stroke-width="3" stroke-linecap="round" />

      <!-- Head -->
      <ellipse cx="215" cy="98" rx="42" ry="34" fill="url(#bodyGrad1)" transform="rotate(5, 215, 98)" />

      <!-- Head Crest / Horns -->
      <path d="M 190 74 Q 170 38 150 32 Q 170 55 198 70 Z" fill="${p.horns}" />
      <path d="M 210 68 Q 200 32 185 24 Q 200 50 218 64 Z" fill="${p.horns}" />

      <!-- Front Wing (Juvenile) -->
      <g class="dragon-wing front-wing">
        <path d="M 140 150 Q 85 70 50 62 Q 75 115 110 170 Z" fill="${p.primary}" />
        <path d="M 50 62 Q 80 100 110 170 Q 75 115 50 62 Z" fill="${p.wingMembrane}" />
        <path d="M 72 85 L 102 145" stroke="${p.primaryDark}" stroke-width="2.5" />
      </g>

      <!-- Face -->
      <g class="dragon-face">
        <!-- Snout -->
        <ellipse cx="250" cy="108" rx="18" ry="14" fill="${p.primaryLight}" />
        <circle cx="260" cy="104" r="3" fill="${p.primaryDark}" />
        <!-- Playful open mouth smile -->
        <path d="M 245 116 Q 256 126 264 116" stroke="${p.primaryDark}" stroke-width="3" fill="#c0392b" stroke-linecap="round" />

        ${isSleeping ? `
          <path d="M 215 94 Q 230 104 242 94" stroke="${p.primaryDark}" stroke-width="3.5" fill="none" stroke-linecap="round" />
        ` : `
          <ellipse cx="228" cy="92" rx="13" ry="15" fill="#ffffff" />
          <ellipse cx="230" cy="92" rx="10" ry="12" fill="${p.eye}" />
          <ellipse cx="231" cy="92" rx="6" ry="9" fill="#1e272e" class="dragon-eye-pupil" />
          <circle cx="228" cy="86" r="4" fill="#ffffff" class="dragon-eye-highlight" />
          <circle cx="234" cy="96" r="2" fill="#ffffff" class="dragon-eye-highlight" />
          <ellipse cx="228" cy="92" rx="14" ry="16" fill="${p.primary}" class="dragon-eyelid" style="opacity:0; transition: opacity 0.1s;" />
        `}
      </g>
    `;
  }

  /**
   * STAGE 2: ADOLESCENT DRAKE (Sleek, wider wingspan, glowing markings, majestic horns)
   */
  getAdolescentSVG(p, isSleeping) {
    return `
      <defs>
        <radialGradient id="bodyGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${p.primaryLight}" />
          <stop offset="60%" stop-color="${p.primary}" />
          <stop offset="100%" stop-color="${p.primaryDark}" />
        </radialGradient>
        <linearGradient id="bellyGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${p.belly}" />
          <stop offset="100%" stop-color="${p.bellyDark}" />
        </linearGradient>
        <filter id="runeGlow2">
          <feGaussianBlur stdDeviation="3" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Tail -->
      <g class="dragon-tail">
        <path d="M 110 180 Q 40 180 10 130 Q -5 105 -15 110 Q 15 160 95 210 Z" fill="${p.primaryDark}" />
        <!-- Tail Blade -->
        <path d="M -15 110 Q -30 85 -10 75 Q 5 95 -15 110 Z" fill="${p.wingMembrane}" />
        <!-- Tail Rune -->
        <circle cx="5" cy="115" r="3.5" fill="${p.runeGlow}" filter="url(#runeGlow2)" />
      </g>

      <!-- Back Wing (Adolescent - Large) -->
      <g class="dragon-wing back-wing">
        <path d="M 165 130 Q 120 30 75 15 Q 105 80 135 140 Z" fill="${p.primaryDark}" />
        <path d="M 75 15 Q 110 60 135 140 Q 105 80 75 15 Z" fill="${p.wingMembrane}" opacity="0.85" />
        <path d="M 95 45 L 128 115" stroke="${p.primaryDark}" stroke-width="3" />
        <path d="M 115 65 L 132 125" stroke="${p.primaryDark}" stroke-width="2.5" />
      </g>

      <!-- Torso -->
      <path d="M 120 180 Q 140 130 180 120 Q 210 140 205 190 Q 170 215 120 180 Z" fill="url(#bodyGrad2)" />

      <!-- Graceful Neck -->
      <path d="M 175 130 Q 205 85 225 65 L 250 85 Q 220 125 195 150 Z" fill="url(#bodyGrad2)" />

      <!-- Glowing Chest / Belly Runes -->
      <path d="M 175 145 Q 200 135 215 115 Q 225 165 205 195 Q 180 200 170 180 Z" fill="url(#bellyGrad2)" />
      <!-- Glowing Ancient Dragon Runes -->
      <path d="M 188 150 L 198 160 L 188 170" stroke="${p.runeGlow}" stroke-width="3" fill="none" filter="url(#runeGlow2)" />
      <circle cx="198" cy="175" r="3" fill="${p.runeGlow}" filter="url(#runeGlow2)" />

      <!-- Strong Muscular Legs -->
      <ellipse cx="125" cy="210" rx="22" ry="15" fill="${p.primaryDark}" />
      <ellipse cx="195" cy="215" rx="22" ry="15" fill="${p.primaryDark}" />
      <path d="M 112 215 L 105 222 M 122 218 L 118 226 M 132 216 L 130 224" stroke="${p.horns}" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 185 218 L 180 226 M 195 222 L 192 229 M 205 218 L 205 226" stroke="${p.horns}" stroke-width="3.5" stroke-linecap="round" />

      <!-- Majestic Head -->
      <ellipse cx="242" cy="68" rx="44" ry="32" fill="url(#bodyGrad2)" transform="rotate(8, 242, 68)" />

      <!-- Long Swept-Back Horns -->
      <path d="M 215 48 Q 185 10 155 2 Q 185 30 225 45 Z" fill="${p.horns}" />
      <path d="M 235 42 Q 215 5 190 0 Q 215 22 242 38 Z" fill="${p.horns}" />

      <!-- Front Wing (Adolescent - Sweeping) -->
      <g class="dragon-wing front-wing">
        <path d="M 140 145 Q 65 35 20 20 Q 55 95 100 165 Z" fill="${p.primary}" />
        <path d="M 20 20 Q 60 75 100 165 Q 55 95 20 20 Z" fill="${p.wingMembrane}" />
        <path d="M 50 48 L 92 135" stroke="${p.primaryDark}" stroke-width="3" />
        <path d="M 75 70 L 98 145" stroke="${p.primaryDark}" stroke-width="2.5" />
        <!-- Wing Claw -->
        <circle cx="20" cy="20" r="3.5" fill="${p.horns}" />
      </g>

      <!-- Face -->
      <g class="dragon-face">
        <!-- Snout -->
        <ellipse cx="278" cy="78" rx="20" ry="14" fill="${p.primaryLight}" />
        <circle cx="290" cy="74" r="3.5" fill="${p.primaryDark}" />
        <path d="M 272 86 Q 284 94 294 84" stroke="${p.primaryDark}" stroke-width="3" fill="none" stroke-linecap="round" />

        ${isSleeping ? `
          <path d="M 245 62 Q 260 74 274 62" stroke="${p.primaryDark}" stroke-width="4" fill="none" stroke-linecap="round" />
        ` : `
          <ellipse cx="256" cy="62" rx="14" ry="15" fill="#ffffff" />
          <ellipse cx="258" cy="62" rx="10" ry="12" fill="${p.eye}" />
          <!-- Slit / Proud Dragon Pupil -->
          <ellipse cx="259" cy="62" rx="4.5" ry="10" fill="#1e272e" class="dragon-eye-pupil" />
          <circle cx="256" cy="56" r="4" fill="#ffffff" class="dragon-eye-highlight" />
          <circle cx="261" cy="66" r="2" fill="#ffffff" class="dragon-eye-highlight" />
          <ellipse cx="256" cy="62" rx="15" ry="16" fill="${p.primary}" class="dragon-eyelid" style="opacity:0; transition: opacity 0.1s;" />
        `}
      </g>
    `;
  }

  /**
   * STAGE 3: MAJESTIC ADULT DRAGON (Grand wingspan, intricate horns, cosmic runes, regal guardian)
   */
  getAdultSVG(p, isSleeping) {
    return `
      <defs>
        <radialGradient id="bodyGrad3" cx="35%" cy="30%" r="72%">
          <stop offset="0%" stop-color="${p.primaryLight}" />
          <stop offset="55%" stop-color="${p.primary}" />
          <stop offset="90%" stop-color="${p.primaryDark}" />
          <stop offset="100%" stop-color="#111" />
        </radialGradient>
        <linearGradient id="bellyGrad3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${p.belly}" />
          <stop offset="100%" stop-color="${p.bellyDark}" />
        </linearGradient>
        <filter id="runeGlow3" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Grand Spiked Tail -->
      <g class="dragon-tail">
        <path d="M 105 175 Q 30 170 -10 115 Q -30 85 -45 90 Q -10 150 85 205 Z" fill="${p.primaryDark}" />
        <!-- Crown Tail Blade -->
        <polygon points="-45,90 -65,65 -40,55 -30,75" fill="${p.wingMembrane}" />
        <polygon points="-40,55 -50,35 -25,40" fill="${p.belly}" />
        <circle cx="-25" cy="95" r="4" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
      </g>

      <!-- Back Wing (Grand Regal Wingspan) -->
      <g class="dragon-wing back-wing">
        <path d="M 160 120 Q 105 5 50 -15 Q 90 60 125 135 Z" fill="${p.primaryDark}" />
        <path d="M 50 -15 Q 90 40 125 135 Q 90 60 50 -15 Z" fill="${p.wingMembrane}" opacity="0.9" />
        <path d="M 75 18 L 115 105" stroke="${p.primaryDark}" stroke-width="3.5" />
        <path d="M 98 42 L 120 115" stroke="${p.primaryDark}" stroke-width="3" />
        <!-- Glowing Wing Runes -->
        <circle cx="85" cy="50" r="3.5" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
      </g>

      <!-- Regal Torso & Shoulder Crest -->
      <path d="M 110 175 Q 135 115 185 105 Q 220 125 215 185 Q 170 215 110 175 Z" fill="url(#bodyGrad3)" />

      <!-- Elegant Arched Neck -->
      <path d="M 180 115 Q 215 65 240 45 L 268 68 Q 230 115 200 145 Z" fill="url(#bodyGrad3)" />

      <!-- Armored Golden Belly Plates -->
      <path d="M 185 135 Q 215 120 230 100 Q 240 155 215 190 Q 185 198 175 175 Z" fill="url(#bellyGrad3)" />
      <!-- Ancient Guardian Runes Glowing on Chest -->
      <path d="M 200 135 L 212 148 L 200 162 L 188 148 Z" stroke="${p.runeGlow}" stroke-width="2.5" fill="none" filter="url(#runeGlow3)" />
      <line x1="200" y1="130" x2="200" y2="170" stroke="${p.runeGlow}" stroke-width="2" filter="url(#runeGlow3)" />
      <circle cx="200" cy="148" r="3.5" fill="#ffffff" filter="url(#runeGlow3)" />

      <!-- Powerful Guardian Paws with Golden Claws -->
      <ellipse cx="125" cy="205" rx="24" ry="16" fill="${p.primaryDark}" />
      <ellipse cx="205" cy="210" rx="24" ry="16" fill="${p.primaryDark}" />
      <path d="M 110 208 L 100 216 M 122 212 L 116 222 M 134 210 L 132 220" stroke="${p.belly}" stroke-width="4" stroke-linecap="round" />
      <path d="M 192 212 L 185 222 M 204 216 L 202 225 M 216 212 L 216 221" stroke="${p.belly}" stroke-width="4" stroke-linecap="round" />

      <!-- Regal Head with Crown Crest -->
      <ellipse cx="258" cy="50" rx="46" ry="34" fill="url(#bodyGrad3)" transform="rotate(10, 258, 50)" />

      <!-- Magnificent Sweeping Dual Horns -->
      <path d="M 225 32 Q 190 -15 145 -25 Q 185 5 235 26 Z" fill="${p.horns}" />
      <path d="M 248 24 Q 220 -25 185 -35 Q 220 -5 256 18 Z" fill="${p.horns}" />
      <!-- Golden Horn Rings -->
      <path d="M 185 -5 L 188 2" stroke="${p.belly}" stroke-width="3" />
      <path d="M 215 5 L 218 12" stroke="${p.belly}" stroke-width="3" />

      <!-- Front Wing (Magnificent Adult Wingspan) -->
      <g class="dragon-wing front-wing">
        <path d="M 135 135 Q 45 5 -10 -20 Q 30 75 85 160 Z" fill="${p.primary}" />
        <path d="M -10 -20 Q 35 55 85 160 Q 30 75 -10 -20 Z" fill="${p.wingMembrane}" />
        <path d="M 25 22 L 75 125" stroke="${p.primaryDark}" stroke-width="3.5" />
        <path d="M 55 48 L 84 138" stroke="${p.primaryDark}" stroke-width="3" />
        <!-- Wing Bone Claw -->
        <polygon points="-10,-20 -22,-30 -8,-25" fill="${p.horns}" />
        <!-- Wing Runes -->
        <circle cx="35" cy="50" r="4" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
        <circle cx="58" cy="85" r="3.5" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
      </g>

      <!-- Regal Face -->
      <g class="dragon-face">
        <!-- Snout -->
        <ellipse cx="296" cy="62" rx="22" ry="15" fill="${p.primaryLight}" />
        <circle cx="310" cy="57" r="4" fill="${p.primaryDark}" />
        <path d="M 288 70 Q 302 78 314 68" stroke="${p.primaryDark}" stroke-width="3.5" fill="none" stroke-linecap="round" />

        ${isSleeping ? `
          <path d="M 260 45 Q 278 58 294 45" stroke="${p.primaryDark}" stroke-width="4.5" fill="none" stroke-linecap="round" />
        ` : `
          <ellipse cx="274" cy="45" rx="15" ry="16" fill="#ffffff" />
          <ellipse cx="276" cy="45" rx="11" ry="13" fill="${p.eye}" />
          <!-- Intelligent Mystic Slit Pupil -->
          <ellipse cx="277" cy="45" rx="4" ry="11" fill="#1e272e" class="dragon-eye-pupil" />
          <circle cx="273" cy="38" r="4.5" fill="#ffffff" class="dragon-eye-highlight" />
          <circle cx="280" cy="48" r="2" fill="#ffffff" class="dragon-eye-highlight" />
          <ellipse cx="274" cy="45" rx="16" ry="17" fill="${p.primary}" class="dragon-eyelid" style="opacity:0; transition: opacity 0.1s;" />
        `}
      </g>
    `;
  }
}

window.DragonPet = DragonPet;
