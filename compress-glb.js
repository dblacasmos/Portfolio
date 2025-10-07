// compress-glb.js (versión simple)
import { NodeIO } from '@gltf-transform/core'
import { draco, dedup, prune, resample } from '@gltf-transform/functions'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'

const INPUT = 'public/assets/models/AvatarRobotLuz.glb'      // ⬅️ ajusta a tu ruta real
const OUTPUT = 'public/assets/models/AvatarRobotLite.glb'    // ⬅️ salida

async function run() {
    const io = new NodeIO()
        .registerExtensions([KHRDracoMeshCompression])
        .registerDependencies({
            'draco3d.decoder': await draco3d.createDecoderModule(),
            'draco3d.encoder': await draco3d.createEncoderModule(),
        })

    const doc = await io.read(INPUT)
    await doc.transform(
        dedup(),
        prune(),
        resample(),
        draco({ compressionLevel: 10 })
    )
    await io.write(OUTPUT, doc)
    console.log('✅ GLB comprimido (Draco-only):', OUTPUT)
}
run().catch(console.error)