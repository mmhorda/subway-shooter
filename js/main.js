/*
 * main.js — Game initialization, input handling, main loop
 * Stage 2: combat, enemies, waves, effects
 */

window.Game = window.Game || {};

(function() {

  var renderer = null;
  var scene = null;
  var camera = null;
  var clock = null;
  var running = false;
  var fps = 60;
  var fpsAccum = 0;
  var fpsFrames = 0;

  var zoomActive = false;
  var currentFov = 90;

  // Combat input state
  var mouse1Down = false;
  var lastSemiShot = 0;

  function initRenderer() {
    var R = Game.Config.renderer;
    renderer = new THREE.WebGLRenderer({ antialias: R.antialias });
    renderer.setPixelRatio(R.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    document.getElementById('game-container').appendChild(renderer.domElement);
  }

  function initScene() {
    scene = new THREE.Scene();

    var R = Game.Config.renderer;
    camera = new THREE.PerspectiveCamera(R.fov, window.innerWidth / window.innerHeight, R.near, R.far);
    scene.add(camera); // Camera must be in scene for weapon children to render

    // Build world
    Game.World.build(scene);

    // Init player
    Game.Player.init(camera);

    // Init weapons (attaches weaponGroup to camera)
    Game.Weapons.init(camera);

    // Init enemies
    Game.Enemies.init(scene);

    // Init combat
    Game.Combat.init(camera, scene);

    // Init effects
    Game.Effects.init(scene);

    // Init waves
    Game.Waves.init();

    // Init pickups (vending machines, CABOOM, etc.)
    Game.Pickups.init(scene);

    // Lightweight debug handle for browser QA/dev inspection.
    Game.Debug = { scene: scene, camera: camera, renderer: renderer };
  }

  function initInput() {
    // --- Key events ---
    window.addEventListener('keydown', function(e) {
      if (!Game.UI.hasStarted()) return;
      Game.Player.onKeyDown(e);
      Game.Pickups.onKeyDown(e);

      // Weapon switch
      if (e.code === 'Digit1') Game.Weapons.switchTo('rifle');
      if (e.code === 'Digit2') Game.Weapons.switchTo('pistol');

      // Reload
      if (e.code === 'KeyR') Game.Combat.reload();
    });

    window.addEventListener('keyup', function(e) {
      Game.Player.onKeyUp(e);
      Game.Pickups.onKeyUp(e);
    });

    // --- Mouse move (pointer lock) ---
    document.addEventListener('mousemove', function(e) {
      Game.Player.onMouseMove(e);
    });

    // --- Mouse down ---
    document.addEventListener('mousedown', function(e) {
      if (!Game.UI.hasStarted() || Game.UI.isPaused()) return;

      switch(e.button) {
        case 0: // Left click — fire
          mouse1Down = true;
          Game.Combat.fire();
          break;
        case 1: // Middle click — knife
          Game.Combat.knife();
          e.preventDefault();
          break;
        case 2: // Right click — zoom
          zoomActive = true;
          e.preventDefault();
          break;
      }
    });

    document.addEventListener('mouseup', function(e) {
      if (e.button === 0) {
        mouse1Down = false;
      }
      if (e.button === 2) {
        zoomActive = false;
      }
    });

    // --- Mouse wheel — weapon switch ---
    document.addEventListener('wheel', function(e) {
      if (!Game.UI.hasStarted() || Game.UI.isPaused()) return;
      if (e.deltaY > 0) Game.Weapons.switchNext();
      else if (e.deltaY < 0) Game.Weapons.switchNext();
    });

    // --- Context menu prevention ---
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });

    // --- Middle-click autoscroll prevention ---
    document.addEventListener('auxclick', function(e) {
      if (e.button === 1) e.preventDefault();
    });

    document.addEventListener('mousedown', function(e) {
      if (e.button === 1) e.preventDefault();
    }, true);

    // --- Pointer lock ---
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mozpointerlockchange', onPointerLockChange);

    // --- Window resize ---
    window.addEventListener('resize', onResize);
  }

  function onPointerLockChange() {
    var locked = (document.pointerLockElement || document.mozPointerLockElement) === renderer.domElement;
    Game.Player.setLocked(locked);

    if (!locked && Game.UI.hasStarted()) {
      // Lost pointer lock — pause
      Game.UI.showPause();
      Game.Player.setPaused(true);
      Game.Pickups.cancelOnEvent();
    }
  }

  function requestLock() {
    renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || renderer.domElement.mozRequestPointerLock;
    renderer.domElement.requestPointerLock();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function startGame() {
    Game.Player.setPaused(false);
    Game.Player.setLocked(true);
    requestLock();
    running = true;
  }

  function resumeGame() {
    Game.Player.setPaused(false);
    requestLock();
    running = true;
  }

  function gameLoop() {
    requestAnimationFrame(gameLoop);

    var dt = Math.min(clock.getDelta(), 0.1); // Cap delta

    if (running && !Game.UI.isPaused() && !Game.Combat.isGameOver()) {
      // Update player
      Game.Player.update(dt);

      // Auto-fire for rifle while mouse1 held
      if (mouse1Down && Game.Weapons.getCurrentWeapon() === 'rifle') {
        var now = performance.now() / 1000;
        var fireRate = Game.Config.weapons.rifle.fireRate;
        if (now - lastSemiShot >= fireRate) {
          Game.Combat.fire();
          lastSemiShot = now;
        }
      }

      // Semi-auto pistol: only fires on press (handled in mousedown)
      // For semi-auto, track the last shot time to prevent rapid spam
      if (Game.Weapons.getCurrentWeapon() === 'pistol') {
        lastSemiShot = performance.now() / 1000;
      }

      // Update weapons
      Game.Weapons.update(dt);

      // Update combat
      Game.Combat.update(dt);

      // Update enemies
      Game.Enemies.update(dt);

      // Update waves
      Game.Waves.update(dt);

      // Update effects
      Game.Effects.update(dt);

      // Update pickups (vending machines, CABOOM, etc.)
      Game.Pickups.update(dt);

      // Update dust particles
      Game.World.updateDust(dt);

      // Zoom FOV transition
      var targetFov = zoomActive ? Game.Config.weapons.zoomFov : Game.Config.weapons.normalFov;
      currentFov += (targetFov - currentFov) * Math.min(1, dt * Game.Config.weapons.zoomSpeed);
      camera.fov = currentFov;
      camera.updateProjectionMatrix();
    }

    // FPS counter
    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      fps = fpsFrames / fpsAccum;
      fpsAccum = 0;
      fpsFrames = 0;
      var pos = Game.Player.getPosition();
      Game.UI.updateDebug(fps, pos);
    }

    renderer.render(scene, camera);
  }

  function main() {
    clock = new THREE.Clock();

    Game.UI.init();
    initRenderer();
    initScene();
    initInput();

    // Start screen handler
    Game.UI.onStart(function() {
      startGame();
    });

    // Resume handler
    Game.UI.onResume(function() {
      resumeGame();
    });

    // Restart handler
    Game.UI.onRestart(function() {
      Game.Combat.restart();
      Game.Pickups.reset();
      Game.Player.setPaused(false);
      Game.Player.setLocked(true);
      requestLock();
      running = true;
      Game.UI.hidePause();
      Game.Combat.updateHUD();
    });

    // Initial HUD update
    Game.Combat.updateHUD();

    // Start render loop
    gameLoop();
  }

  // Bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

})();
