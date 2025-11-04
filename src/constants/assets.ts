/* =========================================================
    FILE: src/constants/assets.ts
============================================================
    Rutas a todos los assets públicos del proyecto.
    Usar ASSETS.* en vez de cadenas sueltas por el código.
============================================================ */

export const ASSETS = {
    // Modelos (GLB ya optimizados con KTX2/Draco/Meshopt)
    models: {
        city: "/assets/models/CyberpunkCity.ktx2.glb",
        drone: "/assets/models/drone.ktx2.glb",
        robot: "/assets/models/Robot.ktx2.glb",
        weapon: "/assets/models/weapon.ktx2.glb",
    },

    img: {
        timeline: {
            escudo: "/assets/img/timeline/escudo.webp",
            vida: "/assets/img/timeline/vida.webp",
            skySource: "/assets/img/timeline/skySource.webp",
        },
        ui: {
            paneles: "/assets/ui/paneles.webp",
        },
    },

    // Audio
    audio: {
        botonPresentacion: "/assets/audio/boton_presentacion.wav",
        buttonSound: "/assets/audio/buttonSound.mp3",
        explosionDron: "/assets/audio/explosionDron.mp3",
        musicCity: "/assets/audio/musicCity.mp3",
        openPortfolio: "/assets/audio/openPortfolio.wav",
        introMusic: "/assets/audio/introMusic.mp3",
        reload: "/assets/audio/reload.mp3",
        shotLaser: "/assets/audio/shotLaser.mp3",
        step: "/assets/audio/step.wav",
        portal: "/assets/audio/endDoor.mp3",
        capDos: "/assets/audio/capDosAudio.mp3",
        mainDrums: "/assets/audio/gangsBass.mp3",
    },

    // Vídeo
    video: {
        avatarMission: "/assets/video/avatarMission.mp4",
        bgIntro: "/assets/video/bgIntro.mp4",
        bgMain: "/assets/video/bgMain.mp4",
        endDoor: "/assets/video/endDoor.mp4",
        explosion: "/assets/video/explosion.mp4",
        presentacion: "/assets/video/introNave.mp4",
        robotLoading: "/assets/video/robotLoading.mp4",
        video1: "/assets/video/video1.mp4",
        capDos: "/assets/video/capDosVideo.mp4",
        afterPortal: "/assets/video/afterPortal.mp4",
    },

    // Decoders (GLTF/DRACO)
    decoders: {
        dracoPath: "/assets/draco/",
        basisPath: "/assets/basis/",
    },
} as const;

export type ASSETS = typeof ASSETS;
