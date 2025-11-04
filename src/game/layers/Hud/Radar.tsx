/*  =======================================
    FILE: src/game/layers/Hud/Radar.tsx
    =======================================*/
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CFG } from "@/constants/config";

/**
 * Radar HUD – disco + anillos + brújula + blips.
 * - Flecha cyan (jugador) ligeramente más pequeña.
 * - Flechas rojas (enemigos) algo más grandes (pero menores que la cyan).
 * - Barrido más visible que además ilumina temporalmente los blips.
 */

export type RadarProps = {
    position: [number, number, number];
    width: number;
    height: number;
    getPlayer2D?: () => { x: number; y: number; headingRad: number };
    zoomMul?: number;
    getEnemyMeshes?: () => THREE.Object3D[] | null;
    getPoiMeshes?: () => THREE.Object3D[] | null;
    getEndDoorMesh?: () => THREE.Object3D | null;   // EndDoor (amarillo)
    endDoorVisible?: boolean;                       // se activa al 5/5
    fillAlpha?: number;
    viewWorldWidth?: number;
    sweepEnabled?: boolean;
};

const OVERLAY_ORDER = 20000;

/* ---------- Shaders ---------- */
function makeBaseMaskGridMaterial(
    fillAlpha: number,
    colGrid: THREE.Color,
    gridCells: number,
    gridLineWidth: number
) {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
            uTime: { value: 0 },
            uFillAlpha: { value: THREE.MathUtils.clamp(fillAlpha, 0, 1) },
            uGridColor: { value: colGrid },
            uCircleR: { value: 0.92 },
            uGridScale: { value: gridCells },
            uGridLineW: { value: gridLineWidth },
            uJammed: { value: 0.0 },
        },
        vertexShader: /*glsl*/`
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
        fragmentShader: /*glsl*/`
      precision highp float;
      varying vec2 vUv;
      uniform float uFillAlpha, uCircleR, uGridScale, uGridLineW, uJammed, uTime;
      uniform vec3  uGridColor;

      float gridLine(float x, float w){ float d = abs(fract(x)-.5); return smoothstep(w, 0.0, d-(0.5-w)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

      void main(){
        vec2 p = vUv*2.0-1.0;
        float r = length(p);
        if(r > uCircleR) discard;

        vec2 g = p * (uGridScale * 0.5);
        float grid = clamp(gridLine(g.x,uGridLineW)+gridLine(g.y,uGridLineW),0.0,1.0);

        float edge = smoothstep(uCircleR, uCircleR-0.18, r);
        vec3 gridCol = uGridColor * (0.45 + 0.55*grid);
        gridCol.r += 0.06*edge; gridCol.b += 0.03*(1.0-edge);

        float scan = 0.12 * sin((p.y*120.0) + uTime*5.5);
        float jitter = (hash(p*vec2(80.0,120.0)+uTime*1.5)-0.5)*0.25;
        float jam = uJammed * (0.25*scan + 0.35*jitter);

        vec3 col = gridCol + vec3(jam*0.6, jam*0.2, jam*0.8);
        float a = uFillAlpha + 0.18*grid + 0.10*edge + 0.15*uJammed*abs(scan);
        gl_FragColor = vec4(col, a);
      }`,
    });
}

function makeOverlayRingsMaterial(cyan: THREE.Color, red: THREE.Color, ringThickness: number) {
    const sectors = new Array(12).fill(0);
    return new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uCircleR: { value: 0.92 },
            uCyan: { value: cyan },
            uRed: { value: red },
            uHeading: { value: 0.0 },
            uSweepOn: { value: 1.0 },
            uRingThick: { value: ringThickness },
            uSectors: { value: sectors },
            uSweepWidth: { value: 1.35 },
            uSweepGain: { value: 1.15 },
        },
        vertexShader: /*glsl*/`
      varying vec2 vP;
      void main(){
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
        fragmentShader: /*glsl*/`
      precision highp float;
      varying vec2 vP;
      uniform float uTime,uCircleR,uHeading,uSweepOn,uRingThick,uSweepWidth,uSweepGain;
      uniform vec3  uCyan,uRed;
      uniform float uSectors[12];

      float ring(vec2 p,float r,float w){ float d=abs(length(p)-r); return smoothstep(w,0.0,d); }

      // Flecha del jugador (más pequeña)
      float arrow(vec2 p,float ang,float len,float baseW){
        float s=sin(-ang), c=cos(-ang);
        vec2 q=vec2(c*p.x - s*p.y, s*p.x + c*p.y);
        if(q.y<0.0) return 0.0;
        float b=baseW*(1.0 - clamp(q.y/len,0.0,1.0));
        return step(abs(q.x), b)*step(q.y, len);
      }

      float ticks(vec2 p, float rOuter){
        float ang = atan(p.y, p.x);
        float spokes = pow(abs(sin(ang*12.0)), 16.0);
        float band = smoothstep(rOuter, rOuter-0.02, length(p));
        return spokes * band;
      }

      float threatArcs(vec2 p, float rOuter){
        float ang = atan(p.y, p.x);
        float r = length(p);
        if(r < rOuter-0.08) return 0.0;
        float acc = 0.0;
        for(int i=0;i<12;i++){
          float ac = 6.2831853 * (float(i)/12.0);
          float dA = abs(atan(sin(ang-ac), cos(ang-ac)));
          float arc = smoothstep(0.28, 0.0, dA);
          float band = smoothstep(rOuter, rOuter-0.05, r);
          acc = max(acc, arc * band * uSectors[i]);
        }
        return acc;
      }

      void main(){
        vec2 p=vP; float r=length(p);
        if(r>uCircleR) discard;

        float w=uRingThick;
        float r0=ring(p,uCircleR,     w*0.14);
        float r1=ring(p,uCircleR*0.66,w*0.11);
        float r2=ring(p,uCircleR*0.33,w*0.09);
        float rings=r0*1.15+r1*0.82+r2*0.62;

        float ang=atan(p.x,p.y);
        float a0=mod(uTime*0.6, 6.2831853);

        float dA=abs(atan(sin(ang-a0), cos(ang-a0)));
        float sweepCore = smoothstep(uSweepWidth, 0.0, dA);
        float sweepBand = smoothstep(uCircleR, uCircleR-0.12, r);
        float sweep = sweepCore * sweepBand * uSweepOn;
        float sweepGlow = smoothstep(uSweepWidth*1.6, uSweepWidth*0.6, dA) * sweepBand * 0.35;

        float arr = arrow(p,uHeading,0.16,0.05);

        float dot = smoothstep(0.045,0.0,r);
        float tks = ticks(p, uCircleR) * 0.85;
        float arcs = threatArcs(p, uCircleR);

        vec3 col = uCyan*(rings*1.0 + dot*0.8 + arr*0.9 + tks*0.6)
                 + uRed * ((sweep*(0.65*uSweepGain) + sweepGlow) + arcs*1.1);

        float a = (rings*0.9 + dot*0.8 + arr*0.9 + (sweep*(0.55*uSweepGain)+sweepGlow) + tks*0.6 + arcs*1.1);
        gl_FragColor = vec4(col, a);
      }`,
    });
}

function makeCircleClippedPointsMaterial(enemySizePx: number, poiSizePx: number, gain: number) {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uCenter: { value: new THREE.Vector2(0, 0) },
            uScale: { value: new THREE.Vector2(1, 1) },
            uR: { value: 0.92 },
            uTime: { value: 0.0 },
            uDpr: { value: 1.0 },
            uEnemySizePx: { value: enemySizePx },
            uPoiSizePx: { value: poiSizePx },
            uGain: { value: gain },
            uSweepOn: { value: 1.0 },
            uSweepWidth: { value: 1.35 },
            uSweepGain: { value: 1.15 },
        },
        vertexShader: /*glsl*/`
      attribute float aType; // 0=enemigo, 1=poi, 2=endDoor
      attribute float aPing; // s desde “descubrimiento”
      attribute float aYaw;  // orientación mundo del enemigo (rad)
      varying float vType; varying float vPing; varying vec2 vW; varying float vYaw;
      uniform float uDpr, uEnemySizePx, uPoiSizePx;
      void main(){
        vec4 wp=modelMatrix*vec4(position,1.0);
        vW=wp.xy; vType=aType; vPing=aPing; vYaw=aYaw;
        gl_Position=projectionMatrix*viewMatrix*wp;
        float isEnemy   = step(vType, 0.5);
        float isEndDoor = step(1.5, vType);
        float isPoi     = (1.0 - isEnemy) * (1.0 - isEndDoor);
        float sizePx = isEnemy * uEnemySizePx
                     + isPoi   * uPoiSizePx
                     + isEndDoor * uEnemySizePx;
        gl_PointSize=sizePx*uDpr;
      }`,
        fragmentShader: /*glsl*/`
      precision highp float;
      varying float vType, vPing; varying vec2 vW; varying float vYaw;
      uniform vec2 uCenter,uScale; uniform float uR,uTime, uGain;
      uniform float uSweepOn, uSweepWidth, uSweepGain;
      const vec3 RED=vec3(1.0,0.12,0.12), YELL=vec3(1.0,0.9,0.35);

      float arrowShape(vec2 p){
        if(p.y < -1.0 || p.y > 1.0) return 0.0;
        float halfW = mix(0.6, 0.2, (p.y + 1.0) * 0.5);
        return step(abs(p.x), halfW);
      }
      float angDist(float a, float b){ return abs(atan(sin(a-b), cos(a-b))); }

      void main(){
        vec2 q=(vW-uCenter)/uScale;
        float r = length(q);
        if(r>uR) discard;

        vec2 pc=gl_PointCoord*2.0-1.0;

        float ang = atan(q.y, q.x);
        float a0  = mod(uTime*0.6, 6.2831853);
        float dA  = angDist(ang, a0);
        float sweepMask = smoothstep(uSweepWidth, 0.0, dA) * uSweepOn;

        if(vType < 0.5){
          float s=sin(-vYaw), c=cos(-vYaw);
          vec2 pr=vec2(c*pc.x - s*pc.y, s*pc.x + c*pc.y);
          float a = arrowShape(pr);
          if(a<=0.0) discard;

          float pingAmp=0.0;
          if(vPing>0.0 && vPing<2.0){
            float ph=(1.0-(vPing/2.0));
            pingAmp=(0.55+0.45*sin(6.2831*(uTime*1.2)))*ph;
          }

          float alpha = (0.65 + 0.35*a) * clamp(uGain, 0.2, 2.0) + 0.5*pingAmp;
          alpha *= (1.0 + uSweepGain * sweepMask);

          vec3 col = RED * (0.65 + 0.35*a + pingAmp);
          gl_FragColor = vec4(col, alpha);
          return;
        }

        float rr=dot(pc,pc); if(rr>1.0) discard;
        float core=smoothstep(1.0,0.0,rr);

        float isEndDoor = step(1.5, vType);
        float pulse = 0.5 + 0.5*sin(uTime*6.0);
        float baseA = mix((0.55+0.45*core), (0.90 + 0.30*pulse), isEndDoor);
        float alpha = baseA*clamp(uGain,0.2,2.0);
        alpha *= (1.0 + uSweepGain * sweepMask);

        vec3 col = YELL * mix((0.45+0.75*core), (0.85 + 0.25*pulse), isEndDoor);

        float ring = smoothstep(1.0, 0.86, rr) * smoothstep(0.88, 1.0, rr);
        col   += YELL * (0.6 * ring * isEndDoor);
        alpha  = max(alpha, 0.65*ring * isEndDoor);

        alpha = max(alpha, 0.35 * isEndDoor);
        gl_FragColor = vec4(col, alpha);
      }`,
    });
}

/* ---------- Geometría para ticks de brújula ---------- */
function makeCompassTicksGeometry(circleR: number) {
    const positions: number[] = [];
    for (let deg = 0; deg < 360; deg += 10) {
        const isMajor = deg % 30 === 0;
        const rad = (deg * Math.PI) / 180;
        const dirx = Math.sin(rad);
        const diry = Math.cos(rad);
        const rOuter = circleR * 0.99;
        const len = isMajor ? 0.065 : 0.035;
        const rInner = rOuter - len;
        positions.push(dirx * rInner, diry * rInner, 0, dirx * rOuter, diry * rOuter, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
    return g;
}

const Radar: React.FC<RadarProps> = ({
    position, width, height,
    getPlayer2D, zoomMul = 1,
    getEnemyMeshes, getPoiMeshes,
    getEndDoorMesh, endDoorVisible = false,
    fillAlpha = (CFG as any)?.hud?.radar?.fillAlphaDefault ?? 0.38,
    viewWorldWidth = (CFG as any)?.hud?.radar?.viewWorldWidth ?? 120,
    sweepEnabled = (CFG as any)?.hud?.radar?.sweepOn ?? true,
}) => {
    const { gl } = useThree();
    const dpr = gl.getPixelRatio();

    const CYAN = new THREE.Color(CFG.hud?.colors?.neonCyan ?? "#22D3EE");
    const RED = new THREE.Color(CFG.hud?.colors?.dangerRed ?? "#ff2d2d");
    const circleR = 0.92;

    const orbitronFont: string | undefined = (CFG as any)?.hud?.fonts?.orbitronUrl as string | undefined;

    // Tuning
    const tuning = (CFG as any)?.hud?.radar?.tuning ?? {};
    const gridCells: number = tuning.gridCells ?? 18;
    const gridLineWidth: number = tuning.gridLineWidthPx ? Math.max(0.005, (tuning.gridLineWidthPx / 100.0)) : 0.035;
    const ringThickness: number = tuning.ringThickness ?? 0.06;

    const toPx = (norm?: number, fallbackPx = 6) => typeof norm === "number" ? Math.max(1, Math.round(norm * 180)) : fallbackPx;

    const enemySizePx: number = tuning.enemyPointSizePx ?? toPx(tuning.enemyPointSize, 11);
    const poiSizePx: number =
        endDoorVisible ? enemySizePx : (tuning.poiPointSizePx ?? toPx(tuning.poiPointSize, 6));

    const sweepGain = (CFG as any)?.hud?.radar?.sweepGain ?? 1.15;
    const sweepWidth = (CFG as any)?.hud?.radar?.sweepWidth ?? 1.35;

    // Materiales
    const matBase = useMemo(() => makeBaseMaskGridMaterial(fillAlpha, CYAN.clone(), gridCells, gridLineWidth), [fillAlpha, CYAN, gridCells, gridLineWidth]);
    const matOverlay = useMemo(() => makeOverlayRingsMaterial(CYAN.clone(), RED.clone(), ringThickness), [CYAN, RED, ringThickness]);
    const matPoints = useMemo(() => makeCircleClippedPointsMaterial(enemySizePx, poiSizePx, (CFG as any)?.hud?.radar?.defaults?.gain ?? 0.98), [enemySizePx, poiSizePx]);

    // Uniforms barrido coherentes en overlay + puntos
    useEffect(() => {
        (matOverlay.uniforms.uSweepOn as any).value = sweepEnabled ? 1.0 : 0.0;
        (matOverlay.uniforms.uSweepGain as any).value = sweepGain;
        (matOverlay.uniforms.uSweepWidth as any).value = sweepWidth;

        (matPoints.uniforms.uSweepOn as any).value = sweepEnabled ? 1.0 : 0.0;
        (matPoints.uniforms.uSweepGain as any).value = sweepGain;
        (matPoints.uniforms.uSweepWidth as any).value = sweepWidth;
    }, [matOverlay, matPoints, sweepEnabled, sweepGain, sweepWidth]);

    // Tamaños POIs (EndDoor = mismo tamaño que dron cuando visible)
    useEffect(() => {
        (matPoints.uniforms.uEnemySizePx as any).value = enemySizePx;
        (matPoints.uniforms.uPoiSizePx as any).value = poiSizePx;
    }, [matPoints, enemySizePx, poiSizePx]);

    // Geometría brújula (reutilizada → antes se creaba dos veces)
    const compassGeom = useMemo(() => makeCompassTicksGeometry(circleR), [circleR]);
    useEffect(() => () => compassGeom.dispose(), [compassGeom]);

    const compassMat = useMemo(() => {
        const m = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.85 });
        (m as any).depthTest = false; (m as any).depthWrite = false; (m as any).toneMapped = false;
        return m;
    }, [CYAN]);

    const groupContent = useRef<THREE.Group>(null!);
    const ptsGeo = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());

    useEffect(() => { (matPoints.uniforms.uDpr as any).value = dpr; }, [matPoints, dpr]);
    useEffect(() => {
        (matPoints.uniforms.uCenter as any).value.set(position[0], position[1]);
        (matPoints.uniforms.uScale as any).value.set(width / 2, height / 2);
        (matPoints.uniforms.uR as any).value = circleR;

        (matOverlay.uniforms.uCircleR as any).value = circleR;
        (matBase.uniforms.uCircleR as any).value = circleR;
    }, [position, width, height, circleR, matPoints, matOverlay, matBase]);

    useFrame((st) => {
        const t = st.clock.elapsedTime;
        (matBase.uniforms.uTime as any).value = t;
        (matOverlay.uniforms.uTime as any).value = t;
        (matPoints.uniforms.uTime as any).value = t;

        const p = getPlayer2D?.();
        if (!p) return;

        (matOverlay.uniforms.uHeading as any).value = -p.headingRad;

        const diameter = Math.max(10, (viewWorldWidth) / Math.max(0.001, zoomMul || 1));
        const worldToMini = (2 * circleR) / diameter;

        if (groupContent.current) {
            groupContent.current.scale.set(worldToMini, worldToMini, 1);
            groupContent.current.position.set(-p.x * worldToMini, -p.y * worldToMini, 0);
        }
    });

    // Geometría dinámica (enemigos/POIs)
    const aType = useRef<THREE.BufferAttribute | null>(null);
    const aPing = useRef<THREE.BufferAttribute | null>(null);
    const aYaw = useRef<THREE.BufferAttribute | null>(null);
    const seenAt = useRef<Map<number | string, number>>(new Map());
    const idOf = (o: any): number | string => o?.userData?.droneId ?? o?.uuid ?? Math.random();

    useEffect(() => {
        const g = ptsGeo.current;
        g.setAttribute("position", new THREE.Float32BufferAttribute([], 3).setUsage(THREE.DynamicDrawUsage));
        aType.current = new THREE.Float32BufferAttribute([], 1).setUsage(THREE.DynamicDrawUsage);
        aPing.current = new THREE.Float32BufferAttribute([], 1).setUsage(THREE.DynamicDrawUsage);
        aYaw.current = new THREE.Float32BufferAttribute([], 1).setUsage(THREE.DynamicDrawUsage);
        g.setAttribute("aType", aType.current);
        g.setAttribute("aPing", aPing.current);
        g.setAttribute("aYaw", aYaw.current);
        return () => g.dispose();
    }, []);

    const sectorsRef = useRef<number[]>(new Array(12).fill(0));

    useFrame((st) => {
        const now = st.clock.getElapsedTime();
        const enemies = (getEnemyMeshes?.() ?? []).filter(Boolean);
        const pois = (getPoiMeshes?.() ?? []).filter(Boolean);

        const outPos: number[] = [];
        const outType: number[] = [];
        const outPing: number[] = [];
        const outYaw: number[] = [];

        const tmpW = new THREE.Vector3();
        const p = getPlayer2D?.();

        const secs = sectorsRef.current;
        for (let i = 0; i < secs.length; i++) secs[i] = 0;

        const pushEnemy = (o: THREE.Object3D) => {
            o.getWorldPosition(tmpW);
            outPos.push(tmpW.x, tmpW.z, 0);
            outType.push(0);

            const key = idOf(o);
            const detected = !!(o as any)?.userData?.detected;
            if (detected) {
                if (!seenAt.current.has(key)) seenAt.current.set(key, now);
                outPing.push(Math.max(0, now - (seenAt.current.get(key) || now)));
            } else {
                seenAt.current.delete(key);
                outPing.push(0);
            }

            const yaw = (o as any)?.userData?.yaw ?? 0;
            outYaw.push(yaw);

            if (p) {
                const rx = tmpW.x - p.x, ry = tmpW.z - p.y;
                const A = (Math.atan2(ry, rx) + Math.PI * 2) % (Math.PI * 2);
                const idx = Math.floor((A / (Math.PI * 2)) * 12) % 12;
                secs[idx] += 1;
            }
        };
        const pushPoi = (o: THREE.Object3D) => {
            o.getWorldPosition(tmpW);
            outPos.push(tmpW.x, tmpW.z, 0);
            outType.push(1);
            outPing.push(0);
            outYaw.push(0);
        };

        for (const o of enemies) pushEnemy(o);
        for (const o of pois) pushPoi(o);

        // EndDoor (tipo 2)
        const globalEndDoor: THREE.Object3D | null = (window as any).__endDoorMesh ?? null;
        const endDoorGetter = getEndDoorMesh ?? (() => globalEndDoor);
        const endDoor = endDoorGetter?.();
        const globalVisible = !!((window as any).__endDoorVisible);
        if (endDoor && (endDoorVisible || globalVisible || endDoor.visible)) {
            endDoor.getWorldPosition(tmpW);
            outPos.push(tmpW.x, tmpW.z, 0);
            outType.push(2);
            outPing.push(0);
            outYaw.push(0);
        }

        const g = ptsGeo.current;
        if (!outPos.length && endDoor && (endDoorVisible || globalVisible || endDoor.visible)) {
            g.setDrawRange(0, 0); // se asegura abajo con ensure()
        }

        let maxC = 0; for (let i = 0; i < 12; i++) maxC = Math.max(maxC, secs[i]);
        const f = maxC > 0 ? (1 / maxC) : 0; for (let i = 0; i < 12; i++) secs[i] = Math.min(1, secs[i] * f);
        const uSectors = (matOverlay.uniforms.uSectors as any).value as number[]; for (let i = 0; i < 12; i++) uSectors[i] = secs[i];

        if (outPos.length) {
            const pos = new Float32Array(outPos);
            const type = new Float32Array(outType);
            const ping = new Float32Array(outPing);
            const yaw = new Float32Array(outYaw);

            const ensure = (name: string, itemSize: number, data: Float32Array, ref?: React.MutableRefObject<THREE.BufferAttribute | null>) => {
                const existing = g.getAttribute(name) as THREE.BufferAttribute | undefined;
                if (!existing || (existing.array as Float32Array).length !== data.length) {
                    const attr = new THREE.Float32BufferAttribute(data, itemSize); attr.setUsage(THREE.DynamicDrawUsage);
                    g.setAttribute(name, attr); if (ref) ref.current = attr;
                } else { (existing.array as Float32Array).set(data); existing.needsUpdate = true; }
            };
            ensure("position", 3, pos);
            ensure("aType", 1, type, aType);
            ensure("aPing", 1, ping, aPing);
            ensure("aYaw", 1, yaw, aYaw);

            g.setDrawRange(0, pos.length / 3);
            g.computeBoundingSphere?.();
        } else {
            g.setDrawRange(0, 0);
        }
    });

    const diameterMeters = Math.max(10, (viewWorldWidth) / Math.max(0.001, zoomMul || 1));
    const radiusMeters = diameterMeters * 0.5;

    if (!width || !height) return null;
    const halfW = width * 0.5, halfH = height * 0.5;

    const rawDegreeLabels = [0, 30, 60, 120, 150, 210, 240, 300, 330];
    const block = [0, 90, 180, 270];
    const SEP = 15;
    const degreeLabels = rawDegreeLabels.filter(d =>
        block.every(c => Math.abs(((d - c + 540) % 360) - 180) >= SEP)
    );

    return (
        <group position={position} renderOrder={OVERLAY_ORDER}>
            <group scale={[halfW, halfH, 1]}>
                {/* Base */}
                <mesh frustumCulled={false}>
                    <planeGeometry args={[2, 2]} />
                    <primitive attach="material" object={matBase} />
                </mesh>

                {/* Blips */}
                <group ref={groupContent}>
                    <points frustumCulled={false}>
                        <primitive attach="geometry" object={ptsGeo.current} />
                        <primitive attach="material" object={matPoints} />
                    </points>
                </group>

                {/* Overlay: anillos, sweep, heading */}
                <mesh frustumCulled={false}>
                    <planeGeometry args={[2, 2]} />
                    <primitive attach="material" object={matOverlay} />
                </mesh>

                {/* Cardinales */}
                <group>
                    <Text position={[0, 0.92 * 1.08, 0]} font={orbitronFont} fontSize={0.12} color={CYAN.getStyle()} anchorX="center" anchorY="middle" renderOrder={OVERLAY_ORDER + 3}>N</Text>
                    <Text position={[0, -0.92 * 1.08, 0]} font={orbitronFont} fontSize={0.12} color={CYAN.getStyle()} anchorX="center" anchorY="middle" renderOrder={OVERLAY_ORDER + 3}>S</Text>
                    <Text position={[-0.92 * 1.08, 0, 0]} font={orbitronFont} fontSize={0.12} color={CYAN.getStyle()} anchorX="center" anchorY="middle" renderOrder={OVERLAY_ORDER + 3}>W</Text>
                    <Text position={[0.92 * 1.08, 0, 0]} font={orbitronFont} fontSize={0.12} color={CYAN.getStyle()} anchorX="center" anchorY="middle" renderOrder={OVERLAY_ORDER + 3}>E</Text>
                </group>

                {/* Ticks de brújula (reutilizo geometría ya creada) */}
                <lineSegments frustumCulled={false} renderOrder={OVERLAY_ORDER + 2}>
                    <primitive attach="geometry" object={compassGeom} />
                    <primitive attach="material" object={compassMat} />
                </lineSegments>

                {/* Grados */}
                {degreeLabels.map((deg) => {
                    const rad = (deg * Math.PI) / 180;
                    const rLabel = 0.92 * 1.16;
                    const x = Math.sin(rad) * rLabel;
                    const y = Math.cos(rad) * rLabel;
                    return (
                        <Text
                            key={deg}
                            position={[x, y, 0]}
                            font={orbitronFont}
                            fontSize={0.08}
                            color={CYAN.getStyle()}
                            anchorX="center"
                            anchorY="middle"
                            renderOrder={OVERLAY_ORDER + 3}
                            outlineWidth={0.002}
                            outlineColor="black"
                            outlineOpacity={0.75}
                        >
                            {deg.toString()}
                        </Text>
                    );
                })}

                {/* Etiquetas de rango */}
                {[0, 1, 2].map((i) => {
                    const r = [0.92 * (1 / 3), 0.92 * (2 / 3), 0.92][i];
                    const val = [radiusMeters * (1 / 3), radiusMeters * (2 / 3), radiusMeters][i];
                    const ang = THREE.MathUtils.degToRad(30);
                    const x = Math.sin(ang) * r;
                    const y = Math.cos(ang) * r;
                    const leftHalf = x < 0;
                    return (
                        <Text
                            key={i}
                            position={[x, y, 0]}
                            font={orbitronFont}
                            fontSize={0.07}
                            color={CYAN.getStyle()}
                            anchorX={leftHalf ? "right" : "left"}
                            anchorY="middle"
                            renderOrder={OVERLAY_ORDER + 3}
                            outlineWidth={0.003}
                            outlineColor="black"
                            outlineOpacity={0.75}
                        >
                            {`${Math.round(val)}m`}
                        </Text>
                    );
                })}
            </group>
        </group>
    );
};

export default Radar;
