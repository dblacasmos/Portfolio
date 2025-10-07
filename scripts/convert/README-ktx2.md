# GLB → KTX2 (KHR_texture_basisu) Pipeline

## Requisitos
- Node.js 18+ y `npx`
- (Opcional) `toktx` si quieres los codificadores de KTX2 nativos.
- El proyecto ya inicializa `KTX2Loader` y lo adjunta a `GLTFLoader`, así que los `.ktx2.glb` funcionarán sin tocar código.

## Uso rápido
```bash
# desde la raíz del repo
./scripts/convert/convert-glb-ktx2.sh public/assets/models/
# o bien archivos sueltos
./scripts/convert/convert-glb-ktx2.sh public/assets/models/*.glb
```

## Estrategia
- **ETC1S** para `baseColor`, `metallicRoughness`, `occlusion`, `emissive` (`--quality 140 --effort 5`)
- **UASTC** para `normalTexture` (`--level 2 --rdo 1`)
- `ktxfix` para sanear metadatos y compatibilidad.

## Resultado
- Se generan ficheros `*.ktx2.glb` junto al original.
- Sustituye en `ASSETS.models.*` si quieres usarlos en producción.

## Consejos
- Si ves banding en albedo, sube `--quality` (ETC1S) a ~160.
- Si notas rugosidad pobre, eleva `--effort` (ETC1S) o cambia esa textura a UASTC (más caro, mejor calidad).
