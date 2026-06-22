/*
 * collision.js — Practical box/radius colliders
 * Collision data is separate from visual objects for easy editing.
 */

window.Game = window.Game || {};

Game.Collision = (function() {

  // Collider list: { type: 'box', minX, maxX, minZ, maxZ, minY, maxY }
  // type: 'box' — solid box, player can't pass through
  // type: 'floor' — walkable surface at height Y, player can stand on top
  // type: 'wall' — infinite-height wall (treat as box with very high maxY)

  var colliders = [];

  // Ground height function — determines the highest floor surface
  // under a given (x,z) position, or null if no floor.
  // For Stage 1, the entire station has a ground floor (track bed),
  // the platform is a raised box you can walk on,
  // and stairs create ramps.

  // Floor levels: tracks at y=0, platform at y=platformHeight
  // We compute ground height by checking all 'floor' type colliders.

  function addBox(minX, maxX, minZ, maxZ, minY, maxY) {
    colliders.push({
      type: 'box',
      minX: minX, maxX: maxX,
      minZ: minZ, maxZ: maxZ,
      minY: minY, maxY: maxY
    });
  }

  function addFloor(y) {
    colliders.push({
      type: 'floor',
      y: y,
      // Floor covers entire world
      minX: -1000, maxX: 1000,
      minZ: -1000, maxZ: 1000
    });
  }

  // Add a walkable platform top
  function addPlatformTop(minX, maxX, minZ, maxZ, topY) {
    colliders.push({
      type: 'floor',
      y: topY,
      minX: minX, maxX: maxX,
      minZ: minZ, maxZ: maxZ
    });
  }

  // Add stair as a ramp (floor with slope)
  // For simplicity, stairs are modeled as a series of steps or a ramp floor
  function addStairRamp(minX, maxX, minZ, maxZ, yLow, yHigh, axis) {
    colliders.push({
      type: 'ramp',
      minX: minX, maxX: maxX,
      minZ: minZ, maxZ: maxZ,
      yLow: yLow, yHigh: yHigh,
      // Direction of slope. Wide stairs are often wider than their run, so
      // callers can explicitly pass 'z' instead of relying on dimensions.
      axis: axis || ((Math.abs(maxZ - minZ) > Math.abs(maxX - minX)) ? 'z' : 'x')
    });
  }

  function getColliders() {
    return colliders;
  }

  function clear() {
    colliders = [];
  }

  // --- Ground height at position ---
  // Returns the highest floor surface Y at or below the player's previous Y,
  // or 0 (track bed) as default ground.
  // prevY = player's Y before applying this frame's velocity.
  function getGroundHeight(x, z, prevY) {
    var bestY = 0; // default: track bed covers entire station
    var found = false;

    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];

      if (c.type === 'floor') {
        if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
          // Only consider floors at or slightly above the player's previous
          // feet position. The small tolerance prevents falling through at
          // stair-to-landing / landing-to-upper-floor seams when sprinting.
          // It is still below platform height, so players won't snap from the
          // tracks straight onto the platform.
          var floorStepTolerance = 0.45;
          if (c.y <= prevY + floorStepTolerance) {
            if (c.y > bestY || !found) {
              bestY = c.y;
              found = true;
            }
          }
        }
      } else if (c.type === 'ramp') {
        if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
          var rampY;
          if (c.axis === 'z') {
            var t = (z - c.minZ) / (c.maxZ - c.minZ);
            rampY = c.yLow + (c.yHigh - c.yLow) * t;
          } else {
            var t2 = (x - c.minX) / (c.maxX - c.minX);
            rampY = c.yLow + (c.yHigh - c.yLow) * t2;
          }
          // Ramps/stairs must be climbable while walking forward. A strict
          // prevY+0.01 check makes the player step off the platform, miss the
          // next slightly-higher ramp sample, and fall through to y=0. Allow a
          // sane per-frame step-up tolerance for sloped stair ramps only.
          var stepUpTolerance = 1.35;
          if (rampY <= prevY + stepUpTolerance) {
            if (rampY > bestY || !found) {
              bestY = rampY;
              found = true;
            }
          }
        }
      }
    }

    return bestY;
  }

  // --- Collision resolution ---
  // Given a proposed new position (x, z) with radius r and current y,
  // returns adjusted (x, z) that avoids penetrating solid boxes.
  function resolveCircleBox(x, z, r, y) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (c.type !== 'box') continue;

      // Only collide if the box is at the player's vertical level
      // (box minY is below player feet + some tolerance, maxY is above player feet)
      var playerFeet = y;
      var playerHead = y + Game.Config.player.height;

      // Skip boxes that are entirely below the player's feet
      // (using a generous threshold so platform body doesn't block when standing on top)
      if (c.maxY < playerFeet - 0.3) continue;
      if (c.minY > playerHead + 0.1) continue;

      // Expand box by radius
      var bxMin = c.minX - r;
      var bxMax = c.maxX + r;
      var bzMin = c.minZ - r;
      var bzMax = c.maxZ + r;

      if (x > bxMin && x < bxMax && z > bzMin && z < bzMax) {
        // Player is penetrating — push out along the smallest penetration axis
        var penX1 = bxMax - x; // distance to push +X
        var penX2 = x - bxMin; // distance to push -X
        var penZ1 = bzMax - z;
        var penZ2 = z - bzMin;

        var minPen = Math.min(penX1, penX2, penZ1, penZ2);

        if (minPen === penX1) x = bxMax;
        else if (minPen === penX2) x = bxMin;
        else if (minPen === penZ1) z = bzMax;
        else z = bzMin;
      }
    }

    return { x: x, z: z };
  }

  return {
    addBox: addBox,
    addFloor: addFloor,
    addPlatformTop: addPlatformTop,
    addStairRamp: addStairRamp,
    getColliders: getColliders,
    clear: clear,
    getGroundHeight: getGroundHeight,
    resolveCircleBox: resolveCircleBox
  };
})();
