# VRAM Tools & Build Preprocess

Este proyecto incluye scripts de **prebuild** para:
- Convertir PNG/JPG → **KTX2** (UASTC/ETC1S) con *toktx*.
- Exportar imágenes de **UI/HUD** a **AVIF/WebP** para red.
- Empaquetar **GLB** con **KHR_texture_basisu**, **Draco** y **Meshopt** (vía `gltf-transform`). 
- Detectar **duplicidades de archivos** por hash.

## Uso rápido
```bash
# dependencias (dev)
npm i -D gltf-transform sharp fast-glob p-limit

# herramientas nativas necesarias
# - toktx (KTX-Software): https://github.com/KhronosGroup/KTX-Software
# - opcional: meshoptimizer (traído por gltf-transform)
# luego:
npm run prebuild
```

Resultados y reportes en **build-reports/** y archivos `.ktx2` junto a las texturas originales.

Configura `scripts/config.vram.mjs` para ajustar heurísticas (UASTC vs ETC1S, carpetas a escanear, etc.).
