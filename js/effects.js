/*
 * effects.js — Bullet tracers, impact sparks, hit markers, death effects, damage flash
 * All effects use pooled/shared geometry for performance.
 */

window.Game = window.Game || {};

Game.Effects = (function() {
  var scene = null;

  // Pools
  var tracers = [];
  var sparks = [];
  var deathEffects = [];
  var slashEffects = [];

  // Shared geometry/materials
  var tracerGeo, tracerMat;
  var sparkGeo, sparkMat;
  var deathGeo, deathMat;
  var slashGeo, slashMat;

  // Damage flash overlay
  var damageFlashEl = null;
  var damageFlashTime = 0;

  // Hit marker
  var hitMarkerEl = null;
  var hitMarkerTime = 0;

  function init(threeScene) {
    scene = threeScene;

    // Tracer: thin line segment
    tracerGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 4);
    tracerMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.8 });

    // Spark: small bright sphere
    sparkGeo = new THREE.SphereGeometry(0.04, 4, 4);
    sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 1 });

    // Death effect: expanding ring
    deathGeo = new THREE.RingGeometry(0.1, 0.3, 8);
    deathMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8, side: THREE.DoubleSide });

    // Slash arc
    slashGeo = new THREE.RingGeometry(0.3, 0.5, 12, 1, 0, Math.PI);
    slashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });

    // DOM elements
    damageFlashEl = document.getElementById('damage-flash');
    hitMarkerEl = document.getElementById('hit-marker');
  }

  function addBulletTrace(origin, endPoint) {
    if (tracers.length >= Game.Config.perf.maxTracers) {
      var oldest = tracers.shift();
      if (oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
    }

    var dir = new THREE.Vector3().subVectors(endPoint, origin);
    var len = dir.length();
    if (len < 0.1) return;

    var mesh = new THREE.Mesh(tracerGeo, tracerMat.clone());
    mesh.position.copy(origin).add(endPoint).multiplyScalar(0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    scene.add(mesh);

    tracers.push({ mesh: mesh, life: 0.25 });
  }

  function addImpactSpark(point, normal) {
    if (sparks.length >= Game.Config.perf.maxSparks) {
      var oldest = sparks.shift();
      if (oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
    }

    var mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
    mesh.position.copy(point).add(normal.multiplyScalar(0.05));
    scene.add(mesh);

    sparks.push({ mesh: mesh, life: 0.3 });
  }

  function addImpactMark(point, normal) {
    // Delegate to weapons.js existing mark system
    if (Game.Weapons && Game.Weapons.addImpactMark) {
      Game.Weapons.addImpactMark(point, normal);
    }
  }

  function addHitMarker() {
    hitMarkerTime = 0.2;
    if (hitMarkerEl) {
      hitMarkerEl.classList.add('active');
    }
  }

  function addDamageFlash() {
    damageFlashTime = Game.Config.player.damageFlashDuration;
    if (damageFlashEl) {
      damageFlashEl.classList.add('active');
    }
  }

  function addDeathEffect(position) {
    if (deathEffects.length >= Game.Config.perf.maxDeathEffects) {
      var oldest = deathEffects.shift();
      if (oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
    }

    var mesh = new THREE.Mesh(deathGeo, deathMat.clone());
    mesh.position.copy(position);
    mesh.position.y += 0.5;
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);

    deathEffects.push({ mesh: mesh, life: 0.6 });
  }

  function addKnifeSlash(position) {
    if (slashEffects.length >= 5) {
      var oldest = slashEffects.shift();
      if (oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
    }

    var mesh = new THREE.Mesh(slashGeo, slashMat.clone());
    mesh.position.copy(position);
    mesh.position.y += 0.8;
    scene.add(mesh);

    slashEffects.push({ mesh: mesh, life: 0.3 });
  }

  function update(dt) {
    // Tracers
    for (var i = tracers.length - 1; i >= 0; i--) {
      var t = tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        if (t.mesh.parent) t.mesh.parent.remove(t.mesh);
        t.mesh.material.dispose();
        tracers.splice(i, 1);
      } else {
        t.mesh.material.opacity = (t.life / 0.25) * 0.8;
      }
    }

    // Sparks
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
        s.mesh.material.dispose();
        sparks.splice(i, 1);
      } else {
        s.mesh.material.opacity = (s.life / 0.3);
        s.mesh.scale.setScalar(1 + (1 - s.life / 0.3) * 2);
      }
    }

    // Death effects
    for (var i = deathEffects.length - 1; i >= 0; i--) {
      var d = deathEffects[i];
      d.life -= dt;
      if (d.life <= 0) {
        if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
        d.mesh.material.dispose();
        deathEffects.splice(i, 1);
      } else {
        var t = 1 - (d.life / 0.6);
        d.mesh.material.opacity = (1 - t) * 0.8;
        d.mesh.scale.setScalar(1 + t * 4);
      }
    }

    // Slash effects
    for (var i = slashEffects.length - 1; i >= 0; i--) {
      var s = slashEffects[i];
      s.life -= dt;
      if (s.life <= 0) {
        if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
        s.mesh.material.dispose();
        slashEffects.splice(i, 1);
      } else {
        s.mesh.material.opacity = (s.life / 0.3) * 0.7;
        s.mesh.scale.setScalar(1 + (1 - s.life / 0.3) * 1.5);
      }
    }

    // Damage flash (DOM)
    if (damageFlashTime > 0) {
      damageFlashTime -= dt;
      if (damageFlashTime <= 0 && damageFlashEl) {
        damageFlashEl.classList.remove('active');
      }
    }

    // Hit marker (DOM)
    if (hitMarkerTime > 0) {
      hitMarkerTime -= dt;
      if (hitMarkerTime <= 0 && hitMarkerEl) {
        hitMarkerEl.classList.remove('active');
      }
    }
  }

  return {
    init: init,
    addBulletTrace: addBulletTrace,
    addImpactSpark: addImpactSpark,
    addImpactMark: addImpactMark,
    addHitMarker: addHitMarker,
    addDamageFlash: addDamageFlash,
    addDeathEffect: addDeathEffect,
    addKnifeSlash: addKnifeSlash,
    update: update
  };
})();
