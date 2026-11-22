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
      this.container.classList.remove('at-window', 'at-nest');
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
      this.container.classList.remove('at-window', 'at-nest');
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
        <path d="M 120 185 Q 70 195 45 160 Q 32 142 22 146 Q 38 180 112 212 Z" fill="${p.primaryDark}" />
        <!-- Tail Flame Spade -->
        <path d="M 22 146 Q 10 128 24 120 Q 34 135 22 146 Z" fill="${p.wingMembrane}" />
        <circle cx="24" cy="133" r="3" fill="${p.belly}" />
      </g>

      <!-- Back Wing (Juvenile) -->
      <g class="dragon-wing back-wing">
        <path d="M 160 135 Q 128 55 98 46 Q 118 95 138 145 Z" fill="${p.primaryDark}" />
        <path d="M 98 46 Q 122 75 138 145 Q 118 95 98 46 Z" fill="${p.wingMembrane}" opacity="0.85" />
        <path d="M 112 68 L 134 120" stroke="${p.primaryDark}" stroke-width="2.5" />
      </g>

      <!-- Juvenile Sleek Body -->
      <ellipse cx="158" cy="176" rx="58" ry="46" fill="url(#bodyGrad1)" />

      <!-- Neck smoothly connecting to head -->
      <path d="M 148 148 Q 175 110 195 96 L 222 114 Q 192 144 182 165 Z" fill="url(#bodyGrad1)" />

      <!-- Neck dorsal spikes -->
      <polygon points="168,125 158,112 174,120" fill="${p.horns}" />
      <polygon points="182,108 174,96 188,104" fill="${p.horns}" />

      <!-- Belly Plates -->
      <path d="M 152 164 Q 178 158 196 138 Q 208 178 192 206 Q 166 210 152 194 Z" fill="url(#bellyGrad1)" />
      <path d="M 165 174 Q 182 178 194 168" stroke="${p.bellyDark}" stroke-width="2.5" fill="none" />
      <path d="M 162 189 Q 180 193 190 184" stroke="${p.bellyDark}" stroke-width="2.5" fill="none" />

      <!-- Legs & Claws -->
      <ellipse cx="122" cy="216" rx="20" ry="14" fill="${p.primaryDark}" />
      <ellipse cx="192" cy="218" rx="20" ry="14" fill="${p.primaryDark}" />
      <path d="M 112 220 L 106 226 M 120 223 L 116 229 M 128 221 L 126 227" stroke="${p.horns}" stroke-width="3" stroke-linecap="round" />
      <path d="M 184 223 L 180 228 M 193 225 L 191 230 M 201 222 L 202 227" stroke="${p.horns}" stroke-width="3" stroke-linecap="round" />

      <!-- Head & Horns Group (seamlessly aligned) -->
      <g class="dragon-head-group">
        <!-- Back-swept Horns firmly rooted on skull -->
        <path d="M 182 92 Q 162 58 142 50 Q 162 70 190 86 Z" fill="${p.horns}" />
        <path d="M 198 84 Q 188 48 174 38 Q 188 62 206 78 Z" fill="${p.horns}" />

        <!-- Head Oval -->
        <ellipse cx="204" cy="112" rx="42" ry="34" fill="url(#bodyGrad1)" />

        <!-- Front Wing (Juvenile) -->
        <g class="dragon-wing front-wing">
          <path d="M 138 150 Q 82 68 52 58 Q 78 112 110 168 Z" fill="${p.primary}" />
          <path d="M 52 58 Q 80 98 110 168 Q 78 112 52 58 Z" fill="${p.wingMembrane}" />
          <path d="M 72 82 L 102 142" stroke="${p.primaryDark}" stroke-width="2.5" />
          <path d="M 90 98 L 106 150" stroke="${p.primaryDark}" stroke-width="2" />
        </g>

        <!-- Face Details -->
        <g class="dragon-face">
          <!-- Snout rooted on front of skull -->
          <ellipse cx="236" cy="120" rx="18" ry="13" fill="${p.primaryLight}" />
          <circle cx="245" cy="116" r="3" fill="${p.primaryDark}" />
          <!-- Playful open smile -->
          <path d="M 232 126 Q 242 134 250 125" stroke="${p.primaryDark}" stroke-width="2.5" fill="#c0392b" stroke-linecap="round" />

          ${isSleeping ? `
            <!-- Sleeping Eye Curve -->
            <path d="M 206 108 Q 220 118 232 108" stroke="${p.primaryDark}" stroke-width="3.5" fill="none" stroke-linecap="round" />
          ` : `
            <!-- Expressive Eye -->
            <ellipse cx="216" cy="104" rx="12" ry="14" fill="#ffffff" />
            <ellipse cx="218" cy="104" rx="9" ry="11" fill="${p.eye}" />
            <ellipse cx="219" cy="104" rx="5" ry="8" fill="#1e272e" class="dragon-eye-pupil" />
            <circle cx="216" cy="99" r="3.5" fill="#ffffff" class="dragon-eye-highlight" />
            <circle cx="222" cy="108" r="1.8" fill="#ffffff" class="dragon-eye-highlight" />
            <ellipse cx="216" cy="104" rx="13" ry="15" fill="${p.primary}" class="dragon-eyelid" style="opacity:0; transition: opacity 0.1s;" />
          `}
        </g>
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

      <!-- Tail with Aerodynamic Blade and Rune -->
      <g class="dragon-tail">
        <path d="M 115 180 Q 55 185 28 145 Q 16 125 6 128 Q 22 172 105 210 Z" fill="${p.primaryDark}" />
        <!-- Tail Blade -->
        <polygon points="6,128 -8,105 12,98 22,120" fill="${p.wingMembrane}" />
        <circle cx="10" cy="120" r="3.5" fill="${p.runeGlow}" filter="url(#runeGlow2)" />
      </g>

      <!-- Back Wing (Adolescent - Large) -->
      <g class="dragon-wing back-wing">
        <path d="M 158 130 Q 118 42 78 28 Q 104 88 132 145 Z" fill="${p.primaryDark}" />
        <path d="M 78 28 Q 110 65 132 145 Q 104 88 78 28 Z" fill="${p.wingMembrane}" opacity="0.85" />
        <path d="M 98 52 L 128 120" stroke="${p.primaryDark}" stroke-width="3" />
        <path d="M 116 70 L 132 130" stroke="${p.primaryDark}" stroke-width="2.5" />
      </g>

      <!-- Muscular Torso -->
      <path d="M 115 178 Q 138 124 178 114 Q 212 134 206 188 Q 170 216 115 178 Z" fill="url(#bodyGrad2)" />

      <!-- Graceful Arched Neck -->
      <path d="M 152 142 Q 182 96 208 80 L 232 96 Q 202 136 182 162 Z" fill="url(#bodyGrad2)" />

      <!-- Dorsal Spikes along Neck -->
      <polygon points="172,120 160,105 178,114" fill="${p.horns}" />
      <polygon points="188,102 178,88 194,96" fill="${p.horns}" />
      <polygon points="204,85 196,72 210,80" fill="${p.horns}" />

      <!-- Glowing Chest / Belly Plates -->
      <path d="M 158 152 Q 186 142 202 122 Q 216 172 198 200 Q 172 206 158 186 Z" fill="url(#bellyGrad2)" />
      <!-- Glowing Ancient Dragon Runes -->
      <path d="M 178 158 L 188 168 L 178 178" stroke="${p.runeGlow}" stroke-width="2.5" fill="none" filter="url(#runeGlow2)" />
      <circle cx="188" cy="184" r="3" fill="${p.runeGlow}" filter="url(#runeGlow2)" />

      <!-- Strong Muscular Legs -->
      <ellipse cx="124" cy="214" rx="22" ry="15" fill="${p.primaryDark}" />
      <ellipse cx="194" cy="216" rx="22" ry="15" fill="${p.primaryDark}" />
      <path d="M 112 218 L 105 225 M 122 221 L 118 228 M 132 219 L 130 226" stroke="${p.horns}" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 185 220 L 180 227 M 195 223 L 192 229 M 204 220 L 204 227" stroke="${p.horns}" stroke-width="3.5" stroke-linecap="round" />

      <!-- Front Wing (Adolescent - Sweeping) -->
      <g class="dragon-wing front-wing">
        <path d="M 136 146 Q 72 48 36 34 Q 65 102 104 168 Z" fill="${p.primary}" />
        <path d="M 36 34 Q 70 82 104 168 Q 65 102 36 34 Z" fill="${p.wingMembrane}" />
        <path d="M 60 62 L 96 138" stroke="${p.primaryDark}" stroke-width="3" />
        <path d="M 80 82 L 102 148" stroke="${p.primaryDark}" stroke-width="2.5" />
        <circle cx="36" cy="34" r="3.5" fill="${p.horns}" />
      </g>

      <!-- Head & Horns Group -->
      <g class="dragon-head-group">
        <!-- Sweeping Horns firmly anchored on skull -->
        <path d="M 194 72 Q 170 32 140 22 Q 168 46 204 66 Z" fill="${p.horns}" />
        <path d="M 212 65 Q 194 25 168 16 Q 194 40 220 60 Z" fill="${p.horns}" />

        <!-- Head Oval -->
        <ellipse cx="216" cy="94" rx="44" ry="32" fill="url(#bodyGrad2)" />

        <!-- Face Details -->
        <g class="dragon-face">
          <!-- Snout firmly attached to head -->
          <ellipse cx="250" cy="100" rx="20" ry="14" fill="${p.primaryLight}" />
          <circle cx="260" cy="96" r="3.5" fill="${p.primaryDark}" />
          <path d="M 244 106 Q 255 113 264 104" stroke="${p.primaryDark}" stroke-width="3" fill="none" stroke-linecap="round" />

          ${isSleeping ? `
            <path d="M 218 88 Q 232 100 244 88" stroke="${p.primaryDark}" stroke-width="4" fill="none" stroke-linecap="round" />
          ` : `
            <ellipse cx="228" cy="86" rx="13" ry="14" fill="#ffffff" />
            <ellipse cx="230" cy="86" rx="9" ry="11" fill="${p.eye}" />
            <ellipse cx="231" cy="86" rx="4.5" ry="9" fill="#1e272e" class="dragon-eye-pupil" />
            <circle cx="228" cy="81" r="3.5" fill="#ffffff" class="dragon-eye-highlight" />
            <circle cx="233" cy="90" r="1.8" fill="#ffffff" class="dragon-eye-highlight" />
            <ellipse cx="228" cy="86" rx="14" ry="15" fill="${p.primary}" class="dragon-eyelid" style="opacity:0; transition: opacity 0.1s;" />
          `}
        </g>
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

      <!-- Grand Spiked Tail with Crown Blade -->
      <g class="dragon-tail">
        <path d="M 110 178 Q 45 180 20 135 Q 8 110 2 114 Q 18 165 98 210 Z" fill="${p.primaryDark}" />
        <!-- Crown Tail Blade -->
        <polygon points="2,114 -12,90 8,82 18,105" fill="${p.wingMembrane}" />
        <polygon points="8,82 2,68 18,72" fill="${p.belly}" />
        <circle cx="6" cy="108" r="4" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
      </g>

      <!-- Back Wing (Grand Regal Wingspan) -->
      <g class="dragon-wing back-wing">
        <path d="M 155 125 Q 105 28 62 14 Q 92 80 128 145 Z" fill="${p.primaryDark}" />
        <path d="M 62 14 Q 98 56 128 145 Q 92 80 62 14 Z" fill="${p.wingMembrane}" opacity="0.9" />
        <path d="M 84 38 L 120 115" stroke="${p.primaryDark}" stroke-width="3.5" />
        <path d="M 104 58 L 126 128" stroke="${p.primaryDark}" stroke-width="3" />
        <circle cx="75" cy="42" r="3.5" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
      </g>

      <!-- Regal Torso -->
      <path d="M 110 175 Q 135 116 182 106 Q 216 126 210 186 Q 168 216 110 175 Z" fill="url(#bodyGrad3)" />

      <!-- Elegant Arched Neck -->
      <path d="M 148 136 Q 178 84 206 68 L 232 84 Q 204 126 180 156 Z" fill="url(#bodyGrad3)" />

      <!-- Royal Dorsal Spikes along Neck -->
      <polygon points="166,112 154,96 172,106" fill="${p.horns}" />
      <polygon points="182,94 170,78 188,88" fill="${p.horns}" />
      <polygon points="198,76 188,62 204,70" fill="${p.horns}" />

      <!-- Armored Golden Belly Plates -->
      <path d="M 160 144 Q 190 132 208 112 Q 222 164 202 194 Q 174 200 160 180 Z" fill="url(#bellyGrad3)" />
      <!-- Ancient Guardian Runes Glowing on Chest -->
      <path d="M 180 148 L 192 160 L 180 172 L 168 160 Z" stroke="${p.runeGlow}" stroke-width="2.5" fill="none" filter="url(#runeGlow3)" />
      <line x1="180" y1="142" x2="180" y2="178" stroke="${p.runeGlow}" stroke-width="2" filter="url(#runeGlow3)" />
      <circle cx="180" cy="160" r="3.5" fill="#ffffff" filter="url(#runeGlow3)" />

      <!-- Powerful Guardian Paws with Golden Claws -->
      <ellipse cx="124" cy="212" rx="24" ry="16" fill="${p.primaryDark}" />
      <ellipse cx="198" cy="214" rx="24" ry="16" fill="${p.primaryDark}" />
      <path d="M 110 216 L 102 223 M 122 219 L 117 227 M 134 217 L 132 225" stroke="${p.belly}" stroke-width="4" stroke-linecap="round" />
      <path d="M 188 220 L 182 227 M 198 223 L 196 230 M 208 219 L 208 226" stroke="${p.belly}" stroke-width="4" stroke-linecap="round" />

      <!-- Front Wing (Magnificent Adult Wingspan) -->
      <g class="dragon-wing front-wing">
        <path d="M 134 140 Q 56 32 18 16 Q 52 86 98 164 Z" fill="${p.primary}" />
        <path d="M 18 16 Q 56 68 98 164 Q 52 86 18 16 Z" fill="${p.wingMembrane}" />
        <path d="M 46 44 L 88 132" stroke="${p.primaryDark}" stroke-width="3.5" />
        <path d="M 70 66 L 96 142" stroke="${p.primaryDark}" stroke-width="3" />
        <polygon points="18,16 6,8 18,12" fill="${p.horns}" />
        <circle cx="36" cy="38" r="4" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
        <circle cx="56" cy="70" r="3.5" fill="${p.runeGlow}" filter="url(#runeGlow3)" />
      </g>

      <!-- Head & Horns Group -->
      <g class="dragon-head-group">
        <!-- Magnificent Sweeping Dual Horns firmly anchored on skull -->
        <path d="M 194 60 Q 166 18 130 8 Q 160 35 204 55 Z" fill="${p.horns}" />
        <path d="M 212 52 Q 190 10 160 0 Q 190 26 222 47 Z" fill="${p.horns}" />
        <!-- Golden Horn Rings -->
        <path d="M 160 18 L 164 24" stroke="${p.belly}" stroke-width="3" />
        <path d="M 186 36 L 190 42" stroke="${p.belly}" stroke-width="3" />

        <!-- Regal Skull -->
        <ellipse cx="218" cy="82" rx="46" ry="32" fill="url(#bodyGrad3)" />

        <!-- Regal Face Details -->
        <g class="dragon-face">
          <!-- Snout firmly attached to front of skull -->
          <ellipse cx="254" cy="88" rx="22" ry="15" fill="${p.primaryLight}" />
          <circle cx="265" cy="84" r="4" fill="${p.primaryDark}" />
          <path d="M 248 94 Q 260 102 270 92" stroke="${p.primaryDark}" stroke-width="3.5" fill="none" stroke-linecap="round" />

          ${isSleeping ? `
            <path d="M 220 74 Q 236 86 248 74" stroke="${p.primaryDark}" stroke-width="4.5" fill="none" stroke-linecap="round" />
          ` : `
            <ellipse cx="230" cy="72" rx="14" ry="15" fill="#ffffff" />
            <ellipse cx="232" cy="72" rx="10" ry="12" fill="${p.eye}" />
            <ellipse cx="233" cy="72" rx="4" ry="10" fill="#1e272e" class="dragon-eye-pupil" />
            <circle cx="230" cy="66" r="4" fill="#ffffff" class="dragon-eye-highlight" />
            <circle cx="236" cy="76" r="2" fill="#ffffff" class="dragon-eye-highlight" />
            <ellipse cx="230" cy="72" rx="15" ry="16" fill="${p.primary}" class="dragon-eyelid" style="opacity:0; transition: opacity 0.1s;" />
          `}
        </g>
      </g>
    `;
  }
}

window.DragonPet = DragonPet;
