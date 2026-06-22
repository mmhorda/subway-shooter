/*
 * config.js — Central configuration & global namespace
 * Subway Shooter — Stage 1
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
    airControl: 0.3
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
    zoomSpeed: 12 // lerp speed for FOV transition
  },

  // --- Performance ---
  perf: {
    maxDustParticles: 70,
    textureSize: 256
  }
};
