//src/game/utils/three/fixIndex0Attr.ts
// Ignora parámetros desconocidos/undefined que llegan a Material.setValues,
// en particular 'index0AttributeName' (ruido de algunos loaders/shaders).
import * as THREE from "three";

let patched = false;
export function patchThreeIndex0AttributeNameWarning() {
    if (patched) return;
    patched = true;
    const orig = (THREE.Material as any).prototype.setValues;
    (THREE.Material as any).prototype.setValues = function setValuesPatched(values: any) {
        if (values && typeof values === "object") {
            const v = { ...values };
            if (v.index0AttributeName === undefined) delete v.index0AttributeName;
            // evita pasar undefined a setValues()
            Object.keys(v).forEach(k => { if (v[k] === undefined) delete v[k]; });
            return orig.call(this, v);
        }
        return orig.call(this, values);
    };
}

export default patchThreeIndex0AttributeNameWarning;
