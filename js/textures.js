/*
 * textures.js — Procedural Canvas Textures
 * All textures generated via canvas, no external files.
 */

window.Game = window.Game || {};

Game.Textures = (function() {

  var SIZE = Game.Config.perf.textureSize; // 256

  // Helper: create canvas + ctx
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w || SIZE;
    c.height = h || SIZE;
    return c;
  }

  // Helper: add noise/dirt to a region
  function addNoise(ctx, w, h, amount, alpha) {
    var img = ctx.getImageData(0, 0, w, h);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (Math.random() - 0.5) * amount;
      d[i]   = Math.max(0, Math.min(255, d[i] + n));
      d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
      d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
      if (alpha) d[i+3] = Math.max(0, Math.min(255, d[i+3] + (Math.random()-0.5)*alpha));
    }
    ctx.putImageData(img, 0, 0);
  }

  // --- Wall tiles: white/grey with dark grout lines ---
  function wallTiles() {
    var w = 512, h = 512;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    // Base
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, 0, w, h);

    var tileW = 64, tileH = 32;
    var groutW = 3;

    for (var y = 0; y < h; y += tileH) {
      var offset = (Math.floor(y / tileH) % 2) ? tileW / 2 : 0;
      for (var x = -tileW; x < w + tileW; x += tileW) {
        var tx = x + offset;
        // Tile fill with slight variation
        var shade = 200 + Math.floor(Math.random() * 40);
        ctx.fillStyle = 'rgb(' + shade + ',' + (shade - 5) + ',' + shade + ')';
        ctx.fillRect(tx + groutW/2, y + groutW/2, tileW - groutW, tileH - groutW);

        // Stain at bottom of tile
        if (Math.random() < 0.15) {
          ctx.fillStyle = 'rgba(100, 90, 70, ' + (0.1 + Math.random()*0.15) + ')';
          ctx.fillRect(tx + groutW/2, y + tileH - 8, tileW - groutW, 5 + Math.random()*3);
        }
      }
    }

    // Grout lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = groutW;
    for (var y2 = 0; y2 <= h; y2 += tileH) {
      ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(w, y2); ctx.stroke();
    }
    // Vertical grout offset per row
    for (var y3 = 0; y3 < h; y3 += tileH) {
      var off = (Math.floor(y3 / tileH) % 2) ? tileW / 2 : 0;
      for (var x2 = off; x2 <= w + tileW; x2 += tileW) {
        ctx.beginPath();
        ctx.moveTo(x2, y3);
        ctx.lineTo(x2, y3 + tileH);
        ctx.stroke();
      }
    }

    addNoise(ctx, w, h, 20);
    return new THREE.CanvasTexture(c);
  }

  // --- Concrete floor: dirty with stains ---
  function concreteFloor() {
    var w = 512, h = 512;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#9a9a96';
    ctx.fillRect(0, 0, w, h);

    // Large blotches
    for (var i = 0; i < 30; i++) {
      var bx = Math.random() * w;
      var by = Math.random() * h;
      var br = 20 + Math.random() * 60;
      var grd = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      var darkness = Math.random() < 0.5 ? 60 : 120;
      grd.addColorStop(0, 'rgba(' + darkness + ',' + (darkness-5) + ',' + darkness + ',0.3)');
      grd.addColorStop(1, 'rgba(' + darkness + ',' + darkness + ',' + darkness + ',0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
    }

    // Crack lines
    ctx.strokeStyle = 'rgba(50,50,48,0.4)';
    ctx.lineWidth = 1;
    for (var j = 0; j < 8; j++) {
      ctx.beginPath();
      var sx = Math.random() * w;
      var sy = Math.random() * h;
      ctx.moveTo(sx, sy);
      for (var k = 0; k < 5; k++) {
        sx += (Math.random() - 0.5) * 80;
        sy += (Math.random() - 0.5) * 80;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    addNoise(ctx, w, h, 25);
    return new THREE.CanvasTexture(c);
  }

  // --- Track bed gravel: dark, dirty ---
  function trackBed() {
    var w = 256, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#2a2620';
    ctx.fillRect(0, 0, w, h);

    // Gravel dots
    for (var i = 0; i < 1200; i++) {
      var gx = Math.random() * w;
      var gy = Math.random() * h;
      var gs = 1 + Math.random() * 3;
      var shade = 30 + Math.floor(Math.random() * 50);
      ctx.fillStyle = 'rgb(' + shade + ',' + (shade-3) + ',' + (shade-5) + ')';
      ctx.fillRect(gx, gy, gs, gs);
    }

    // Larger stones
    for (var j = 0; j < 60; j++) {
      var sx = Math.random() * w;
      var sy = Math.random() * h;
      var ss = 3 + Math.random() * 5;
      var sh = 50 + Math.floor(Math.random() * 40);
      ctx.fillStyle = 'rgb(' + sh + ',' + (sh-2) + ',' + (sh-6) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI*2); ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }

  // --- Sign texture generator ---
  function makeSign(title, subtitle, bgColor, textColor) {
    var w = 512, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    ctx.fillStyle = bgColor || '#003a7a';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = textColor || '#fff';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // Title
    ctx.fillStyle = textColor || '#fff';
    ctx.font = 'bold 52px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, h / 2 - 20);

    if (subtitle) {
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText(subtitle, w / 2, h / 2 + 40);
    }

    addNoise(ctx, w, h, 8);
    return new THREE.CanvasTexture(c);
  }

  // --- Poster: colorful transit ad ---
  function transitPoster() {
    var w = 256, h = 384;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    // Background gradient
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#1a4a8a');
    grd.addColorStop(0.5, '#2a8a6a');
    grd.addColorStop(1, '#cc7722');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Top text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TRAVEL SMART', w/2, 40);

    // Train icon (simple)
    ctx.fillStyle = '#fff';
    ctx.fillRect(w/2 - 40, 80, 80, 50);
    ctx.fillStyle = '#33a';
    ctx.fillRect(w/2 - 35, 88, 70, 30);
    // Windows
    ctx.fillStyle = '#aef';
    for (var i = 0; i < 3; i++) {
      ctx.fillRect(w/2 - 30 + i * 22, 92, 16, 16);
    }
    // Wheels
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(w/2 - 20, 138, 7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2 + 20, 138, 7, 0, Math.PI*2); ctx.fill();

    // Bottom text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('CENTRAL LINE', w/2, 180);
    ctx.font = '14px Arial';
    ctx.fillText('Your City, Connected', w/2, 210);
    ctx.font = 'bold 16px Arial';
    ctx.fillText('FROM $2.50', w/2, 260);

    addNoise(ctx, w, h, 10);
    return new THREE.CanvasTexture(c);
  }

  // --- Vending machine front ---
  function vendingMachine() {
    var w = 256, h = 512;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    // Body
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, w, h);

    // Top panel
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(10, 10, w - 20, 50);

    // Title
    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 20px Courier';
    ctx.textAlign = 'center';
    ctx.fillText('SNACKS', w/2, 40);

    // Product rows
    var rows = 6, cols = 4;
    var margin = 20, gap = 6;
    var cellW = (w - margin*2 - gap*(cols-1)) / cols;
    var cellH = 45;
    var startY = 80;

    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        var px = margin + col * (cellW + gap);
        var py = startY + r * (cellH + gap);

        // Product slot bg
        ctx.fillStyle = '#444';
        ctx.fillRect(px, py, cellW, cellH);

        // Product item
        var colors = ['#e44', '#4e4', '#44e', '#ee4', '#e4e', '#4ee', '#c63', '#39c'];
        ctx.fillStyle = colors[(r * cols + col) % colors.length];
        ctx.fillRect(px + 4, py + 4, cellW - 8, cellH - 14);

        // Price tag
        ctx.fillStyle = '#000';
        ctx.font = '9px Courier';
        ctx.fillText('$' + (1 + (r*cols+col) % 4), px + cellW/2, py + cellH - 5);
      }
    }

    // Coin slot / buttons area
    ctx.fillStyle = '#222';
    ctx.fillRect(margin, startY + rows * (cellH + gap) + 10, w - margin*2, 60);

    // Buttons
    for (var b = 0; b < 4; b++) {
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(margin + 30 + b * 45, startY + rows * (cellH + gap) + 35, 10, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#0f0';
      ctx.font = '8px Courier';
      ctx.fillText(b + 1, margin + 30 + b * 45, startY + rows * (cellH + gap) + 38);
    }

    // Dispenser slot
    ctx.fillStyle = '#111';
    ctx.fillRect(margin, h - 40, w - margin*2, 25);

    return new THREE.CanvasTexture(c);
  }

  // --- Train side: windows, doors, dirt ---
  function trainSide() {
    var w = 1024, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    // Body base
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#3a6a9a');
    grd.addColorStop(0.5, '#4a8aaa');
    grd.addColorStop(0.7, '#3a6a9a');
    grd.addColorStop(1, '#284868');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Stripe
    ctx.fillStyle = '#1a3a5a';
    ctx.fillRect(0, h - 30, w, 8);

    // Windows (top row)
    var winW = 80, winH = 50, winY = 40;
    var winGap = 24;
    var numWins = Math.floor(w / (winW + winGap));
    var startX = (w - numWins * (winW + winGap) + winGap) / 2;

    for (var i = 0; i < numWins; i++) {
      var wx = startX + i * (winW + winGap);
      // Window frame
      ctx.fillStyle = '#222';
      ctx.fillRect(wx - 3, winY - 3, winW + 6, winH + 6);
      // Glass
      var gg = ctx.createLinearGradient(wx, winY, wx + winW, winY + winH);
      gg.addColorStop(0, 'rgba(120, 180, 220, 0.7)');
      gg.addColorStop(1, 'rgba(40, 60, 90, 0.7)');
      ctx.fillStyle = gg;
      ctx.fillRect(wx, winY, winW, winH);
      // Reflection
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(wx + 5, winY + 3, 20, 10);
    }

    // Doors (every 3rd window gap)
    var doorW = 70, doorH = 150, doorY = 40;
    for (var d = 0; d < 4; d++) {
      var dx = (w / 5) * (d + 1) - doorW / 2;
      ctx.fillStyle = '#2a4a6a';
      ctx.fillRect(dx, doorY, doorW, doorH);
      // Door split line
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx + doorW/2, doorY);
      ctx.lineTo(dx + doorW/2, doorY + doorH);
      ctx.stroke();
      // Door window
      ctx.fillStyle = '#3a5a7a';
      ctx.fillRect(dx + 8, doorY + 8, doorW - 16, 30);
    }

    // Dirt/grime at bottom
    for (var s = 0; s < 40; s++) {
      var sx = Math.random() * w;
      var sy = h - 40 + Math.random() * 40;
      var sr = 10 + Math.random() * 30;
      var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, 'rgba(50, 40, 30, 0.4)');
      sg.addColorStop(1, 'rgba(50, 40, 30, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }

    // Top grime
    for (var t = 0; t < 15; t++) {
      var tx = Math.random() * w;
      var ty = Math.random() * 20;
      var tr = 15 + Math.random() * 30;
      var tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, tr);
      tg.addColorStop(0, 'rgba(40, 35, 25, 0.3)');
      tg.addColorStop(1, 'rgba(40, 35, 25, 0)');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI*2); ctx.fill();
    }

    addNoise(ctx, w, h, 15);
    return new THREE.CanvasTexture(c);
  }

  // --- Yellow safety line ---
  function safetyLine() {
    var w = 256, h = 64;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // Yellow strip
    ctx.fillStyle = '#ddb00a';
    ctx.fillRect(0, 16, w, 32);

    // Bumps texture
    for (var x = 0; x < w; x += 12) {
      ctx.fillStyle = 'rgba(200, 160, 0, 0.6)';
      ctx.fillRect(x + 2, 18, 8, 28);
    }

    addNoise(ctx, w, h, 10);
    return new THREE.CanvasTexture(c);
  }

  // --- Pillar texture ---
  function pillarTexture() {
    var w = 256, h = 512;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    // Base tile pattern
    ctx.fillStyle = '#ccc';
    ctx.fillRect(0, 0, w, h);

    var tileH = 32;
    for (var y = 0; y < h; y += tileH) {
      var shade = 190 + Math.floor(Math.random() * 30);
      ctx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
      ctx.fillRect(2, y + 2, w - 4, tileH - 4);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, y, w, tileH);
    }

    // Grime at bottom of tiles
    for (var y2 = 0; y2 < h; y2 += tileH) {
      if (Math.random() < 0.3) {
        ctx.fillStyle = 'rgba(80, 70, 55, 0.2)';
        ctx.fillRect(2, y2 + tileH - 8, w - 4, 6);
      }
    }

    addNoise(ctx, w, h, 15);
    return new THREE.CanvasTexture(c);
  }

  // --- Ceiling panel ---
  function ceilingTexture() {
    var w = 256, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, w, h);

    // Panel grid
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    for (var i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * w/4, 0); ctx.lineTo(i * w/4, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * h/4); ctx.lineTo(w, i * h/4); ctx.stroke();
    }

    addNoise(ctx, w, h, 12);
    return new THREE.CanvasTexture(c);
  }

  // --- Light housing diffuser ---
  function lightDiffuser() {
    var w = 256, h = 64;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#eef4f8';
    ctx.fillRect(0, 0, w, h);

    // Striations
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.5)';
    ctx.lineWidth = 1;
    for (var x = 0; x < w; x += 6) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    return new THREE.CanvasTexture(c);
  }

  // --- Bench texture ---
  function benchTexture() {
    var w = 256, h = 64;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(0, 0, w, h);

    // Wood slats
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    for (var x = 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // Wood grain
    for (var i = 0; i < 30; i++) {
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.3)';
      ctx.beginPath();
      var y = Math.random() * h;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w/3, y + (Math.random()-0.5)*10, 2*w/3, y + (Math.random()-0.5)*10, w, y);
      ctx.stroke();
    }

    addNoise(ctx, w, h, 10);
    return new THREE.CanvasTexture(c);
  }

  // --- Metal texture for rails ---
  function metalTexture() {
    var w = 128, h = 64;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');

    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#888');
    grd.addColorStop(0.5, '#bbb');
    grd.addColorStop(1, '#666');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    addNoise(ctx, w, h, 8);
    return new THREE.CanvasTexture(c);
  }

  // Cache
  var cache = {};

  function get(name) {
    if (cache[name]) return cache[name];
    var fn;
    switch(name) {
      case 'wallTiles': fn = wallTiles; break;
      case 'concreteFloor': fn = concreteFloor; break;
      case 'trackBed': fn = trackBed; break;
      case 'transitPoster': fn = transitPoster; break;
      case 'vendingMachine': fn = vendingMachine; break;
      case 'trainSide': fn = trainSide; break;
      case 'safetyLine': fn = safetyLine; break;
      case 'pillarTexture': fn = pillarTexture; break;
      case 'ceilingTexture': fn = ceilingTexture; break;
      case 'lightDiffuser': fn = lightDiffuser; break;
      case 'benchTexture': fn = benchTexture; break;
      case 'metalTexture': fn = metalTexture; break;
      default: return null;
    }
    var tex = fn();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    cache[name] = tex;
    return tex;
  }

  function getSign(title, subtitle, bgColor, textColor) {
    // Signs are unique — don't cache by name, just generate
    return makeSign(title, subtitle, bgColor, textColor);
  }

  return {
    get: get,
    getSign: getSign,
    wallTiles: wallTiles,
    concreteFloor: concreteFloor,
    trackBed: trackBed,
    transitPoster: transitPoster,
    vendingMachine: vendingMachine,
    trainSide: trainSide,
    safetyLine: safetyLine,
    pillarTexture: pillarTexture,
    ceilingTexture: ceilingTexture,
    lightDiffuser: lightDiffuser,
    benchTexture: benchTexture,
    metalTexture: metalTexture,
    makeSign: makeSign
  };
})();
