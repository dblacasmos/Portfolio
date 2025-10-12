# Shooter Timeline — Portfolio 3D + Mini-Shooter (React + Three.js)
[🇬🇧 English](./README.md) | [🇪🇸 Español](./README-es.md)

> Un portfolio interactivo que combina una intro cinematográfica, una página principal con 3D embebido y un mini-shooter jugable, todo en la web. Centrado en rendimiento real (compresión de modelos/texturas, carga progresiva) y UX (capas HUD editables, audio con ducking, overlays, etc.).

---

## Índice

1. [Qué es este proyecto](#qué-es-este-proyecto)  
2. [Stack tecnológico](#stack-tecnológico)  
3. [Estructura de carpetas](#estructura-de-carpetas)  
4. [Scripts de npm](#scripts-de-npm)  
5. [Arranque rápido](#arranque-rápido)  
6. [Pipeline de assets (KTX2/Draco/Meshopt)](#pipeline-de-assets-ktx2dracomeshopt)  
7. [Arquitectura del juego](#arquitectura-del-juego)  
8. [Controles](#controles)  
9. [Configuración (src/constants/config.ts)](#configuración-srcconstantsconfigts)  
10. [Calidad gráfica y rendimiento](#calidad-gráfica-y-rendimiento)  
11. [Audio](#audio)  
12. [Rutas y flujo de UX](#rutas-y-flujo-de-ux)  
13. [Despliegue](#despliegue)  
14. [Resolución de problemas](#resolución-de-problemas)  
15. [Licencia y créditos](#licencia-y-créditos)

---

## Qué es este proyecto

Este repo es un portfolio con tres “capas”:

- **Intro** con vídeo, música y locución (saltable con `ENTER`).  
- **Main** con un “hero” 3D y contenido navegable (transiciones `framer-motion`).  
- **Game**: shooter ligero en una ciudad cyberpunk, con drones enemigos, HUD personalizable y menú in-game.

Se ha puesto especial énfasis en que **se sienta fluido** en navegadores modernos, con **compresión real de assets** (KTX2, Draco, Meshopt) y utilidades de build para dejar los modelos «listos para producción».

---

## Stack tecnológico

**Cliente / UI**
- **React 19 + Vite 7** (ESM, HMR muy rápido).
- **React Router 7** (rutas `/intro`, `/main`, `/timeline`, `/game`).
- **TailwindCSS 3** (estilos utilitarios + variables de HUD en `globals.css`).
- **framer-motion 12** (transiciones y micro-interacciones).

**3D / Juego**
- **three.js 0.179**  
- **@react-three/fiber** (Canvas, hooks de render, portals ortográficos para HUD).
- **@react-three/drei** (helpers: `AdaptiveDpr`, loaders, `OrbitControls` en vistas 3D de UI).
- **@react-three/rapier** (física ligera).
- **three-mesh-bvh** (raycasts y colisiones eficientes, parcheado global en `patchBVH.ts`).
- **Meshopt / Draco / KTX2** (decoders integrados, rutas en `CFG.decoders`).

**Estado / sonido / utilidades**
- **zustand 5** (estado del juego y editor de HUD).
- **howler** + **WebAudio** (mezclador con grupos `music/sfx/ui`, ducking de menú).
- **TypeScript** estricto, ESLint flat config.

**Build tooling de assets (Node)**
- **@gltf-transform** (dedup, prune, quantize, Draco, Meshopt).
- **sharp** (procesado de imágenes).
- **toktx** (KTX2 ETC1S/UASTC, según heurística).

---

## Estructura de carpetas

```
/public
  /assets
    /audio/ ...               # sfx, música, UI
    /img/ ...                 # imágenes (UI/HUD)
    /models/ *.ktx2.glb       # GLB ya optimizados (KTX2/Draco/Meshopt)
    /video/ ...               # mp4 intro / escenas
    /basis/ basis_transcoder.*# KTX2 transcoder
    /draco/ ...               # decoders Draco (gltf/wasm/js)

/src
  /constants
    assets.ts                 # rutas centralizadas a assets
    config.ts                 # CFG global: gameplay, HUD, audio, render, etc.
  /hooks                      # hooks de UI/GLTF/teclado/responsive...
  /pages
    Intro.tsx                 # intro con vídeo + narración
    /main
      Hero.tsx                # hero 3D
      Main.tsx                # página principal
      Timeline.tsx            # capítulo 2 del lore
  /game
    Game.tsx                  # bootstrap del Canvas y capas
    /layers
      /World                  # City, cielo, portal final...
      /Player                 # cápsula jugador, cámara, input, arma
      /Weapon                 # modelo y efectos (flash, luz)
      /Shots                  # sistema de láseres
      /Enemies                # drones enemigos
      /Hud                    # HUD ortográfico (crosshair, ammo, radar...)
    /overlays                 # overlays DOM: menú, misión, carga, edición HUD...
    /utils                    # audio, colisiones BVH, texturas, video, state...
    /graphics/quality.ts      # presets de calidad → DPR y caps de textura
  App.tsx, main.tsx           # enrutador, bootstrap KTX2, estilos globales

/scripts                      # pipeline de assets (ver sección específica)
```

---

## Scripts de npm

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

  "// Assets / modelos": "",
  "assets:ktx2": "node --experimental-json-modules scripts/convert-images.mjs",
  "assets:dups": "node --experimental-json-modules scripts/scan-duplicates.mjs",
  "models:pack": "node --experimental-json-modules scripts/pack-gltf.mjs",
  "models:finalize": "node --experimental-json-modules scripts/finalize-models.mjs",
  "models:tile": "node --experimental-json-modules scripts/tile-city.mjs",
  "models:clean": "node --experimental-json-modules scripts/cleanup-model-trash.mjs",

  "// Util": "",
  "compress:glb": "node compress-glb.js",
  "ktx2:install": "echo \"Instala KTX-Software (toktx) desde https://github.com/KhronosGroup/KTX-Software/releases\""
}
```

- **`prebuild` / `predev`**: pipeline automático de assets (imágenes → KTX2/AVIF/WebP, GLB → Draco/Meshopt/KTX2).  
  > En CI (Vercel, etc.) puedes saltarlo con `SKIP_ASSET_PIPELINE=1`.
- **`assets:ktx2`**: reprocesa imágenes a **KTX2** + variantes UI (AVIF/WebP).  
- **`assets:dups`**: detecta duplicados por hash y genera `build-reports/duplicates.json`.  
- **`models:pack`**: normaliza texturas del GLB, cuantiza, y aplica **Draco + Meshopt** eligiendo el menor.  
- **`models:finalize`**: renombra `*.packed.glb → *.glb` y limpia intermedios.  
- **`models:tile`**: trocea escenas grandes en tiles (grid) con un manifest simple.  
- **`models:clean`**: limpia «basura» de editores 3D.  
- **`lint` / `typecheck`**: calidad de código.

---

## Arranque rápido

**Requisitos**
- Node.js 18+ (recomendado LTS).  
- (Opcional pero recomendado) **toktx** en tu PATH para convertir KTX2.  
- Los decoders **Basis/KTX2** y **Draco** ya vienen en `public/assets/basis` y `public/assets/draco`.

```bash
# 1) Instalar dependencias
npm i

# 2) Desarrollo (ejecuta prebuild de assets si no está en CI)
npm run dev

# 3) Producción
npm run build
npm run preview
```

> Si no quieres ejecutar el pipeline pesado de assets en local:  
> **Linux/macOS**: `SKIP_ASSET_PIPELINE=1 npm run dev`  
> **Windows (CMD)**: `set SKIP_ASSET_PIPELINE=1 && npm run dev`

---

## Pipeline de assets (KTX2/Draco/Meshopt)

- **`scripts/convert-images.mjs`**  
  - Detecta imágenes (`.png/.jpg/.jpeg`) y genera **KTX2** (ETC1S vs UASTC mediante heurística) y, para UI/HUD, **AVIF/WebP**.  
  - Control de mipmaps por carpetas (`/ui/`, `/hud/`) y parámetros en `scripts/config.vram.mjs`.  
- **`scripts/pack-gltf.mjs`**  
  - Normaliza texturas a PNG cuando es necesario, hace `dedup + prune + quantize`.  
  - Ejecuta **Draco** y **Meshopt** y escoge el **GLB más pequeño**.  
- **`scripts/finalize-models.mjs`**  
  - Renombra `*.packed.glb` a definitivo, limpia temporales.  
- **`scripts/scan-duplicates.mjs`**  
  - Agrupa ficheros duplicados por hash y (opcionalmente) hardlinka.  
- **`scripts/tile-city.mjs`**  
  - Troceado por grillas para streaming en escenas grandes.

Los presets para KTX2, cuantización y mipmaps están en `scripts/config.vram.mjs`.

---

## Arquitectura del juego

**Capas principales (`/src/game/layers`)**
- **World**: carga de ciudad (`City.tsx`), cielo (`DomeSky`), puerta/portal final, optimizaciones de materiales y geometría (mallas fusionadas, mips, anisotropía limitada).  
- **Player**: cámara + control estilo FPS sobre cápsula, **pointer lock**, salto, crouch, sprint, ADS (aim-down-sights), y arma en primera persona.  
- **Weapon**: modelo con **muzzle flash** y luz dinámica; materiales con `tuneMaterials`.  
- **Shots**: láseres efímeros (`makeLaser.ts`) con crecimiento y TTL.  
- **Enemies**: **drones** con spawn en zonas válidas (raycasts sobre carretera/paredes), y chequeos de «burbuja» libre de colisión.  
- **Hud**: render **ortográfico** independiente (crosshair, ammo, diales de vida/escudo, barra de recarga, radar 3D, contador de drones).  
  - **Editor de HUD**: arrastre/ajuste con grid y **export/import** a `localStorage`.

**Overlays DOM (`/src/game/overlays`)**
- **MenuInGame** (pausa, calidad, audio, mano, ADS hold/toggle, export HUD).  
- **MissionCard / DestroyDroneCard** (briefings y feedback).  
- **LoadingOverlay** + **GlobalLoadingPortal** con barra de progreso y watchdog.  
- **ContextLostOverlay** (recuperación de contexto WebGL).  
- **HudEditOverlay** (UI de edición).

**Colisiones y rendimiento**
- Parche de **three-mesh-bvh** aplicado globalmente (`patchBVH.ts`).  
- Colliders del entorno derivados de la ciudad (`colliderEnvBVH.ts`).  
- `AdaptiveDpr` y `PerformanceMonitor` para ajustar carga según dispositivo.

---

## Controles

- **Movimiento**: `W` (adelante), `S` (atrás), `Q` (izquierda), `E` (derecha)  
- **Saltar**: `Espacio`  
- **Crouch**: `Shift` (mantenido)  
- **Sprint**: `V` (mantenido)  
- **Disparo**: click izquierdo (bloquea el cursor si no lo estaba)  
- **Apuntar (ADS)**: click derecho (modo **hold** o **toggle**, configurable)  
- **Recargar**: `R`  
- **Fullscreen**: `F`  
- **TAB**: salir de intro / cerrar overlays (con trampas para no perder el pointer lock sin querer)

> El juego pausa el **frameloop** cuando el menú u overlays están abiertos, para ahorrar GPU/batería.

---

## Configuración (`/src/constants/config.ts`)

- **`gameplay`**: número de drones iniciales, munición por cargador, cooldowns, etc.  
- **`move`**: velocidad base, multiplicador de sprint, gravedad, alturas (de pie/cuclillas), head-bob.  
- **`look`**: sensibilidad y modo ADS (`hold`/`toggle`).  
- **`collision`**: radios de cápsula, padding contra paredes, altura de suelo, etc.  
- **`audio`**: volúmenes iniciales (`music/sfx/ui`), **ducking** al abrir menú, muteo durante loading, clips base.  
- **`hud`**: colores, fuentes, **DPR máximo** para móviles, snapping, escalado responsive por aspect ratio.  
- **`render`**: anisotropía máx., tamaño mínimo de mipmap, antialias, tone mapping.  
- **`decoders`**: rutas para **Basis/KTX2** y **Draco** (`/assets/basis`, `/assets/draco`).  
- **`layers`**: máscaras de render (WORLD, SHOTS, HUD…).

Casi todo se puede ajustar sin tocar lógica, sólo datos.

---

## Calidad gráfica y rendimiento

Archivo: `src/game/graphics/quality.ts`

- Presets **low / medium / high / auto** que mutan **CFG** de forma segura:
  - **`hud.ui.dprMax`** (límite de DPR)  
  - **`render.maxTextureSize`** (cap de tamaño de textura)  
- Persistencia en `localStorage`; el `Canvas` se remonta si cambias calidad para aplicar nuevos caps.  
- `AdaptiveDpr` baja el DPR dinámicamente en GPU apretadas.  
- Materiales **sin sombras** y **NoToneMapping** con `sRGBColorSpace` para mantener costes bajos.

---

## Audio

`/src/game/utils/audio/audio.ts` implementa un **mezclador** con WebAudio:
- Grupos `master`, `music`, `sfx`, `ui`.  
- Fallback a etiquetas `<audio>` si WebAudio no está disponible.  
- **Ducking** configurable al abrir menú.  
- Clips y rutas definidos en `ASSETS.audio`.

---

## Rutas y flujo de UX

- `/intro`: vídeo + música + narración (TTS opcional con selección de voz ES), botón para ir a main; `ENTER` salta.  
- `/main`: hero con 3D y música de fondo, botones para navegar a **Timeline** o **Game**.  
- `/timeline`: “Capítulo 2” del lore con UI animada y audio.  
- `/game`: carga assets (overlay global), entra en modo **inmersivo** (fullscreen/pointer-lock) y muestra el menú inicial antes de jugar.

---

## Despliegue

- **Build** estático: `npm run build` → carpeta `dist/`.  
- Servir como **static site** (Netlify, Vercel, nginx, GitHub Pages, …).  
- Variables útiles:
  - `BASE_URL` si publicas bajo subruta (vite).  
  - `SKIP_ASSET_PIPELINE=1` en CI para saltar el preprocesado (los assets optimizados ya están en `public/assets`).  

---

## Resolución de problemas

- **Pantalla en negro / texturas “rotas”**  
  Verifica que `public/assets/basis` y `public/assets/draco` se suben al servidor. La carga KTX2 hace HEAD y cae a `TextureLoader` si falla, pero DRACO necesita sus WASM/JS si tus GLB están comprimidos con Draco.
- **El audio no suena hasta hacer click**  
  Es por políticas del navegador. El mezclador se inicializa tras una interacción del usuario.
- **El puntero “se escapa”**  
  Asegúrate de entrar en pointer-lock desde el canvas del juego; hay protectores para `ESC` en fullscreen.
- **Rendimiento bajo en móvil**  
  Baja la calidad en el menú in-game o limita el DPR en `CFG.hud.ui.dprMax`.
- **Artefactos en texturas UI**  
  La pipeline evita mipmaps en `/ui/` y `/hud/` por diseño; revisa `textures.noMipmapInclude` en `scripts/config.vram.mjs`.

---

## Licencia y créditos

- Código: MIT (ajusta según convenga).  
- Modelos, audio y vídeo: pertenecen a sus autores. Revisa licencias antes de reutilizar.  
- Agradecimientos: ecosistema **Three.js**, **R3F**, **Drei**, **Rapier**, **gltf-transform**, y la comunidad WebGL.

---

### Notas finales

- Este README describe **lo que hay en el repo**: rutas, scripts, assets y decisiones de ingeniería (compresión, colisiones, HUD, audio).  
- Si amplías la ciudad o añades enemigos nuevos, reaprovecha el pipeline (`models:pack`, `assets:ktx2`) para mantener el peso a raya.  
- Para depurar pesos de bundle, habilita `sourcemap` en `vite.config.ts` y revisa los chunks grandes (Three + GLTF suelen rozar el límite por defecto, ya está ajustado con `chunkSizeWarningLimit`).
