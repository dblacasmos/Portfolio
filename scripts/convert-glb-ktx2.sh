#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   ./scripts/convert/convert-glb-ktx2.sh public/assets/models/*.glb
#   ./scripts/convert/convert-glb-ktx2.sh path/to/models
#
# Requisitos:
#   - Node 18+
#   - npx (descarga @gltf-transform/cli automáticamente)
#   - toktx (opcional)
#
# Estrategia:
#   - ETC1S para mapas tipo color/ORM/AO/Emissive (quality ~140, effort 5)
#   - UASTC para normales (level 2, rdo 1)
#   - ktxfix para ajustar flags/metadata
#
# Salida:
#   junto al origen, con sufijo .ktx2.glb (no pisa el .glb original)

shopt -s nullglob

# Helper para limpiar temporales si algo falla
cleanup_files=()
cleanup() {
  local code=$?
  if (( ${#cleanup_files[@]} )); then
    for f in "${cleanup_files[@]}"; do rm -f "$f" || true; done
  fi
  exit "$code"
}
trap cleanup EXIT INT TERM

# Colección de entradas: acepta ficheros y directorios (busca .glb)
inputs=()
for arg in "$@"; do
  if [ -d "$arg" ]; then
    # también admite .gltf por si acaso
    while IFS= read -r -d '' f; do inputs+=("$f"); done < <(find "$arg" -type f \( -name '*.glb' -o -name '*.gltf' \) -print0)
  else
    inputs+=("$arg")
  fi
done

if [ ${#inputs[@]} -eq 0 ]; then
  echo "No GLB/GLTF inputs. Proporciona archivos o carpetas."
  exit 1
fi

echo "Procesando ${#inputs[@]} archivo(s)..."

for src in "${inputs[@]}"; do
  # Si ya existe una salida más nueva que la entrada, saltar.
  base="${src%.*}"
  out="${base}.ktx2.glb"
  if [ -f "$out" ] && [ "$out" -nt "$src" ]; then
    echo "SKIP  $out (al día)"
    continue
  fi

  # Temporales en el mismo directorio (más seguro en Windows)
  tmp1="${base}.etc1s.tmp.$$.glb"
  tmp2="${base}.uastc.tmp.$$.glb"
  cleanup_files+=("$tmp1" "$tmp2")

  echo "→ $src"
  # ETC1S para color/ORM/AO/Emissive
  npx -y @gltf-transform/cli etc1s "$src" "$tmp1" \
    --quality 140 --effort 5 \
    --slots "baseColorTexture,metallicRoughnessTexture,occlusionTexture,emissiveTexture"

  # UASTC para normales
  npx -y @gltf-transform/cli uastc "$tmp1" "$tmp2" \
    --level 2 --rdo 1 \
    --slots "normalTexture"

  # Fijar metadata/compat
  npx -y @gltf-transform/cli ktxfix "$tmp2" "$out"

  rm -f "$tmp1" "$tmp2"
  echo "✓ Wrote ${out}"
done

echo "Done."
