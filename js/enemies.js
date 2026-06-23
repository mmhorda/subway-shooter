/*
 * enemies.js — Enemy spawning, AI, health, hitboxes
 * Uses shared geometry/materials for performance.
 * Maintains Game.Enemies.active list for raycast targeting.
 */

window.Game = window.Game || {};

Game.Enemies = (function() {
  var scene = null;
  var worldGroup = null;

  // Active enemy tracking (for raycasting)
  var active = [];       // {group, health, maxHealth, speed, lastAttack, hitFlash, healthBarFg, walkPhase}
  var hitboxMeshes = []; // flat list of meshes for raycasting

  // Shared geometry/materials
  var bodyGeo, headGeo, armGeo, legGeo;
  var bodyMat, headMat, accentMat, eyeMat, legMat;
  var healthBarBgMat, healthBarFgMat;
  var stripeGeo;

  // Spawn locations (computed from world data)
  var spawnLocations = [];

  function init(threeScene) {
    scene = threeScene;
    worldGroup = Game.World.getWorldGroup && Game.World.getWorldGroup();

    // Shared geometries
    bodyGeo = new THREE.CylinderGeometry(0.35, 0.3, 1.0, 8);
    headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
    legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.6, 6);
    stripeGeo = new THREE.CylinderGeometry(0.37, 0.32, 0.15, 8);

    // Shared materials
    bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b2520, emissive: 0x1a0500, shininess: 45, specular: 0x553322 });
    headMat = new THREE.MeshPhongMaterial({ color: 0x9f6a55, emissive: 0x120505, shininess: 28, specular: 0x442211 });
    accentMat = new THREE.MeshPhongMaterial({ color: 0xff5a1f, emissive: 0x551400, shininess: 80, specular: 0xffaa55 });
    eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a00 });
    legMat = new THREE.MeshPhongMaterial({ color: 0x17171a, shininess: 35, specular: 0x333333 });

    // Health bar materials
    healthBarBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    healthBarFgMat = new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide });

    // Compute spawn locations
    computeSpawnLocations();
  }

  function computeSpawnLocations() {
    var W = Game.Config.world;
    var pHalfL = W.platformLength / 2;
    var pHalfW = W.platformWidth / 2;
    var trackW = W.trackWidth;
    var platformH = W.platformHeight;

    // Train door positions (from world.js buildTrain)
    var trackCenterX = pHalfW + trackW / 2;
    var trainLen = pHalfL * 2;
    var doorCount = 5;
    var usableLen = trainLen - 12;
    var doorSpacing = usableLen / (doorCount - 1);
    var doorCenters = [];
    for (var dc = 0; dc < doorCount; dc++) {
      doorCenters.push(-usableLen / 2 + dc * doorSpacing);
    }

    // Spawn from train doors (platform side)
    for (var d = 0; d < doorCenters.length; d++) {
      spawnLocations.push({
        x: trackCenterX - 1.5,
        y: platformH,
        z: doorCenters[d],
        source: 'train'
      });
    }

    // Spawn only from train doors. Earlier versions also spawned at front/rear
    // stair exits, which made enemies appear outside the train pathing setup.
    // Keeping all spawns in the train preserves the intended behavior: train
    // walls block them except where open doors let them exit onto the platform.
  }

  // Shared eye geometry (small, reused)
  var eyeGeo = new THREE.SphereGeometry(0.05, 4, 4);
  // Shared health bar geometries
  var hbBgGeo = new THREE.PlaneGeometry(0.8, 0.08);
  var hbFgGeo = new THREE.PlaneGeometry(0.78, 0.06);

  function createEnemyMesh() {
    var group = new THREE.Group();

    // Body — shared material, no clone needed
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.userData.isEnemyPart = true;
    group.add(body);

    // Head — shared material
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.65;
    head.userData.isEnemyPart = true;
    group.add(head);

    // Eyes (glowing red) — shared geometry + material
    var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.7, -0.18);
    group.add(leftEye);
    var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 1.7, -0.18);
    group.add(rightEye);

    // Arms (forward-facing threat pose) — shared material
    var leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.45, 1.0, -0.15);
    leftArm.rotation.x = -0.5;
    leftArm.userData.isEnemyPart = true;
    group.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.45, 1.0, -0.15);
    rightArm.rotation.x = -0.5;
    rightArm.userData.isEnemyPart = true;
    group.add(rightArm);

    // Legs — shared material
    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.3, 0);
    leftLeg.userData.isEnemyPart = true;
    group.add(leftLeg);
    var rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.3, 0);
    rightLeg.userData.isEnemyPart = true;
    group.add(rightLeg);

    // Accent stripe on body
    var stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.position.y = 0.9;
    group.add(stripe);

    // Health bar background — shared geometry + material
    var hbBg = new THREE.Mesh(hbBgGeo, healthBarBgMat);
    hbBg.position.y = 2.0;
    hbBg.userData.isHealthBar = true;
    group.add(hbBg);

    // Health bar foreground — shared geometry + material
    var hbFg = new THREE.Mesh(hbFgGeo, healthBarFgMat);
    hbFg.position.y = 2.0;
    hbFg.position.z = -0.005;
    hbFg.userData.isHealthBar = true;
    hbFg.userData.isHealthBarFg = true;
    group.add(hbFg);

    // Collect hitbox meshes directly (no traverse)
    var meshes = [body, head, leftArm, rightArm, leftLeg, rightLeg];

    return { group: group, hitboxes: meshes, healthBarFg: hbFg, healthBarBg: hbBg };
  }

  function spawnEnemy(level) {
    if (active.length >= Game.Config.enemies.maxActive) return null;

    var E = Game.Config.enemies;
    var healthMult = Math.pow(E.levelHealthScale, Math.max(0, level - 1));
    var speedMult = Math.pow(E.levelSpeedScale, Math.max(0, level - 1));
    var health = Math.round(E.baseHealth * healthMult);
    var speed = Math.min(E.baseSpeed * speedMult, E.maxSpeed);

    // Pick a random spawn location
    var spawn = spawnLocations[Math.floor(Math.random() * spawnLocations.length)];

    var result = createEnemyMesh();
    var group = result.group;

    group.position.set(spawn.x, spawn.y, spawn.z);

    // Add to scene
    if (worldGroup) {
      worldGroup.add(group);
    } else {
      scene.add(group);
    }

    var enemy = {
      group: group,
      health: health,
      maxHealth: health,
      speed: speed,
      lastAttack: 0,
      hitFlash: 0,
      hitboxes: result.hitboxes,
      healthBarFg: result.healthBarFg,
      healthBarBg: result.healthBarBg,
      spawnSource: spawn.source,
      walkPhase: Math.random() * Math.PI * 2
    };

    active.push(enemy);

    // Register hitboxes
    for (var i = 0; i < result.hitboxes.length; i++) {
      result.hitboxes[i].userData.enemyRef = enemy;
      hitboxMeshes.push(result.hitboxes[i]);
    }

    updateHealthBar(enemy);

    return enemy;
  }

  function updateHealthBar(enemy) {
    var ratio = Math.max(0, enemy.health / enemy.maxHealth);
    if (enemy.healthBarFg) {
      enemy.healthBarFg.scale.x = ratio;
    }
  }

  function isUsableGroundY(y) {
    // Track bed is y=0 and must be valid for enemies so they can drop from
    // the platform to open rails. Solid train/world boxes still block movement
    // through resolveCircleBox; this only controls whether a floor height is
    // allowed after collision resolution.
    return y >= 0;
  }

  function getEnemyGroundHeight(x, z, currentY) {
    var normalGroundY = Game.Collision.getGroundHeight(x, z, currentY);
    var stepUpHeight = (Game.Config.enemies && Game.Config.enemies.stepUpHeight) || 1.45;
    var climbGroundY = Game.Collision.getGroundHeight(x, z, currentY + stepUpHeight);
    return Math.max(normalGroundY, climbGroundY);
  }

  function resolveEnemyMove(x, z, radius, currentY, assistX, assistZ) {
    var groundY = getEnemyGroundHeight(x, z, currentY);
    var W = Game.Config.world;
    var platformHalfW = W.platformWidth / 2;
    var platformHalfL = W.platformLength / 2;
    var maxStepUp = (Game.Config.enemies && Game.Config.enemies.stepUpHeight) || 1.45;

    // Enemy-only platform-edge climb. From rail bed the enemy center is outside
    // the platform, so ordinary floor sampling can never see the platform top.
    // If it is near the long platform edge and moving toward it, snap the target
    // just inside the edge at platform height, then resolve collision there.
    // Train walls/props still block because resolveCircleBox runs at platformY.
    if (currentY < W.platformHeight - 0.35 && Math.abs(z) <= platformHalfL + 0.2) {
      var edgeReach = radius + 1.15;
      var climbX = null;
      if (x < -platformHalfW && x >= -platformHalfW - edgeReach && (assistX || 0) > 0) {
        climbX = -platformHalfW + radius + 0.18;
      } else if (x > platformHalfW && x <= platformHalfW + edgeReach && (assistX || 0) < 0) {
        climbX = platformHalfW - radius - 0.18;
      }
      if (climbX !== null && W.platformHeight <= currentY + maxStepUp + 0.1) {
        var previousX = x - (assistX || 0);
        var maxClimbAdvance = 0.28;
        var deltaToClimb = climbX - previousX;
        if (Math.abs(deltaToClimb) > maxClimbAdvance) {
          x = previousX + Math.sign(deltaToClimb) * maxClimbAdvance;
        } else {
          x = climbX;
        }
        if (x >= -platformHalfW && x <= platformHalfW) {
          groundY = W.platformHeight;
        }
      }
    }

    // No generic ledge probe here: ramp/stair ground handles normal stairs.
    // Extra probing made enemies rocket/teleport up stair slopes.


    var collisionY = groundY > currentY ? groundY : currentY;
    var resolved = Game.Collision.resolveCircleBox(x, z, radius, collisionY);
    var resolvedGroundY = getEnemyGroundHeight(resolved.x, resolved.z, currentY);
    return {
      x: resolved.x,
      z: resolved.z,
      groundY: resolvedGroundY
    };
  }

  function update(dt) {
    var playerPos = Game.Player.getPosition();
    var playerX = playerPos.x;
    var playerZ = playerPos.z;

    var E = Game.Config.enemies;

    for (var i = active.length - 1; i >= 0; i--) {
      var enemy = active[i];
      if (enemy.health <= 0) continue;

      var group = enemy.group;
      var ex = group.position.x;
      var ez = group.position.z;

      // Hit flash decay — direct material reference, no traverse
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= dt;
        if (enemy.hitFlash <= 0) {
          for (var h = 0; h < enemy.hitboxes.length; h++) {
            var hm = enemy.hitboxes[h].material;
            if (hm.emissive) {
              hm.emissive.setHex(0x000000);
              hm.emissiveIntensity = 0;
            }
          }
        }
      }

      // Simple chase AI
      var dx = playerX - ex;
      var dz = playerZ - ez;
      var dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.5) {
        // Move toward player
        var mx = (dx / dist) * enemy.speed * dt;
        var mz = (dz / dist) * enemy.speed * dt;

        // Simple separation from other enemies
        for (var j = 0; j < active.length; j++) {
          if (i === j) continue;
          var other = active[j];
          if (other.health <= 0) continue;
          var ox = other.group.position.x;
          var oz = other.group.position.z;
          var sdx = ex - ox;
          var sdz = ez - oz;
          var sdist = Math.sqrt(sdx * sdx + sdz * sdz);
          if (sdist < E.separationDist && sdist > 0.01) {
            var force = E.separationForce * (1 - sdist / E.separationDist) * dt;
            mx += (sdx / sdist) * force;
            mz += (sdz / sdist) * force;
          }
        }

        // Try to move, resolving against the same solid box colliders used by
        // the player. Previously enemies only checked for floor height, so they
        // walked straight through benches, vending machines, booths, glass,
        // pillars, and other registered prop colliders.
        var enemyRadius = E.radius || 0.4;
        var move = resolveEnemyMove(ex + mx, ez + mz, enemyRadius, group.position.y, mx, mz);

        if (isUsableGroundY(move.groundY)) {
          group.position.x = move.x;
          group.position.z = move.z;
        } else {
          // Try X only, still respecting prop/world box collision and climb-up.
          var xMove = resolveEnemyMove(ex + mx, ez, enemyRadius, group.position.y, mx, 0);
          if (isUsableGroundY(xMove.groundY)) {
            group.position.x = xMove.x;
            group.position.z = xMove.z;
          } else {
            // Try Z only, still respecting prop/world box collision and climb-up.
            var zMove = resolveEnemyMove(ex, ez + mz, enemyRadius, group.position.y, 0, mz);
            if (isUsableGroundY(zMove.groundY)) {
              group.position.x = zMove.x;
              group.position.z = zMove.z;
            }
          }
        }

        // Keep on ground, with the same climb-up tolerance used for movement.
        group.position.y = getEnemyGroundHeight(group.position.x, group.position.z, group.position.y);
      }

      // Face player
      group.rotation.y = Math.atan2(dx, dz);

      // Walk bob
      enemy.walkPhase += dt * enemy.speed * 2;
      var bob = Math.sin(enemy.walkPhase) * 0.05;
      group.position.y += bob;

      // Health bar always faces camera (billboard) — direct reference, no traverse
      if (enemy.healthBarBg) {
        enemy.healthBarBg.lookAt(playerX, enemy.healthBarBg.getWorldPosition(new THREE.Vector3()).y, playerZ);
      }
      if (enemy.healthBarFg) {
        enemy.healthBarFg.lookAt(playerX, enemy.healthBarFg.getWorldPosition(new THREE.Vector3()).y, playerZ);
      }

      // Attack player only when actually close on the same vertical level.
      // The old check used X/Z distance only, so enemies directly below the
      // player could damage through the ceiling / upper floor.
      var dy = Math.abs((playerPos.y || 0) - group.position.y);
      var verticalAttackRange = E.verticalAttackRange || 0.35;
      var dist3D = Math.sqrt(dx * dx + dz * dz + dy * dy);
      if (dist3D < E.attackRange && dy <= verticalAttackRange) {
        var now = performance.now() / 1000;
        if (now - enemy.lastAttack > E.attackCooldown) {
          enemy.lastAttack = now;
          if (Game.Combat && Game.Combat.damagePlayer) {
            Game.Combat.damagePlayer(E.damage);
          }
        }
      }
    }
  }

  function getHitboxMeshes() {
    return hitboxMeshes;
  }

  function getActive() {
    return active;
  }

  function getSpawnLocations() {
    return spawnLocations;
  }

  function clearAll() {
    for (var i = active.length - 1; i >= 0; i--) {
      var enemy = active[i];
      if (enemy.group && enemy.group.parent) {
        enemy.group.parent.remove(enemy.group);
      }
      // No material disposal needed — all materials are shared
    }
    active = [];
    hitboxMeshes = [];
  }

  return {
    init: init,
    spawn: spawnEnemy,
    update: update,
    getHitboxMeshes: getHitboxMeshes,
    getActive: getActive,
    getSpawnLocations: getSpawnLocations,
    clearAll: clearAll
  };
})();
