/*  ==================================
    FILE: src/types/react-helpers.d.ts
    ================================== */
import type React from "react";

declare global {
    /** Úsalo como `WithClassName<Props>` para tener className y children tipados */
    type WithClassName<T = {}> = T & {
        className?: string;
        children?: React.ReactNode;
    };
}
export { };
