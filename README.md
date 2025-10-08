# Shooter Timeline — 3D Portfolio + Mini‑Shooter (React + Three.js)

> An interactive portfolio that blends a cinematic intro, a 3D‑powered main page, and a playable mini‑shooter — all in the browser. It focuses on real‑world performance (model/texture compression, progressive loading) and UX (editable HUD layers, audio ducking, overlays, etc.).

---

## Table of Contents

1. [What this project is](#what-this-project-is)  
2. [Tech stack](#tech-stack)  
3. [Folder structure](#folder-structure)  
4. [npm scripts](#npm-scripts)  
5. [Quick start](#quick-start)  
6. [Asset pipeline (KTX2/Draco/Meshopt)](#asset-pipeline-ktx2dracomeshopt)  
7. [Game architecture](#game-architecture)  
8. [Controls](#controls)  
9. [Configuration (src/constants/config.ts)](#configuration-srcconstantsconfigts)  
10. [Graphics & performance](#graphics--performance)  
11. [Audio](#audio)  
12. [Routes & UX flow](#routes--ux-flow)  
13. [Deployment](#deployment)  
14. [Troubleshooting](#troubleshooting)  
15. [License & credits](#license--credits)

---

## What this project is

This repo ships a portfolio with three layers:

- **Intro** with video, music, and narration (**skippable with `ESC`**).  
- **Main** with a 3D hero section and animated content (via `framer-motion`).  
- **Game**: a lightweight shooter set in a cyberpunk city, with enemy drones, a customizable HUD, and an in‑game menu.

A lot of work went into making it **feel smooth** on modern browsers, with **real asset compression** (KTX2, Draco, Meshopt) and build tooling to keep models **production‑ready**.

---

## Tech stack

**Client / UI**
- **React 19 + Vite 7** (ESM, blazing‑fast HMR).
- **React Router 7** (routes `/intro`, `/main`, `/timeline`, `/game`).
- **TailwindCSS 3** (utility styles + HUD variables in `globals.css`).
- **framer-motion 12** (transitions and micro‑interactions).

**3D / Game**
- **three.js 0.179**  
- **@react-three/fiber** (Canvas, render hooks, orthographic HUD portals).
- **@react-three/drei** (helpers: `AdaptiveDpr`, loaders, `OrbitControls` for UI views).
- **@react-three/rapier** (lightweight physics).
- **three-mesh-bvh** (efficient raycasts/collisions, patched globally in `patchBVH.ts`).
- **Meshopt / Draco / KTX2** (decoders wired; paths in `CFG.decoders`).

**State / audio / utilities**
- **zustand 5** (game state + HUD editor state).
- **howler** + **WebAudio** (mixer with `music/sfx/ui` groups, menu ducking).
- **TypeScript** strict mode, flat ESLint config.

**Asset build tooling (Node)**
- **@gltf-transform** (dedup, prune, quantize, Draco, Meshopt).
- **sharp** (image processing).
- **toktx** (KTX2 ETC1S/UASTC, heuristic‑based).

---

## Folder structure

```
/public
  /assets
    /audio/ ...               # sfx, music, UI
    /img/ ...                 # images (UI/HUD)
    /models/ *.ktx2.glb       # optimized GLB (KTX2/Draco/Meshopt)
    /video/ ...               # intro / story mp4
    /basis/ basis_transcoder.*# KTX2 transcoder
    /draco/ ...               # Draco decoders (gltf/wasm/js)

/src
  /constants
    assets.ts                 # centralized asset paths
    config.ts                 # global CFG: gameplay, HUD, audio, render, etc.
  /hooks                      # UI/GLTF/keyboard/responsive hooks
  /pages
    Intro.tsx                 # intro with video + narration
    /main
      Hero.tsx                # 3D hero
      Main.tsx                # main page
      Timeline.tsx            # lore chapter 2
  /game
    Game.tsx                  # Canvas bootstrap + layer mounts
    /layers
      /World                  # City, sky, final portal...
      /Player                 # player capsule, camera, input, weapon
      /Weapon                 # model + effects (muzzle flash, light)
      /Shots                  # laser system
      /Enemies                # enemy drones
      /Hud                    # orthographic HUD (crosshair, ammo, radar...)
    /overlays                 # DOM overlays: menu, mission, loading, HUD edit...
    /utils                    # audio, BVH collisions, textures, video, state...
    /graphics/quality.ts      # quality presets → DPR & texture caps
  App.tsx, main.tsx           # router, KTX2 bootstrap, global styles

/scripts                      # asset pipeline (see section below)
```

---

## npm scripts

```json
{
  "prebuild": "node scripts/prebuild.mjs",
  "predev": "node scripts/prebuild.mjs",
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit -p tsconfig.json",
  "lint": "eslint . --cache",
  "lint:ci": "ESLINT_TYPED=1 eslint . --cache",

  "// Assets / models": "",
  "assets:ktx2": "node --experimental-json-modules scripts/convert-images.mjs",
  "assets:dups": "node --experimental-json-modules scripts/scan-duplicates.mjs",
  "models:pack": "node --experimental-json-modules scripts/pack-gltf.mjs",
  "models:finalize": "node --experimental-json-modules scripts/finalize-models.mjs",
  "models:tile": "node --experimental-json-modules scripts/tile-city.mjs",
  "models:clean": "node --experimental-json-modules scripts/cleanup-model-trash.mjs",

  "// Utils": "",
  "compress:glb": "node compress-glb.js",
  "ktx2:install": "echo \"Install KTX-Software (toktx) from https://github.com/KhronosGroup/KTX-Software/releases\""
}
```

- **`prebuild` / `predev`**: automatic pipeline (images → KTX2/AVIF/WebP, GLB → Draco/Meshopt/KTX2).  
  > In CI (Vercel, etc.) you can skip it with `SKIP_ASSET_PIPELINE=1`.
- **`assets:ktx2`**: reprocess images to **KTX2** + UI variants (AVIF/WebP).  
- **`assets:dups`**: detect duplicates by hash; writes `build-reports/duplicates.json`.  
- **`models:pack`**: normalize textures, quantize, run **Draco + Meshopt**, pick the smallest artifact.  
- **`models:finalize`**: rename `*.packed.glb → *.glb` and clean intermediates.  
- **`models:tile`**: grid‑tile large scenes with a simple manifest.  
- **`models:clean`**: remove editor leftovers.  
- **`lint` / `typecheck`**: code quality.

---

## Quick start

**Requirements**
- Node.js 18+ (LTS recommended).  
- (Optional) **toktx** in your PATH for KTX2 conversion.  
- **Basis/KTX2** and **Draco** decoders are already in `public/assets/basis` and `public/assets/draco`.

```bash
# 1) Install dependencies
npm i

# 2) Development (runs prebuild unless skipped in CI)
npm run dev

# 3) Production
npm run build
npm run preview
```

> If you don’t want to run the heavy asset pipeline locally:  
> **Linux/macOS**: `SKIP_ASSET_PIPELINE=1 npm run dev`  
> **Windows (CMD)**: `set SKIP_ASSET_PIPELINE=1 && npm run dev`

---

## Asset pipeline (KTX2/Draco/Meshopt)

- **`scripts/convert-images.mjs`**  
  - Finds images (`.png/.jpg/.jpeg`) and produces **KTX2** (ETC1S vs UASTC via heuristics) and, for UI/HUD, **AVIF/WebP**.  
  - Fine‑grained mipmap control by folders (`/ui/`, `/hud/`) and parameters in `scripts/config.vram.mjs`.  
- **`scripts/pack-gltf.mjs`**  
  - Normalizes textures to PNG when needed, performs `dedup + prune + quantize`.  
  - Runs **Draco** and **Meshopt** and picks the **smallest GLB**.  
- **`scripts/finalize-models.mjs`**  
  - Renames `*.packed.glb` to final names, cleans temporaries.  
- **`scripts/scan-duplicates.mjs`**  
  - Groups duplicate files by hash and (optionally) hard‑links them.  
- **`scripts/tile-city.mjs`**  
  - Grid‑based tiling for large scenes to stream progressively.

Presets for KTX2, quantization, and mipmaps live in `scripts/config.vram.mjs`.

---

## Game architecture

**Main layers (`/src/game/layers`)**
- **World**: city loading (`City.tsx`), sky (`DomeSky`), end portal, material/geometry optimizations (merged meshes, mip control, capped anisotropy).  
- **Player**: FPS‑style camera on a capsule, **pointer lock**, jump, crouch, sprint, ADS (aim‑down‑sights), and first‑person weapon.  
- **Weapon**: model with **muzzle flash** and dynamic light; materials tuned via `tuneMaterials`.  
- **Shots**: ephemeral lasers (`makeLaser.ts`) with growth and TTL.  
- **Enemies**: **drones** spawning in valid spots (raycasts on roads/walls) with free‑bubble checks for collisions.  
- **Hud**: independent **orthographic** render (crosshair, ammo, health/shield dials, reload bar, 3D radar, drone counter).  
  - **HUD editor**: drag/snap with grid and **export/import** to `localStorage`.

**DOM overlays (`/src/game/overlays`)**
- **MenuInGame** (pause, quality, audio, handedness, ADS hold/toggle, HUD export).  
- **MissionCard / DestroyDroneCard** (briefings and feedback).  
- **LoadingOverlay** + **GlobalLoadingPortal** with progress bar and watchdog.  
- **ContextLostOverlay** (WebGL context recovery).  
- **HudEditOverlay** (editing UI).

**Collisions & performance**
- Global **three‑mesh‑bvh** patch (`patchBVH.ts`).  
- Environment colliders derived from the city mesh (`colliderEnvBVH.ts`).  
- `AdaptiveDpr` and `PerformanceMonitor` adapt workload to the device.

---

## Controls

- **Move**: `W` (forward), `S` (back), `Q` (left), `E` (right)  
- **Jump**: `Space`  
- **Crouch**: `Shift` (hold)  
- **Sprint**: `V` (hold)  
- **Fire**: left click (locks cursor if not already)  
- **Aim (ADS)**: right click (either **hold** or **toggle**, configurable)  
- **Reload**: `R`  
- **Fullscreen**: `F`  
- **ESC**: leave intro / close overlays (with guardrails to avoid losing pointer lock by accident)

> The game **pauses the frameloop** when menus/overlays are open to save GPU/battery.

---

## Configuration (`/src/constants/config.ts`)

- **`gameplay`**: starting drones, ammo per clip, cooldowns, etc.  
- **`move`**: base speed, sprint multiplier, gravity, standing/crouch heights, head‑bob.  
- **`look`**: sensitivity and ADS mode (`hold`/`toggle`).  
- **`collision`**: capsule radii, wall padding, ground height, etc.  
- **`audio`**: initial volumes (`music/sfx/ui`), **menu ducking**, mute during loading, base clips.  
- **`hud`**: colors, fonts, **max DPR** for mobile, snapping, responsive scaling by aspect ratio.  
- **`render`**: max anisotropy, min mip size, antialias, tone mapping.  
- **`decoders`**: paths for **Basis/KTX2** and **Draco** (`/assets/basis`, `/assets/draco`).  
- **`layers`**: render masks (WORLD, SHOTS, HUD…).

Most tuning is **data‑driven** — no logic changes needed.

---

## Graphics & performance

File: `src/game/graphics/quality.ts`

- **low / medium / high / auto** presets safely mutate **CFG**:
  - **`hud.ui.dprMax`** (DPR cap)  
  - **`render.maxTextureSize`** (texture size cap)  
- Persisted to `localStorage`; the `Canvas` remounts when quality changes to apply caps.  
- `AdaptiveDpr` lowers DPR dynamically on stressed GPUs.  
- Materials use **no shadows** and **NoToneMapping** with `sRGBColorSpace` to keep costs low.

---

## Audio

`/src/game/utils/audio/audio.ts` implements a **WebAudio mixer**:
- Buses: `master`, `music`, `sfx`, `ui`.  
- Fallback to `<audio>` tags if WebAudio isn’t available.  
- Configurable **ducking** when opening the menu.  
- Clips and paths defined in `ASSETS.audio`.

---

## Routes & UX flow

- `/intro`: video + music + narration (optional ES TTS), button to go to main; `ESC` skips.  
- `/main`: 3D hero and background music, buttons to **Timeline** and **Game**.  
- `/timeline`: “Chapter 2” of the lore with animated UI and audio.  
- `/game`: loads assets (global overlay), enters **immersive** mode (fullscreen/pointer‑lock) and shows the in‑game menu before playing.

---

## Deployment

- **Static build**: `npm run build` → `dist/` folder.  
- Serve as a **static site** (Netlify, Vercel, nginx, GitHub Pages, …).  
- Useful vars:
  - `BASE_URL` if publishing under a sub‑path (Vite).  
  - `SKIP_ASSET_PIPELINE=1` in CI to skip heavy preprocessing (optimized assets live in `public/assets`).

---

## Troubleshooting

- **Black screen / broken textures**  
  Ensure `public/assets/basis` and `public/assets/draco` are deployed. KTX2 loading does a HEAD and falls back to `TextureLoader` if it fails, but DRACO needs its WASM/JS if GLBs are Draco‑compressed.
- **No sound until click**  
  Browser policies; the mixer initializes after a user gesture.
- **Pointer keeps “escaping”**  
  Enter pointer‑lock from the game canvas; `ESC` handling is guarded when in fullscreen.
- **Poor mobile performance**  
  Lower the quality in the in‑game menu or cap DPR via `CFG.hud.ui.dprMax`.
- **UI texture artifacts**  
  The pipeline intentionally disables mipmaps in `/ui/` and `/hud/`; tweak `textures.noMipmapInclude` in `scripts/config.vram.mjs` if needed.

---

## License & credits

- Code: MIT (adjust to your needs).  
- Models, audio, and video: belong to their respective authors. Check licenses before reuse.  
- Thanks to the **Three.js**, **R3F**, **Drei**, **Rapier**, **gltf‑transform** ecosystems and the WebGL community.

---

### Final notes

- This README documents **what’s in the repo**: routes, scripts, assets, and the engineering decisions (compression, collisions, HUD, audio).  
- If you expand the city or add enemy types, reuse the pipeline (`models:pack`, `assets:ktx2`) to keep the footprint in check.  
- To inspect bundle weight, enable `sourcemap` in `vite.config.ts` and check large chunks (Three + GLTF often flirt with the default limit; `chunkSizeWarningLimit` is tuned already).
