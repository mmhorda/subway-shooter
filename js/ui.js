/*
 * ui.js — User interface management
 * Handles: start screen, pause overlay, HUD, crosshair, debug info
 */

window.Game = window.Game || {};

Game.UI = (function() {

  var startScreen = null;
  var pauseScreen = null;
  var hud = null;
  var weaponNameEl = null;
  var ammoEl = null;
  var debugEl = null;
  var crosshair = null;

  var started = false;
  var paused = false;

  var init = function() {
    startScreen = document.getElementById('start-screen');
    pauseScreen = document.getElementById('pause-screen');
    hud = document.getElementById('hud');
    weaponNameEl = document.getElementById('weapon-name');
    ammoEl = document.getElementById('ammo-display');
    debugEl = document.getElementById('debug-info');
    crosshair = document.getElementById('crosshair');
  };

  var onStart = function(callback) {
    startScreen.addEventListener('click', function() {
      if (!started) {
        started = true;
        startScreen.classList.add('hidden');
        hud.classList.remove('hidden');
        callback();
      }
    });
  };

  var showPause = function() {
    paused = true;
    pauseScreen.classList.remove('hidden');
    hud.classList.add('hidden');
  };

  var hidePause = function() {
    paused = false;
    pauseScreen.classList.add('hidden');
    hud.classList.remove('hidden');
  };

  var onResume = function(callback) {
    pauseScreen.addEventListener('click', function() {
      if (paused) {
        hidePause();
        callback();
      }
    });
  };

  var isPaused = function() {
    return paused;
  };

  var hasStarted = function() {
    return started;
  };

  var updateWeapon = function(name, ammo) {
    if (weaponNameEl) weaponNameEl.textContent = name;
    if (ammoEl) ammoEl.textContent = 'AMMO: ' + ammo;
  };

  var updateDebug = function(fps, pos) {
    if (!debugEl) return;
    if (pos) {
      debugEl.textContent = 'FPS: ' + Math.round(fps) + ' | X:' + pos.x.toFixed(1) + ' Y:' + pos.y.toFixed(1) + ' Z:' + pos.z.toFixed(1);
    } else {
      debugEl.textContent = 'FPS: ' + Math.round(fps);
    }
  };

  var setCrosshairVisible = function(visible) {
    if (crosshair) {
      crosshair.style.display = visible ? 'block' : 'none';
    }
  };

  return {
    init: init,
    onStart: onStart,
    showPause: showPause,
    hidePause: hidePause,
    onResume: onResume,
    isPaused: isPaused,
    hasStarted: hasStarted,
    updateWeapon: updateWeapon,
    updateDebug: updateDebug,
    setCrosshairVisible: setCrosshairVisible
  };
})();
