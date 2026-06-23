/*
 * materials.js — Shared materials using procedural textures
 */

window.Game = window.Game || {};

Game.Materials = (function() {

  var T = Game.Textures;
  var matCache = {};


  function loadTexture(path, repeatX, repeatY) {
    var tex = new THREE.TextureLoader().load(path);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX || 1, repeatY || 1);
    tex.anisotropy = 4;
    return tex;
  }

  function makePBR(asset, repeatX, repeatY, metalness, roughness) {
    var base = 'assets/textures/polyhaven/' + asset + '/';
    return new THREE.MeshStandardMaterial({
      map: loadTexture(base + 'diffuse.jpg', repeatX, repeatY),
      normalMap: loadTexture(base + 'nor_gl.jpg', repeatX, repeatY),
      roughnessMap: loadTexture(base + 'rough.jpg', repeatX, repeatY),
      metalness: metalness || 0,
      roughness: roughness == null ? 0.85 : roughness
    });
  }

  function get(name) {
    if (matCache[name]) return matCache[name];

    var m;

    switch(name) {
      case 'wall':
        m = makePBR('concrete_block_wall_02', 8, 3, 0, 0.9);
        break;

      case 'floor':
        m = makePBR('concrete_floor_worn_001', 6, 14, 0, 0.92);
        break;

      case 'trackbed':
        m = new THREE.MeshLambertMaterial({ map: T.get('trackBed') });
        break;

      case 'pillar':
        m = new THREE.MeshLambertMaterial({ map: T.get('pillarTexture') });
        break;

      case 'ceiling':
        m = new THREE.MeshLambertMaterial({ map: T.get('ceilingTexture') });
        break;

      case 'bench':
        m = new THREE.MeshLambertMaterial({ map: T.get('benchTexture') });
        break;

      case 'rail':
        m = new THREE.MeshPhongMaterial({ map: T.get('metalTexture'), shininess: 100, specular: 0x888888 });
        break;

      case 'safetyLine':
        m = new THREE.MeshLambertMaterial({ map: T.get('safetyLine') });
        break;

      case 'trainBody':
        m = makePBR('blue_metal_plate', 4, 1, 0.45, 0.55);
        break;

      case 'metal':
        m = makePBR('blue_metal_plate', 2, 2, 0.55, 0.5);
        break;

      case 'darkMetal':
        m = new THREE.MeshPhongMaterial({ color: 0x333344, shininess: 60, specular: 0x222233 });
        break;

      case 'glass':
        m = new THREE.MeshLambertMaterial({ color: 0x223344, transparent: true, opacity: 0.35 });
        break;

      case 'trashBin':
        m = new THREE.MeshPhongMaterial({ color: 0x444, shininess: 30, specular: 0x222 });
        break;

      case 'vending':
        m = new THREE.MeshLambertMaterial({ map: T.get('vendingMachine') });
        break;

      case 'poster':
        m = new THREE.MeshLambertMaterial({ map: T.get('transitPoster') });
        break;

      case 'lightHousing':
        m = new THREE.MeshLambertMaterial({ color: 0x888888 });
        break;

      case 'lightPanel':
        m = new THREE.MeshBasicMaterial({ color: 0xffffff });
        break;

      case 'sleeper':
        m = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
        break;

      case 'stair':
        m = new THREE.MeshLambertMaterial({ color: 0x777 });
        break;

      case 'helpBooth':
        m = new THREE.MeshLambertMaterial({ color: 0x445566 });
        break;

      default:
        m = new THREE.MeshLambertMaterial({ color: 0x999 });
    }

    matCache[name] = m;
    return m;
  }

  // Sign material factory — unique each time
  function makeSignMaterial(title, subtitle, bgColor, textColor) {
    return new THREE.MeshLambertMaterial({
      map: T.getSign(title, subtitle, bgColor, textColor)
    });
  }

  return {
    get: get,
    makeSignMaterial: makeSignMaterial
  };
})();
