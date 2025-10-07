// scripts/config.vram.mjs
export default {
  imgDirs: ["public", "assets", "static", "src/assets", "public/assets"],
  modelDirs: ["public", "assets", "static", "public/models", "assets/models"],
  uastcInclude: [/characters?/i, /hero/i, /props[_-]?near/i, /materials?\/(metal|skin|glass)/i],
  uiInclude: [/hud/i, /ui/i, /interface/i],
  ktx2: { etc1sQLevel: 128, etc1sEffort: 3, uastcRate: 2, uastcQuality: 128, zstdLevel: 18, genMipmap: true },
  concurrency: Math.max(1, (process.env.VRAM_TOOLS_CONCURRENCY && parseInt(process.env.VRAM_TOOLS_CONCURRENCY, 10)) || 4),
  // Nuevo: control del empaquetado de modelos
  models: {
    skipPacked: true,                 // no tocar *.packed.*
    normalizeWebPInModels: true       // convertir .webp/.avif -> .png antes de etc1s
  },
  // Nuevo: parámetros Draco ajustables (red/VRAM)
  // Si tus UVs superan [0,1], pon texcoordBits: null para no forzar cuantización de UV en Draco
  draco: { positionBits: 14, texcoordBits: null },

  // === NUEVO: cuantización para reducir VRAM de buffers ===
  quantize: {
    enabled: true,
    positionBits: 14,   // bajar a 12 si aceptas más pérdida geométrica
    normalBits: 10,     // 8–10 suele ir bien
    texcoordBits: 12    // pon null para saltar UV si tienes UV fuera de [0,1]
  },
  // === NUEVO: control fino de mipmaps por carpeta ===
  textures: {
    genMipmapDefault: true,           // valor por defecto
    noMipmapInclude: [/\/ui\//i, /\/hud\//i], // desactiva mips para UI
    yesMipmapInclude: []              // reglas que fuerzan mips (tienen prioridad)
  }
};
