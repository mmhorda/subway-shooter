/*
 * weapons.js — First-person weapon viewmodels
 * Creates two low-poly weapons (rifle + pistol), attaches to camera.
 * Handles: weapon switching, muzzle flash, recoil, reload placeholder, knife placeholder.
 */

window.Game = window.Game || {};

Game.Weapons = (function() {

  var camera = null;
  var weaponGroup = null;
  var sceneRef = null;
  var currentWeapon = 'rifle'; // 'rifle' or 'pistol'

  var rifleGroup = null;
  var pistolGroup = null;

  // Muzzle flash
  var muzzleFlash = null;
  var muzzleFlashTime = 0;
  var muzzleLight = null;

  // Bullet tracers — pooled meshes, shared geometry + material
  var bullets = [];     // active bullet data {mesh, vx, vy, vz, life}
  var bulletPool = [];  // unused meshes waiting to be reused
  var MAX_BULLETS = 30;
  var bulletGeo = null;
  var bulletMat = null; // single shared material for ALL bullets

  // Bullet impact marks — pooled meshes, shared material
  var marks = [];      // active mark data {mesh, life}
  var markPool = [];   // unused meshes waiting to be reused
  var MAX_MARKS = 40;
  var markGeo = null;
  var markMat = null;  // single shared material for ALL marks

  // Raycaster + shootable whitelist (only structural objects, no decor)
  var raycaster = null;
  var shootable = [];  // array of meshes that can be hit by bullets

  // Auto-fire
  var isFiring = false;
  var lastShotTime = 0;

  // Recoil
  var recoilOffset = 0;
  var recoilRotation = 0;

  // Reload animation
  var reloadTime = 0;
  var reloadDuration = 1.2;

  // Knife animation
  var knifeTime = 0;
  var knifeDuration = 0.5;

  // Weapon config
  var weaponData = {
    rifle: {
      name: 'ASSAULT RIFLE',
      ammo: 30,
      maxAmmo: 30,
      reserve: 90,
      muzzlePos: { x: 0.15, y: -0.12, z: -0.95 }
    },
    pistol: {
      name: 'PISTOL',
      ammo: 12,
      maxAmmo: 12,
      reserve: 48,
      muzzlePos: { x: 0.08, y: -0.10, z: -0.45 }
    }
  };

  var init = function(threeCamera) {
    camera = threeCamera;
    sceneRef = camera.parent; // camera is added to scene in main.js

    weaponGroup = new THREE.Group();
    camera.add(weaponGroup);

    // Build weapons
    rifleGroup = buildRifle();
    pistolGroup = buildPistol();

    weaponGroup.add(rifleGroup);
    weaponGroup.add(pistolGroup);

    // Muzzle flash sprite — small, tight
    var flashGeo = new THREE.SphereGeometry(0.06, 6, 5);
    var flashMat = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0
    });
    muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    weaponGroup.add(muzzleFlash);

    // Small point light for muzzle flash (no shadow)
    muzzleLight = new THREE.PointLight(0xffaa44, 0, 4, 2);
    muzzleLight.position.set(0.15, -0.12, -0.95);
    weaponGroup.add(muzzleLight);

    // Bullet geometry — simple box, 2 faces, minimal triangles
    bulletGeo = new THREE.BoxGeometry(0.02, 0.02, 0.3);
    // Single shared material — no per-bullet allocation
    bulletMat = new THREE.MeshBasicMaterial({
      color: 0xfff4b0,
      transparent: true,
      opacity: 0.9
    });

    // Bullet impact mark geometry (small flat circle)
    markGeo = new THREE.CircleGeometry(0.06, 6);
    // Single shared material for all marks
    markMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      side: THREE.DoubleSide
    });

    raycaster = new THREE.Raycaster();

    // Build shootable whitelist — only structural surfaces, skip decor
    buildShootableList();

    // Start with rifle
    showWeapon('rifle');
  };

  // --- Build Assault Rifle ---
  function buildRifle() {
    var group = new THREE.Group();
    var mat = new THREE.MeshPhongMaterial({ color: 0x2a2a30, shininess: 40, specular: 0x111111 });
    var mat2 = new THREE.MeshPhongMaterial({ color: 0x1a1a1e, shininess: 50, specular: 0x222222 });
    var matGrip = new THREE.MeshPhongMaterial({ color: 0x0f0f12, shininess: 20 });

    // Main body
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.7), mat);
    body.position.set(0, 0, 0);
    group.add(body);

    // Barrel
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), mat2);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.5);
    group.add(barrel);

    // Front sight
    var sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), mat2);
    sight.position.set(0, 0.08, -0.6);
    group.add(sight);

    // Rear sight
    var rsight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), mat2);
    rsight.position.set(0, 0.08, 0.25);
    group.add(rsight);

    // Magazine (curved look using box)
    var mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.1), mat2);
    mag.position.set(0, -0.15, -0.05);
    mag.rotation.x = 0.15;
    group.add(mag);

    // Grip
    var grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), matGrip);
    grip.position.set(0, -0.12, 0.2);
    grip.rotation.x = -0.3;
    group.add(grip);

    // Stock
    var stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.2), matGrip);
    stock.position.set(0, -0.02, 0.45);
    group.add(stock);

    // Stock connection
    var stockConn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), mat);
    stockConn.position.set(0, 0, 0.35);
    group.add(stockConn);

    // Hands guard
    var handGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), mat2);
    handGuard.rotation.x = Math.PI / 2;
    handGuard.position.set(0, -0.04, -0.25);
    group.add(handGuard);

    // Position the rifle in lower-right view
    group.position.set(0.18, -0.18, -0.3);
    group.rotation.y = -0.05;

    return group;
  }

  // --- Build Pistol ---
  function buildPistol() {
    var group = new THREE.Group();
    var mat = new THREE.MeshPhongMaterial({ color: 0x1a1a20, shininess: 60, specular: 0x333333 });
    var matGrip = new THREE.MeshPhongMaterial({ color: 0x0a0a0c, shininess: 30 });

    // Slide/body
    var slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.3), mat);
    slide.position.set(0, 0, -0.05);
    group.add(slide);

    // Barrel tip
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.22);
    group.add(barrel);

    // Grip
    var grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.07), matGrip);
    grip.position.set(0, -0.1, 0.08);
    grip.rotation.x = -0.2;
    group.add(grip);

    // Trigger guard
    var guardGeo = new THREE.TorusGeometry(0.03, 0.008, 4, 8);
    var guard = new THREE.Mesh(guardGeo, mat);
    guard.position.set(0, -0.05, 0.02);
    guard.rotation.x = Math.PI / 2;
    group.add(guard);

    // Sights
    var frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.01), mat);
    frontSight.position.set(0, 0.05, -0.18);
    group.add(frontSight);

    var rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), mat);
    rearSight.position.set(0, 0.05, 0.08);
    group.add(rearSight);

    // Position pistol in lower-right view
    group.position.set(0.15, -0.16, -0.25);
    group.rotation.y = -0.05;

    return group;
  }

  // --- Build shootable whitelist ---
  // Only structural surfaces that should show bullet impacts.
  // Skips: weapons, bullets, marks, dust, lights, signs, posters,
  // vending machines, trash bins, benches, help booth, decorative trim.
  function buildShootableList() {
    if (!sceneRef) return;
    shootable = [];

    // Get the world group (first child of scene that is a Group)
    var worldGrp = Game.World.getWorldGroup && Game.World.getWorldGroup();
    if (!worldGrp) return;

    // Tag all world meshes; we'll filter by userData
    var children = worldGrp.children;
    for (var i = 0; i < children.length; i++) {
      var obj = children[i];
      // Only add Mesh objects (skip Groups, Lights, etc.)
      if (obj.isMesh) {
        // Skip objects that are clearly decorative by checking material color
        // or by explicit userData flags we'll set in world.js
        // For now: include everything in worldGroup EXCEPT known decor
        // We use a whitelist approach: include structural surfaces
        var mat = obj.material;
        if (!mat) continue;

        // Skip very bright objects (lights, lamps, signage)
        var c = mat.color;
        if (c) {
          var brightness = (c.r + c.g + c.b) / 3;
          if (brightness > 0.95) continue; // lamps, lights
        }

        // Skip transparent objects (glass walls)
        if (mat.transparent && mat.opacity < 0.5) continue;

        // Skip bullet marks
        if (obj.userData.isBulletMark) continue;

        shootable.push(obj);
      }
    }
  }

  // --- Weapon switching ---
  function showWeapon(name) {
    currentWeapon = name;
    if (rifleGroup) rifleGroup.visible = (name === 'rifle');
    if (pistolGroup) pistolGroup.visible = (name === 'pistol');

    // Update muzzle position
    var data = weaponData[name];
    if (muzzleFlash) {
      muzzleFlash.position.set(data.muzzlePos.x, data.muzzlePos.y, data.muzzlePos.z);
    }
    if (muzzleLight) {
      muzzleLight.position.set(data.muzzlePos.x, data.muzzlePos.y, data.muzzlePos.z);
    }

    // Update HUD
    if (Game.UI) Game.UI.updateWeapon(data.name, data.ammo + ' / ' + data.reserve);
  }

  function switchTo(name) {
    if (!weaponData[name]) return;
    showWeapon(name);
  }

  function switchNext() {
    if (currentWeapon === 'rifle') switchTo('pistol');
    else switchTo('rifle');
  }

  // --- Fire (muzzle flash + recoil + bullet tracer) ---
  function fire() {
    if (reloadTime > 0 || knifeTime > 0) return;

    var data = weaponData[currentWeapon];
    muzzleFlashTime = 0.08; // 80ms flash
    recoilOffset = currentWeapon === 'rifle' ? 0.04 : 0.025;
    recoilRotation = currentWeapon === 'rifle' ? 0.06 : 0.04;

    // Spawn a bullet tracer and check for impact
    spawnBullet(data.muzzlePos);
  };

  // --- Start/stop continuous fire (for auto-fire) ---
  function startFire() {
    isFiring = true;
    fire(); // fire immediately on press
    lastShotTime = performance.now() / 1000;
  }

  function stopFire() {
    isFiring = false;
  }

  // --- Spawn a visible bullet tracer from the muzzle + raycast for impact ---
  function spawnBullet(muzzlePos) {
    if (!sceneRef || !bulletGeo || !bulletMat) return;

    // Get muzzle world position
    var muzzleLocal = new THREE.Vector3(muzzlePos.x, muzzlePos.y, muzzlePos.z);
    var muzzleWorld = muzzleLocal.clone();
    weaponGroup.localToWorld(muzzleWorld);

    // Get camera forward direction (where the player is aiming)
    var forward = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(forward);

    // Slight spread for visual realism
    var spread = currentWeapon === 'rifle' ? 0.012 : 0.02;
    forward.x += (Math.random() - 0.5) * spread;
    forward.y += (Math.random() - 0.5) * spread;
    forward.normalize();

    // Bullet speed (world units per second) — store as components, no Vector3
    var speed = 60;
    var vx = forward.x * speed;
    var vy = forward.y * speed;
    var vz = forward.z * speed;

    // Reuse from pool or create new (cap at MAX_BULLETS)
    var mesh;
    if (bulletPool.length > 0) {
      mesh = bulletPool.pop();
      mesh.visible = true;
    } else if (bullets.length >= MAX_BULLETS) {
      // Recycle oldest bullet
      var old = bullets.shift();
      sceneRef.remove(old.mesh);
      mesh = old.mesh;
      mesh.visible = true;
    } else {
      // Create new mesh with shared material
      mesh = new THREE.Mesh(bulletGeo, bulletMat);
      sceneRef.add(mesh);
    }

    mesh.position.copy(muzzleWorld);

    bullets.push({
      mesh: mesh,
      vx: vx,
      vy: vy,
      vz: vz,
      life: 0.5 // bullet visible for 500ms
    });

    // Raycast for impact mark
    castImpact(muzzleWorld, forward);
  }

  // --- Raycast and place a bullet mark on the first surface hit ---
  function castImpact(origin, direction) {
    if (!raycaster || !markGeo || !shootable.length) return;

    raycaster.set(origin, direction);
    raycaster.far = 200; // generous range
    var hits = raycaster.intersectObjects(shootable, false);

    for (var i = 0; i < hits.length; i++) {
      var hit = hits[i];

      // Skip the weapon group and bullets themselves
      if (hit.object === muzzleFlash) continue;
      var parent = hit.object.parent;
      var isWeapon = false;
      while (parent) {
        if (parent === weaponGroup) { isWeapon = true; break; }
        parent = parent.parent;
      }
      if (isWeapon) continue;

      // Also skip existing bullet marks
      if (hit.object.userData.isBulletMark) continue;

      // Found a real surface — place the mark
      placeMark(hit.point, hit.face.normal, hit.object);
      return; // only first surface
    }
  }

  // --- Place a bullet impact decal ---
  function placeMark(point, normal, hitObject) {
    // Cap marks — recycle from pool
    var mesh;
    if (markPool.length > 0) {
      mesh = markPool.pop();
      mesh.visible = true;
    } else if (marks.length >= MAX_MARKS) {
      // Recycle oldest mark
      var old = marks.shift();
      sceneRef.remove(old.mesh);
      mesh = old.mesh;
      mesh.visible = true;
    } else {
      // Create new mesh with shared material
      mesh = new THREE.Mesh(markGeo, markMat);
      sceneRef.add(mesh);
    }

    mesh.position.copy(point);

    // Offset slightly off the surface to avoid z-fighting
    var n = normal.clone();
    if (hitObject) {
      // Transform normal to world space if needed
      var worldNormal = normal.clone();
      if (hitObject.parent) {
        hitObject.localToWorld(worldNormal.add(new THREE.Vector3()));
        worldNormal.sub(hitObject.getWorldPosition(new THREE.Vector3()));
      }
      n = worldNormal.normalize();
    }
    mesh.position.add(n.multiplyScalar(0.01));

    // Orient flat against surface
    mesh.lookAt(point.clone().add(n));

    mesh.userData.isBulletMark = true;

    marks.push({
      mesh: mesh,
      life: 8.0 // 8 seconds (reduced from 10)
    });
  }

  // --- Reload placeholder ---
  function reload() {
    if (reloadTime > 0) return;
    reloadTime = reloadDuration;
  }

  // --- Knife slash placeholder ---
  function knife() {
    if (knifeTime > 0) return;
    knifeTime = knifeDuration;
  }

  // --- Update weapons (called every frame) ---
  function update(dt) {
    // Muzzle flash decay — small, quick
    if (muzzleFlashTime > 0) {
      muzzleFlashTime -= dt;
      var t = Math.max(0, muzzleFlashTime / 0.08);
      muzzleFlash.material.opacity = t * 0.85;
      muzzleFlash.scale.setScalar(1.0 + (1 - t) * 0.4);
      muzzleLight.intensity = t * 1.2;
    } else {
      muzzleFlash.material.opacity = 0;
      muzzleLight.intensity = 0;
    }

    // Update bullet tracers — zero allocations, component math
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.life -= dt;
      // Fade out in the last 0.15s — update shared material opacity
      if (b.life < 0.15) {
        bulletMat.opacity = Math.max(0, b.life / 0.15) * 0.9;
      } else {
        bulletMat.opacity = 0.9;
      }
      if (b.life <= 0) {
        b.mesh.visible = false;
        bulletPool.push(b.mesh);
        bullets.splice(i, 1);
      }
    }

    // Update bullet impact marks — fade via shared material
    for (var mi = marks.length - 1; mi >= 0; mi--) {
      var mk = marks[mi];
      mk.life -= dt;
      if (mk.life <= 0) {
        mk.mesh.visible = false;
        markPool.push(mk.mesh);
        marks.splice(mi, 1);
      }
    }

    // Auto-fire for rifle
    if (isFiring && currentWeapon === 'rifle') {
      var now = performance.now() / 1000;
      var fireRate = 0.1; // 10 rounds per second
      if (now - lastShotTime >= fireRate) {
        fire();
        lastShotTime = now;
      }
    }

    // Recoil decay
    recoilOffset *= 0.85;
    recoilRotation *= 0.85;

    // Reload animation
    var reloadOffset = 0;
    var reloadRot = 0;
    if (reloadTime > 0) {
      reloadTime -= dt;
      var rProgress = 1 - (reloadTime / reloadDuration);
      // Dip down and come back
      reloadOffset = -Math.sin(rProgress * Math.PI) * 0.08;
      reloadRot = Math.sin(rProgress * Math.PI) * 0.3;
      if (reloadTime <= 0) {
        reloadTime = 0;
        // Refill ammo for placeholder
        var data = weaponData[currentWeapon];
        if (data.ammo < data.maxAmmo && data.reserve > 0) {
          var needed = data.maxAmmo - data.ammo;
          var take = Math.min(needed, data.reserve);
          data.ammo += take;
          data.reserve -= take;
          Game.UI.updateWeapon(data.name, data.ammo + ' / ' + data.reserve);
        }
      }
    }

    // Knife animation
    var knifeOffset = 0;
    var knifeRot = 0;
    if (knifeTime > 0) {
      knifeTime -= dt;
      var kProgress = 1 - (knifeTime / knifeDuration);
      knifeOffset = Math.sin(kProgress * Math.PI) * 0.15;
      knifeRot = Math.sin(kProgress * Math.PI) * -0.5;
      if (knifeTime <= 0) knifeTime = 0;
    }

    // Apply transforms to active weapon
    var activeGroup = currentWeapon === 'rifle' ? rifleGroup : pistolGroup;
    if (activeGroup) {
      var baseX = currentWeapon === 'rifle' ? 0.18 : 0.15;
      var baseY = currentWeapon === 'rifle' ? -0.18 : -0.16;
      var baseZ = currentWeapon === 'rifle' ? -0.3 : -0.25;

      activeGroup.position.set(
        baseX,
        baseY + recoilOffset + reloadOffset + knifeOffset,
        baseZ + recoilOffset
      );
      activeGroup.rotation.x = -recoilRotation + reloadRot + knifeRot;
    }
  }

  function getCurrentWeapon() {
    return currentWeapon;
  }

  function getData() {
    return weaponData[currentWeapon];
  }

  function getShootable() {
    return shootable;
  }

  function addImpactMark(point, normal) {
    placeMark(point, normal, null);
  }

  return {
    init: init,
    update: update,
    switchTo: switchTo,
    switchNext: switchNext,
    fire: fire,
    startFire: startFire,
    stopFire: stopFire,
    reload: reload,
    knife: knife,
    getCurrentWeapon: getCurrentWeapon,
    getData: getData,
    getWeaponGroup: function() { return weaponGroup; },
    getShootable: getShootable,
    addImpactMark: addImpactMark
  };
})();
