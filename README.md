# Subway Shooter — Stage 1

A first-person subway station prototype built with Three.js (r128) loaded from CDN.

## Play Online

Play the game in a modern browser:

https://mmhorda.github.io/subway-shooter/

## Run Locally

Open `index.html` in a modern browser, or serve the project directory locally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Stage 1 Features

- Beautiful procedural subway station with tiled walls, pillars, concrete floor
- Stopped subway train on one side, empty track tunnel on the other
- Fluorescent ceiling lights with glow
- Signs: "CENTRAL STATION", "PLATFORM 1", "LINE A", "EXIT", "STAIRS", "STREET"
- Transit posters in frames, vending machines, benches, trash bins, help booth
- Yellow safety lines along platform edges
- First-person pointer-lock controls (WASD + mouse look + jump + sprint)
- Collision detection (walls, train, pillars, props, platform edges)
- Jump down to rails and back up
- Two visible first-person weapon viewmodels (assault rifle + pistol)
- Weapon switching (1/2 keys, mouse wheel)
- Right-click zoom (FOV 90 -> 45)
- Left-click muzzle flash + recoil (no damage yet)
- R = reload animation placeholder
- Middle-click = knife slash animation placeholder
- HUD with weapon name, ammo display, crosshair
- Start screen, pause overlay
- Performance-safe rendering (pixel ratio 1, no shadows, shared geometries/materials, InstancedMesh for sleepers)
- Mild fog for depth, dust particles (70 max)
- All textures procedural (canvas-generated), no external assets

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look |
| Space | Jump |
| Shift | Sprint |
| 1 | Assault Rifle |
| 2 | Pistol |
| Mouse Wheel | Switch weapon |
| Right Click (hold) | Zoom |
| Left Click | Fire (muzzle flash) |
| R | Reload |
| Middle Click | Knife slash |
| Esc | Pause / release pointer |

## File Structure

```
subway-shooter/
  index.html          Entry point
  css/
    style.css         All styles
  js/
    config.js         Global config & namespace
    textures.js       Procedural canvas textures
    materials.js      Shared materials
    collision.js       Box/radius colliders, ground height
    world.js           Subway station scene builder
    player.js          FPS controller (look, move, jump)
    weapons.js         Weapon viewmodels, muzzle flash, switching
    ui.js              Start screen, HUD, pause
    main.js            Init, input, game loop
  README.md
```

## Technical Notes

- Three.js r128 from cdnjs (no npm, no build step)
- All scripts use `<script src>` (no ES modules)
- Global namespace: `window.Game`
- Procedural textures: 256x256 / 512x512 canvas-generated
- InstancedMesh used for track sleepers
- Shared geometries and materials throughout
- No shadow-casting lights; emissive/fake glow meshes for light effect
- FogExp2 for mild depth

## Known Limitations (Stage 1)

- No enemies, AI, waves, or combat damage
- No sound effects
- Ammo display is placeholder (refills on reload, no actual depletion on fire)
- Stair collision uses simplified ramp approximation
- No melee hit detection
- No save/load system
- Train is static (doesn't move or open doors)
- No outdoor area visible beyond tunnel
- Texture tiling may show repetition at certain angles

## Future Stages (Not Yet Implemented)

- Stage 2: Enemies, combat, health, damage
- Stage 3: Wave system, scoring, ammo management
- Stage 4: Sound, particles, polish
- Stage 5: Multiple weapons with distinct behavior
