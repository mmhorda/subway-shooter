/*
 * combat.js — Hitscan shooting, ammo, knife melee, player health
 */

window.Game = window.Game || {};

Game.Combat = (function() {
  var raycaster = new THREE.Raycaster();
  var camera = null;
  var scene = null;

  // Player state
  var playerHealth = 100;
  var score = 0;
  var gameOver = false;

  // Knife state
  var knifeCooldown = 0;

  // Weapon ammo state (mirrors weapons.js but tracks real depletion)
  var ammoState = {
    rifle: { current: 30, reserve: 120, reloading: false },
    pistol: { current: 12, reserve: 48, reloading: false }
  };

  // Callbacks
  var onFire = null;     // called when player fires (weapon module handles muzzle flash etc)
  var onHit = null;      // called when a bullet hits something
  var onKnifeSwing = null;

  function init(threeCamera, threeScene) {
    camera = threeCamera;
    scene = threeScene;
    playerHealth = Game.Config.player.maxHealth;
    score = 0;
    gameOver = false;

    // Reset ammo
    var W = Game.Config.weapons;
    ammoState.rifle.current = W.rifle.ammo;
    ammoState.rifle.reserve = W.rifle.reserve;
    ammoState.pistol.current = W.pistol.ammo;
    ammoState.pistol.reserve = W.pistol.reserve;
  }

  function fire() {
    if (gameOver) return false;
    var weapon = Game.Weapons.getCurrentWeapon();
    var data = Game.Config.weapons[weapon];
    var ammo = ammoState[weapon];

    if (ammo.reloading) return false;
    if (ammo.current <= 0) {
      // Auto-reload if reserve available
      if (ammo.reserve > 0) reload();
      return false;
    }

    // Deplete ammo
    ammo.current--;

    // Fire weapon (muzzle flash, recoil)
    if (Game.Weapons && Game.Weapons.fire) Game.Weapons.fire();

    // Perform hitscan
    performHitscan(data);

    return true;
  }

  function performHitscan(weaponData) {
    // Direction from camera center (crosshair)
    var forward = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(forward);

    // Add spread
    var spread = weaponData.spread;
    forward.x += (Math.random() - 0.5) * spread;
    forward.y += (Math.random() - 0.5) * spread;
    forward.normalize();

    // Origin: camera position
    var origin = camera.position.clone();

    raycaster.set(origin, forward);
    raycaster.far = 200;

    // Check enemies first
    var enemyMeshes = Game.Enemies.getHitboxMeshes();
    var hits = raycaster.intersectObjects(enemyMeshes, false);
    if (hits.length > 0) {
      var hit = hits[0];
      var enemy = hit.object.userData.enemyRef;
      if (enemy && enemy.health > 0) {
        // Hit enemy — apply damage directly
        damageEnemyDirect(enemy, weaponData.damage);

        // Effects
        if (Game.Effects) {
          Game.Effects.addHitMarker();
          Game.Effects.addImpactSpark(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0));
          Game.Effects.addBulletTrace(origin, hit.point);
        }

        return;
      }
    }

    // No enemy hit — check environment for impact
    var shootable = Game.Weapons.getShootable ? Game.Weapons.getShootable() : [];
    var impactPoint = null;
    if (shootable.length > 0) {
      var envHits = raycaster.intersectObjects(shootable, false);
      if (envHits.length > 0) {
        impactPoint = envHits[0].point;
        var envNormal = envHits[0].face ? envHits[0].face.normal : new THREE.Vector3(0, 1, 0);
        if (Game.Effects) {
          Game.Effects.addImpactMark(impactPoint, envNormal);
        }
      }
    }

    // Bullet trace to impact point or max range
    if (Game.Effects) {
      if (impactPoint) {
        Game.Effects.addBulletTrace(origin, impactPoint);
      } else {
        var end = origin.clone().add(forward.clone().multiplyScalar(200));
        Game.Effects.addBulletTrace(origin, end);
      }
    }
  }

  function damageEnemyDirect(enemy, amount) {
    enemy.health -= amount;
    enemy.hitFlash = 0.15;

    // Flash — direct hitbox reference, no traverse
    for (var i = 0; i < enemy.hitboxes.length; i++) {
      var mat = enemy.hitboxes[i].material;
      if (mat.emissive) {
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 1;
      }
    }

    // Update health bar
    var ratio = Math.max(0, enemy.health / enemy.maxHealth);
    if (enemy.healthBarFg) {
      enemy.healthBarFg.scale.x = ratio;
    }

    if (enemy.health <= 0) {
      killEnemyDirect(enemy);
    }
  }

  function killEnemyDirect(enemy) {
    // Remove hitboxes
    var hb = Game.Enemies.getHitboxMeshes();
    for (var i = hb.length - 1; i >= 0; i--) {
      if (hb[i].userData.enemyRef === enemy) {
        hb.splice(i, 1);
      }
    }

    // Remove from active
    var active = Game.Enemies.getActive();
    for (var j = active.length - 1; j >= 0; j--) {
      if (active[j] === enemy) {
        active.splice(j, 1);
        break;
      }
    }

    // Death effect
    if (Game.Effects) {
      Game.Effects.addDeathEffect(enemy.group.position.clone());
    }

    // Remove mesh
    setTimeout(function() {
      if (enemy.group && enemy.group.parent) {
        enemy.group.parent.remove(enemy.group);
      }
      // No material disposal needed — all materials are shared
    }, 300);

    // Score
    score += 100;
    updateHUD();

    // Notify waves
    if (Game.Waves && Game.Waves.onEnemyKilled) {
      Game.Waves.onEnemyKilled();
    }
  }

  function knife() {
    if (gameOver || knifeCooldown > 0) return;
    knifeCooldown = Game.Config.weapons.knife.cooldown;

    // Swing animation
    if (Game.Weapons && Game.Weapons.knife) Game.Weapons.knife();

    // Check enemies in range
    var playerPos = Game.Player.getPosition();
    var forward = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(forward);

    var active = Game.Enemies.getActive();
    var knifeRange = Game.Config.weapons.knife.range;
    var knifeArc = Game.Config.weapons.knife.arc;
    var knifeDmg = Game.Config.weapons.knife.damage;

    for (var i = 0; i < active.length; i++) {
      var enemy = active[i];
      if (enemy.health <= 0) continue;

      var ex = enemy.group.position.x;
      var ez = enemy.group.position.z;
      var dx = ex - playerPos.x;
      var dz = ez - playerPos.z;
      var dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < knifeRange) {
        // Check angle
        var toEnemy = new THREE.Vector3(dx, 0, dz).normalize();
        var dot = forward.dot(toEnemy);
        if (dot > Math.cos(knifeArc)) {
          damageEnemyDirect(enemy, knifeDmg);
          if (Game.Effects) {
            Game.Effects.addKnifeSlash(new THREE.Vector3(ex, enemy.group.position.y + 1, ez));
          }
        }
      }
    }
  }

  function reload() {
    var weapon = Game.Weapons.getCurrentWeapon();
    var ammo = ammoState[weapon];
    var data = Game.Config.weapons[weapon];

    if (ammo.reloading || ammo.current >= data.maxAmmo || ammo.reserve <= 0) return;

    ammo.reloading = true;
    if (Game.Weapons && Game.Weapons.reload) Game.Weapons.reload();

    // After reload time, refill
    setTimeout(function() {
      var needed = data.maxAmmo - ammo.current;
      var take = Math.min(needed, ammo.reserve);
      ammo.current += take;
      ammo.reserve -= take;
      ammo.reloading = false;
      updateHUD();
    }, data.reloadTime * 1000);
  }

  function damagePlayer(amount) {
    if (gameOver) return;
    playerHealth -= amount;
    if (playerHealth < 0) playerHealth = 0;

    if (Game.Effects) Game.Effects.addDamageFlash();
    updateHUD();

    if (playerHealth <= 0) {
      triggerGameOver();
    }
  }

  function triggerGameOver() {
    gameOver = true;
    Game.Pickups.cancelOnEvent();
    if (Game.UI && Game.UI.showGameOver) {
      Game.UI.showGameOver(score);
    }
  }

  function restart() {
    playerHealth = Game.Config.player.maxHealth;
    score = 0;
    gameOver = false;

    var W = Game.Config.weapons;
    ammoState.rifle.current = W.rifle.ammo;
    ammoState.rifle.reserve = W.rifle.reserve;
    ammoState.rifle.reloading = false;
    ammoState.pistol.current = W.pistol.ammo;
    ammoState.pistol.reserve = W.pistol.reserve;
    ammoState.pistol.reloading = false;

    if (Game.Enemies && Game.Enemies.clearAll) Game.Enemies.clearAll();
    if (Game.Waves && Game.Waves.reset) Game.Waves.reset();

    updateHUD();
  }

  function update(dt) {
    if (knifeCooldown > 0) knifeCooldown -= dt;
  }

  function updateHUD() {
    if (!Game.UI) return;
    var weapon = Game.Weapons.getCurrentWeapon();
    var ammo = ammoState[weapon];
    var data = Game.Config.weapons[weapon];
    var ammoStr = ammo.current + ' / ' + ammo.reserve;
    if (ammo.reloading) ammoStr = 'RELOADING';

    Game.UI.updateWeapon(data.name, ammoStr);
    Game.UI.updateHealth(playerHealth, Game.Config.player.maxHealth);
    Game.UI.updateScore(score);
  }

  function getAmmo() { return ammoState; }
  function getPlayerHealth() { return playerHealth; }
  function getScore() { return score; }
  function isGameOver() { return gameOver; }

  return {
    init: init,
    fire: fire,
    knife: knife,
    reload: reload,
    damagePlayer: damagePlayer,
    restart: restart,
    update: update,
    updateHUD: updateHUD,
    getAmmo: getAmmo,
    getPlayerHealth: getPlayerHealth,
    getScore: getScore,
    isGameOver: isGameOver
  };
})();
