/*
 * player.js — First-person player controller
 * Handles: pointer-lock mouse look, WASD movement, jump, sprint, collision
 */

window.Game = window.Game || {};

Game.Player = (function() {

  var camera = null;
  var yaw = 0;
  var pitch = 0;
  var targetYaw = 0;
  var targetPitch = 0;

  // Position (feet level)
  var pos = { x: 0, y: 0, z: 0 };
  var vel = { x: 0, y: 0, z: 0 };

  var onGround = false;
  var isPaused = true;
  var isLocked = false;

  // Input state
  var keys = {};
  var mouseDX = 0;
  var mouseDY = 0;

  // Look sensitivity
  var sensitivity = 0.0022;
  var pitchLimit = Math.PI / 2 - 0.05;

  var init = function(threeCamera) {
    camera = threeCamera;

    var W = Game.Config.world;
    // Start on platform, center, near front
    pos.x = 0;
    pos.y = W.platformHeight;
    pos.z = W.platformLength * 0.3;
    vel.x = 0; vel.y = 0; vel.z = 0;
    yaw = 0; pitch = -0.18;
    targetYaw = 0; targetPitch = -0.18;

    updateCamera();
  };

  var setPaused = function(p) {
    isPaused = p;
  };

  var setLocked = function(l) {
    isLocked = l;
  };

  var isLocked_ = function() {
    return isLocked;
  };

  // --- Input handlers ---
  var onKeyDown = function(e) {
    keys[e.code] = true;
    // Prevent space scroll
    if (e.code === 'Space') e.preventDefault();
  };

  var onKeyUp = function(e) {
    keys[e.code] = false;
  };

  var onMouseMove = function(e) {
    if (!isLocked || isPaused) return;
    mouseDX += e.movementX || 0;
    mouseDY += e.movementY || 0;
  };

  // --- Update ---
  var update = function(dt) {
    if (isPaused || !isLocked) {
      // Still update camera even if paused, but don't process movement
      updateCamera();
      return;
    }

    var P = Game.Config.player;

    // --- Mouse look ---
    yaw -= mouseDX * sensitivity;
    pitch -= mouseDY * sensitivity;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
    mouseDX = 0;
    mouseDY = 0;

    // --- Movement ---
    var forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    var right = { x: Math.cos(yaw), z: -Math.sin(yaw) };

    var moveX = 0, moveZ = 0;

    if (keys['KeyW']) { moveX += forward.x; moveZ += forward.z; }
    if (keys['KeyS']) { moveX -= forward.x; moveZ -= forward.z; }
    if (keys['KeyD']) { moveX += right.x; moveZ += right.z; }
    if (keys['KeyA']) { moveX -= right.x; moveZ -= right.z; }

    // Normalize diagonal
    var moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 0) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    var speed = P.walkSpeed;
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      speed = P.sprintSpeed;
    }

    // Air control
    var control = onGround ? 1.0 : P.airControl;

    // Apply acceleration
    vel.x = moveX * speed * control + vel.x * (1 - control);
    vel.z = moveZ * speed * control + vel.z * (1 - control);

    // If on ground and no input, dampen
    if (onGround && moveLen === 0) {
      vel.x *= 0.8;
      vel.z *= 0.8;
    }

    // --- Jump ---
    if (keys['Space'] && onGround) {
      vel.y = P.jumpSpeed;
      onGround = false;
    }

    // --- Gravity ---
    vel.y -= P.gravity * dt;

    // --- Apply velocity with collision ---
    var newX = pos.x + vel.x * dt;
    var newZ = pos.z + vel.z * dt;
    var newY = pos.y + vel.y * dt;

    // Horizontal collision (use pos.y — player's current vertical level)
    var resolved = Game.Collision.resolveCircleBox(newX, newZ, P.radius, pos.y);
    newX = resolved.x;
    newZ = resolved.z;

    // Ground collision — use pos.y (previous frame Y) as reference for floor detection
    // This allows jumping up onto platform: when player rises above platformHeight,
    // the platform top becomes a valid floor
    var groundY = Game.Collision.getGroundHeight(newX, newZ, pos.y);

    if (newY <= groundY) {
      newY = groundY;
      vel.y = 0;
      onGround = true;
    } else {
      onGround = false;
    }

    // Check if standing on platform (need to also check if moving onto platform from track)
    // The platform is a raised box. If player is near platform edge and jumping,
    // getGroundHeight should return platform top if player is above it.

    pos.x = newX;
    pos.y = newY;
    pos.z = newZ;

    updateCamera();
  };

  var updateCamera = function() {
    var P = Game.Config.player;
    camera.position.set(pos.x, pos.y + P.height, pos.z);

    // Build rotation from yaw and pitch
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.rotation.z = 0;
  };

  var getPosition = function() {
    return { x: pos.x, y: pos.y, z: pos.z };
  };

  var getYaw = function() { return yaw; };
  var getPitch = function() { return pitch; };

  return {
    init: init,
    update: update,
    setPaused: setPaused,
    setLocked: setLocked,
    isLocked: isLocked_,
    onKeyDown: onKeyDown,
    onKeyUp: onKeyUp,
    onMouseMove: onMouseMove,
    getPosition: getPosition,
    getYaw: getYaw,
    getPitch: getPitch
  };
})();
