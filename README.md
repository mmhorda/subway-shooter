# Subway Shooter — Stage 2

A first-person shooter set in a procedural subway station, built with Three.js (r128) from CDN.

## Play Online

Play the game in a modern browser:

https://mmhorda.github.io/subway-shooter/

## Run Locally

Open `index.html` in a modern browser, or serve the project directory locally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Stage 2 Features

### Combat
- **Real gunfire** with hitscan raycasting
- **Assault rifle** (key 1): automatic fire, 30-round mag, moderate spread/recoil
- **Pistol** (key 2): semi-auto, 12-round mag, more accurate
- **Knife melee** (middle-click): works with any weapon equipped, short range, fast cooldown
- **Bullet tracers**: visible yellow lines from muzzle to impact point
- **Impact effects**: sparks on hits, impact marks on walls/floor
- **Hit markers**: white X flash on enemy hits
- **Muzzle flash** + weapon recoil animation
- **Ammo depletion**: real ammo count, reload with R, reserve ammo

### Enemies
- **Procedural humanoid enemies**: red/orange bodies with glowing red eyes
- **Chase AI**: enemies pursue the player with basic separation avoidance
- **Health bars**: floating above each enemy, color-coded (green/yellow/red)
- **Hit feedback**: white flash on damage, health bar decreases
- **Death effects**: expanding ring animation, mesh removal
- **Spawn locations**: train doors (5 positions), front exit stairs, rear exit stairs
- **No random spawns**: enemies only appear from believable sources

### Waves & Levels
- **8 waves per level**, increasing difficulty
- **Wave 1 starts with 5 enemies**, each wave adds more
- **Level progression**: after wave 8, next level starts with harder enemies
- **Enemy scaling**: health and speed increase per level (capped at max speed)
- **Active enemy cap**: 38 maximum for performance
- **Spawn queuing**: excess enemies spawn as slots free up
- **Countdown between waves**: 3-second warning

### Player
- **Health system**: 100 HP, damage flash on hit
- **Enemy attacks**: close-range melee damage from enemies
- **Game over**: screen with final score, restart option
- **Score**: +100 per enemy kill

### HUD
- **Top-left**: Level, Wave, Enemies remaining
- **Top-right**: Score
- **Bottom-center**: Health bar (color-coded) + HP text
- **Bottom-left**: Weapon name + Ammo count
- **Bottom-right**: Debug info (FPS, position)

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
| Right Click (hold) | Zoom (FOV 90 -> 45) |
| Left Click | Fire (auto for rifle, semi for pistol) |
| R | Reload |
| Middle Click | Knife melee |
| Esc | Pause / release pointer |

## File Structure

```
subway-shooter/
  index.html          Entry point
  css/
    style.css         All styles (Stage 2)
  js/
    config.js         Global config & namespace
    textures.js       Procedural canvas textures
    materials.js      Shared materials
    collision.js      Box/radius colliders, ground height
    world.js          Subway station scene builder
    player.js         FPS controller (look, move, jump)
    weapons.js        Weapon viewmodels, muzzle flash, switching
    ui.js             Start screen, HUD, pause, game over
    main.js           Init, input, game loop
    enemies.js        Enemy spawning, AI, health, hitboxes (NEW)
    combat.js         Hitscan shooting, ammo, knife, player health (NEW)
    effects.js        Tracers, sparks, hit markers, death effects (NEW)
    waves.js          Wave system, level progression, spawn queuing (NEW)
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
- **No `scene.traverse()` during shooting**: dedicated `hitboxMeshes` list for raycasting
- **Pooled effects**: tracers, sparks, death effects use object pools with disposal
- **Pixel ratio 1**: no shadow maps for performance
- **Enemy cap**: 38 active enemies maximum
- **All textures procedural**: no external assets required

## Performance Choices

- Shared geometries for all enemy parts (body, head, arms, legs)
- Cloned materials per enemy (emissive flash needs per-instance)
- Health bar uses simple planes (billboarded)
- Bullet tracers use shared cylinder geometry, pooled with max 30
- Impact sparks pooled with max 25
- Death effects pooled with max 10
- No per-frame allocations in enemy AI (pre-allocated vectors reused)
- Enemy separation uses simple distance check, not spatial hashing
- Ground height checks prevent enemies falling into void
- Effects auto-dispose after expiration

## Known Limitations

- No sound effects
- No enemy shooting (they only melee at close range)
- Simple chase AI (no pathfinding, may clip through thin props)
- No outdoor area visible beyond tunnel
- No save/load system
- Train is static (doesn't move or open doors)
- Texture tiling may show repetition at certain angles
- Enemy separation is basic (no flocking/steering behaviors)
- No weapon pickup/progression system
- Knife slash visual is simple (ring arc, no particle trail)

## Future Stages (Not Yet Implemented)

- Stage 3: Sound effects, weapon pickups, more enemy types
- Stage 4: Cover system, destructible props, better AI
- Stage 5: Multiplayer, networked waves

## External Assets

None. All textures are procedurally generated via canvas. No external models or sounds used.
