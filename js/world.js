/*
 * world.js — Subway Station Scene Builder (v2 — bigger, realistic)
 * Builds the visual scene and registers collision data.
 */

window.Game = window.Game || {};

Game.World = (function() {

  var scene = null;
  var worldGroup = null;
  var dustParticles = null;

  var geom = {};

  function initSharedGeometries() {
    geom.box = new THREE.BoxGeometry(1, 1, 1);
    geom.plane = new THREE.PlaneGeometry(1, 1);
    geom.cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  }

  function build(threeScene) {
    scene = threeScene;
    initSharedGeometries();

    Game.Collision.clear();

    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    var W = Game.Config.world;

    var pHalfL = W.platformLength / 2;
    var pHalfW = W.platformWidth / 2;
    var trackW = W.trackWidth;
    var ceilingH = W.ceilingHeight;

    // Track X extents
    var leftTrackNear = -pHalfW;
    var leftTrackFar = -(pHalfW + trackW);
    var rightTrackNear = pHalfW;
    var rightTrackFar = pHalfW + trackW;

    // Wall X positions
    var leftWallX = leftTrackFar - 0.3;
    var rightWallX = rightTrackFar + 0.3;

    // Station Z extent (walls + stairs area)
    // Extra length gives the exit stairs room to rise to a believable upper concourse.
    var stationHalfL = pHalfL + 9;
    var tunnelLen = W.tunnelLength || 40;


    // --- Lighting ---
    buildLighting(scene, W);

    // --- Ceiling ---
    buildCeiling(W, stationHalfL, ceilingH);

    // --- Track bed (entire station floor at y=0) ---
    buildTrackBed(W, stationHalfL);

    // --- Platform (no side walls hiding the train) ---
    buildPlatform(W, pHalfL, pHalfW);

    // --- Walls (with tunnel openings) ---
    buildWallsWithTunnels(W, stationHalfL, ceilingH, leftWallX, rightWallX, pHalfL, trackW, tunnelLen);

    // --- Tunnels (both sides, extending into darkness) ---
    buildTunnel(ceilingH, pHalfL, tunnelLen, -1, pHalfW, trackW);
    buildTunnel(ceilingH, pHalfL, tunnelLen, 1, pHalfW, trackW);

    // --- Tracks (both sides, full station length + into tunnels) ---
    buildTracks(leftTrackFar, leftTrackNear, stationHalfL + tunnelLen, trackW);
    buildTracks(rightTrackNear, rightTrackFar, stationHalfL + tunnelLen, trackW);

    // --- Train (right side, bigger and realistic) ---
    buildTrain(rightTrackNear, rightTrackFar, pHalfL, ceilingH, pHalfW, trackW);

    // --- Pillars (down the middle of the platform) ---
    buildPillars(W, pHalfL, pHalfW, ceilingH);

    // --- Safety lines (both platform edges) ---
    buildSafetyLines(pHalfL, pHalfW);

    // --- Ceiling light strips ---
    buildLightStrips(W, stationHalfL, ceilingH, pHalfW, trackW);

    // --- Signs ---
    buildSigns(W, pHalfL, pHalfW, ceilingH, stationHalfL, leftWallX, rightWallX);

    // --- Benches (in the middle of the platform, between pillars) ---
    buildBenches(pHalfL, pHalfW);

    // --- Trash bins ---
    buildTrashBins(pHalfL, pHalfW);

    // --- Vending machines (against end walls) ---
    buildVendingMachines(pHalfL, pHalfW);

    // --- Help booth ---
    buildHelpBooth(pHalfL, pHalfW);

    // --- Posters (on side walls) ---
    buildPosters(W, pHalfL, ceilingH, leftWallX, rightWallX);

    // --- Graphic route bands / wall trim ---
    buildWallTrim(W, pHalfL, leftWallX, rightWallX);

    // --- Stairs (front and rear) ---
    buildStairs(pHalfL, pHalfW, ceilingH);

    // --- Upper concourse / second map above the stair openings ---
    buildUpperConcourse(W, pHalfL, pHalfW, ceilingH);

    // --- Dust particles ---
    buildDustParticles(stationHalfL, ceilingH, pHalfW);

    // --- Collision ---
    registerCollisions(W, pHalfL, pHalfW, leftWallX, rightWallX, ceilingH, stationHalfL, tunnelLen);

    return worldGroup;
  }

  // --- Stairs / real exit stairwells ---
  function buildStairs(pHalfL, pHalfW, ceilingH) {
    var concreteMat = new THREE.MeshLambertMaterial({ color: 0x8a8d8c });
    var treadMat = new THREE.MeshLambertMaterial({ color: 0x767a7a });
    var sideWallMat = new THREE.MeshLambertMaterial({ color: 0xb8bfbe });
    var metalMat = new THREE.MeshPhongMaterial({ color: 0x3f484d, shininess: 70, specular: 0x777777 });
    var darkVoidMat = new THREE.MeshBasicMaterial({ color: 0x080b0d });
    var lightMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });
    addExitStairwell(1, pHalfL, pHalfW, ceilingH, concreteMat, treadMat, sideWallMat, metalMat, darkVoidMat, lightMat);
    addExitStairwell(-1, pHalfL, pHalfW, ceilingH, concreteMat, treadMat, sideWallMat, metalMat, darkVoidMat, lightMat);
  }

  function addExitStairwell(dir, pHalfL, pHalfW, ceilingH, concreteMat, treadMat, sideWallMat, metalMat, darkVoidMat, lightMat) {
    var platformY = Game.Config.world.platformHeight;
    var stairWidth = pHalfW * 2; // as wide as the island platform
    var stepCount = 18;
    var stepDepth = 0.32;
    // Upper room floor sits above the subway ceiling by roughly 2-3 wall-tile
    // rows, so the second floor is not embedded in the lower station ceiling.
    var topY = ceilingH + 0.2;
    var rise = (topY - platformY) / stepCount;
    // Starts exactly at the platform edge so it feels like part of the platform.
    var baseZ = dir * pHalfL;
    var halfW = stairWidth / 2;
    var totalRun = stepCount * stepDepth;
    var centerRunZ = baseZ + dir * (totalRun / 2);
    var topZ = baseZ + dir * totalRun;

    // Flush threshold slab: no barrier, no gate, no side fence — just platform becoming stairs.
    var threshold = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, 0.07, 0.55), concreteMat);
    threshold.position.set(0, platformY + 0.035, baseZ + dir * 0.02);
    worldGroup.add(threshold);

    // Stair opening is intentionally unsigned here; exit signage belongs at the
    // upper gates where it is visible and not floating behind the stairs.

    // Individual concrete/tile steps rising almost to the ceiling / second floor.
    for (var i = 0; i < stepCount; i++) {
      var h = rise * (i + 1);
      var step = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, h, stepDepth), i % 2 === 0 ? concreteMat : treadMat);
      step.position.set(0, platformY + h / 2, baseZ + dir * (i * stepDepth + stepDepth / 2));
      worldGroup.add(step);

      // Slight bright nosing on each step.
      var nosing = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, 0.025, 0.035), metalMat);
      nosing.position.set(0, platformY + h + 0.018, baseZ + dir * (i * stepDepth + 0.035));
      worldGroup.add(nosing);
    }

    // Upper landing / second-floor slab just below ceiling.
    var landingDepth = 2.0;
    var landing = new THREE.Mesh(new THREE.BoxGeometry(stairWidth + 0.8, 0.16, landingDepth), concreteMat);
    landing.position.set(0, topY + 0.06, topZ + dir * (landingDepth / 2));
    worldGroup.add(landing);

    // Upper landing opens directly into the second-floor concourse built above.

    // No stairwell ceiling lights: the ceiling is cut out here for the stair
    // opening, so any fixture at ceilingH would float in the void. The
    // stairwell gets enough ambient light from the lower station and the
    // upper concourse.
  }

  // --- Upper concourse / second playable map ---
  function buildUpperConcourse(W, pHalfL, pHalfW, ceilingH) {
    // Raise the whole upper concourse above the lower station ceiling by about
    // 2-3 metro wall-tile rows. This keeps the second room clear of the subway
    // ceiling/texture layer below.
    var stairTopY = ceilingH + 0.2;
    // Collision stays exactly at stair-landing height. Only the visible floor
    // skin is lifted a hair so it covers lower-room texture bleed without
    // becoming a physical slab in the subway ceiling below.
    var upperFloorY = stairTopY;
    var upperFloorVisualY = stairTopY + 0.045;
    var roomW = Math.max(W.platformWidth * 2.6, 34); // much wider than the lower island platform
    var roomL = Math.max(W.platformLength * 1.55, 120); // bigger/opener than the subway room below
    var halfX = roomW / 2;
    var halfZ = roomL / 2;
    var roomH = 6.4;
    var ceilY = upperFloorY + roomH;
    var stairRun = 18 * 0.32;
    var topLandingDepth = 2.0;
    var holeW = W.platformWidth;
    var holeHalf = holeW / 2;
    var frontHoleA = pHalfL;
    // Keep the upper-floor hole open across the ramp AND the top landing.
    // Otherwise the landing looks like a closed ceiling/floor sheet that the
    // player passes through at the top of the stairs.
    var frontHoleB = pHalfL + stairRun + topLandingDepth;
    var rearHoleA = -pHalfL - stairRun - topLandingDepth;
    var rearHoleB = -pHalfL;

    // Match the lower platform floor while keeping a separate map repeat for
    // the larger upper room.
    var floorTex = Game.Textures.get('concreteFloor');
    if (floorTex && floorTex.clone) floorTex = floorTex.clone();
    var floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
    if (floorMat.map && floorMat.map.repeat) {
      floorMat.map.repeat.set(10, 18);
      floorMat.map.needsUpdate = true;
    }
    var wallMat = new THREE.MeshLambertMaterial({ color: 0xb8c0c0 });
    var ceilMat = new THREE.MeshLambertMaterial({ color: 0x90989b });
    var pillarMat = Game.Materials.get('pillar');
    var gateMat = new THREE.MeshPhongMaterial({ color: 0x2b3740, shininess: 80, specular: 0x666666 });
    var lightMat = new THREE.MeshBasicMaterial({ color: 0xfff8dd });
    var lineMat = new THREE.MeshBasicMaterial({ color: 0x1e6fae });
    var signMat = Game.Materials.makeSignMaterial('STREET EXIT', 'GATES', '#0a4a1a', '#ffffff');

    function floorPanel(w, d, x, z) {
      if (w <= 0 || d <= 0) return;
      // Use real thin slabs, not one-sided planes. The old plane skin was easy
      // to see through from shallow angles and left the whole upper concourse
      // looking like disconnected floating sheets. Keep the top surface at the
      // same visual Y while giving every panel thickness and visible edges.
      var slabT = 0.18;
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, slabT, d), floorMat);
      mesh.position.set(x, upperFloorVisualY - slabT / 2, z);
      worldGroup.add(mesh);
    }

    // Large upper floor, segmented so stair holes stay genuinely open. Cover
    // the full stair opening depth on both side wings, including the landing
    // pocket, otherwise the left/right second-floor edges show gaps everywhere
    // around the stairwell.
    floorPanel(roomW, rearHoleA + halfZ, 0, (-halfZ + rearHoleA) / 2);
    floorPanel(roomW, frontHoleA - rearHoleB, 0, (rearHoleB + frontHoleA) / 2);
    floorPanel(roomW, halfZ - frontHoleB, 0, (frontHoleB + halfZ) / 2);
    var sideW = (roomW - holeW) / 2;
    var sideX = holeHalf + sideW / 2;
    var holeD = frontHoleB - frontHoleA;
    floorPanel(sideW, holeD, -sideX, (frontHoleA + frontHoleB) / 2);
    floorPanel(sideW, holeD, sideX, (frontHoleA + frontHoleB) / 2);
    floorPanel(sideW, holeD, -sideX, (rearHoleA + rearHoleB) / 2);
    floorPanel(sideW, holeD, sideX, (rearHoleA + rearHoleB) / 2);

    // Metal safety curbs + glass walls along the stair hole edges.
    var rimMat = new THREE.MeshPhongMaterial({ color: 0x4c5960, shininess: 70, specular: 0x888888 });
    var glassWallMat = new THREE.MeshPhongMaterial({ color: 0x9fc8d6, transparent: true, opacity: 0.35, shininess: 90, specular: 0xffffff, side: THREE.DoubleSide });
    var glassWallH = roomH;
    // Side glass walls extend all the way down to the track bed (y=0) so
    // players can't jump off the stairs sideways onto the railway tracks.
    var trackBedY = 0;
    var sideGlassTopY = upperFloorVisualY + glassWallH;
    var sideGlassTotalH = sideGlassTopY - trackBedY;
    var sideGlassCenterY = trackBedY + sideGlassTotalH / 2;
    function addHoleRims(z0, z1, isFront) {
      var zMid = (z0 + z1) / 2;
      var zLen = z1 - z0;
      // Metal rails on left/right edges (at upper floor level)
      var leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, zLen), rimMat);
      leftRail.position.set(-holeHalf - 0.08, upperFloorVisualY + 0.175, zMid);
      worldGroup.add(leftRail);
      var rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, zLen), rimMat);
      rightRail.position.set(holeHalf + 0.08, upperFloorVisualY + 0.175, zMid);
      worldGroup.add(rightRail);

      // Left glass wall — extends from track bed (y=0) to upper room ceiling
      var leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, sideGlassTotalH, zLen), glassWallMat);
      leftGlass.position.set(-holeHalf - 0.12, sideGlassCenterY, zMid);
      worldGroup.add(leftGlass);
      // Right glass wall — same full height
      var rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, sideGlassTotalH, zLen), glassWallMat);
      rightGlass.position.set(holeHalf + 0.12, sideGlassCenterY, zMid);
      worldGroup.add(rightGlass);

      // Glass wall behind the stairs — at the bottom (platform edge) of the
      // stairwell, so it's behind the player as they walk up. Doesn't block
      // the path; acts as a back wall for the stairwell shaft.
      var behindGlassZ = isFront ? z0 : z1;
      var behindGlass = new THREE.Mesh(new THREE.BoxGeometry(holeW + 0.24, glassWallH, 0.05), glassWallMat);
      behindGlass.position.set(0, upperFloorVisualY + glassWallH / 2, behindGlassZ);
      worldGroup.add(behindGlass);

      // Metal doorstep/base rail at the bottom of the back glass wall,
      // matching the left/right side rails.
      var backRail = new THREE.Mesh(new THREE.BoxGeometry(holeW + 0.24, 0.35, 0.16), rimMat);
      backRail.position.set(0, upperFloorVisualY + 0.175, behindGlassZ);
      worldGroup.add(backRail);
    }
    addHoleRims(frontHoleA, frontHoleB, true);
    addHoleRims(rearHoleA, rearHoleB, false);

    // Ceiling and boundary walls for the upper room.
    var ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomL), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ceilY, 0);
    worldGroup.add(ceiling);

    var wallT = 0.24;
    var wallH = roomH;
    function wallBox(w, h, d, x, y, z, mat) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      worldGroup.add(m);
    }
    wallBox(wallT, wallH, roomL, -halfX, upperFloorY + wallH / 2, 0, wallMat);
    wallBox(wallT, wallH, roomL, halfX, upperFloorY + wallH / 2, 0, wallMat);
    wallBox(roomW, wallH, wallT, 0, upperFloorY + wallH / 2, -halfZ, wallMat);
    wallBox(roomW, wallH, wallT, 0, upperFloorY + wallH / 2, halfZ, wallMat);

    // Blue station trim around upper walls.
    wallBox(0.04, 0.18, roomL - 1, -halfX + 0.14, upperFloorY + 2.35, 0, lineMat);
    wallBox(0.04, 0.18, roomL - 1, halfX - 0.14, upperFloorY + 2.35, 0, lineMat);
    wallBox(roomW - 1, 0.18, 0.04, 0, upperFloorY + 2.35, -halfZ + 0.14, lineMat);
    wallBox(roomW - 1, 0.18, 0.04, 0, upperFloorY + 2.35, halfZ - 0.14, lineMat);

    // Pillar grid, leaving both stair openings clear.
    var pillarGeo = new THREE.BoxGeometry(0.8, roomH, 0.8);
    var xs = [-halfX * 0.55, 0, halfX * 0.55];
    var zs = [-halfZ * 0.55, -halfZ * 0.25, 0, halfZ * 0.25, halfZ * 0.55];
    for (var xi = 0; xi < xs.length; xi++) {
      for (var zi = 0; zi < zs.length; zi++) {
        var px = xs[xi], pz = zs[zi];
        if (Math.abs(px) < holeHalf + 1 && ((pz > frontHoleA - 2 && pz < frontHoleB + 3) || (pz > rearHoleA - 3 && pz < rearHoleB + 2))) continue;
        var pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(px, upperFloorY + roomH / 2, pz);
        worldGroup.add(pillar);
      }
    }

    // One obvious exit gate cluster on the far wall of the upper map.
    var gateZ = -halfZ + 0.7;
    var gateSign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.0), signMat);
    gateSign.position.set(0, upperFloorY + 3.35, gateZ + 0.06);
    gateSign.rotation.y = Math.PI;
    worldGroup.add(gateSign);
    for (var g = 0; g < 5; g++) {
      var gx = -4 + g * 2;
      var postA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), gateMat);
      postA.position.set(gx - 0.45, upperFloorY + 0.75, gateZ);
      worldGroup.add(postA);
      var postB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), gateMat);
      postB.position.set(gx + 0.45, upperFloorY + 0.75, gateZ);
      worldGroup.add(postB);
      var bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), gateMat);
      bar.position.set(gx, upperFloorY + 0.9, gateZ);
      worldGroup.add(bar);
    }

    // Bright, cheap fluorescent strips on the upper ceiling.
    for (var l = 0; l < 8; l++) {
      var lz = -halfZ + 10 + l * ((roomL - 20) / 7);
      var lamp = new THREE.Mesh(new THREE.BoxGeometry(roomW * 0.42, 0.06, 0.35), lightMat);
      lamp.position.set(0, ceilY - 0.12, lz);
      worldGroup.add(lamp);
    }

    // Keep dimensions for collision registration.
    buildUpperConcourse.info = { floorY: upperFloorY, roomW: roomW, roomL: roomL, roomH: roomH, holeW: holeW, stairRun: stairRun };
  }

  // --- Lighting ---
  function buildLighting(scene, W) {
    var ambient = new THREE.AmbientLight(0x9aa4b8, 0.78);
    scene.add(ambient);

    var hemi = new THREE.HemisphereLight(0xb8c8e0, 0x504030, 0.65);
    scene.add(hemi);

    var dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(0, 1, 0);
    scene.add(dir);

    scene.fog = new THREE.FogExp2(W.fogColor, W.fogDensity);
    scene.background = new THREE.Color(W.fogColor);
  }

  // --- Ceiling ---
  function buildCeiling(W, halfL, ceilingH) {
    var totalWidth = W.trackWidth * 2 + W.platformWidth + 1;
    var ceilingMat = Game.Materials.get('ceiling');
    var tex = ceilingMat.map;
    if (tex) tex.repeat.set(10, 16);

    // Leave real ceiling openings above both exit stairwells instead of letting
    // stairs visually crash into a continuous ceiling plane.
    var pHalfL = W.platformLength / 2;
    var stairRun = 18 * 0.32;
    var holeStart = pHalfL + 0.15;
    var holeEnd = pHalfL + 0.35 + stairRun + 2.35;
    var holeW = W.platformWidth + 0.85;
    var sideW = Math.max(0.5, (totalWidth - holeW) / 2);
    var sideX = holeW / 2 + sideW / 2;

    function addCeilingPanel(w, d, x, z) {
      if (w <= 0 || d <= 0) return;
      var geo = new THREE.PlaneGeometry(w, d);
      var panel = new THREE.Mesh(geo, ceilingMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(x, ceilingH, z);
      worldGroup.add(panel);
    }

    // Main station ceiling between the two stair holes.
    addCeilingPanel(totalWidth, holeStart * 2, 0, 0);

    // End caps beyond the holes.
    addCeilingPanel(totalWidth, Math.max(0.1, halfL - holeEnd), 0, (holeEnd + halfL) / 2);
    addCeilingPanel(totalWidth, Math.max(0.1, halfL - holeEnd), 0, -(holeEnd + halfL) / 2);

    // Ceiling side strips beside each hole, leaving a full platform-width opening.
    var holeDepth = holeEnd - holeStart;
    addCeilingPanel(sideW, holeDepth, -sideX, (holeStart + holeEnd) / 2);
    addCeilingPanel(sideW, holeDepth, sideX, (holeStart + holeEnd) / 2);
    addCeilingPanel(sideW, holeDepth, -sideX, -(holeStart + holeEnd) / 2);
    addCeilingPanel(sideW, holeDepth, sideX, -(holeStart + holeEnd) / 2);

    // Concrete/metal rim around each opening so the hole reads as architecture.
    var rimMat = new THREE.MeshPhongMaterial({ color: 0xaeb6b8, shininess: 45, specular: 0x777777 });
    addCeilingHoleRim(holeW, holeStart, holeEnd, ceilingH, rimMat, 1);
    addCeilingHoleRim(holeW, holeStart, holeEnd, ceilingH, rimMat, -1);
  }

  function addCeilingHoleRim(holeW, holeStart, holeEnd, ceilingH, rimMat, dir) {
    var zMid = dir * ((holeStart + holeEnd) / 2);
    var zNear = dir * holeStart;
    var zFar = dir * holeEnd;
    var depth = holeEnd - holeStart;
    var beamH = 0.16;
    var beamDrop = ceilingH - beamH / 2 - 0.02;

    var sideGeo = new THREE.BoxGeometry(0.18, beamH, depth);
    var left = new THREE.Mesh(sideGeo, rimMat);
    left.position.set(-holeW / 2, beamDrop, zMid);
    worldGroup.add(left);
    var right = new THREE.Mesh(sideGeo, rimMat);
    right.position.set(holeW / 2, beamDrop, zMid);
    worldGroup.add(right);

    var crossGeo = new THREE.BoxGeometry(holeW + 0.18, beamH, 0.18);
    var near = new THREE.Mesh(crossGeo, rimMat);
    near.position.set(0, beamDrop, zNear);
    worldGroup.add(near);
    var far = new THREE.Mesh(crossGeo, rimMat);
    far.position.set(0, beamDrop, zFar);
    worldGroup.add(far);
  }

  // --- Track bed ---
  function buildTrackBed(W, halfL) {
    var totalWidth = W.trackWidth * 2 + W.platformWidth + 1;
    var bedMat = Game.Materials.get('trackbed');
    var bedGeo = new THREE.PlaneGeometry(totalWidth, halfL * 2);
    var tex = bedMat.map;
    if (tex) tex.repeat.set(8, 18);
    var bed = new THREE.Mesh(bedGeo, bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = 0;
    worldGroup.add(bed);
  }

  // --- Platform (no side walls hiding train) ---
  function buildPlatform(W, pHalfL, pHalfW) {
    var floorMat = Game.Materials.get('floor');
    var tex = floorMat.map;
    if (tex) tex.repeat.set(6, 14);

    // Top surface
    var topGeo = new THREE.PlaneGeometry(pHalfW * 2, pHalfL * 2);
    var topMesh = new THREE.Mesh(topGeo, floorMat);
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.y = W.platformHeight + 0.01;
    worldGroup.add(topMesh);

    // Platform side walls (just the concrete edge, thin)
    var concreteMat = new THREE.MeshLambertMaterial({ color: 0x7a7a76 });
    var sideH = W.platformHeight;

    // Left edge
    var leftEdgeGeo = new THREE.BoxGeometry(0.2, sideH, pHalfL * 2);
    var leftEdge = new THREE.Mesh(leftEdgeGeo, concreteMat);
    leftEdge.position.set(-pHalfW, sideH / 2, 0);
    worldGroup.add(leftEdge);

    // Right edge
    var rightEdge = new THREE.Mesh(leftEdgeGeo, concreteMat);
    rightEdge.position.set(pHalfW, sideH / 2, 0);
    worldGroup.add(rightEdge);

    // No raised end caps: platform ends must flow directly into the exit stairs.
  }

  // --- Walls with tunnel openings ---
  function buildWallsWithTunnels(W, halfL, ceilingH, leftX, rightX, pHalfL, trackW, tunnelLen) {
    var tunnelH = 5.5;
    var tunnelHalfW = trackW / 2 + 0.2;
    var pHalfW = W.platformWidth / 2;
    var leftTrackCenterX = -(pHalfW + trackW / 2);
    var rightTrackCenterX = pHalfW + trackW / 2;

    // Side walls (full, no openings — tunnels are at Z ends)
    var leftWallMat = new THREE.MeshLambertMaterial({ map: Game.Textures.get('wallTiles') });
    if (leftWallMat.map) leftWallMat.map.repeat.set(12, 2);
    var leftWallGeo = new THREE.PlaneGeometry(halfL * 2, ceilingH);
    var leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.position.set(leftX, ceilingH / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    worldGroup.add(leftWall);

    var rightWallMat = new THREE.MeshLambertMaterial({ map: Game.Textures.get('wallTiles') });
    if (rightWallMat.map) rightWallMat.map.repeat.set(12, 2);
    var rightWall = new THREE.Mesh(leftWallGeo, rightWallMat);
    rightWall.position.set(rightX, ceilingH / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    worldGroup.add(rightWall);

    // End walls with tunnel openings (front and back)
    buildEndWallWithTunnel(leftX, rightX, ceilingH, halfL, pHalfL, trackW, tunnelH, leftTrackCenterX, rightTrackCenterX, tunnelHalfW, 'front');
    buildEndWallWithTunnel(leftX, rightX, ceilingH, -halfL, pHalfL, trackW, tunnelH, leftTrackCenterX, rightTrackCenterX, tunnelHalfW, 'back');
  }

  function buildEndWallWithTunnel(leftX, rightX, ceilingH, wallZ, pHalfL, trackW, tunnelH, leftTrackCX, rightTrackCX, tunnelHalfW, label) {
    var totalWidth = rightX - leftX;
    var wallThickness = 0.3;
    var sillH = 0.5;
    var stairPortalHalfW = Game.Config.world.platformWidth / 2 + 0.15;
    var wallMat = new THREE.MeshLambertMaterial({ map: Game.Textures.get('wallTiles') });
    if (wallMat.map) wallMat.map.repeat.set(10, 2);

    function addWallSegment(x0, x1, y0, y1) {
      if (x1 <= x0 || y1 <= y0) return;
      var geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, wallThickness);
      var mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, wallZ);
      worldGroup.add(mesh);
    }

    // Lintel above tunnels, with a central full-height stair opening.
    var lintelH = ceilingH - tunnelH;
    if (lintelH > 0.1) {
      addWallSegment(leftX, -stairPortalHalfW, tunnelH, ceilingH);
      addWallSegment(stairPortalHalfW, rightX, tunnelH, ceilingH);
    }

    // Sill below tunnels — only outside the tunnel openings. The old full-width
    // sill covered the track bed with white brick texture at every tunnel
    // entrance, which made no sense. Now only the gaps beside/between tunnels
    // get a low sill; the track openings stay clean.
    // Left sill (left wall to left tunnel edge)
    if (leftTrackCX - tunnelHalfW > leftX) {
      addWallSegment(leftX, leftTrackCX - tunnelHalfW, 0, sillH);
    }
    // Middle sill (between tunnels, split around stair portal)
    addWallSegment(leftTrackCX + tunnelHalfW, -stairPortalHalfW, 0, sillH);
    addWallSegment(stairPortalHalfW, rightTrackCX - tunnelHalfW, 0, sillH);
    // Right sill (right tunnel edge to right wall)
    if (rightX > rightTrackCX + tunnelHalfW) {
      addWallSegment(rightTrackCX + tunnelHalfW, rightX, 0, sillH);
    }

    // Left segment (left wall to left tunnel)
    var leftSegEnd = leftTrackCX - tunnelHalfW;
    if (leftSegEnd > leftX) {
      var segGeo = new THREE.BoxGeometry(leftSegEnd - leftX, tunnelH - sillH, wallThickness);
      var seg = new THREE.Mesh(segGeo, wallMat);
      seg.position.set((leftX + leftSegEnd) / 2, sillH + (tunnelH - sillH) / 2, wallZ);
      worldGroup.add(seg);
    }

    // Middle segment (between tunnels) — keep as invisible collision only.
    // The visible wall texture between tunnels is removed so players see open
    // dark depth instead of a white brick wall blocking the view.
    // (Collision is handled in registerCollisions.)

    // Right segment (right tunnel to right wall)
    var rightSegStart = rightTrackCX + tunnelHalfW;
    if (rightX > rightSegStart) {
      var rSegGeo = new THREE.BoxGeometry(rightX - rightSegStart, tunnelH - sillH, wallThickness);
      var rSeg = new THREE.Mesh(rSegGeo, wallMat);
      rSeg.position.set((rightSegStart + rightX) / 2, sillH + (tunnelH - sillH) / 2, wallZ);
      worldGroup.add(rSeg);
    }

    // Tunnel portal frames
    var portalMat = new THREE.MeshLambertMaterial({ color: 0x333344 });
    for (var t = 0; t < 2; t++) {
      var tcx = t === 0 ? leftTrackCX : rightTrackCX;
      var topFrameGeo = new THREE.BoxGeometry(tunnelHalfW * 2 + 0.4, 0.2, wallThickness + 0.1);
      var topFrame = new THREE.Mesh(topFrameGeo, portalMat);
      topFrame.position.set(tcx, tunnelH, wallZ);
      worldGroup.add(topFrame);

      var sideFrameGeo = new THREE.BoxGeometry(0.15, tunnelH - sillH, wallThickness + 0.1);
      var leftFrame = new THREE.Mesh(sideFrameGeo, portalMat);
      leftFrame.position.set(tcx - tunnelHalfW - 0.07, sillH + (tunnelH - sillH) / 2, wallZ);
      worldGroup.add(leftFrame);
      var rightFrame = new THREE.Mesh(sideFrameGeo, portalMat);
      rightFrame.position.set(tcx + tunnelHalfW + 0.07, sillH + (tunnelH - sillH) / 2, wallZ);
      worldGroup.add(rightFrame);
    }
  }

  // --- Tunnels (dark tubes extending beyond station end walls) ---
  function buildTunnel(ceilingH, pHalfL, tunnelLen, sideDir, pHalfW, trackW) {
    var tunnelH = 5.5;
    var tunnelW = trackW + 0.6;
    var trackCenterX = sideDir * (pHalfW + trackW / 2);

    var darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a22 });
    var darkerMat = new THREE.MeshLambertMaterial({ color: 0x111118 });

    // Tunnels at both Z ends (front and back)
    for (var end = 0; end < 2; end++) {
      var zDir = end === 0 ? 1 : -1;
      // Start the tunnel tube at the station end wall, not inside the station.
      // This prevents the dark tunnel planes from z-fighting with the end wall
      // segments around the tunnel openings.
      var tunnelStartZ = zDir * (pHalfL + 9); // stationHalfL = pHalfL + 9
      var tunnelActualLen = tunnelLen - 0.5;
      var tunnelZ = tunnelStartZ + zDir * (tunnelActualLen / 2);

      // Floor (raised 0.01 to avoid z-fighting with station track bed overlap)
      var floorGeo = new THREE.PlaneGeometry(tunnelW, tunnelActualLen);
      var floor = new THREE.Mesh(floorGeo, darkerMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(trackCenterX, 0.01, tunnelZ);
      worldGroup.add(floor);

      // Ceiling
      var ceilGeo = new THREE.PlaneGeometry(tunnelW, tunnelActualLen);
      var ceil = new THREE.Mesh(ceilGeo, darkMat);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(trackCenterX, tunnelH, tunnelZ);
      worldGroup.add(ceil);

      // Walls
      var wallGeo = new THREE.PlaneGeometry(tunnelActualLen, tunnelH);
      var wallL = new THREE.Mesh(wallGeo, darkMat);
      wallL.position.set(trackCenterX - tunnelW / 2, tunnelH / 2, tunnelZ);
      wallL.rotation.y = Math.PI / 2;
      worldGroup.add(wallL);

      var wallR = new THREE.Mesh(wallGeo, darkMat);
      wallR.position.set(trackCenterX + tunnelW / 2, tunnelH / 2, tunnelZ);
      wallR.rotation.y = -Math.PI / 2;
      worldGroup.add(wallR);

      // Dim lights and small safety beacons for depth cues
      for (var l = 0; l < 3; l++) {
        var lightZ = tunnelZ - zDir * (tunnelActualLen / 2 - l * tunnelActualLen / 3 - tunnelActualLen / 6);
        var lightStrip = new THREE.Mesh(
          new THREE.BoxGeometry(tunnelW * 0.45, 0.1, 0.45),
          new THREE.MeshBasicMaterial({ color: 0x26384a })
        );
        lightStrip.position.set(trackCenterX, tunnelH - 0.1, lightZ);
        worldGroup.add(lightStrip);

        var beaconMat = new THREE.MeshBasicMaterial({ color: l % 2 === 0 ? 0xff5533 : 0xffaa33 });
        var beaconL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), beaconMat);
        beaconL.position.set(trackCenterX - tunnelW / 2 + 0.18, 1.2, lightZ);
        worldGroup.add(beaconL);
        var beaconR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), beaconMat);
        beaconR.position.set(trackCenterX + tunnelW / 2 - 0.18, 1.2, lightZ);
        worldGroup.add(beaconR);
      }

      // Far black end mask gives the tunnel real depth instead of a visible hard cut.
      var endMask = new THREE.Mesh(
        new THREE.PlaneGeometry(tunnelW * 0.98, tunnelH * 0.98),
        new THREE.MeshBasicMaterial({ color: 0x020205 })
      );
      endMask.position.set(trackCenterX, tunnelH / 2, tunnelStartZ + zDir * (tunnelActualLen + 0.45));
      if (zDir < 0) endMask.rotation.y = Math.PI;
      worldGroup.add(endMask);
    }
  }

  // --- Tracks ---
  function buildTracks(trackNear, trackFar, totalHalfL, trackW) {
    var railMat = Game.Materials.get('rail');
    var sleeperMat = Game.Materials.get('sleeper');

    var trackCenterX = (trackNear + trackFar) / 2;
    var railOffset = 0.75;
    var railHeight = 0.15;

    var railGeo = new THREE.BoxGeometry(0.12, railHeight, totalHalfL * 2);
    for (var side = 0; side < 2; side++) {
      var railX = trackCenterX + (side === 0 ? -railOffset : railOffset);
      var rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(railX, railHeight / 2, 0);
      worldGroup.add(rail);
    }

    // Sleepers (instanced)
    var sleeperSpacing = 0.65;
    var sleeperCount = Math.floor((totalHalfL * 2) / sleeperSpacing);
    var sleeperGeo = new THREE.BoxGeometry(trackW * 0.85, 0.1, 0.22);
    var sleeperMesh = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
    var dummy = new THREE.Object3D();
    for (var i = 0; i < sleeperCount; i++) {
      var z = -totalHalfL + i * sleeperSpacing + sleeperSpacing / 2;
      dummy.position.set(trackCenterX, 0.05, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      sleeperMesh.setMatrixAt(i, dummy.matrix);
    }
    sleeperMesh.instanceMatrix.needsUpdate = true;
    worldGroup.add(sleeperMesh);
  }

  // --- Train (full platform length, walkable interior, platform-side doors open only) ---
  function buildTrain(trackNear, trackFar, pHalfL, ceilingH, pHalfW, trackW) {
    var trackCenterX = (trackNear + trackFar) / 2;

    // Full length of the platform: the train now runs from platform end to platform end.
    // On the right track, x = pHalfW is the platform edge; width 5.0 makes the near wall touch it.
    var trainBodyW = 5.0;
    var trainBodyH = 4.25;
    var trainLength = pHalfL * 2;
    var trainFloorY = Game.Config.world.platformHeight - 0.1;
    var trainFloorTop = Game.Config.world.platformHeight;
    var trainHalf = trainLength / 2;
    var wallThickness = 0.15;

    var platformSideX = trackCenterX - trainBodyW / 2;
    var outerSideX = trackCenterX + trainBodyW / 2;
    var bodyCenterY = trainFloorY + trainBodyH / 2;
    var roofY = trainFloorY + trainBodyH;

    // Use a clean body material here instead of the procedural train-side texture.
    // The old texture painted fake windows/doors onto every wall segment, which made
    // real openings impossible to read. Windows/doors are now explicit geometry below.
    var exteriorMat = new THREE.MeshLambertMaterial({ color: 0x6f8fa4 });
    var blueBandMat = new THREE.MeshLambertMaterial({ color: 0x174d8f });
    var whiteBandMat = new THREE.MeshLambertMaterial({ color: 0xdce7ef });
    var glassMat = new THREE.MeshLambertMaterial({ color: 0x8fd6f3, transparent: true, opacity: 0.32 });
    var windowFrameMat = new THREE.MeshLambertMaterial({ color: 0x182632 });
    var rubberMat = new THREE.MeshLambertMaterial({ color: 0x17191c });
    var doorMat = new THREE.MeshLambertMaterial({ color: 0x5d7489 });
    var doorDarkMat = new THREE.MeshLambertMaterial({ color: 0x1b2936 });
    var interiorFloorMat = new THREE.MeshLambertMaterial({ color: 0x59656d });
    var interiorWallMat = new THREE.MeshLambertMaterial({ color: 0xb9c6cb });
    var intCeilMat = new THREE.MeshLambertMaterial({ color: 0xd3dade });
    var poleMat = new THREE.MeshPhongMaterial({ color: 0xd0d4d8, shininess: 90, specular: 0x777777 });
    var seatMat = new THREE.MeshLambertMaterial({ color: 0x2b6aa0 });
    var seatBackMat = new THREE.MeshLambertMaterial({ color: 0x1d4f7d });
    var trimMat = new THREE.MeshPhongMaterial({ color: 0xc3c9ce, shininess: 60, specular: 0x777777 });
    var lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    var lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.18, depthWrite: false });

    // Train interior floor/ceiling/walls, visible through open doors.
    var floorMesh = new THREE.Mesh(new THREE.BoxGeometry(trainBodyW - 0.35, 0.06, trainLength - 0.25), interiorFloorMat);
    floorMesh.position.set(trackCenterX, trainFloorTop + 0.015, 0);
    worldGroup.add(floorMesh);

    var intCeil = new THREE.Mesh(new THREE.BoxGeometry(trainBodyW - 0.45, 0.06, trainLength - 0.3), intCeilMat);
    intCeil.position.set(trackCenterX, roofY - 0.35, 0);
    worldGroup.add(intCeil);

    var intWallGeo = new THREE.BoxGeometry(0.06, 2.65, trainLength - 0.4);
    // Keep the wall-facing side continuous, but leave the platform side physically/visually open at doors.
    var intWallOuter = new THREE.Mesh(intWallGeo, interiorWallMat);
    intWallOuter.position.set(outerSideX - 0.18, trainFloorTop + 1.48, 0);
    worldGroup.add(intWallOuter);

    // Door layout: more doors for a full-length train, with only platform-side doors open.
    var doorCount = 5;
    var doorWidth = 1.75;
    var doorHeight = 2.45;
    var doorCenters = [];
    var usableLen = trainLength - 12;
    var doorSpacing = usableLen / (doorCount - 1);
    for (var dc = 0; dc < doorCount; dc++) {
      doorCenters.push(-usableLen / 2 + dc * doorSpacing);
    }

    function isDoorGap(z0, z1) {
      for (var i = 0; i < doorCenters.length; i++) {
        if (z1 > doorCenters[i] - doorWidth / 2 && z0 < doorCenters[i] + doorWidth / 2) return true;
      }
      return false;
    }

    // Exterior side walls. Side 0/platform side has door holes. Side 1/wall side is solid with closed doors.
    for (var side = 0; side < 2; side++) {
      var wallX = side === 0 ? platformSideX : outerSideX;
      var outward = side === 0 ? -1 : 1;
      var openSide = side === 0;
      var prevZ = -trainHalf;

      for (var d = 0; d < doorCount; d++) {
        var doorZ = doorCenters[d];
        var doorStart = doorZ - doorWidth / 2;
        var doorEnd = doorZ + doorWidth / 2;

        if (openSide && doorStart > prevZ) {
          addTrainWallSegment(wallX, bodyCenterY, (prevZ + doorStart) / 2, wallThickness, trainBodyH, doorStart - prevZ, exteriorMat, side);
        }

        if (openSide) {
          // Above-door lintel keeps the train body continuous while the entry below is open.
          var aboveDoorH = trainBodyH - doorHeight;
          addTrainWallSegment(wallX, trainFloorY + doorHeight + aboveDoorH / 2, doorZ, wallThickness, aboveDoorH, doorWidth, exteriorMat, side);
          addOpenDoorDetails(wallX, outward, doorZ, doorWidth, doorHeight, trainFloorTop, trainBodyH, doorMat, doorDarkMat, glassMat, trimMat);
        }

        prevZ = doorEnd;
      }

      if (openSide && prevZ < trainHalf) {
        addTrainWallSegment(wallX, bodyCenterY, (prevZ + trainHalf) / 2, wallThickness, trainBodyH, trainHalf - prevZ, exteriorMat, side);
      }

      if (!openSide) {
        // Closed wall side: one continuous body, then explicit closed doors/windows on top.
        addTrainWallSegment(wallX, bodyCenterY, 0, wallThickness, trainBodyH, trainLength, exteriorMat, side);
      }

      // Long route stripes and lower skirt make it read as a real subway car, not a box.
      addSideStrip(wallX + outward * 0.082, trainFloorTop + 2.65, 0, trainLength, 0.18, blueBandMat, side);
      addSideStrip(wallX + outward * 0.086, trainFloorTop + 2.28, 0, trainLength, 0.10, whiteBandMat, side);
      addSideStrip(wallX + outward * 0.09, trainFloorTop + 0.18, 0, trainLength, 0.28, rubberMat, side);

      // Windows between doors and closed door faces.
      var bayCount = 12;
      for (var w = 0; w < bayCount; w++) {
        var z = -trainHalf + 4 + w * ((trainLength - 8) / (bayCount - 1));
        if (!isDoorGap(z - 0.55, z + 0.55)) {
          addTrainWindow(wallX + outward * 0.108, trainFloorTop + 2.0, z, 1.08, 0.62, glassMat, windowFrameMat, side);
        }
      }

      for (var cd = 0; cd < doorCenters.length; cd++) {
        if (!openSide) {
          addClosedDoor(wallX + outward * 0.11, outward, doorCenters[cd], doorWidth, doorHeight, trainFloorTop, side, doorMat, doorDarkMat, glassMat, trimMat);
        }
      }
    }

    // Platform-side thresholds at open doors.
    var thresholdMat = new THREE.MeshPhongMaterial({ color: 0x9ca8b2, shininess: 90, specular: 0x555566 });
    for (var th = 0; th < doorCenters.length; th++) {
      var threshold = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.045, doorWidth * 0.95), thresholdMat);
      threshold.position.set(platformSideX + 0.2, trainFloorTop + 0.035, doorCenters[th]);
      worldGroup.add(threshold);
    }

    // Car joints, roof detail and undercarriage. Joints are exterior bands only;
    // never draw a full black cross-section through the interior walkway.
    for (var cj = -2; cj <= 2; cj++) {
      if (cj === 0) continue;
      var jz = cj * trainLength / 6;
      addExteriorJointBand(platformSideX - 0.09, outerSideX + 0.09, bodyCenterY, jz, trainBodyH, rubberMat);
    }

    var roofMat = new THREE.MeshLambertMaterial({ color: 0x9aa8b0 });
    var roof = new THREE.Mesh(new THREE.BoxGeometry(trainBodyW * 0.86, 0.34, trainLength), roofMat);
    roof.position.set(trackCenterX, roofY + 0.18, 0);
    worldGroup.add(roof);
    var roofCurveGeo = new THREE.BoxGeometry(0.22, 0.22, trainLength);
    var roofCurveL = new THREE.Mesh(roofCurveGeo, roofMat);
    roofCurveL.position.set(trackCenterX - trainBodyW * 0.42, roofY + 0.08, 0);
    worldGroup.add(roofCurveL);
    var roofCurveR = new THREE.Mesh(roofCurveGeo, roofMat);
    roofCurveR.position.set(trackCenterX + trainBodyW * 0.42, roofY + 0.08, 0);
    worldGroup.add(roofCurveR);

    var hvacGeo = new THREE.BoxGeometry(1.1, 0.22, 3.2);
    var hvacMat = new THREE.MeshLambertMaterial({ color: 0x707b82 });
    for (var hv = 0; hv < 5; hv++) {
      var hz = -trainHalf + 8 + hv * ((trainLength - 16) / 4);
      var hvac = new THREE.Mesh(hvacGeo, hvacMat);
      hvac.position.set(trackCenterX, roofY + 0.47, hz);
      worldGroup.add(hvac);
    }

    var under = new THREE.Mesh(new THREE.BoxGeometry(trainBodyW * 0.86, 0.42, trainLength * 0.98), rubberMat);
    under.position.set(trackCenterX, trainFloorY - 0.1, 0);
    worldGroup.add(under);

    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
    var wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.16, 12);
    var bogiePositions = [-trainLength * 0.42, -trainLength * 0.24, -trainLength * 0.06, trainLength * 0.12, trainLength * 0.30, trainLength * 0.45];
    for (var b = 0; b < bogiePositions.length; b++) {
      for (var ws = 0; ws < 2; ws++) {
        var wheelX = trackCenterX + (ws === 0 ? -1.0 : 1.0);
        var wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wheelX, 0.35, bogiePositions[b]);
        worldGroup.add(wheel);
      }
    }

    // More realistic front/back: windshields, route sign and headlights.
    var endMat = new THREE.MeshLambertMaterial({ color: 0x486b83 });
    var windMat = new THREE.MeshLambertMaterial({ color: 0x10202b });
    var headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    var routeMat = Game.Materials.makeSignMaterial('LINE A', 'CENTRAL', '#0b58a2', '#ffffff');
    for (var end = 0; end < 2; end++) {
      var endZ = end === 0 ? trainHalf : -trainHalf;
      var face = new THREE.Mesh(new THREE.BoxGeometry(trainBodyW, trainBodyH, wallThickness), endMat);
      face.position.set(trackCenterX, bodyCenterY, endZ);
      worldGroup.add(face);

      var sign = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.36), routeMat);
      sign.position.set(trackCenterX, trainFloorTop + 3.1, endZ + (end === 0 ? 0.095 : -0.095));
      sign.rotation.y = end === 0 ? 0 : Math.PI;
      worldGroup.add(sign);

      var wind = new THREE.Mesh(new THREE.PlaneGeometry(trainBodyW * 0.62, 1.0), windMat);
      wind.position.set(trackCenterX, trainFloorTop + 2.2, endZ + (end === 0 ? 0.10 : -0.10));
      wind.rotation.y = end === 0 ? 0 : Math.PI;
      worldGroup.add(wind);

      for (var hl = 0; hl < 2; hl++) {
        var hlX = trackCenterX + (hl === 0 ? -trainBodyW * 0.32 : trainBodyW * 0.32);
        var headlight = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), headlightMat);
        headlight.position.set(hlX, trainFloorTop + 0.55, endZ + (end === 0 ? 0.11 : -0.11));
        headlight.rotation.y = end === 0 ? 0 : Math.PI;
        worldGroup.add(headlight);
      }
    }

    // Interior: benches, poles, grab straps, light strips, line maps.
    var seatGeo = new THREE.BoxGeometry(0.48, 0.09, 1.55);
    var seatBackGeo = new THREE.BoxGeometry(0.08, 0.62, 1.55);
    var handleGeo = new THREE.TorusGeometry(0.12, 0.018, 6, 12);
    var poleGeo = new THREE.CylinderGeometry(0.035, 0.035, trainBodyH - 0.65, 8);
    var routeMapMat = Game.Materials.makeSignMaterial('LINE A', 'Central  •  Street  •  Museum', '#ffffff', '#153d72');

    var seatRows = 18;
    for (var sr = 0; sr < seatRows; sr++) {
      var sz = -trainHalf + 4 + sr * ((trainLength - 8) / (seatRows - 1));
      if (isDoorGap(sz - 0.7, sz + 0.7)) continue;
      addSeat(platformSideX + 0.45, sz, seatGeo, seatBackGeo, seatMat, seatBackMat, trainFloorTop, 0);
      addSeat(outerSideX - 0.45, sz, seatGeo, seatBackGeo, seatMat, seatBackMat, trainFloorTop, 1);
    }

    for (var pi = 0; pi < doorCenters.length; pi++) {
      var pz = doorCenters[pi];
      var poleA = new THREE.Mesh(poleGeo, poleMat);
      poleA.position.set(trackCenterX - 0.75, trainFloorTop + (trainBodyH - 0.65) / 2, pz);
      worldGroup.add(poleA);
      var poleB = new THREE.Mesh(poleGeo, poleMat);
      poleB.position.set(trackCenterX + 0.75, trainFloorTop + (trainBodyH - 0.65) / 2, pz);
      worldGroup.add(poleB);
    }

    var handleCount = 16;
    for (var gh = 0; gh < handleCount; gh++) {
      var gz = -trainHalf + 3 + gh * ((trainLength - 6) / (handleCount - 1));
      for (var gxI = 0; gxI < 2; gxI++) {
        var gx = trackCenterX + (gxI === 0 ? -0.85 : 0.85);
        var handle = new THREE.Mesh(handleGeo, poleMat);
        handle.position.set(gx, roofY - 0.95, gz);
        handle.rotation.x = Math.PI / 2;
        worldGroup.add(handle);
      }
    }

    var lightStripGeo = new THREE.BoxGeometry(0.38, 0.035, 5.0);
    var glowGeo = new THREE.PlaneGeometry(1.1, 5.5);
    for (var li = 0; li < 9; li++) {
      var lz = -trainHalf + 5 + li * ((trainLength - 10) / 8);
      var lightStrip = new THREE.Mesh(lightStripGeo, lightMat);
      lightStrip.position.set(trackCenterX, roofY - 0.42, lz);
      worldGroup.add(lightStrip);
      var glow = new THREE.Mesh(glowGeo, lightGlowMat);
      glow.rotation.x = Math.PI / 2;
      glow.position.set(trackCenterX, roofY - 0.46, lz);
      worldGroup.add(glow);
    }

    for (var rm = 0; rm < 4; rm++) {
      var rz = -trainHalf + 12 + rm * ((trainLength - 24) / 3);
      var routeMap = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), routeMapMat);
      routeMap.position.set(outerSideX - 0.19, trainFloorTop + 2.72, rz);
      routeMap.rotation.y = -Math.PI / 2;
      worldGroup.add(routeMap);
    }

    buildTrain.doors = doorCenters;
    buildTrain.trackCenterX = trackCenterX;
    buildTrain.trainBodyW = trainBodyW;
    buildTrain.trainFloorTop = trainFloorTop;
    buildTrain.trainFloorY = trainFloorY;
    buildTrain.trainBodyH = trainBodyH;
    buildTrain.trainLength = trainLength;
    buildTrain.doorWidth = doorWidth;
    buildTrain.doorHeight = doorHeight;
  }

  function addTrainWallSegment(x, y, z, width, height, depth, material, side) {
    var seg = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    seg.position.set(x, y, z);
    worldGroup.add(seg);
  }

  function addSideStrip(x, y, z, length, height, mat, side) {
    var strip = new THREE.Mesh(new THREE.PlaneGeometry(length, height), mat);
    strip.position.set(x, y, z);
    strip.rotation.y = side === 0 ? -Math.PI / 2 : Math.PI / 2;
    worldGroup.add(strip);
  }

  function addSidePanel(x, y, z, width, height, mat, side) {
    var panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    panel.position.set(x, y, z);
    panel.rotation.y = side === 0 ? -Math.PI / 2 : Math.PI / 2;
    worldGroup.add(panel);
  }

  function addTrainWindow(x, y, z, width, height, glassMat, frameMat, side) {
    // Obvious dark frame + translucent blue glass. These are deliberately explicit
    // geometry so windows do not get confused with doors in the texture.
    addSidePanel(x, y, z, width + 0.12, height + 0.12, frameMat, side);
    addSidePanel(x + (side === 0 ? -0.01 : 0.01), y, z, width, height, glassMat, side);
  }

  function addExteriorJointBand(minX, maxX, y, z, height, mat) {
    // Two side strips and a roof strip only — no black wall through the aisle.
    var sideH = new THREE.BoxGeometry(0.08, height, 0.08);
    var left = new THREE.Mesh(sideH, mat);
    left.position.set(minX, y, z);
    worldGroup.add(left);
    var right = new THREE.Mesh(sideH, mat);
    right.position.set(maxX, y, z);
    worldGroup.add(right);
    var top = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.08, 0.08), mat);
    top.position.set((minX + maxX) / 2, y + height / 2 - 0.04, z);
    worldGroup.add(top);
    var bottom = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.08, 0.08), mat);
    bottom.position.set((minX + maxX) / 2, y - height / 2 + 0.12, z);
    worldGroup.add(bottom);
  }

  function addOpenDoorDetails(wallX, outward, z, doorW, doorH, floorY, trainH, doorMat, darkMat, glassMat, trimMat) {
    var frameX = wallX + outward * 0.105;
    var side = outward < 0 ? 0 : 1;

    // Dark interior doorway opening.
    // No dark panel here: the doorway is genuinely open so the player can see
    // through to the train interior while walking through it.

    // Door leaves are slid open to both sides, proving this side is open.
    var leafW = doorW * 0.38;
    for (var i = 0; i < 2; i++) {
      var dz = z + (i === 0 ? -doorW * 0.62 : doorW * 0.62);
      addSidePanel(frameX + outward * 0.012, floorY + doorH * 0.50, dz, leafW, doorH * 0.9, doorMat, side);
      addSidePanel(frameX + outward * 0.018, floorY + doorH * 0.70, dz, leafW * 0.65, 0.42, glassMat, side);
    }

    // Bright metal jambs and overhead trim.
    var jambGeo = new THREE.BoxGeometry(0.06, doorH, 0.055);
    var leftJamb = new THREE.Mesh(jambGeo, trimMat);
    leftJamb.position.set(wallX + outward * 0.13, floorY + doorH / 2, z - doorW / 2);
    worldGroup.add(leftJamb);
    var rightJamb = new THREE.Mesh(jambGeo, trimMat);
    rightJamb.position.set(wallX + outward * 0.13, floorY + doorH / 2, z + doorW / 2);
    worldGroup.add(rightJamb);
    var topJamb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, doorW), trimMat);
    topJamb.position.set(wallX + outward * 0.13, floorY + doorH, z);
    worldGroup.add(topJamb);
  }

  function addClosedDoor(x, outward, z, doorW, doorH, floorY, side, doorMat, darkMat, glassMat, trimMat) {
    addSidePanel(x, floorY + doorH * 0.50, z, doorW * 0.92, doorH * 0.92, doorMat, side);
    addSidePanel(x + outward * 0.012, floorY + doorH * 0.72, z, doorW * 0.55, 0.46, glassMat, side);
    var seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH * 0.82, 0.035), darkMat);
    seam.position.set(x + outward * 0.018, floorY + doorH * 0.50, z);
    worldGroup.add(seam);
    var edgeA = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH, 0.035), trimMat);
    edgeA.position.set(x + outward * 0.02, floorY + doorH / 2, z - doorW / 2);
    worldGroup.add(edgeA);
    var edgeB = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH, 0.035), trimMat);
    edgeB.position.set(x + outward * 0.02, floorY + doorH / 2, z + doorW / 2);
    worldGroup.add(edgeB);
  }

  function addSeat(x, z, seatGeo, seatBackGeo, seatMat, seatBackMat, floorY, side) {
    var seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(x, floorY + 0.26, z);
    worldGroup.add(seat);

    var back = new THREE.Mesh(seatBackGeo, seatBackMat);
    // Seat backs sit against the walls; players face inward toward the aisle.
    var backX = side === 0 ? x - 0.24 : x + 0.24;
    back.position.set(backX, floorY + 0.55, z);
    worldGroup.add(back);
  }

  // --- Pillars (down the center of the platform) ---
  function buildPillars(W, pHalfL, pHalfW, ceilingH) {
    var pillarMat = Game.Materials.get('pillar');
    var tex = pillarMat.map;
    if (tex) tex.repeat.set(1, 4);

    var pillarSize = 0.9;
    var pillarGeo = new THREE.BoxGeometry(pillarSize, ceilingH, pillarSize);
    // Max 4 pillars per row, evenly spaced
    var pillarCount = 4;
    var spacing = (pHalfL * 2) / (pillarCount + 1);
    var startZ = -pHalfL + spacing;
    var rowOffset = pHalfW * 0.35;

    for (var i = 0; i < pillarCount; i++) {
      var z = startZ + i * spacing;

      var pL = new THREE.Mesh(pillarGeo, pillarMat);
      pL.position.set(-rowOffset, ceilingH / 2, z);
      worldGroup.add(pL);

      var pR = new THREE.Mesh(pillarGeo, pillarMat);
      pR.position.set(rowOffset, ceilingH / 2, z);
      worldGroup.add(pR);
    }
  }

  // --- Safety lines ---
  function buildSafetyLines(pHalfL, pHalfW) {
    var lineGeo = new THREE.PlaneGeometry(0.5, pHalfL * 2);

    for (var side = 0; side < 2; side++) {
      var tex = Game.Textures.get('safetyLine');
      var mat = new THREE.MeshLambertMaterial({ map: tex });
      if (mat.map) mat.map.repeat.set(1, 30);
      var line = new THREE.Mesh(lineGeo, mat);
      line.rotation.x = -Math.PI / 2;
      var x = side === 0 ? pHalfW - 0.35 : -pHalfW + 0.35;
      line.position.set(x, Game.Config.world.platformHeight + 0.02, 0);
      worldGroup.add(line);
    }
  }

  // --- Ceiling light strips ---
  function buildLightStrips(W, halfL, ceilingH, pHalfW, trackW) {
    var housingMat = Game.Materials.get('lightHousing');
    var panelMat = Game.Materials.get('lightPanel');
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.1
    });

    var stripCount = 8;
    var stripSpacing = (halfL * 2) / (stripCount + 1);

    var rowX = [0, -(pHalfW + trackW / 2), pHalfW + trackW / 2];
    var rowWidth = [W.platformWidth * 0.5, trackW * 0.6, trackW * 0.6];

    // Ceiling hole Z extents (matching buildCeiling calculations).
    var pHalfLCeiling = W.platformLength / 2;
    var stairRunCeiling = 18 * 0.32;
    var ceilingHoleStart = pHalfLCeiling + 0.15;
    var ceilingHoleEnd = pHalfLCeiling + 0.35 + stairRunCeiling + 2.35;

    for (var row = 0; row < 3; row++) {
      var housingW = rowWidth[row];

      for (var i = 0; i < stripCount; i++) {
        var z = -halfL + (i + 1) * stripSpacing;
        var stripLen = stripSpacing * 0.55;

        // Skip strips whose bounding box overlaps either stairwell ceiling
        // hole. The last strip on each end extends into the opening and
        // causes the lamp to clip/fly into the void.
        var stripNearZ = Math.abs(z) - stripLen / 2;
        var stripFarZ = Math.abs(z) + stripLen / 2;
        if (stripFarZ > ceilingHoleStart) continue;

        var housing = new THREE.Mesh(
          new THREE.BoxGeometry(housingW, 0.15, stripLen),
          housingMat
        );
        housing.position.set(rowX[row], ceilingH - 0.1, z);
        worldGroup.add(housing);

        var panel = new THREE.Mesh(
          new THREE.PlaneGeometry(housingW * 0.85, stripLen * 0.85),
          panelMat
        );
        panel.rotation.x = Math.PI / 2;
        panel.position.set(rowX[row], ceilingH - 0.18, z);
        worldGroup.add(panel);

        if (row === 0) {
          var glow = new THREE.Mesh(
            new THREE.PlaneGeometry(housingW * 2.5, stripLen * 1.5),
            glowMat
          );
          glow.rotation.x = Math.PI / 2;
          glow.position.set(rowX[row], ceilingH - 0.25, z);
          worldGroup.add(glow);
        }
      }
    }
  }

  // --- Signs ---
  function buildSigns(W, pHalfL, pHalfW, ceilingH, halfL, leftWallX, rightWallX) {
    // Keep station signs on the visible side walls, not behind/inside the stair openings.
    var stationMat = Game.Materials.makeSignMaterial('CENTRAL STATION', 'LINE A', '#003a7a', '#ffffff');
    var platformMat = Game.Materials.makeSignMaterial('PLATFORM 1', '', '#1a1a2a', '#6cf');
    var lineMat = Game.Materials.makeSignMaterial('LINE A', 'CENTRAL', '#1a1a2a', '#ff6');

    // Hanging platform signs in the open middle of the lower station.
    var hangPositions = [-pHalfL * 0.35, pHalfL * 0.35];
    for (var h = 0; h < hangPositions.length; h++) {
      var hang = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), platformMat);
      hang.position.set(0, ceilingH - 1.2, hangPositions[h]);
      hang.rotation.x = Math.PI / 2;
      worldGroup.add(hang);
    }

    // Side-wall station identity signs, away from stairs.
    for (var side = 0; side < 2; side++) {
      var wallX = side === 0 ? leftWallX + 0.2 : rightWallX - 0.2;
      var rot = side === 0 ? Math.PI / 2 : -Math.PI / 2;
      var central = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.55), stationMat);
      central.position.set(wallX, 3.7, 0);
      central.rotation.y = rot;
      worldGroup.add(central);

      for (var pos = 0; pos < 3; pos++) {
        var z = (pos - 1) * pHalfL * 0.55;
        if (Math.abs(z) < 1) continue;
        var line = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.2), lineMat);
        line.position.set(wallX, 3.5, z);
        line.rotation.y = rot;
        worldGroup.add(line);
      }
    }
  }

  // --- Benches (in the middle of the platform) ---
  function buildBenches(pHalfL, pHalfW) {
    var benchMat = Game.Materials.get('bench');
    var legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // Back-to-back bench banks: two benches separated slightly so the backs touch in the middle.
    var benchPositions = [
      [0.38, -pHalfL * 0.6, 0],
      [-0.38, -pHalfL * 0.6, Math.PI],
      [0.38, pHalfL * 0.2, 0],
      [-0.38, pHalfL * 0.2, Math.PI],
      [0.38, pHalfL * 0.7, 0],
      [-0.38, pHalfL * 0.7, Math.PI],
    ];

    var seatGeo = new THREE.BoxGeometry(0.5, 0.08, 2.5);
    var backGeo = new THREE.BoxGeometry(0.08, 0.6, 2.5);
    var legGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);

    for (var i = 0; i < benchPositions.length; i++) {
      var p = benchPositions[i];
      var benchGroup = new THREE.Group();

      var seat = new THREE.Mesh(seatGeo, benchMat);
      seat.position.y = 0.5;
      benchGroup.add(seat);

      // Back rest on the side facing AWAY from center (outward toward tracks)
      // rotation 0 = facing +X, back at +X side. rotation PI = facing -X, back at -X side.
      // For back-to-back: one bench has back at center side (-X for rotation 0 bench),
      // other has back at center side (+X for rotation PI bench).
      // Actually for back-to-back: both backs should be at the CENTER.
      // Bench facing +X (rotation 0): person sits facing +X, back is behind them at -X (center).
      // Bench facing -X (rotation PI): person sits facing -X, back is behind them at +X (center).
      // So back is at center for both — they share a back wall.
      var back = new THREE.Mesh(backGeo, benchMat);
      // For rotation 0: back at x=-0.2 (center side). For rotation PI: back at x=+0.2 (center side).
      // But we rotate the whole group, so just put back at x=+0.2 in local space and rotate group.
      // When group rotation = 0: back at +0.2 (right side = outward). That's wrong.
      // Let me think differently:
      // Local: seat at origin, back at x = +0.2 (behind someone sitting facing -X direction)
      // Group rotation 0: facing -X? No...
      // Simpler: put back at local x = -0.2 (toward center when rotation=0 facing +X)
      // When rotation = PI, local x=-0.2 becomes world x=+0.2 (toward center when facing -X)
      // So back at local x = -0.2 works for both! Back-to-back at center.
      back.position.set(-0.2, 0.8, 0);
      benchGroup.add(back);

      for (var lz = -1.1; lz <= 1.1; lz += 2.2) {
        var leg1 = new THREE.Mesh(legGeo, legMat);
        leg1.position.set(0.15, 0.25, lz);
        benchGroup.add(leg1);
        var leg2 = new THREE.Mesh(legGeo, legMat);
        leg2.position.set(-0.15, 0.25, lz);
        benchGroup.add(leg2);
      }

      benchGroup.position.set(p[0], Game.Config.world.platformHeight, p[1]);
      benchGroup.rotation.y = p[2];
      worldGroup.add(benchGroup);
    }
  }

  // --- Trash bins ---
  function buildTrashBins(pHalfL, pHalfW) {
    var binMat = Game.Materials.get('trashBin');
    var binGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.8, 12);
    var lidGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.05, 12);

    var positions = [
      [pHalfW * 0.5, -pHalfL * 0.4],
      [-pHalfW * 0.5, pHalfL * 0.4],
      [pHalfW * 0.5, pHalfL * 0.6],
      [-pHalfW * 0.5, -pHalfL * 0.7],
    ];

    for (var i = 0; i < positions.length; i++) {
      var bin = new THREE.Mesh(binGeo, binMat);
      bin.position.set(positions[i][0], Game.Config.world.platformHeight + 0.4, positions[i][1]);
      worldGroup.add(bin);

      var lid = new THREE.Mesh(lidGeo, binMat);
      lid.position.set(positions[i][0], Game.Config.world.platformHeight + 0.82, positions[i][1]);
      worldGroup.add(lid);
    }
  }

  // --- Vending machines ---
  function buildVendingMachines(pHalfL, pHalfW) {
    var sideMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    var glowMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.08 });

    var positions = [
      [-pHalfW * 0.7, pHalfL - 2, 0],
      [pHalfW * 0.7, -pHalfL + 2, Math.PI],
    ];

    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var group = new THREE.Group();

      var body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.8), sideMat);
      group.add(body);

      var vendMat = Game.Materials.get('vending');
      var frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.9), vendMat);
      frontPanel.position.z = 0.41;
      group.add(frontPanel);

      var glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), glowMat);
      glow.position.z = 0.42;
      group.add(glow);

      group.name = 'vending-machine-' + i;
      group.userData.isVendingMachine = true;
      body.userData.isVendingMachine = true;
      frontPanel.userData.isVendingMachine = true;
      glow.userData.isVendingMachine = true;

      group.position.set(p[0], Game.Config.world.platformHeight + 1, p[1]);
      group.rotation.y = p[2];
      worldGroup.add(group);

      // Register with pickups system after the mesh exists.
      if (Game.Pickups && Game.Pickups.registerVendingMachine) {
        Game.Pickups.registerVendingMachine(group, p[0], Game.Config.world.platformHeight + 1, p[1], glow);
      }
    }
  }

  // --- Help booth ---
  function buildHelpBooth(pHalfL, pHalfW) {
    var boothMat = Game.Materials.get('helpBooth');
    var glassMat = Game.Materials.get('glass');

    var boothGroup = new THREE.Group();

    var base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2), boothMat);
    base.position.y = 0.6;
    boothGroup.add(base);

    var upper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2), glassMat);
    upper.position.y = 1.8;
    boothGroup.add(upper);

    var roof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.15, 2.2), boothMat);
    roof.position.y = 2.5;
    boothGroup.add(roof);

    for (var s = 0; s < 4; s++) {
      var helpMat = Game.Materials.makeSignMaterial('HELP', '', '#aa0000', '#ffffff');
      var helpSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), helpMat);
      var angle = s * Math.PI / 2;
      helpSign.position.set(Math.sin(angle) * 1.01, 2.7, Math.cos(angle) * 1.01);
      helpSign.rotation.y = angle;
      boothGroup.add(helpSign);
    }

    boothGroup.position.set(-pHalfW * 0.5, Game.Config.world.platformHeight, pHalfL * 0.85);
    worldGroup.add(boothGroup);
  }

  // --- Posters ---
  function buildPosters(W, pHalfL, ceilingH, leftX, rightX) {
    var frameMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    var posterGeo = new THREE.PlaneGeometry(1.8, 2.5);
    var frameGeo = new THREE.BoxGeometry(1.9, 2.6, 0.05);
    var zPositions = [-pHalfL * 0.7, -pHalfL * 0.3, pHalfL * 0.2, pHalfL * 0.6];

    for (var side = 0; side < 2; side++) {
      var wallX = side === 0 ? leftX + 0.2 : rightX - 0.2;
      var rot = side === 0 ? Math.PI / 2 : -Math.PI / 2;

      for (var i = 0; i < zPositions.length; i++) {
        var frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(wallX, 3.0, zPositions[i]);
        frame.rotation.y = rot;
        worldGroup.add(frame);

        var pMat = new THREE.MeshLambertMaterial({ map: Game.Textures.get('transitPoster') });
        var poster = new THREE.Mesh(posterGeo, pMat);
        poster.position.set(wallX, 3.0, zPositions[i]);
        poster.rotation.y = rot;
        if (side === 0) poster.position.x += 0.03;
        else poster.position.x -= 0.03;
        worldGroup.add(poster);
      }
    }
  }

  // --- Graphic route bands / wall trim ---
  function buildWallTrim(W, pHalfL, leftX, rightX) {
    var blueMat = new THREE.MeshBasicMaterial({ color: 0x1e6fae });
    var yellowMat = new THREE.MeshBasicMaterial({ color: 0xe0b21b });
    var darkMat = new THREE.MeshBasicMaterial({ color: 0x101820 });

    var bands = [
      { y: 2.05, h: 0.18, mat: blueMat },
      { y: 1.80, h: 0.08, mat: yellowMat },
      { y: 1.65, h: 0.05, mat: darkMat }
    ];

    for (var side = 0; side < 2; side++) {
      var wallX = side === 0 ? leftX + 0.035 : rightX - 0.035;
      var rot = side === 0 ? Math.PI / 2 : -Math.PI / 2;
      for (var b = 0; b < bands.length; b++) {
        var band = new THREE.Mesh(new THREE.PlaneGeometry(pHalfL * 2, bands[b].h), bands[b].mat);
        band.position.set(wallX, bands[b].y, 0);
        band.rotation.y = rot;
        worldGroup.add(band);
      }
    }

    // Subtle center walkway line on the platform to add scale/depth.
    var centerMat = new THREE.MeshBasicMaterial({ color: 0x4e5c66, transparent: true, opacity: 0.35 });
    var centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, pHalfL * 2), centerMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, Game.Config.world.platformHeight + 0.025, 0);
    worldGroup.add(centerLine);
  }

  // --- Dust particles ---
  function buildDustParticles(halfL, ceilingH, pHalfW) {
    var count = Game.Config.perf.maxDustParticles;
    var totalWidth = Game.Config.world.platformWidth + Game.Config.world.trackWidth * 2;
    var positions = new Float32Array(count * 3);

    for (var i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * totalWidth;
      positions[i * 3 + 1] = Math.random() * ceilingH;
      positions[i * 3 + 2] = (Math.random() - 0.5) * halfL * 2;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var mat = new THREE.PointsMaterial({
      color: 0xfff8dd, size: 0.04, transparent: true,
      opacity: 0.35, depthWrite: false, sizeAttenuation: true
    });

    dustParticles = new THREE.Points(geo, mat);
    worldGroup.add(dustParticles);
  }

  function updateDust(dt) {
    if (!dustParticles) return;
    var pos = dustParticles.geometry.attributes.position;
    var arr = pos.array;
    var ceilingH = Game.Config.world.ceilingHeight;
    for (var i = 0; i < arr.length; i += 3) {
      arr[i + 1] += dt * 0.12;
      if (arr[i + 1] > ceilingH) arr[i + 1] = 0;
    }
    pos.needsUpdate = true;
  }

  // --- Collision registration ---
  function registerCollisions(W, pHalfL, pHalfW, leftX, rightX, ceilingH, halfL, tunnelLen) {
    var C = Game.Collision;

    // Platform top
    C.addPlatformTop(-pHalfW, pHalfW, -pHalfL, pHalfL, W.platformHeight);

    // Platform edges (low curb — blocks at track level, doesn't block when on top or jumping up)
    var edgeT = 0.15;
    C.addBox(-pHalfW - edgeT, -pHalfW + edgeT, -pHalfL, pHalfL, 0, 0.3);
    C.addBox(pHalfW - edgeT, pHalfW + edgeT, -pHalfL, pHalfL, 0, 0.3);

    // Side walls
    C.addBox(leftX - 0.3, leftX + 0.3, -halfL, halfL, 0, ceilingH);
    C.addBox(rightX - 0.3, rightX + 0.3, -halfL, halfL, 0, ceilingH);

    // End walls with tunnel gaps and a central stair/upper-concourse opening.
    var tunnelH = 5.5;
    var tunnelHalfW = W.trackWidth / 2 + 0.2;
    var stairPortalHalfW = pHalfW + 0.15;
    var leftTrackCenterX = -(pHalfW + W.trackWidth / 2);
    var rightTrackCenterX = pHalfW + W.trackWidth / 2;

    function addEndWallCollision(z0, z1) {
      // Track-side wall segments.
      C.addBox(leftX, leftTrackCenterX - tunnelHalfW, z0, z1, 0, ceilingH);
      C.addBox(rightTrackCenterX + tunnelHalfW, rightX, z0, z1, 0, ceilingH);
      // Between tracks, split around the full-width stair portal.
      C.addBox(leftTrackCenterX + tunnelHalfW, -stairPortalHalfW, z0, z1, 0, tunnelH);
      C.addBox(stairPortalHalfW, rightTrackCenterX - tunnelHalfW, z0, z1, 0, tunnelH);
      // Upper lintel, also split around the stair opening so upstairs access is not blocked.
      C.addBox(leftX, -stairPortalHalfW, z0, z1, tunnelH, ceilingH);
      C.addBox(stairPortalHalfW, rightX, z0, z1, tunnelH, ceilingH);
    }

    // Front/back walls at station ends.
    addEndWallCollision(halfL - 0.3, halfL + 0.3);
    addEndWallCollision(-halfL - 0.3, -halfL + 0.3);

    // Tunnel entrance blocks (prevent walking into tunnels — invisible)
    C.addBox(leftTrackCenterX - tunnelHalfW, leftTrackCenterX + tunnelHalfW, halfL - 0.3, halfL + 0.3, 0, 5.5);
    C.addBox(leftTrackCenterX - tunnelHalfW, leftTrackCenterX + tunnelHalfW, -halfL - 0.3, -halfL + 0.3, 0, 5.5);
    C.addBox(rightTrackCenterX - tunnelHalfW, rightTrackCenterX + tunnelHalfW, halfL - 0.3, halfL + 0.3, 0, 5.5);
    C.addBox(rightTrackCenterX - tunnelHalfW, rightTrackCenterX + tunnelHalfW, -halfL - 0.3, -halfL + 0.3, 0, 5.5);

    // Tunnel deep blocks (prevent walking into tunnel)
    var tunnelBlockZ = halfL + tunnelLen * 0.7;
    C.addBox(leftTrackCenterX - tunnelHalfW, leftTrackCenterX + tunnelHalfW, tunnelBlockZ - 0.3, tunnelBlockZ + 0.3, 0, 5.5);
    C.addBox(leftTrackCenterX - tunnelHalfW, leftTrackCenterX + tunnelHalfW, -tunnelBlockZ - 0.3, -tunnelBlockZ + 0.3, 0, 5.5);
    C.addBox(rightTrackCenterX - tunnelHalfW, rightTrackCenterX + tunnelHalfW, tunnelBlockZ - 0.3, tunnelBlockZ + 0.3, 0, 5.5);
    C.addBox(rightTrackCenterX - tunnelHalfW, rightTrackCenterX + tunnelHalfW, -tunnelBlockZ - 0.3, -tunnelBlockZ + 0.3, 0, 5.5);

    // Train body — platform-side wall has open door gaps; wall-facing side is closed.
    var trainW2 = 5.0;
    var trainLen = pHalfL * 2;
    var trainFloorTop = W.platformHeight;
    var trainFloorY = W.platformHeight - 0.1;
    var trainBodyH = 4.25;
    var doorCount = 5;
    var doorWidth = 1.75;
    var usableTrainLen = trainLen - 12;
    var doorSpacing = usableTrainLen / (doorCount - 1);
    var wallT = 0.15;
    var doorCenters = [];
    for (var dc = 0; dc < doorCount; dc++) {
      doorCenters.push(-usableTrainLen / 2 + dc * doorSpacing);
    }

    // Interior floor (walkable surface inside the full-length train)
    C.addPlatformTop(
      rightTrackCenterX - trainW2/2 + wallT,
      rightTrackCenterX + trainW2/2 - wallT,
      -trainLen/2 + wallT,
      trainLen/2 - wallT,
      trainFloorTop
    );

    // Door threshold collision plates from platform edge into train, one per open platform-side door.
    for (var thDoor = 0; thDoor < doorCount; thDoor++) {
      var thDoorZ = doorCenters[thDoor];
      C.addPlatformTop(
        pHalfW - 0.15,
        rightTrackCenterX - trainW2/2 + 0.45,
        thDoorZ - doorWidth * 0.49,
        thDoorZ + doorWidth * 0.49,
        W.platformHeight
      );
    }

    // Platform-facing train side: solid segments between open doors, plus lintels above doors.
    var platformTrainWallX = rightTrackCenterX - trainW2/2;
    var tprevZ = -trainLen/2;
    for (var td = 0; td < doorCount; td++) {
      var tdoorZ = doorCenters[td];
      var tdoorStart = tdoorZ - doorWidth/2;
      var tdoorEnd = tdoorZ + doorWidth/2;

      if (tdoorStart > tprevZ) {
        C.addBox(
          platformTrainWallX - wallT/2, platformTrainWallX + wallT/2,
          tprevZ, tdoorStart,
          trainFloorY, trainFloorY + trainBodyH
        );
      }

      // Door lintel/overhead frame only; lower part is intentionally open.
      C.addBox(
        platformTrainWallX - wallT/2, platformTrainWallX + wallT/2,
        tdoorStart, tdoorEnd,
        trainFloorY + 2.45, trainFloorY + trainBodyH
      );

      tprevZ = tdoorEnd;
    }
    if (tprevZ < trainLen/2) {
      C.addBox(
        platformTrainWallX - wallT/2, platformTrainWallX + wallT/2,
        tprevZ, trainLen/2,
        trainFloorY, trainFloorY + trainBodyH
      );
    }

    // Wall-facing train side: closed/solid for the full platform length.
    var outerTrainWallX = rightTrackCenterX + trainW2/2;
    C.addBox(
      outerTrainWallX - wallT/2, outerTrainWallX + wallT/2,
      -trainLen/2, trainLen/2,
      trainFloorY, trainFloorY + trainBodyH
    );

    // Train end caps
    C.addBox(
      rightTrackCenterX - trainW2/2, rightTrackCenterX + trainW2/2,
      trainLen/2 - wallT, trainLen/2 + wallT,
      trainFloorY, trainFloorY + trainBodyH
    );
    C.addBox(
      rightTrackCenterX - trainW2/2, rightTrackCenterX + trainW2/2,
      -trainLen/2 - wallT, -trainLen/2 + wallT,
      trainFloorY, trainFloorY + trainBodyH
    );

    // Pillars (4 per row, matching visual count)
    var pillarCount = 4;
    var spacing = (pHalfL * 2) / (pillarCount + 1);
    var startZ = -pHalfL + spacing;
    var rowOffset = pHalfW * 0.35;
    for (var i = 0; i < pillarCount; i++) {
      var z = startZ + i * spacing;
      C.addBox(-rowOffset - 0.5, -rowOffset + 0.5, z - 0.5, z + 0.5, 0, ceilingH);
      C.addBox(rowOffset - 0.5, rowOffset + 0.5, z - 0.5, z + 0.5, 0, ceilingH);
    }

    // Exit stair ramps now rise from platform level toward the ceiling / upper concourse.
    var stepCount = 18;
    var stepDepth = 0.32;
    var stairWidth = pHalfW * 2;
    var stairTopY = ceilingH + 0.2;
    var upperFloorY = stairTopY;
    var run = stepCount * stepDepth;
    var topLandingDepth = 2.0;
    C.addStairRamp(-stairWidth/2, stairWidth/2,
      pHalfL, pHalfL + run,
      W.platformHeight, stairTopY, 'z');
    C.addPlatformTop(-stairWidth/2, stairWidth/2,
      pHalfL + run, pHalfL + run + 2.0,
      stairTopY);

    C.addStairRamp(-stairWidth/2, stairWidth/2,
      -pHalfL - run, -pHalfL,
      stairTopY, W.platformHeight, 'z');
    C.addPlatformTop(-stairWidth/2, stairWidth/2,
      -pHalfL - run - 2.0, -pHalfL - run,
      stairTopY);

    // Upper concourse collision: large second playable room above the station,
    // with holes kept open where both stair ramps come through.
    var upperW = Math.max(W.platformWidth * 2.6, 34);
    var upperL = Math.max(W.platformLength * 1.55, 120);
    var uHalfX = upperW / 2;
    var uHalfZ = upperL / 2;
    var uHoleW = W.platformWidth;
    var uHoleHalf = uHoleW / 2;
    var frontA = pHalfL;
    var frontB = pHalfL + run + topLandingDepth;
    var rearA = -pHalfL - run - topLandingDepth;
    var rearB = -pHalfL;
    function addUpperFloor(minX, maxX, minZ, maxZ) {
      if (maxX > minX && maxZ > minZ) C.addPlatformTop(minX, maxX, minZ, maxZ, upperFloorY);
    }
    addUpperFloor(-uHalfX, uHalfX, -uHalfZ, rearA);
    addUpperFloor(-uHalfX, uHalfX, rearB, frontA);
    addUpperFloor(-uHalfX, uHalfX, frontB, uHalfZ);
    addUpperFloor(-uHalfX, -uHoleHalf, frontA, frontB);
    addUpperFloor(uHoleHalf, uHalfX, frontA, frontB);
    addUpperFloor(-uHalfX, -uHoleHalf, rearA, rearB);
    addUpperFloor(uHoleHalf, uHalfX, rearA, rearB);

    // Collision for the glass/metal stair-hole rims and walls. Side glass
    // walls extend all the way down to y=0 (track bed) so players can't
    // jump off the stairs sideways onto the tracks. The stair run and
    // landing remain open.
    var upperRoomH = 6.4;
    var fullGlassTopY = stairTopY + upperRoomH;
    C.addBox(-uHoleHalf - 0.25, -uHoleHalf + 0.05, frontA, frontB, 0, fullGlassTopY);
    C.addBox(uHoleHalf - 0.05, uHoleHalf + 0.25, frontA, frontB, 0, fullGlassTopY);
    C.addBox(-uHoleHalf - 0.25, -uHoleHalf + 0.05, rearA, rearB, 0, fullGlassTopY);
    C.addBox(uHoleHalf - 0.05, uHoleHalf + 0.25, rearA, rearB, 0, fullGlassTopY);
    // Glass wall behind front stairs (bottom/platform edge)
    C.addBox(-uHoleHalf - 0.15, uHoleHalf + 0.15, frontA - 0.05, frontA + 0.05, stairTopY, stairTopY + upperRoomH);
    // Glass wall behind rear stairs (bottom/platform edge)
    C.addBox(-uHoleHalf - 0.15, uHoleHalf + 0.15, rearB - 0.05, rearB + 0.05, stairTopY, stairTopY + upperRoomH);
    C.addBox(-uHalfX - 0.12, -uHalfX + 0.12, -uHalfZ, uHalfZ, upperFloorY, upperFloorY + upperRoomH);
    C.addBox(uHalfX - 0.12, uHalfX + 0.12, -uHalfZ, uHalfZ, upperFloorY, upperFloorY + upperRoomH);
    C.addBox(-uHalfX, uHalfX, -uHalfZ - 0.12, -uHalfZ + 0.12, upperFloorY, upperFloorY + upperRoomH);
    C.addBox(-uHalfX, uHalfX, uHalfZ - 0.12, uHalfZ + 0.12, upperFloorY, upperFloorY + upperRoomH);

    var upXs = [-uHalfX * 0.55, 0, uHalfX * 0.55];
    var upZs = [-uHalfZ * 0.55, -uHalfZ * 0.25, 0, uHalfZ * 0.25, uHalfZ * 0.55];
    for (var ux = 0; ux < upXs.length; ux++) {
      for (var uz = 0; uz < upZs.length; uz++) {
        var px = upXs[ux], pz = upZs[uz];
        if (Math.abs(px) < uHoleHalf + 1 && ((pz > frontA - 2 && pz < frontB + 3) || (pz > rearA - 3 && pz < rearB + 2))) continue;
        C.addBox(px - 0.45, px + 0.45, pz - 0.45, pz + 0.45, upperFloorY, upperFloorY + upperRoomH);
      }
    }

    // Exit gate props on upper concourse.
    for (var gateI = 0; gateI < 5; gateI++) {
      var gx = -4 + gateI * 2;
      C.addBox(gx - 0.55, gx + 0.55, -uHalfZ + 0.55, -uHalfZ + 0.85, upperFloorY, upperFloorY + 1.5);
    }

    // Help booth
    C.addBox(-pHalfW * 0.5 - 1.3, -pHalfW * 0.5 + 1.3, pHalfL * 0.85 - 1, pHalfL * 0.85 + 1, W.platformHeight, W.platformHeight + 2.5);

    // Vending machines
    C.addBox(-pHalfW * 0.7 - 0.5, -pHalfW * 0.7 + 0.5, pHalfL - 2.5, pHalfL - 1.5, W.platformHeight, W.platformHeight + 2);
    C.addBox(pHalfW * 0.7 - 0.5, pHalfW * 0.7 + 0.5, -pHalfL + 1.5, -pHalfL + 2.5, W.platformHeight, W.platformHeight + 2);

    // Benches: broad collision for the back-to-back pair at each Z.
    var benchPositions = [[0, -pHalfL * 0.6], [0, pHalfL * 0.2], [0, pHalfL * 0.7]];
    for (var b = 0; b < benchPositions.length; b++) {
      C.addBox(
        benchPositions[b][0] - 0.85, benchPositions[b][0] + 0.85,
        benchPositions[b][1] - 1.3, benchPositions[b][1] + 1.3,
        W.platformHeight, W.platformHeight + 0.7
      );
    }

    // Trash bins
    var binPos = [
      [pHalfW * 0.5, -pHalfL * 0.4],
      [-pHalfW * 0.5, pHalfL * 0.4],
      [pHalfW * 0.5, pHalfL * 0.6],
      [-pHalfW * 0.5, -pHalfL * 0.7],
    ];
    for (var t = 0; t < binPos.length; t++) {
      C.addBox(
        binPos[t][0] - 0.3, binPos[t][0] + 0.3,
        binPos[t][1] - 0.3, binPos[t][1] + 0.3,
        W.platformHeight, W.platformHeight + 0.8
      );
    }
  }

  return {
    build: build,
    updateDust: updateDust,
    getWorldGroup: function() { return worldGroup; }
  };
})();
