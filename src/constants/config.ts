/*  =========================
    FILE: src/constants/config.ts
    ========================= */
import { ASSETS } from "./assets";

export const CFG = {
    // ===========================
    // GAMEPLAY (valores por defecto)
    // ===========================
    gameplay: {
        dronesTotal: 5,

        // ► NUEVO: valores iniciales centralizados
        playerInitialHealth: 100,
        playerInitialShield: 100,

        playerMagSize: 20,
        playerAmmoTotal: 500,

        // AI / combate
        droneDetectRange: 180,
        droneFireIntervalMs: 800,
        droneHitsToDie: 3,
    },

    // ===========================
    // AUDIO (mezclador + clips)
    // ===========================
    audio: {
        // Volúmenes iniciales (0..1)
        musicVolume: 0.2,
        sfxVolume: 0.8,
        uiVolume: 0.9,

        // Ducking cuando se abre el menú
        duckMenu: {
            musicTo: 0.2,
            sfxTo: 0.1,
        },

        // Si true, mutea global mientras loadingPct está entre 1..99
        muteDuringLoading: true,

        // Clips usados por Player/HUD — sincronizados con ASSETS
        musicCity: { src: ASSETS.audio.musicCity, loop: true, volume: 0.2 },
        reload: { src: ASSETS.audio.reload, loop: true, volume: 0.8 },
        step: { src: ASSETS.audio.step, loop: true, volume: 0.8 },
        shot: { src: ASSETS.audio.shotLaser, volume: 0.8 },

        // Sonidos UI
        ui: {
            click: ASSETS.audio.buttonSound,
            open: ASSETS.audio.openPortfolio,
        },

        // Sonidos sFx
        sfx: {
            explosionDronVolume: 0.9,
            portalVolume: 0.9,
        },
    },

    // ===========================
    // MOVIMIENTO / CONTROLES
    // ===========================
    move: {
        speed: 0.5,
        sprintMul: 1.4,
        standHeight: 0.1,
        crouchHeight: 0.05,
        jumpHeight: 1.7,
        gravity: 10.81,
        dtClampMs: 33,
        headBob: { frequency: 8.0 },
    },

    look: { sensitivity: 0.0015 },

    controls: {
        nearWallLook: { minFactor: 0.25, strength: 1.0 },
    },

    // ===========================
    // COLISIÓN / CÁPSULA
    // ===========================
    collision: {
        /** Radio en pie */
        radiusStand: 0.04,
        /** Radio en cuclillas */
        radiusCrouch: 0.22,

        /**
         * Te permite acercarte más a paredes sin “chocar” tan pronto.
         * A mayor wallPadding → menor radio efectivo contra paredes.
         * (Se clampéa para no bajar de 0.05m de radio efectivo).
         */
        wallPadding: 0.02,

        /** Máximo tamaño del subpaso al resolver sliding. */
        maxSubstep: 0.15,

        /** Separación mínima tras resolver colisión. */
        separationEps: 0.001,

        /**
         * ► NUEVO: altura mínima (Y) de triángulos de "walls" con los que colisiona el player.
         * Cualquier pared por debajo de este Y se ignora (bordillos, raíles bajos, etc).
         * Sube/baja este valor para “recortar” qué obstáculos te paran.
         */
        minWallY: 0.05,
    },

    // ===========================
    // ARMA EN OVERLAY (por compat)
    // ===========================
    weapon: {
        screenPos: [0.64, -0.10] as [number, number],
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
    // ► NUEVO: catálogo de armas seleccionables
    // ===========================
    weapons: {
        laserGun: {
            modelUrl: ASSETS.models.weapon,  // reutiliza el actual
            fireRate: 0.15,                  // seg entre disparos (informativo por ahora)
            damage: 10,
            ammoPerMag: 20,
            sfxShot: ASSETS.audio.shotLaser,
        },
        // Ejemplo para futuro:
        // plasmaGun: { modelUrl: ASSETS.models.plasmaGun, fireRate: 0.5, damage: 25, ammoPerMag: 6, sfxShot: ASSETS.audio.plasmaShot }
    } as const,

    // ===========================
    // JUGADOR / SPAWN
    // ===========================
    player: {
        /**
         * Distancia hacia dentro desde la pared invisible (en metros).
         * Aumenta si notas conflictos con la colisión del borde.
         */
        spawnEdgeInset: 2.5,

        /**
         * Lado del que aparece el jugador:
         * "east" ( +X ), "west" ( -X ), "north" ( +Z ), "south" ( -Z )
         */
        spawnSide: "east" as "east" | "west" | "north" | "south",

        /**
         * ► NUEVO: desplazamiento lateral a lo largo del borde (metros).
         * Positivo = a la DERECHA de donde miras; Negativo = a la izquierda.
         * Útil para salir "un poco más hacia la derecha".
         */
        spawnLateralOffset: -1.0,

        // (legacy – no se usa aquí, lo mantengo por compatibilidad)
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
        width: 1.6,
        minHeight: 0.9,
        heightAboveGround: 0.4,
        inset: 6.5,
        lateralOffset: 1.3,

        // Bucle perfecto del final (sin saltos)
        tailSeconds: 3.0,  // duración del tramo a loopear
        tailFps: 30,       // FPS del bucle (memoria aprox: tailSeconds * tailFps frames)

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
    // EXPLOSION / EFECTOS
    // ===========================
    fx: {
        explosionSize: 4.2, // ← ajusta aquí el tamaño global del billboard de explosión
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
            dprMax: 1.5,
            scale: 1.0,
            breakpoints: { mobileMaxPx: 640, tabletMaxPx: 1024 },

            // Márgenes y snapping del editor
            safeX: 0.02,
            safeY: 0.02,
            snapStep: 0.02,
            snapThreshold: 0.015,
            showGuides: true,

            scaleForAspect: (aspect: number) => {
                if (aspect < 0.65) return 0.85 as const;
                if (aspect < 1.0) return 0.95 as const;
                return 1.0 as const;
            },
        },

        // ------------ DestroyDroneCard (DOM overlay tipo MissionCard) --------------
        destroyDroneCard: {
            /* ===== Contenedor principal (fondo rojo translúcido) ===== */
            // Tamaño/posición
            widthPx: 1000,
            heightPct: 84,
            marginTopPx: 40,
            marginLeftPx: 0,
            marginBottom: 40,
            yOffsetPx: 0,

            // Fondo/bordes
            cardBgColor: "#9e2940",
            cardBgOpacity: 0.35,
            cardBorderColor: "rgba(248,113,113,0.35)",
            cardShadowInset: "0 0 40px rgba(248,113,113,.18) inset",

            // Padding interno
            contentPadX: 20,
            contentPadY: 20,

            /* ===== Layout interno ===== */
            gapX: 16,

            /* ===== Panel de vídeo (izquierda) ===== */
            videoWidthPx: 400,
            videoBgColor: "#062e3a",
            videoBgOpacity: 0.70,
            videoMarginTopPx: 0,
            videoMarginLeftPx: 0,
            videoMarginBottomPx: 20,

            /* ===== Panel de texto (derecha) ===== */
            textWidthPx: null as null | number, // ← si null, se calcula
            textBgColor: "#062e3a",
            textBgOpacity: 0.70,
            textMarginTopPx: 0,
            textMarginRightPx: 0,
            textMarginBottomPx: 20,

            /* ===== Tipografía y color ===== */
            fontUrl: "/assets/fonts/Orbitron.tss", // DOM: se usa font-family; .tss se ignora
            fontFamily:
                "'Orbitron', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, sans-serif",
            textColor: "#7ef9ff",
            textSizePx: 11,
            lineHeight: 1.5,
            textPaddingX: 16,
            textPaddingY: 16,

            /* ===== Etiquetas y UI ===== */
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
                }
            },
            canvasPx: [512, 512],
            size: 0.10,
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
            sweepSpeed: 2.8,   // velocidad barrido
            sweepGain: 1.15,   // brillo del barrido
            sweepWidth: 0.85,  // grosor angular del barrido
            triggerRadius: 0.6, // distancia en metros para activar el “teleport” a Main

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
            offset: { right: 1.70, bottom: 0.02 },
        },

        // ---------- Diales ----------
        dials: {
            size: 0.30,
            texturePx: 712,
            healthColor: "#ff2d2d",
            shieldColor: "#22d3ee",
            images: {
                vida: ASSETS.img.timeline.vida,
                escudo: ASSETS.img.timeline.escudo,
            },
            health: { left: 1.40, bottom: 0.02 },
            shield: { left: 2.40, bottom: 0.02 },
        },

        // ---------- Barra de recarga ----------
        reloadBar: {
            canvasPx: [820, 180] as [number, number],
            size: [0.63, 0.14] as [number, number],
            x: -0.01,
            y: -0.70,
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
            size: 0.40,
        },

        // ---------- Overrides de layout ----------
        layoutOverrides: {
            ortho: {} as Partial<Record<
                "crosshair" | "ammo" | "health" | "shield" | "reload" | "counter" | "radar3d",
                { x: number; y: number }
            >>,
            scale: {
                radar3d: 0.5,
            } as Partial<Record<
                "crosshair" | "ammo" | "health" | "shield" | "reload" | "counter" | "radar3d",
                number
            >>,
        },
    },

    // ===========================
    // ESCENA / DOMO / PARED
    // ===========================
    bounds: {
        height: 0,
        heightExtra: 0.3,
        wallThickness: 0.2,
        margin: 1
    },

    city: {
        size: { x: 1024, z: 1024 },
        margin: 2,
        lighting: { ambient: 0.45, directional: 0.65 },
    },

    sky: { darkness: 0.55 },

    floorFill: {
        url: ASSETS.textures.musgo,
        tileSize: 4,
        grid: 4,           // solo se usa si carpet:false
        detectEps: 0.07,
        lift: -0.008,      // por debajo del asfalto
        alignOffset: -0.013,
        carpet: true,      // usa la “alfombra” barata (un solo polígono)
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
    // DRONES (parámetros específicos actuales)
    // ===========================
    drones: {
        size: 0.1,
        speed: 5.6,              // m/s (opcional; ya lo usabas como fallback)
        pingPongDistance: 3.8,
        capsuleRadius: 0.09,
        capsuleHalfHeight: 0.08,
        customSpawnsWorld: [
            { x: -8.0, z: -1.1 },  // 5º más lejano
            { x: -2.8, z: -1.2 }, // 4º 
            { x: 1.9, z: -1.1 },  // 3º 
            { x: 4.5, z: -1.0 },  // 2º carretera principal
            { x: 11.5, z: -1.1 },  // 1º más cercano
        ],
    },

    // ===========================
    // ► NUEVO: catálogo de tipos de enemigo
    // ===========================
    enemies: {
        drone: {
            modelUrl: ASSETS.models.drone,
            health: 3,
            speed: 5.6,
            behavior: "flying" as const,
        },
        // Ejemplo futuro:
        // soldier: { modelUrl: ASSETS.models.soldier, health: 5, speed: 1.0, behavior: "ground" as const }
    } as const,

    // ===========================
    // ► NUEVO: definición de niveles
    // ===========================
    levels: [
        {
            name: "City",
            modelUrl: ASSETS.models.city,
            enemies: [
                { type: "drone", count: 5 },
            ],
            // Punto de salida por defecto: Game calcula spawn real con el BVH
            playerStart: { position: [0, 1.6, 6], lookAt: [0, 1.6, 0] },
        },
    ] as const,

    // ===========================
    // MODELOS / RUTAS
    // ===========================
    models: {
        city: ASSETS.models.city,
        drone: ASSETS.models.drone,
        robot: ASSETS.models.robot,
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

    decoders: {
        basisPath: "/assets/basis/", // <- coincide con lo que acabamos de copiar
        dracoPath: "/assets/draco/", // <- forzamos también Draco bajo /assets
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
        maxAnisotropy: 4,
        useShadowMap: false,
        toneMappingExposure: 1,
        antialias: false,
    },

} as const;

export type CFGType = typeof CFG;
export default CFG;
