import { create } from "zustand";

type Vec2 = { x: number; y: number };
type Source = "keyboard" | "touch" | "gamepad";

type InputState = {
    // analógicos
    move: Vec2; // x: strafe (-1..1), y: forward (-1..1)
    look: Vec2; // delta horizontal/vertical acumulado por frame
    // botones
    jump: boolean;
    crouch: boolean;
    sprint: boolean;
    fire: boolean;
    aim: boolean;
    reload: boolean;
    strafeLeft: boolean;   // Q
    strafeRight: boolean;  // E

    // meta
    lastSource: Source;

    // setters
    setMove: (v: Vec2 | ((prev: Vec2) => Vec2), source?: Source) => void;
    addLook: (dx: number, dy: number, source?: Source) => void;
    setButton: (k: keyof Pick<InputState,
        "jump" | "crouch" | "sprint" | "fire" | "aim" | "reload" | "strafeLeft" | "strafeRight">,
        v: boolean, source?: Source) => void;
    resetLook: () => void;

    // util: deshabilitar entradas touch en desktop
    enableTouch: boolean;
    setEnableTouch: (v: boolean) => void;
};

export const useInput = create<InputState>((set) => ({
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },

    jump: false,
    crouch: false,
    sprint: false,
    fire: false,
    aim: false,
    reload: false,
    strafeLeft: false,
    strafeRight: false,

    lastSource: "keyboard",
    enableTouch: false,

    setEnableTouch: (v) =>
        set((s) => (s.enableTouch === v ? s : { enableTouch: v })),

    setMove: (v, source = "keyboard") =>
        set((s) => ({
            move: typeof v === "function" ? (v as (p: Vec2) => Vec2)(s.move) : v,
            lastSource: source,
        })),

    addLook: (dx, dy, source = "keyboard") =>
        set((s) => ({
            look: { x: s.look.x + dx, y: s.look.y + dy },
            lastSource: source,
        })),

    setButton: (k, v, source = "keyboard") =>
        set(() => ({ [k]: v, lastSource: source } as any)),

    resetLook: () => set({ look: { x: 0, y: 0 } }),
}));
