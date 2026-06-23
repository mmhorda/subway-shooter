/*
 * config.js — Central configuration & global namespace
 * Subway Shooter — Stage 2
 */

// Global namespace — all game modules attach to this
window.Game = window.Game || {};

Game.Config = {
  // --- Renderer ---
  renderer: {
    pixelRatio: 1,
    antialias: true,
    fov: 90,
    near: 0.05,
    far: 400
  },

  // --- Player physics ---
  player: {
    height: 1.7,
    radius: 0.35,
    walkSpeed: 6.5,
    sprintSpeed: 11,
    jumpSpeed: 7.5,
    gravity: 22,
    airControl: 0.3,
    maxHealth: 100,
    damageFlashDuration: 0.3
  },

  // --- World ---
  world: {
    // Platform is long along Z axis, wider along X
    platformLength: 80,    // Z extent (longer station)
    platformWidth: 14,     // X extent (4x wider than before)
    platformHeight: 1.2,   // Height of platform above track bed
    trackWidth: 5,         // Width of each track area (wider for bigger train)
    tunnelLength: 40,      // How far tunnels extend beyond station walls
    ceilingHeight: 8,      // Taller ceiling
    fogDensity: 0.010,
    fogColor: 0x242836
  },

  // --- Weapons ---
  weapons: {
    zoomFov: 45,
    normalFov: 90,
    zoomSpeed: 12, // lerp speed for FOV transition
    rifle: {
      name: 'ASSAULT RIFLE',
      ammo: 30,
      maxAmmo: 30,
      reserve: 120,
      fireRate: 0.10,   // seconds between shots (auto)
      damage: 18,
      spread: 0.015,
      reloadTime: 2.0,
      muzzlePos: { x: 0.15, y: -0.12, z: -0.95 }
    },
    pistol: {
      name: 'PISTOL',
      ammo: 12,
      maxAmmo: 12,
      reserve: 48,
      fireRate: 0.35,   // seconds between shots (semi-auto)
      damage: 35,
      spread: 0.008,
      reloadTime: 1.5,
      muzzlePos: { x: 0.08, y: -0.10, z: -0.45 }
    },
    knife: {
      damage: 45,
      range: 2.5,
      cooldown: 0.4,
      arc: Math.PI / 2
    }
  },

  // --- Enemies ---
  enemies: {
    baseHealth: 60,
    baseSpeed: 3.5,
    maxSpeed: 8.0,
    damage: 15,          // damage per hit on player
    attackCooldown: 1.0, // seconds between attacks on player
    attackRange: 1.5,    // distance to damage player
    radius: 0.4,
    stepUpHeight: 1.45,      // lets enemies climb from rails back onto platform/thresholds
    scale: 1.0,
    levelHealthScale: 1.15,   // health multiplier per level
    levelSpeedScale: 1.08,    // speed multiplier per level
    maxActive: 38,           // cap on live enemies
    separationDist: 1.0,     // minimum distance between enemies
    separationForce: 2.0     // force to push apart
  },

  // --- Waves ---
  waves: {
    wavesPerLevel: 8,
    firstWaveCount: 5,
    waveGrowth: 2,           // extra enemies per wave
    countdownDuration: 3.0,  // seconds between waves
    spawnInterval: 0.6       // seconds between individual spawns
  },


  // --- Vending machine pickups ---
  vending: {
    useDuration: 5.0,
    cooldown: 30.0,
    range: 3.5,
    pickupRadius: 1.1,
    healthAmount: 35,
    pickupLifetime: 25.0,
    caboomLifetime: 35.0,
    rewards: {
      healthChance: 0.50,
      ammoChance: 0.45,
      caboomChance: 0.05
    }
  },

  // --- Performance ---
  perf: {
    maxDustParticles: 70,
    textureSize: 256,
    maxTracers: 30,
    maxImpacts: 40,
    maxSparks: 25,
    maxDeathEffects: 10
  }
};
