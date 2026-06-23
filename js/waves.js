/*
 * waves.js — Wave system, level progression, spawn queuing
 */

window.Game = window.Game || {};

Game.Waves = (function() {
  var level = 1;
  var wave = 1;
  var waveActive = false;
  var enemiesRemaining = 0;
  var spawnQueue = [];
  var spawnTimer = 0;
  var countdownTimer = 0;
  var countdownActive = false;

  function init() {
    level = 1;
    wave = 1;
    waveActive = false;
    enemiesRemaining = 0;
    spawnQueue = [];
    spawnTimer = 0;
    countdownTimer = 0;
    countdownActive = true;

    startCountdown();
  }

  function reset() {
    level = 1;
    wave = 1;
    waveActive = false;
    enemiesRemaining = 0;
    spawnQueue = [];
    spawnTimer = 0;
    countdownTimer = 0;
    countdownActive = true;

    if (Game.Enemies && Game.Enemies.clearAll) Game.Enemies.clearAll();
    startCountdown();
  }

  function startCountdown() {
    countdownActive = true;
    countdownTimer = Game.Config.waves.countdownDuration;
    if (Game.UI && Game.UI.updateWaveInfo) {
      Game.UI.updateWaveInfo(level, wave, 0, 0, true);
    }
  }

  function startWave() {
    countdownActive = false;
    waveActive = true;

    var W = Game.Config.waves;
    var count = W.firstWaveCount + (wave - 1) * W.waveGrowth + (level - 1) * 2;
    spawnQueue = [];
    for (var i = 0; i < count; i++) {
      spawnQueue.push(i);
    }
    enemiesRemaining = count;
    spawnTimer = 0;

    if (Game.UI && Game.UI.updateWaveInfo) {
      Game.UI.updateWaveInfo(level, wave, enemiesRemaining, 0, false);
    }
  }

  function onEnemyKilled() {
    enemiesRemaining--;
    if (Game.UI && Game.UI.updateWaveInfo) {
      var active = Game.Enemies ? Game.Enemies.getActive().length : 0;
      Game.UI.updateWaveInfo(level, wave, enemiesRemaining, active, false);
    }

    // Check if wave is complete
    if (enemiesRemaining <= 0 && spawnQueue.length === 0) {
      completeWave();
    }
  }

  function completeWave() {
    waveActive = false;

    if (wave >= Game.Config.waves.wavesPerLevel) {
      // Level complete — next level
      level++;
      wave = 1;
    } else {
      wave++;
    }

    startCountdown();
  }

  function update(dt) {
    if (countdownActive) {
      countdownTimer -= dt;
      if (Game.UI && Game.UI.updateWaveInfo) {
        var secs = Math.ceil(countdownTimer);
        Game.UI.updateWaveInfo(level, wave, 0, 0, true, secs);
      }
      if (countdownTimer <= 0) {
        startWave();
      }
      return;
    }

    if (!waveActive) return;

    // Spawn from queue
    if (spawnQueue.length > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnQueue.pop();
        Game.Enemies.spawn(level);
        spawnTimer = Game.Config.waves.spawnInterval;

        if (Game.UI && Game.UI.updateWaveInfo) {
          var active = Game.Enemies.getActive().length;
          Game.UI.updateWaveInfo(level, wave, enemiesRemaining, active, false);
        }
      }
    }
  }

  function getLevel() { return level; }
  function getWave() { return wave; }
  function getEnemiesRemaining() { return enemiesRemaining; }
  function isCountdown() { return countdownActive; }

  return {
    init: init,
    reset: reset,
    update: update,
    onEnemyKilled: onEnemyKilled,
    getLevel: getLevel,
    getWave: getWave,
    getEnemiesRemaining: getEnemiesRemaining,
    isCountdown: isCountdown
  };
})();
