// src/hooks/useCoarsePointer.ts
import { useEffect, useState } from 'react';

export function useCoarsePointer() {
    const [coarse, setCoarse] = useState(false);

    useEffect(() => {
        // Respeta el flag de E2E para forzar móvil
        const forced = localStorage.__FORCE_MOBILE === '1' ||
            document.documentElement.getAttribute('data-force-mobile') === '1';

        if (forced) {
            setCoarse(true);
            return;
        }

        const mm = window.matchMedia('(hover: none) and (pointer: coarse)');
        const update = () => setCoarse(mm.matches);
        update();
        mm.addEventListener?.('change', update);
        return () => mm.removeEventListener?.('change', update);
    }, []);

    return coarse;
}
