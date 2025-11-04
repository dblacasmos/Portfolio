/* ===========================================
   FILE: src/game/utils/three/fixIndex0Attr.ts
   =========================================== */
// Limpia params problemáticos antes de Material.setValues
import * as THREE from "three";

let patched = false;
export function patchThreeIndex0AttributeNameWarning() {
    if (patched) return;
    patched = true;

    const proto: any = THREE.Material.prototype;
    const orig = proto.setValues;

    proto.setValues = function setValuesPatched(values: any) {
        if (values && typeof values === "object") {
            const v: any = { ...values };

            // Casos vistos en loaders/shaders:
            if (v.index0AttributeName === undefined || v.index0AttributeName === null) {
                delete v.index0AttributeName;
            }
            if (v.indexAttributeName === undefined || v.indexAttributeName === null) {
                delete v.indexAttributeName;
            }

            // No pasar nunca undefined/null a setValues
            for (const k of Object.keys(v)) {
                if (v[k] === undefined || v[k] === null) delete v[k];
            }
            return orig.call(this, v);
        }
        return orig.call(this, values);
    };
}

export default patchThreeIndex0AttributeNameWarning;
