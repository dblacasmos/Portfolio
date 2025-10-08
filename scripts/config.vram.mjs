// scripts/config.vram.mjs
export default {
  // Raíces donde buscar imágenes y modelos
  imgDirs: ["public", "assets", "static", "src/assets", "public/assets"],
  modelDirs: ["public", "assets", "static", "public/models", "assets/models"],

  // Dónde exigir UASTC (alta calidad) frente a ETC1S (máxima compresión)
  uastcInclude: [/characters?/i, /hero/i, /props[_-]?near/i, /materials?\/(metal|skin|glass)/i],
  // Heurística para contenidos de interfaz
  uiInclude: [/hud/i, /ui/i, /interface/i],

  // Parámetros de codificación base para KTX2
  ktx2: {
    etc1sQLevel: 128,   // 64–180 suele ser buen rango; 128 conserva bien UI no crítica
    etc1sEffort: 3,     // velocidad/compresión
    uastcRate: 2,       // calidad relativa UASTC (toktx --uastc <rate>)
    uastcQuality: 128,  // gltf-transform --level (0–255)
    zstdLevel: 18,      // compresión del contenedor (UASTC)
    genMipmap: true
  },

  // Concurrencia (ajustable por variable de entorno)
  concurrency: Math.max(1, (process.env.VRAM_TOOLS_CONCURRENCY && parseInt(process.env.VRAM_TOOLS_CONCURRENCY, 10)) || 4),

  // Control del pipeline de modelos
  models: {
    skipPacked: true,                 // no tocar *.packed.*
    normalizeWebPInModels: true       // .webp/.avif -> .png antes de etc1s (evita sustos)
  },

  // Draco: si tus UV exceden [0,1], usa texcoordBits: null
  draco: { positionBits: 14, texcoordBits: null },

  // Cuantización para buffers (reduce VRAM)
  quantize: {
    enabled: true,
    positionBits: 14,  // 12 si aceptas más pérdida geométrica
    normalBits: 10,    // 8–10 suele ir bien
    texcoordBits: 12   // null si tienes UVs fuera de rango
  },

  // Mipmaps por carpeta (prioridades: yes > no > default)
  textures: {
    genMipmapDefault: true,
    noMipmapInclude: [/\/ui\//i, /\/hud\//i],
    yesMipmapInclude: []
  }
};
