/*  ============================
    FILE: src/engine/renderer.ts
    =========================Ç== */
import * as THREE from "three";

export function makeRenderer(container: HTMLElement) {
    const renderer = new THREE.WebGLRenderer({
        antialias: false, // AA por post/FX si hace falta; ahorra VRAM
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
        stencil: false,
        depth: true,
    });
    container.appendChild(renderer.domElement);

    // DPR seguro con ahorro de datos + iOS cap
    const ua = navigator.userAgent;
    const isIOS = /iP(hone|ad|od)/.test(ua);
    const saveData = (navigator as any)?.connection?.saveData === true;
    const prefersLowData = saveData || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-data: reduce)")?.matches);
    const raw = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const maxCap = prefersLowData ? 1.25 : (isIOS ? 1.5 : 2);
    const dpr = Math.min(maxCap, raw);
    renderer.setPixelRatio(dpr);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    const scene = new THREE.Scene();

    let running = true;
    let raf = 0;
    const clock = new THREE.Clock();

    const resize = () => {
        const { clientWidth: w, clientHeight: h } = container;
        camera.aspect = Math.max(1e-6, w / Math.max(1, h));
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const onVis = () => {
        if (document.hidden) {
            running = false;
        } else {
            running = true;
            raf = requestAnimationFrame(renderFrame);
        }
    };
    document.addEventListener("visibilitychange", onVis, { passive: true });

    const onContextLost = (e: Event) => {
        e.preventDefault();
        running = false;
    };
    const onContextRestored = () => {
        running = true;
        raf = requestAnimationFrame(renderFrame);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost as any, { passive: false });
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored as any, { passive: true });

    const renderFrame = () => {
        if (!running) return;
        const dt = clock.getDelta();
        // update(scene, camera, dt) // ← engancha tu loop si procede
        renderer.render(scene, camera);
        raf = requestAnimationFrame(renderFrame);
    };
    raf = requestAnimationFrame(renderFrame);

    const dispose = () => {
        running = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVis);
        ro.disconnect();
        renderer.dispose();
    };

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    return { renderer, scene, camera, dispose, resize, isMobile };
}
