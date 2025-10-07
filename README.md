# 🔫 Cyberpunk Shooter — React + R3F + Tailwind + Framer Motion

FPS minimalista con estética **cyberpunk**. Hecho con **React + TypeScript + Vite**, 3D con **react-three-fiber**/**drei**, UI con **TailwindCSS**, animaciones con **Framer Motion** y audio con **Howler**.

> 🎯 Arrancas en un **teletransporte** mirando a la **puerta final**. Dispara un **láser** tipo bláster, impacta **drones** con panel de logro y navega con un **HUD** completo (radar, munición, salud/escudo, crosshair y menú `ESC`).

-------------------------------------------------------------------------------

## 🧭 Índice

- [Características](#-características)
- [Controles](#-controles)
- [Requisitos](#-requisitos)
- [Instalación y Scripts](#-instalación-y-scripts)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Configuración Clave](#-configuración-clave)
- [Ajustes de Juego (config.ts)](#-ajustes-de-juego-configts)
- [Assets Esperados](#-assets-esperados)
- [Compresión de Modelos (Opcional)](#️-compresión-de-modelos-opcional)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Licencia](#-licencia)

-------------------------------------------------------------------------------

## ✨ Características

- **Ciudad cyberpunk**: edificios con **emisión** en ventanas/carteles, **lluvia** instanciada, cables aéreos, suelo con **charcos/reflejos** y cielo nocturno.
- **Teletransporte** inicial con emisión y **puerta final** que se abre al medio; cruzarla redirige a `Main.tsx`.
- **Drones objetivos** (5 por defecto) con movimiento pseudo–aleatorio, panel de *logro* con **histéresis** (evita parpadeos) que se mantiene hasta alejarse > 10 yd.
- **Sistema de disparo**: láser fino (tipo bláster), impactos planos **no apilables** que se desvanecen a los **3 s**.
- **Arma GLB** en 1ª persona con **bobbing**, **sway**, **recoil** y recarga **10/x** (bloquea disparo durante recarga).
- **HUD**: salud/escudo, munición, **crosshair**, menú `ESC` (EMPEZAR/CONTROLES/VOLVER), **radar** con jugador/teleport/puerta y **drones** (verde si impactados).
- **Optimización de raycast**: arma, lluvia, cables, paneles de logro e impactos **no bloquean** el láser (layers + `userData.noHit`).
- **UI fluida**: Timeline sin loaders ni delays; navegación instantánea.

-------------------------------------------------------------------------------

## 🎮 Controles

W/S     Avanzar / Retroceder
Q/E     Paso lateral Izq./Der.
R       Recargar
Space   Saltar
SHIFT   Agacharse (mientras se mantiene)
Mouse   Mirar
Click   Disparar
ESC     Menú (EMPEZAR / CONTROLES / VOLVER)

-------------------------------------------------------------------------------

## 🧰 Requisitos

- **Node 20** (o superior) y **npm 10**.
- Navegador con **WebGL2**.

Recomendado para entornos consistentes:

.npmrc
  save-exact=true
  fund=false
  audit=false

package.json → engines
  "engines": { "node": ">=20.11 <21", "npm": ">=10.5" }

-------------------------------------------------------------------------------

## 🚀 Instalación y Scripts

npm i
npm run dev

Build y preview:
npm run build
npm run preview

Type-check y lint:
npm run typecheck
npm run lint            # rápido (sin type-aware)
npm run lint:ci         # estricto (con type-aware)

Compresión de modelos (opcional):
npm run compress:glb

-------------------------------------------------------------------------------

## 🗂 Estructura del Proyecto

src/
  components/
    scene/
      City.tsx
      Drones.tsx
      EndDoor.tsx
      TeleportWall.tsx
      World.tsx
    HUD/
      HUD.tsx
      Radar.tsx
    Weapon.tsx
    Laser.tsx
    Impacts.tsx
  hooks/
    useGameStore.ts
  pages/
    Intro.tsx
    Main.tsx
    Timeline.tsx
  styles/
    index.css
  utils/
    timeline/
      audio.ts
      textures.ts
      config.ts
public/
  assets/
    img/
      timeline/      ← texturas (suelo, cielo, edificios, cables, impactos, etc.)
    media/
      audio/         ← audio (music_bg.mp3, shot.wav, step.wav, hit_drone.wav, door_open.wav, reload.wav, mission_vo.mp3)
    models/
      weapon.glb
      drone.glb

-------------------------------------------------------------------------------

## ⚙️ Configuración Clave

- **Tailwind**: importa `src/styles/index.css` en `src/main.tsx` (no desde `index.html`).
- **React Router**: `BrowserRouter`. Si despliegas en subcarpeta, configura `basename`.
- **useGLTF/Suspense**: el loader de modelos (drei) funciona con Suspense.
- **Three r152+**: texturas con `texture.colorSpace = SRGBColorSpace` (ya aplicado).
- **Raycast del láser**: sólo **layer 0** + filtro `userData.noHit` ⇒ ignora lluvia/cables/arma/paneles/impactos.
- **Radar**: canvas que dibuja a `requestAnimationFrame` leyendo `getState()` (sin re-render React).
- **Audio**: desbloqueo tras primer gesto del usuario (`unlockAudioOnce()`) y tipos de howler instalados.

-------------------------------------------------------------------------------

## 🎛 Ajustes de Juego (config.ts)

export const CFG = {
  move: {
    speed: 10,
    crouchHeight: 1.0,
    standHeight: 1.6,
    jumpHeight: 2.2,
    accel: 30, damping: 12, gravity: -24, dtClampMs: 50,
    headBob: { enabled: true, amplitude: 0.03, frequency: 9, minSpeed: 0.2 },
    yClamp: { min: 0.8, max: 3.2 },
  },
  laser: { thickness: 0.02, durationMs: 80 },
  reload: { timeMs: 1000, clipSize: 10, reserve: 100 },
  drones: {
    count: 5,
    spawnRadius: { min: 60, max: 100 },
    height: { min: 3, max: 7 },
    wobble: { ampXZ: 2, ampY: 0.5, freqXZ: 1.0, freqY: 2.0, rotationSpeed: 1.0 },
    achievementDistanceYards: 10,
    hysteresisYards: 1,
    billboard: { y: 2, panelSize: [2.4, 1], innerSize: [2.2, 0.8], textSize: 0.22 },
  },
  weapon: {
    offset: [0.35, -0.25, -0.6],
    bob: { posAmp: 0.02, rotAmp: 0.01, freqMul: 1.0 },
    sway: { amp: 0.02 },
    recoil: { kickBack: 0.06, kickRot: 0.05, recover: 14 },
  },
}

-------------------------------------------------------------------------------

## 🖼 Assets Esperados

Coloca los archivos en estas rutas:

- **Modelos** → `public/assets/models/weapon.glb`, `public/assets/models/drone.glb`
- **Texturas** → `public/assets/img/timeline/*`
  (suelo con charcos, edificios emisivos, cielo nocturno, cables, textura de impacto, etc.)
- **Audio** → `public/assets/media/audio/*`
  (`music_bg.mp3`, `shot.wav`, `step.wav`, `hit_drone.wav`, `door_open.wav`, `reload.wav`, `mission_vo.mp3`)

> ¿Sin assets? Puedes usar *placeholders*; el código ya tolera faltantes con fallbacks.

-------------------------------------------------------------------------------

## 🗜️️ Compresión de Modelos (Opcional)

- **Draco-only (simple, recomendado al principio)**  
  Comprime mallas sin tocar texturas (no requiere configuración extra en runtime).  
  Script: `compress-glb.js` → `npm run compress:glb`.

- **Draco + KTX2 (ultra, para producción móvil)**  
  Añade compresión de texturas (requiere `KTX2Loader` y binarios en `public/basis/`).  
  Úsalo cuando congeles assets para máximo rendimiento.

-------------------------------------------------------------------------------

## 🧪 Troubleshooting

- **Sonidos duplicados en dev**: React `StrictMode` monta dos veces en desarrollo; ya limpiamos listeners. Si notas doble disparo al iniciar, desactiva `StrictMode` temporalmente para depurar.
- **“Unknown at rule @tailwind”**: añade en `.vscode/settings.json`:
  { "css.lint.unknownAtRules": "ignore", "scss.lint.unknownAtRules": "ignore", "less.lint.unknownAtRules": "ignore" }
- **Texturas “lavadas”**: verifica que `texture.colorSpace = SRGBColorSpace` (ya gestionado en `useTiledTexture()`).
- **GLTF sin cargar**: envuelve `<Canvas>` en `<Suspense fallback={null}>` o deja el fallback del arma (caja).

-------------------------------------------------------------------------------

## 🗺️ Roadmap

- [ ] Enemigos adicionales (patrullas/torretas).
- [ ] UI opciones: sliders de volumen (música/SFX) con `localStorage`.
- [ ] Minimapa/radar con heading y cono de visión.
- [ ] KTX2 en producción + CDN de assets.
- [ ] Partículas de lluvia/impacto más ricas (Instanced).

-------------------------------------------------------------------------------

## 📜 Licencia

Proyecto para uso educativo/demostración.  
Los **assets** (modelos/texturas/audio/vídeo) deben cumplir sus licencias correspondientes.