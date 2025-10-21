/*  =========================
    FILE: src/constants/config.ts
    ========================= */
import { ASSETS } from "./assets";

/**
 * Config global del juego.
 * - Mantén aquí valores por defecto y ajustes “de diseño”.
 * - Evita lógica: solo datos y funciones puras (p.ej. scaleForAspect).
 */
export const CFG = {
    // ===========================
    // GAMEPLAY (valores base)
    // ===========================
    gameplay: {
        dronesTotal: 5,
        playerMagSize: 20,
        playerAmmoTotal: 500,
    },

    // ===========================
    // VIEWPORT / ESCALADO
    // ===========================
    viewport: {
        // Resolución de diseño (tu portátil MSI GF63: 1920×1080, 16:9)
        design: { width: 1920, height: 1080 },
        // "contain" = encaja sin recortar (barras si hace falta). "cover" = rellena, puede recortar.
        strategy: "contain" as "contain" | "cover",
        // Topes de escala para móviles/monitores grandes
        minScale: 0.10,
        maxScale: 1.25,
    },

    // =================================
    // ENVIRONMENT / REFLEJOS
    // =================================
    env: {
        /** Intensidad global de reflejos PBR (envMapIntensity por material) */
        intensity: 1.2,
    },

    // ===========================
    // AUDIO (mezclador + clips)
    // ===========================
    audio: {
        // Volúmenes iniciales (0..1)
        musicVolume: 0.2,
        sfxVolume: 0.8,
        uiVolume: 0.9,

        // Ducking al abrir menú
        duckMenu: {
            musicTo: 0.2,
            sfxTo: 0.1,
        },

        // Si true, mutea mientras loadingPct ∈ (0,100)
        muteDuringLoading: true,

        // Clips base (coinciden con ASSETS)
        musicCity: { src: ASSETS.audio.musicCity, loop: true, volume: 0.2 },
        reload: { src: ASSETS.audio.reload, loop: true, volume: 0.8 },
        step: { src: ASSETS.audio.step, loop: true, volume: 0.8 },
        shot: { src: ASSETS.audio.shotLaser, volume: 0.8 },

        // UI
        ui: {
            click: ASSETS.audio.buttonSound,
            open: ASSETS.audio.openPortfolio,
        },

        // SFX (ganancias por tipo)
        sfx: {
            explosionDronVolume: 0.9,
            portalVolume: 0.9, // usado por el portal si no hay override en endDoor
        },
    },

    // ===========================
    // MOVIMIENTO / CONTROLES
    // ===========================
    move: {
        speed: 1.2,
        sprintMul: 1.7,
        standHeight: 0.1,
        crouchHeight: 0.05,
        jumpHeight: 1.7,
        gravity: 10.81,
        dtClampMs: 33,
        headBob: { frequency: 8.0 },
    },

    // Mirada y modo ADS (leído por readAdsMode / readHand)
    look: {
        sensitivity: 0.0015,
        adsMode: "toggle" as "hold" | "toggle",
    },

    controls: {
        nearWallLook: { minFactor: 0.25, strength: 1.0 },
    },

    // ===========================
    // COLISIÓN / CÁPSULA
    // ===========================
    collision: {
        /** Radio de la cápsula de pie (m) */
        radiusStand: 0.04,
        /** Radio en cuclillas (m) — algo menor para “pasillos” */
        radiusCrouch: 0.22,

        /**
         * Te permite acercarte más a paredes sin bloquear tan pronto.
         * A mayor wallPadding → menor radio efectivo contra walls.
         */
        wallPadding: 0.02,

        /** Tamaño máximo del sub-paso al resolver sliding. */
        maxSubstep: 0.15,

        /** Separación mínima tras una colisión. */
        separationEps: 0.001,

        /**
         * Altura mínima Y de triángulos de walls con los que colisiona el player.
         * Sirve para ignorar bordillos o obstáculos bajos.
         */
        minWallY: 0.05,
    },

    // ===========================
    // CAMERA
    // ===========================
    camera: { fov: 60 },

    // ===========================
    // ARMA EN OVERLAY
    // ===========================
    weapon: {
        screenPos: [0.64, -0.1] as [number, number],
        screenDistance: 1.1,
        scale: 0.8,
        rotation: [0.0, 0.16, 0] as [number, number, number],
        modelOffset: [0.0, -0.02, 0] as [number, number, number],
        unlit: true,
        debugCube: false,
        recoil: { kickBack: 0.04, kickRot: 0.015, recover: 5.0 },
        bob: { freqMul: 1.0, posAmp: 0.02, rotAmp: 0.02 },
        sway: { amp: 0.02 },
        modelUrl: ASSETS.models.weapon,
    },

    // ===========================
    // JUGADOR / SPAWN
    // ===========================
    player: {
        /**
         * Distancia hacia dentro desde la pared invisible (m).
         * Aumenta si notas conflictos con la colisión del borde.
         */
        spawnEdgeInset: 3.0,

        /** Lado desde el que aparece el jugador. */
        spawnSide: "east" as "east" | "west" | "north" | "south",

        /** Desplazamiento lateral a lo largo del borde (m). */
        spawnLateralOffset: 0,

        // Preferencia de mano para UI/arma (leído por readHand())
        hand: "right" as "right" | "left",

        // (legacy – compat)
        spawnForwardFromSpawnTex: 8,
    },

    // ===========================
    // RECARGA / MUNICIÓN
    // ===========================
    reload: {
        clipSize: 20,
        reserve: 500,
        timeMs: 2000,
    },

    // ===========================
    // ENDDOOR / PUNTO DE RECOGIDA
    // ===========================
    endDoor: {
        // Si necesitas verlo siempre en debug:
        devForceVisible: false, // ← EndDoor.tsx revisa este flag
        // alias (compat): si alguien usa el viejo nombre, respeta
        devAlwaysVisible: false,

        url: (ASSETS as any)?.video?.endDoor ?? "/assets/video/endDoor.mp4",

        width: 1.6,
        minHeight: 0.9,
        heightAboveGround: 0.4,
        inset: 2.1,          // distancia desde la pared (m)
        lateralOffset: -0.2, // desplazamiento a lo largo de la pared

        // Bucle perfecto del final (sin saltos)
        tailSeconds: 3.0, // tramo a loopear
        tailFps: 30,      // FPS del loop (mem = tailSeconds * tailFps frames)

        // Volumen del portal (override local del de audio.sfx.portalVolume)
        portalVolume: 0.9,

        // Chroma key (fondo azul)
        key: {
            color: "#0b198c",
            tolerance: 0.35,
            smooth: 0.12,
            despill: 0.35,
        },
    },

    // ===========================
    // LASERS / EFECTOS
    // ===========================
    lasers: { viewTiltMeters: 1.2 },

    // ===========================
    // FX (explosión, etc.)
    // ===========================
    fx: {
        explosionSize: 4.2,
    },

    // ===========================
    // HUD (capa, colores, UI)
    // ===========================
    hud: {
        colors: {
            neonCyan: "#22d3ee",
            dangerRed: "#ff2d2d",
            frame: "rgba(255,255,255,0.20)",
            text: "#e6f6ff",
            glass: "rgba(10,14,18,0.45)",
        },
        fonts: {
            orbitronUrl: "/assets/fonts/Orbitron.ttf",
        },
        ui: {
            // Límite de DPR para no sobrecargar móviles
            dprMax: 1.5,
            scale: 1.0,
            breakpoints: { mobileMaxPx: 640, tabletMaxPx: 1024 },

            // Márgenes y snapping del editor
            safeX: 0.02,
            safeY: 0.02,
            snapStep: 0.02,
            snapThreshold: 0.015,
            showGuides: true,

            // Escala responsive empleada por useHudResponsive()
            scaleForAspect: (aspect: number) => {
                if (aspect < 0.65) return 0.85 as const;
                if (aspect < 1.0) return 0.95 as const;
                return 1.0 as const;
            },
        },

        // ------------ DestroyDroneCard (DOM overlay tipo MissionCard) --------------
        destroyDroneCard: {
            // Contenedor (fondo rojo translúcido)
            widthPx: 1000,
            heightPct: 84,
            marginTopPx: 40,
            marginLeftPx: 0,
            marginBottom: 40,
            yOffsetPx: 0,

            cardBgColor: "#9e2940",
            cardBgOpacity: 0.35,
            cardBorderColor: "rgba(248,113,113,0.35)",
            cardShadowInset: "0 0 40px rgba(248,113,113,.18) inset",

            // Padding interno
            contentPadX: 20,
            contentPadY: 20,

            // Layout interno
            gapX: 16,

            // Panel de vídeo (izquierda)
            videoWidthPx: 400,
            videoBgColor: "#062e3a",
            videoBgOpacity: 0.7,
            videoMarginTopPx: 0,
            videoMarginLeftPx: 0,
            videoMarginBottomPx: 20,

            // Panel de texto (derecha)
            textWidthPx: null as null | number, // si null, se calcula
            textBgColor: "#062e3a",
            textBgOpacity: 0.7,
            textMarginTopPx: 0,
            textMarginRightPx: 0,
            textMarginBottomPx: 20,

            // Tipografía
            fontUrl: "/assets/fonts/Orbitron.ttf",
            fontFamily:
                "'Orbitron', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, sans-serif",
            textColor: "#7ef9ff",
            textSizePx: 12,
            lineHeight: 1.5,
            textPaddingX: 16,
            textPaddingY: 16,

            // Etiquetas y UI
            headerSpeakingBg: "rgba(52,211,153,0.15)",
            headerSpeakingRing: "rgba(110,231,183,0.30)",
            headerIdleBg: "rgba(255,255,255,0.10)",
            headerIdleRing: "rgba(255,255,255,0.20)",
        },

        // ---------- Crosshair ----------
        crosshair: {
            zoom: {
                uiMul: 0.4,
                look: { sensitivity: 0.0015, adsFov: 52 },
                audio: {
                    zoomIn: { src: "/audio/servo_in.mp3" },
                    zoomOut: { src: "/audio/servo_out.mp3" },
                },
            },
            canvasPx: [512, 512],
            size: 0.1,
            opacity: 0.95,
            additive: true,
            color: "#57F527",
            glow: 14,
            disk: {
                enabled: true,
                rMul: 0.98,
                center: "rgba(12,18,24,0.25)",
                edge: "rgba(5,8,12,0.10)",
                grid: {
                    enabled: true,
                    count: 12,
                    stepPx: 24,
                    width: 1,
                    color: "rgba(255,255,255,0.07)",
                },
            },
            rings: { outerR: 0.95, outerW: 3, innerR: 0.55, innerW: 2 },
            cross: {
                width: 2,
                lengthMul: 0.58,
                gapPx: 10,
                innerTicks: { enabled: true, count: 8, width: 1, lenPx: 5, stepPx: 10, maxPx: 40 },
            },
            spread: { bump: 0.35, recoverPerSec: 2.5, maxGapPx: 12, expandMul: 0.15 },
            centerDotPx: 3,
        },

        // ---------- Radar ----------
        radar: {
            mode: "ortho" as const,
            canvasPx: [900, 900] as [number, number],
            plane: [0.46, 0.46],
            offset: { top: 0.02, right: 0.02 },

            // Parámetros editables
            viewWorldWidth: 100,
            fillAlphaDefault: 0.38,
            sweepOn: true,
            sweepSpeed: 2.8,
            sweepGain: 1.15,
            sweepWidth: 0.85,
            triggerRadius: 2.6,

            tuning: {
                gridCells: 16,
                gridLineWidthPx: 1.0,
                enemyPointSizePx: 11,
            },

            layoutOverrides: {
                scale: { radar3d: 0.46 },
            },

            routes: {
                main: "./pages/main/Main", // destino al salir por la EndDoor
            },
        },

        // ---------- AmmoBar ----------
        ammo: {
            canvasPx: [800, 200] as [number, number],
            size: 0.72,
            stretchX: 1.0,
            stroke: 2.0,
            glow: 16.0,
            fontMagLabelPx: 56,
            offset: { right: 1.7, bottom: 0.02 },
        },

        // ---------- Diales ----------
        dials: {
            size: 0.3,
            texturePx: 712,
            healthColor: "#ff2d2d",
            shieldColor: "#22d3ee",
            images: {
                vida: ASSETS.img.timeline.vida,
                escudo: ASSETS.img.timeline.escudo,
            },
            health: { left: 1.4, bottom: 0.02 },
            shield: { left: 2.4, bottom: 0.02 },
        },

        // ---------- Barra de recarga ----------
        reloadBar: {
            canvasPx: [820, 180] as [number, number],
            size: [0.63, 0.14] as [number, number],
            x: -0.01,
            y: -0.7,
            cornerPx: 12,
            label: "RECARGANDO…",
        },

        // ---------- Contador de drones ----------
        dronesCounter: {
            enabled: true,
            topPx: 8,
            bg: "rgba(0,0,0,0.40)",
            border: "rgba(103,232,249,0.40)",
            text: "#c4f3ff",
            paddingX: 16,
            paddingY: 4,
            roundedPx: 12,
            canvasPx: [340, 92],
            size: 0.4,
        },

        // ---------- Overrides de layout ----------
        layoutOverrides: {
            ortho: {} as Partial<
                Record<
                    "crosshair" | "ammo" | "health" | "shield" | "reload" | "counter" | "radar3d",
                    { x: number; y: number }
                >
            >,
            scale: {
                radar3d: 0.5,
            } as Partial<Record<"crosshair" | "ammo" | "health" | "shield" | "reload" | "counter" | "radar3d", number>>,
        },
    },

    // ===========================
    // ESCENA / BOUNDS
    // ===========================
    bounds: {
        height: 0,
        heightExtra: 0.3,
        wallThicknessIn: 0.2, // hacia dentro
        wallOffsetOut: 0.0,   // hacia fuera del AABB
        margin: 1,
    },

    city: {
        size: { x: 1024, z: 1024 },
        margin: 2,
        lighting: { ambient: 0.55, directional: 0.65 },
    },

    sky: { darkness: 0.45 },

    floorFill: {
        tileSize: 4,
        grid: 4,
        detectEps: 0.07,
        lift: -0.008,     // ligeramente bajo asfalto
        alignOffset: -0.013,
        carpet: true,     // “alfombra” barata (un polígono)
    },

    wallVideo: {
        url: ASSETS.img.timeline.skySource,
        showWallSkin: true,
        interior: true,
        fadeTopV: 0.85,
        fadeCurve: 1.4,
        brightness: 1.0,
        depthWrite: false,
        repeatX: 1,
        repeatY: 1,
        uvOffsetX: 0,
    },

    dome: {
        segmentsW: 256,
        margin: 1,
        skySource: "/assets/img/timeline/skySource.webp",
    },

    // ===========================
    // DRONES
    // ===========================
    drones: {
        size: 0.16,
        speed: 3.6, // m/s
        pingPongDistance: 3.8,
        capsuleRadius: 0.09,
        capsuleHalfHeight: 0.08,
        customSpawnsWorld: [
            { x: -10.0, z: 0 },
            { x: -4.8, z: 0 },
            { x: -0.2, z: -0.1 },
            { x: 2.4, z: 0 },
            { x: 9.5, z: 0 },
        ],
    },

    // ===========================
    // MODELOS / RUTAS
    // ===========================
    models: {
        city: ASSETS.models.city,
        drone: ASSETS.models.drone,
        robot: ASSETS.models.robot,
        weapon: ASSETS.models.weapon,
    },

    // ===========================
    // LOADING OVERLAY
    // ===========================
    LOADING: {
        transparentBg: false,
        maxWidth: 1200,
        minWidth: 560,
        robotScale: 1.0,
        barScale: 1.0,
    },

    // ===========================
    // DECODERS
    // ===========================
    decoders: {
        basisPath: "/assets/basis/",
        dracoPath: "/assets/draco/",
    },

    // ===========================
    // LAYERS
    // ===========================
    layers: {
        WORLD: 0,
        SHOTS: 1,
        ENEMIES: 2,
        PLAYER: 3,
        WEAPON: 4,
        HUD: 5,
    },

    // ===========================
    // RENDER
    // ===========================
    render: {
        maxAnisotropy: 12,
        minMipmapSize: 512, // usado por tuneMaterials para decidir si genera mips
        useShadowMap: false,
        toneMappingExposure: 1,
        antialias: false,
    },
} as const;

export type CFGType = typeof CFG;
export default CFG;
