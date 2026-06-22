/*
 * materials.js — Shared materials using procedural textures
 */

window.Game = window.Game || {};

Game.Materials = (function() {

  var T = Game.Textures;
  var matCache = {};

  function get(name) {
    if (matCache[name]) return matCache[name];

    var m;

    switch(name) {
      case 'wall':
        m = new THREE.MeshLambertMaterial({ map: T.get('wallTiles') });
        break;

      case 'floor':
        m = new THREE.MeshLambertMaterial({ map: T.get('concreteFloor') });
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
        m = new THREE.MeshLambertMaterial({ map: T.get('trainSide') });
        break;

      case 'metal':
        m = new THREE.MeshPhongMaterial({ color: 0x888899, shininess: 80, specular: 0x444455 });
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
