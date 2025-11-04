/*  ===================================
    FILE: src/types/three-examples.d.ts
    ===================================*/
// Tipos mínimos para módulos de Three.js en `examples/jsm` que no traen .d.ts.
// Incluye ambas variantes: mergeGeometries y mergeBufferGeometries (según versión de three).

declare module "three/examples/jsm/utils/BufferGeometryUtils.js" {
  import type { BufferGeometry } from "three";
  export function mergeVertices(geometry: BufferGeometry, tolerance?: number): BufferGeometry;
  export function mergeBufferGeometries(geometries: BufferGeometry[], useGroups?: boolean): BufferGeometry;
  export function mergeGeometries(geometries: BufferGeometry[], useGroups?: boolean): BufferGeometry;
  const _default: {
    mergeVertices: typeof mergeVertices;
    mergeBufferGeometries: typeof mergeBufferGeometries;
    mergeGeometries: typeof mergeGeometries;
  };
  export default _default;
}

// Patrón genérico por si importas otros módulos de examples sin tipos
declare module "three/examples/jsm/*" {
  const mod: any;
  export = mod;
}
