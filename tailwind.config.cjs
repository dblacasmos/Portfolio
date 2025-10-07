/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./src/styles/**/*.{css,scss}",   // añade tu CSS para que Tailwind detecte @apply
  ],

  safelist: [
    // Overlay del crawl con z arbitrario:
    "z-[2147483647]",
    "z-[999999]",
    // Utilidades arbitrarias usadas en el crawl:
    "[perspective:650px]",
    // (Opcional) si usas variantes dinámicas con dvh/overflow:
    "h-dvh",
    "overflow-hidden",
  ],

  theme: {
    extend: {
      colors: {
        hud: {
          neon: '#22d3ee',
          glass: 'rgba(9,12,16,0.45)',
          frame: 'rgba(255,255,255,0.08)',
          text: '#e5e7eb',
        },
      },

      cursor: {
        // Cursor principal (flecha futurista). Hotspot en la punta (3,2).
        'robot': 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><path d=\'M3 2 L3 22 L10.5 17.5 L14 28 L18 26 L14 15.5 L23 15.5 Z\' fill=\'%23ffffff\' fill-opacity=\'0.95\' stroke=\'%2300e5ff\' stroke-width=\'1.5\' stroke-linejoin=\'round\'/><path d=\'M6 6 L12.5 13.5\' stroke=\'%2300e5ff\' stroke-width=\'1.5\' stroke-linecap=\'round\'/><circle cx=\'12\' cy=\'10\' r=\'1.4\' fill=\'%2300e5ff\'/></svg>") 3 2, auto',

        // Cursor para hover/acción (retícula). Hotspot en el centro (16,16).
        'robot-pointer': 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'9\' fill=\'none\' stroke=\'%2300e5ff\' stroke-width=\'2\'/><circle cx=\'16\' cy=\'16\' r=\'2.4\' fill=\'%23ffffff\' fill-opacity=\'0.95\' stroke=\'%2300e5ff\' stroke-width=\'1.3\'/><path d=\'M16 4 L16 7 M28 16 L25 16 M16 28 L16 25 M4 16 L7 16\' stroke=\'%2300e5ff\' stroke-width=\'1.5\' stroke-linecap=\'round\'/></svg>") 16 16, pointer',
      },

    },
  },
  plugins: [],
}
