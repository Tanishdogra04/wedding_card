// SCENE DEFINITIONS WITH SPECIFIC DURATIONS (in milliseconds)
const SCENES = [
  { id: 'scene-1', duration: 4000 }, // Scene 1: Divine Opening
  { id: 'scene-2', duration: 4500 }, // Scene 2: Dharamshala Establishing
  { id: 'scene-3', duration: 4500 }, // Scene 3: Royal Palace Reveal
  { id: 'scene-4', duration: 4500 }, // Scene 4: Bride & Groom Reveal
  { id: 'scene-5', duration: 25000 }, // Scene 5: Wedding Events Timeline (longer reading time)
  { id: 'scene-6', duration: 6000 }, // Scene 6: Venue Reveal
  { id: 'scene-7', duration: 8000 } // Scene 7: Grand Finale
];

// STATE MANAGEMENT
let currentSceneIndex = -1; // -1 means welcome screen is active
let isPlaying = true;
let isMuted = false;
let sceneTimeout = null;
let sceneStartTime = 0;
let sceneElapsedTime = 0;
let lastTickTime = 0;

// ELEMENTS
const welcomeScreen = document.getElementById('welcome-screen');
const enterBtn = document.getElementById('enter-btn');
const musicToggle = document.getElementById('music-toggle');
const playbackToggle = document.getElementById('playback-toggle');
const overallProgress = document.getElementById('overall-progress');
const navDotsContainer = document.getElementById('nav-dots-container');

// ICONS
const iconMute = document.getElementById('icon-mute');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const iconResume = document.getElementById('icon-resume');

// ==========================================
// 1. TIMELINE & TRANSITIONS ORCHESTRATION
// ==========================================

// Initialize Dot Navigation
function initNavigation() {
  navDotsContainer.innerHTML = '';
  SCENES.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Go to scene ${index + 1}`);
    dot.addEventListener('click', () => {
      if (currentSceneIndex === -1) return; // Prevent clicking before enter
      goToScene(index);
    });
    navDotsContainer.appendChild(dot);
  });
}

// Start the Film Presentation
function startFilm() {
  welcomeScreen.classList.remove('active');
  currentSceneIndex = 0;
  
  // Set first scene active
  const firstScene = document.getElementById(SCENES[0].id);
  if (firstScene) firstScene.classList.add('active');
  
  // Setup audio
  try {
    initAudio();
    if (!isMuted) {
      resumeAudioContext();
      startDrone();
      playBell();
    }
  } catch (e) {
    console.error("Audio init failed:", e);
  }
  
  updateNavigationDots();
  startSceneTimer(SCENES[0].duration);
  requestAnimationFrame(tickProgressBar);
}

// Start Timer for Current Scene
function startSceneTimer(duration) {
  clearTimeout(sceneTimeout);
  sceneStartTime = Date.now() - sceneElapsedTime;
  lastTickTime = Date.now();
  
  sceneTimeout = setTimeout(() => {
    sceneElapsedTime = 0;
    nextScene();
  }, duration - sceneElapsedTime);
}

// Tick Loop for Progress Bar Animation
function tickProgressBar() {
  if (currentSceneIndex === -1) {
    overallProgress.style.width = '0%';
    return;
  }
  
  if (isPlaying) {
    const now = Date.now();
    sceneElapsedTime += (now - lastTickTime);
    lastTickTime = now;
  } else {
    lastTickTime = Date.now();
  }
  
  const currentScene = SCENES[currentSceneIndex];
  let percent = (sceneElapsedTime / currentScene.duration) * 100;
  percent = Math.min(100, Math.max(0, percent));
  overallProgress.style.width = `${percent}%`;
  
  requestAnimationFrame(tickProgressBar);
}

// Move to next scene
function nextScene() {
  if (currentSceneIndex < SCENES.length - 1) {
    goToScene(currentSceneIndex + 1);
  } else {
    // Loop back to scene 1 or pause on final frame
    goToScene(0);
  }
}

// Jump to specific scene index
function goToScene(index) {
  clearTimeout(sceneTimeout);
  
  // Deactivate old scene
  if (currentSceneIndex >= 0 && currentSceneIndex < SCENES.length) {
    const oldScene = document.getElementById(SCENES[currentSceneIndex].id);
    if (oldScene) oldScene.classList.remove('active');
  }
  
  currentSceneIndex = index;
  sceneElapsedTime = 0;
  
  // Activate new scene
  const newScene = document.getElementById(SCENES[currentSceneIndex].id);
  if (newScene) newScene.classList.add('active');
  
  // Play chime for slide change
  if (!isMuted) {
    playBell();
  }
  
  updateNavigationDots();
  
  if (isPlaying) {
    startSceneTimer(SCENES[currentSceneIndex].duration);
  }
}

// Update Active Nav Dot
function updateNavigationDots() {
  const dots = document.querySelectorAll('.dot');
  dots.forEach((dot, idx) => {
    if (idx === currentSceneIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

// Pause Film Playback
function pauseFilm() {
  isPlaying = false;
  clearTimeout(sceneTimeout);
  iconPause.classList.add('hidden');
  iconResume.classList.remove('hidden');
  stopDrone();
}

// Resume Film Playback
function resumeFilm() {
  isPlaying = true;
  iconResume.classList.add('hidden');
  iconPause.classList.remove('hidden');
  
  if (!isMuted) {
    resumeAudioContext();
    startDrone();
  }
  
  startSceneTimer(SCENES[currentSceneIndex].duration);
}


// ==========================================
// 2. WEB AUDIO API SYNTHESIZER
// ==========================================
let audioCtx = null;
let droneOsc1 = null;
let droneOsc2 = null;
let droneGain = null;
let delayNode = null;
let lowpassFilter = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create space/delay node for bell echo
  delayNode = audioCtx.createDelay(1.0);
  delayNode.delayTime.value = 0.45;
  
  const delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = 0.35;
  
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(audioCtx.destination);
  
  // Master lowpass filter for deep warm sounds
  lowpassFilter = audioCtx.createBiquadFilter();
  lowpassFilter.type = 'lowpass';
  lowpassFilter.frequency.value = 380;
  
  // Drone gain node
  droneGain = audioCtx.createGain();
  droneGain.gain.setValueAtTime(0, audioCtx.currentTime);
}

function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function startDrone() {
  if (!audioCtx) return;
  
  // Stop existing oscillators if any
  stopDroneOscillators();
  
  // Fundamental frequencies (D3 and A3 for a traditional tanpura open-fifth)
  droneOsc1 = audioCtx.createOscillator();
  droneOsc1.type = 'sawtooth';
  droneOsc1.frequency.value = 146.83; // D3
  
  droneOsc2 = audioCtx.createOscillator();
  droneOsc2.type = 'triangle';
  droneOsc2.frequency.value = 220.00; // A3
  
  droneOsc1.connect(lowpassFilter);
  droneOsc2.connect(lowpassFilter);
  lowpassFilter.connect(droneGain);
  droneGain.connect(audioCtx.destination);
  
  droneOsc1.start();
  droneOsc2.start();
  
  // Gently ramp up the drone volume to be non-intrusive
  droneGain.gain.cancelScheduledValues(audioCtx.currentTime);
  droneGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 2.5);
}

function stopDrone() {
  if (droneGain) {
    droneGain.gain.cancelScheduledValues(audioCtx.currentTime);
    droneGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);
    setTimeout(stopDroneOscillators, 1100);
  }
}

function stopDroneOscillators() {
  try {
    if (droneOsc1) { droneOsc1.stop(); droneOsc1 = null; }
    if (droneOsc2) { droneOsc2.stop(); droneOsc2 = null; }
  } catch (e) {
    // Already stopped
  }
}

// Synthesize an atmospheric, rich temple bell sound
function playBell() {
  if (!audioCtx) return;
  resumeAudioContext();
  
  // Frequencies for a metallic bell chime chord (D5, F#5, A5, C#6)
  const bellFreqs = [587.33, 739.99, 880.00, 1109.73, 1318.51];
  
  // Envelope gain node for decay
  const envelope = audioCtx.createGain();
  envelope.gain.setValueAtTime(0, audioCtx.currentTime);
  envelope.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05); // quick punch
  envelope.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 4.5); // long chime trail
  
  envelope.connect(audioCtx.destination);
  if (delayNode) envelope.connect(delayNode);
  
  // Create oscillators for chime frequencies
  bellFreqs.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    // Alternating sine/triangle waves for rich harmonic timbre
    osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    
    // Add minor detuning for natural vibration
    osc.detune.value = (Math.random() - 0.5) * 12;
    
    osc.connect(envelope);
    osc.start();
    osc.stop(audioCtx.currentTime + 4.8);
  });
}


// ==========================================
// 3. CANVAS PARTICLE SYSTEM (GOLD DUST & ROSE PETALS)
// ==========================================
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let petals = [];
let animationId = null;

// Handle resize
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Gold Particle Class
class GoldParticle {
  constructor() {
    this.reset();
    this.y = Math.random() * canvas.height; // Spread initially
  }
  
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + 20;
    this.size = Math.random() * 2.5 + 0.5;
    this.speedY = -(Math.random() * 0.8 + 0.3);
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.pulseSpeed = Math.random() * 0.02 + 0.005;
    this.pulseAngle = Math.random() * Math.PI;
  }
  
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    
    // Float drift
    this.pulseAngle += this.pulseSpeed;
    this.currentOpacity = this.opacity + Math.sin(this.pulseAngle) * 0.15;
    
    // Wrap around or go offscreen
    if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
      this.reset();
    }
  }
  
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    // Gold gold glow color
    ctx.fillStyle = `rgba(229, 193, 125, ${Math.max(0, this.currentOpacity)})`;
    ctx.shadowBlur = this.size * 2;
    ctx.shadowColor = 'rgba(229, 193, 125, 0.6)';
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow
  }
}

// Rose Petal Class
class RosePetal {
  constructor() {
    this.reset();
    this.y = Math.random() * -canvas.height; // starts off-screen
  }
  
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = -20;
    this.size = Math.random() * 8 + 5;
    this.speedY = Math.random() * 1.2 + 0.8;
    this.speedX = (Math.random() - 0.5) * 0.6;
    this.rotation = Math.random() * 360;
    this.spinSpeed = (Math.random() - 0.5) * 2;
    this.oscillation = 0;
    this.oscSpeed = Math.random() * 0.02 + 0.01;
    this.oscAmp = Math.random() * 1.5 + 0.5;
    this.opacity = Math.random() * 0.4 + 0.4;
    // Vary between pink/red lehenga maroon petals
    const isMaroon = Math.random() > 0.4;
    this.color = isMaroon ? 'rgba(128, 0, 32, ' : 'rgba(214, 80, 100, ';
  }
  
  update() {
    this.y += this.speedY;
    this.oscillation += this.oscSpeed;
    this.x += this.speedX + Math.sin(this.oscillation) * this.oscAmp;
    this.rotation += this.spinSpeed;
    
    if (this.y > canvas.height + 20) {
      this.reset();
    }
  }
  
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    
    // Draw an elegant petal shape
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color + this.opacity + ')';
    ctx.fill();
    
    // Add tiny gold highlight line to petal edge for luxury detail
    ctx.strokeStyle = `rgba(229, 193, 125, ${this.opacity * 0.25})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    ctx.restore();
  }
}

// Particle Loop
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  petals.forEach(p => {
    p.update();
    p.draw();
  });
  
  animationId = requestAnimationFrame(animateParticles);
}

function initParticles() {
  particles = [];
  petals = [];
  
  // Instantiate gold dust
  const particleCount = Math.min(80, Math.floor(window.innerWidth / 15));
  for (let i = 0; i < particleCount; i++) {
    particles.push(new GoldParticle());
  }
  
  // Instantiate rose petals (fewer count to avoid clutter)
  const petalCount = 18;
  for (let i = 0; i < petalCount; i++) {
    petals.push(new RosePetal());
  }
  
  animateParticles();
}


// ==========================================
// 4. BIND EVENT LISTENERS & INITS
// ==========================================

// Enter Invitation click
enterBtn.addEventListener('click', startFilm);

// Audio Toggle click
musicToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  
  if (isMuted) {
    iconPlay.classList.add('hidden');
    iconMute.classList.remove('hidden');
    stopDrone();
  } else {
    iconMute.classList.add('hidden');
    iconPlay.classList.remove('hidden');
    
    if (currentSceneIndex >= 0) {
      initAudio();
      resumeAudioContext();
      startDrone();
      playBell();
    }
  }
});

// Play/Pause Playback click
playbackToggle.addEventListener('click', () => {
  if (isPlaying) {
    pauseFilm();
  } else {
    resumeFilm();
  }
});

// Initialize on Load
initNavigation();
initParticles();
