/*
 * pickups.js — Vending-machine pickups and CABOOM power-up
 * Subway Shooter — Stage 4
 */

window.Game = window.Game || {};

Game.Pickups = (function() {
  var scene = null;
  var raycaster = new THREE.Raycaster();
  var vendingMachines = [];
  var pickups = [];
  var eKeyHeld = false;
  var interacting = null;
  var interactionProgress = 0;
  var promptEl = null;
  var progressBarEl = null;
  var progressEl = null;
  var notificationsEl = null;
  var caboomFlashEl = null;
  var caboomFlashTime = 0;
  var caboomRing = null;
  var caboomRingLife = 0;
  var notifications = [];

  var medkitGeo, ammoGeo, caboomGeo, glowGeo, ringGeo;
  var healthMat, ammoMat, caboomMat, glowHealthMat, glowAmmoMat, glowCaboomMat, ringMat;

  function cfg() {
    return Game.Config.vending || {
      useDuration: 5, cooldown: 30, range: 3, pickupRadius: 1.1,
      healthAmount: 35, pickupLifetime: 25, caboomLifetime: 35,
      rewards: { healthChance: 0.50, ammoChance: 0.45, caboomChance: 0.05 }
    };
  }

  function init(threeScene) {
    scene = threeScene;
    promptEl = document.getElementById('vending-prompt');
    progressBarEl = document.getElementById('vending-progress-bar');
    progressEl = document.getElementById('vending-progress');
    notificationsEl = document.getElementById('pickup-notifications');
    caboomFlashEl = document.getElementById('caboom-flash');

    medkitGeo = new THREE.BoxGeometry(0.55, 0.25, 0.38);
    ammoGeo = new THREE.BoxGeometry(0.48, 0.32, 0.32);
    caboomGeo = new THREE.SphereGeometry(0.33, 16, 12);
    glowGeo = new THREE.SphereGeometry(0.7, 16, 12);
    ringGeo = new THREE.RingGeometry(0.2, 0.28, 48);

    healthMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x661111, emissiveIntensity: 0.5 });
    ammoMat = new THREE.MeshLambertMaterial({ color: 0x3b7cff, emissive: 0x062050, emissiveIntensity: 0.45 });
    caboomMat = new THREE.MeshBasicMaterial({ color: 0xff7a00 });
    glowHealthMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.28 });
    glowAmmoMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.25 });
    glowCaboomMat = new THREE.MeshBasicMaterial({ color: 0xffb000, transparent: true, opacity: 0.4 });
    ringMat = new THREE.MeshBasicMaterial({ color: 0xff8a00, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  }

  function registerVendingMachine(mesh, x, y, z, glowMesh) {
    var entry = {
      mesh: mesh,
      position: new THREE.Vector3(x, y, z),
      cooldown: 0,
      available: true,
      dispenseFlash: 0,
      glowMesh: glowMesh || null
    };
    vendingMachines.push(entry);
    Game.vendingMachines = vendingMachines;
    return entry;
  }

  function onKeyDown(e) {
    if (e.code === 'KeyE') {
      eKeyHeld = true;
      if (e.preventDefault) e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'KeyE') {
      eKeyHeld = false;
      cancelInteraction();
      if (e.preventDefault) e.preventDefault();
    }
  }

  function findTargetVending() {
    if (!Game.Player || !Game.Debug || !Game.Debug.camera) return null;
    if (Game.UI && (!Game.UI.hasStarted() || Game.UI.isPaused())) return null;
    if (Game.Combat && Game.Combat.isGameOver && Game.Combat.isGameOver()) return null;

    var V = cfg();
    var playerPos = Game.Player.getPosition();
    var camera = Game.Debug.camera;
    var origin = camera.position.clone();
    var forward = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(forward);
    forward.normalize();

    // First try the exact crosshair raycast. This keeps the interaction feeling
    // intentional when the player is aiming directly at the machine.
    raycaster.set(origin, forward);
    raycaster.far = V.range + 2.0;

    var meshes = [];
    for (var i = 0; i < vendingMachines.length; i++) {
      if (vendingMachines[i].mesh) meshes.push(vendingMachines[i].mesh);
    }

    var hits = meshes.length ? raycaster.intersectObjects(meshes, true) : [];
    if (hits.length) {
      var hitObj = hits[0].object;
      for (var j = 0; j < vendingMachines.length; j++) {
        var vm = vendingMachines[j];
        var obj = hitObj;
        while (obj) {
          if (obj === vm.mesh) {
            var dx = playerPos.x - vm.position.x;
            var dz = playerPos.z - vm.position.z;
            if (Math.sqrt(dx * dx + dz * dz) <= V.range) return vm;
            return null;
          }
          obj = obj.parent;
        }
      }
    }

    // Forgiving fallback: require proximity plus a forward-facing cone aimed at
    // the machine center. This fixes the "I am standing at the vending machine
    // holding E and nothing happens" failure caused by tiny mesh/raycast misses.
    var best = null;
    var bestDot = 0;
    var minDot = Math.cos(THREE.MathUtils.degToRad(32));
    for (var k = 0; k < vendingMachines.length; k++) {
      var candidate = vendingMachines[k];
      var cx = candidate.position.x - playerPos.x;
      var cz = candidate.position.z - playerPos.z;
      var dist = Math.sqrt(cx * cx + cz * cz);
      if (dist > V.range) continue;

      var toMachine = new THREE.Vector3(
        candidate.position.x - origin.x,
        (candidate.position.y + 0.2) - origin.y,
        candidate.position.z - origin.z
      ).normalize();
      var dot = forward.dot(toMachine);
      if (dot > minDot && dot > bestDot) {
        best = candidate;
        bestDot = dot;
      }
    }
    return best;
  }

  function chooseReward() {
    var r = Math.random();
    var R = cfg().rewards;
    if (r < R.healthChance) return 'health';
    if (r < R.healthChance + R.ammoChance) return 'ammo';
    return 'caboom';
  }

  function dispenseReward(vm) {
    var V = cfg();
    var type = chooseReward();
    var forward = new THREE.Vector3(0, 0, 1).applyQuaternion(vm.mesh.quaternion).normalize();
    var pos = vm.position.clone().add(forward.multiplyScalar(1.25));
    pos.y = Game.Config.world.platformHeight + 0.1;
    spawnPickup(type, pos);
    vm.cooldown = V.cooldown;
    vm.available = false;
    vm.dispenseFlash = 0.5;
    showNotification(type === 'caboom' ? 'CABOOM READY!' : type === 'health' ? 'Health Dispensed' : 'Ammo Dispensed', type);
    cancelInteraction();
  }

  function spawnPickup(type, pos) {
    if (!scene) return;
    var V = cfg();
    var mat = type === 'health' ? healthMat : type === 'ammo' ? ammoMat : caboomMat;
    var geo = type === 'health' ? medkitGeo : type === 'ammo' ? ammoGeo : caboomGeo;
    var glowMat = type === 'health' ? glowHealthMat : type === 'ammo' ? glowAmmoMat : glowCaboomMat;
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + 0.4, pos.z);
    mesh.userData.pickupType = type;
    scene.add(mesh);

    if (type === 'health') {
      var crossGeo = new THREE.BoxGeometry(0.12, 0.03, 0.5);
      var crossMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      var c1 = new THREE.Mesh(crossGeo, crossMat);
      var c2 = new THREE.Mesh(crossGeo, crossMat);
      c2.rotation.y = Math.PI / 2;
      c1.position.y = 0.14;
      c2.position.y = 0.145;
      mesh.add(c1); mesh.add(c2);
    }

    var glow = new THREE.Mesh(glowGeo, glowMat.clone());
    glow.position.copy(mesh.position);
    scene.add(glow);

    pickups.push({
      type: type,
      mesh: mesh,
      glowMesh: glow,
      position: pos.clone(),
      lifetime: type === 'caboom' ? V.caboomLifetime : V.pickupLifetime,
      bobPhase: Math.random() * Math.PI * 2
    });
    Game.pickups = pickups;
  }

  function collectPickup(p) {
    if (!Game.Player || !Game.Combat) return false;
    var V = cfg();
    var pp = Game.Player.getPosition();
    var dx = pp.x - p.position.x;
    var dz = pp.z - p.position.z;
    if (Math.sqrt(dx * dx + dz * dz) > V.pickupRadius) return false;

    if (p.type === 'health') {
      var healed = Game.Combat.healPlayer ? Game.Combat.healPlayer(V.healthAmount) : 0;
      showNotification('+' + Math.round(healed || V.healthAmount) + ' Health', 'health');
    } else if (p.type === 'ammo') {
      if (Game.Combat.refillAmmo) Game.Combat.refillAmmo();
      showNotification('Ammo Refilled', 'ammo');
    } else if (p.type === 'caboom') {
      triggerCaboom();
      showNotification('CABOOM!', 'caboom');
    }

    removePickup(p);
    return true;
  }

  function removePickup(p) {
    if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh);
    if (p.glowMesh && p.glowMesh.parent) p.glowMesh.parent.remove(p.glowMesh);
    var idx = pickups.indexOf(p);
    if (idx >= 0) pickups.splice(idx, 1);
  }

  function triggerCaboom() {
    if (!scene || !Game.Enemies || !Game.Combat) return;
    var playerPos = Game.Player.getPosition();
    var center = new THREE.Vector3(playerPos.x, Game.Config.world.platformHeight + 0.08, playerPos.z);

    caboomRing = new THREE.Mesh(ringGeo, ringMat.clone());
    caboomRing.rotation.x = -Math.PI / 2;
    caboomRing.position.copy(center);
    scene.add(caboomRing);
    caboomRingLife = 1.0;

    caboomFlashTime = 0.25;
    if (caboomFlashEl) caboomFlashEl.classList.add('active');

    var active = Game.Enemies.getActive().slice();
    for (var i = 0; i < active.length; i++) {
      if (Game.Combat.killEnemy) Game.Combat.killEnemy(active[i]);
    }
  }

  function showNotification(text, type) {
    if (!notificationsEl) return;
    var el = document.createElement('div');
    el.className = 'pickup-notification';
    el.textContent = text;
    el.style.color = type === 'health' ? '#ff5555' : type === 'ammo' ? '#66bbff' : '#ffb000';
    notificationsEl.appendChild(el);
    notifications.push({ element: el, life: 3.0 });
  }

  function cancelInteraction() {
    interacting = null;
    interactionProgress = 0;
  }

  function updateInteractionUI() {
    if (!promptEl || !progressBarEl || !progressEl) return;
    var V = cfg();
    var target = interacting || findTargetVending();
    if (!target) {
      promptEl.style.opacity = 0;
      progressBarEl.style.display = 'none';
      progressEl.style.width = '0%';
      return;
    }

    promptEl.style.opacity = 1;
    if (interacting) {
      promptEl.textContent = 'Dispensing... ' + interactionProgress.toFixed(1) + ' / ' + V.useDuration.toFixed(1) + 's';
      progressBarEl.style.display = 'block';
      progressEl.style.width = Math.min(100, (interactionProgress / V.useDuration) * 100) + '%';
    } else if (target.available) {
      promptEl.textContent = 'Hold E to use vending machine';
      progressBarEl.style.display = 'none';
      progressEl.style.width = '0%';
    } else {
      promptEl.textContent = 'Vending cooling down: ' + Math.ceil(target.cooldown) + 's';
      progressBarEl.style.display = 'none';
      progressEl.style.width = '0%';
    }
  }

  function update(dt) {
    var V = cfg();
    if (!Game.Player || !Game.UI || Game.UI.isPaused() || (Game.Combat && Game.Combat.isGameOver && Game.Combat.isGameOver())) {
      cancelInteraction();
    }

    for (var i = 0; i < vendingMachines.length; i++) {
      var vm = vendingMachines[i];
      if (vm.cooldown > 0) {
        vm.cooldown = Math.max(0, vm.cooldown - dt);
        vm.available = vm.cooldown <= 0;
      }
      if (vm.dispenseFlash > 0) vm.dispenseFlash -= dt;
      if (vm.glowMesh && vm.glowMesh.material) {
        var pulse = interacting === vm ? 0.25 + 0.2 * Math.sin(performance.now() * 0.02) : vm.dispenseFlash > 0 ? 0.45 : vm.available ? 0.08 : 0.02;
        vm.glowMesh.material.opacity = Math.max(0.02, pulse);
      }
    }

    if (eKeyHeld && !interacting) {
      var startTarget = findTargetVending();
      if (startTarget && startTarget.available) interacting = startTarget;
    }

    if (interacting) {
      var current = findTargetVending();
      if (!eKeyHeld || current !== interacting || !interacting.available) {
        cancelInteraction();
      } else {
        interactionProgress += dt;
        if (interactionProgress >= V.useDuration) dispenseReward(interacting);
      }
    }

    for (var p = pickups.length - 1; p >= 0; p--) {
      var pickup = pickups[p];
      pickup.lifetime -= dt;
      if (pickup.lifetime <= 0) {
        removePickup(pickup);
        continue;
      }
      pickup.bobPhase += dt * 2.5;
      var bobY = Math.sin(pickup.bobPhase) * 0.12;
      if (pickup.mesh) {
        pickup.mesh.position.y = pickup.position.y + 0.4 + bobY;
        pickup.mesh.rotation.y += dt * (pickup.type === 'caboom' ? 3.2 : 1.5);
      }
      if (pickup.glowMesh) {
        pickup.glowMesh.position.y = pickup.position.y + 0.4 + bobY;
        pickup.glowMesh.material.opacity = 0.2 + 0.18 * Math.sin(pickup.bobPhase * 2);
      }
      collectPickup(pickup);
    }

    if (caboomRing && caboomRingLife > 0) {
      caboomRingLife -= dt;
      var t = 1 - (caboomRingLife / 1.0);
      caboomRing.scale.setScalar(1 + t * 40);
      caboomRing.material.opacity = (1 - t) * 0.9;
      if (caboomRingLife <= 0) {
        if (caboomRing.parent) caboomRing.parent.remove(caboomRing);
        caboomRing = null;
      }
    }

    if (caboomFlashTime > 0) {
      caboomFlashTime -= dt;
      if (caboomFlashTime <= 0 && caboomFlashEl) caboomFlashEl.classList.remove('active');
    }

    for (var n = notifications.length - 1; n >= 0; n--) {
      var note = notifications[n];
      note.life -= dt;
      if (note.life <= 0) {
        if (note.element && note.element.parentElement) note.element.parentElement.removeChild(note.element);
        notifications.splice(n, 1);
      } else {
        note.element.style.opacity = Math.min(1, note.life / 0.5);
        note.element.style.transform = 'translateY(' + ((1 - note.life / 3.0) * -20) + 'px)';
      }
    }

    updateInteractionUI();
  }

  function reset() {
    for (var i = pickups.length - 1; i >= 0; i--) removePickup(pickups[i]);
    pickups = [];
    for (var j = 0; j < vendingMachines.length; j++) {
      vendingMachines[j].cooldown = 0;
      vendingMachines[j].available = true;
      vendingMachines[j].dispenseFlash = 0;
    }
    cancelInteraction();
    if (caboomRing && caboomRing.parent) caboomRing.parent.remove(caboomRing);
    caboomRing = null;
    caboomRingLife = 0;
    caboomFlashTime = 0;
    if (caboomFlashEl) caboomFlashEl.classList.remove('active');
    for (var n = notifications.length - 1; n >= 0; n--) {
      if (notifications[n].element && notifications[n].element.parentElement) notifications[n].element.parentElement.removeChild(notifications[n].element);
    }
    notifications = [];
  }

  return {
    init: init,
    registerVendingMachine: registerVendingMachine,
    onKeyDown: onKeyDown,
    onKeyUp: onKeyUp,
    update: update,
    reset: reset,
    cancelOnEvent: cancelInteraction,
    getVendingMachines: function() { return vendingMachines; },
    getPickups: function() { return pickups; }
  };
})();
