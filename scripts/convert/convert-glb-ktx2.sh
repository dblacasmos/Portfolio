#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/convert/convert-glb-ktx2.sh public/assets/models/*.glb
#   ./scripts/convert/convert-glb-ktx2.sh path/to/models
#
# Requirements:
#   - Node 18+
#   - npx (gltf-transform CLI will be fetched automatically)
#   - toktx (optional but recommended; gltf-transform bundles ktx-encode in many builds)
#
# Strategy:
#   - ETC1S for color/ORM/AO/Emissive (quality ~140, effort 5)
#   - UASTC for normals (level 2, rdo 1)
#   - ktxfix to ensure metadata/flags
#
# Outputs write next to source using suffix .ktx2.glb (safe).

shopt -s nullglob

inputs=()
for arg in "$@"; do
  if [ -d "$arg" ]; then
    while IFS= read -r -d '' f; do inputs+=("$f"); done < <(find "$arg" -type f -name '*.glb' -print0)
  else
    inputs+=("$arg")
  fi
done

if [ ${#inputs[@]} -eq 0 ]; then
  echo "No GLB inputs. Provide files or directories."
  exit 1
fi

echo "Processing ${#inputs[@]} file(s)..."

for src in "${inputs[@]}"; do
  base="${src%.*}"
  tmp1="${base}.etc1s.tmp.glb"
  tmp2="${base}.uastc.tmp.glb"
  out="${base}.ktx2.glb"

  echo "→ ${src}"
  # Color-like maps → ETC1S
  npx -y gltf-transform etc1s "$src" "$tmp1"       --quality 140 --effort 5       --slots "baseColorTexture,metallicRoughnessTexture,occlusionTexture,emissiveTexture"

  # Normal maps → UASTC
  npx -y gltf-transform uastc "$tmp1" "$tmp2"       --level 2 --rdo 1       --slots "normalTexture"

  # Fix metadata/compat
  npx -y gltf-transform ktxfix "$tmp2" "$out"

  rm -f "$tmp1" "$tmp2"
  echo "✓ Wrote ${out}"
done

echo "Done."
