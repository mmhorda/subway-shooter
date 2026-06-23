/*
 * ui.js — User interface management
 * Handles: start screen, pause overlay, HUD, crosshair, debug info, game over
 */

window.Game = window.Game || {};

Game.UI = (function() {

  var startScreen = null;
  var pauseScreen = null;
  var gameOverScreen = null;
  var hud = null;
  var weaponNameEl = null;
  var ammoEl = null;
  var debugEl = null;
  var crosshair = null;
  var healthBarEl = null;
  var healthTextEl = null;
  var scoreEl = null;
  var waveEl = null;
  var levelEl = null;
  var remainingEl = null;
  var restartBtn = null;

  var started = false;
  var paused = false;

  var init = function() {
    startScreen = document.getElementById('start-screen');
    pauseScreen = document.getElementById('pause-screen');
    gameOverScreen = document.getElementById('gameover-screen');
    hud = document.getElementById('hud');
    weaponNameEl = document.getElementById('weapon-name');
    ammoEl = document.getElementById('ammo-display');
    debugEl = document.getElementById('debug-info');
    crosshair = document.getElementById('crosshair');
    healthBarEl = document.getElementById('health-bar-fill');
    healthTextEl = document.getElementById('health-text');
    scoreEl = document.getElementById('score-display');
    waveEl = document.getElementById('wave-display');
    levelEl = document.getElementById('level-display');
    remainingEl = document.getElementById('remaining-display');
    restartBtn = document.getElementById('restart-btn');
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

  var updateHealth = function(current, max) {
    if (healthBarEl) {
      var pct = Math.max(0, (current / max) * 100);
      healthBarEl.style.width = pct + '%';
      if (pct > 60) healthBarEl.style.backgroundColor = '#44ff44';
      else if (pct > 30) healthBarEl.style.backgroundColor = '#ffaa00';
      else healthBarEl.style.backgroundColor = '#ff2222';
    }
    if (healthTextEl) {
      healthTextEl.textContent = Math.round(current) + ' / ' + max;
    }
  };

  var updateScore = function(val) {
    if (scoreEl) scoreEl.textContent = 'SCORE: ' + val;
  };

  var updateWaveInfo = function(lvl, wv, remaining, active, countdown, secs) {
    if (levelEl) levelEl.textContent = 'LEVEL ' + lvl;
    if (waveEl) {
      if (countdown) {
        waveEl.textContent = 'WAVE ' + wv + ' — ' + (secs || '...');
      } else {
        waveEl.textContent = 'WAVE ' + wv;
      }
    }
    if (remainingEl) {
      remainingEl.textContent = 'ENEMIES: ' + remaining;
    }
  };

  var updateDebug = function(fps, pos) {
    if (!debugEl) return;
    if (pos) {
      debugEl.textContent = 'FPS: ' + Math.round(fps) + ' | X:' + pos.x.toFixed(1) + ' Y:' + pos.y.toFixed(1) + ' Z:' + pos.z.toFixed(1);
    } else {
      debugEl.textContent = 'FPS: ' + Math.round(fps);
    }
  };

  var showGameOver = function(finalScore) {
    if (gameOverScreen) {
      gameOverScreen.classList.remove('hidden');
      var scoreFinal = document.getElementById('final-score');
      if (scoreFinal) scoreFinal.textContent = 'SCORE: ' + finalScore;
    }
  };

  var hideGameOver = function() {
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
  };

  var onRestart = function(callback) {
    if (restartBtn) {
      restartBtn.addEventListener('click', function() {
        hideGameOver();
        hud.classList.remove('hidden');
        callback();
      });
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
    setCrosshairVisible: setCrosshairVisible,
    updateHealth: updateHealth,
    updateScore: updateScore,
    updateWaveInfo: updateWaveInfo,
    showGameOver: showGameOver,
    hideGameOver: hideGameOver,
    onRestart: onRestart
  };
})();
