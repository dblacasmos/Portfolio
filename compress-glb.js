// compress-glb.js
// Compresión Draco-only rápida para casos puntuales.
// Uso:
//   node compress-glb.js input.glb [output.glb] [--level=10]
//
// Sugerencia: para el pipeline completo usa `npm run models:pack`.
import { NodeIO } from '@gltf-transform/core'
import { draco, dedup, prune, resample } from '@gltf-transform/functions'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { basename, dirname, extname, join } from 'node:path'
import { existsSync } from 'node:fs'

function parseArgs() {
    const args = process.argv.slice(2)
    if (!args.length) {
        console.error('Uso: node compress-glb.js input.glb [output.glb] [--level=10]')
        process.exit(1)
    }
    const input = args[0]
    let output = args[1]
    let level = 10
    for (const a of args.slice(2)) {
        const m = /^--level=(\d+)$/i.exec(a)
        if (m) level = Math.max(0, Math.min(10, parseInt(m[1], 10)))
    }
    if (!output) {
        const dir = dirname(input)
        const base = basename(input, extname(input))
        output = join(dir, `${base}.draco.glb`)
    }
    return { input, output, level }
}

const { input: INPUT, output: OUTPUT, level: LEVEL } = parseArgs()

async function run() {
    if (!existsSync(INPUT)) {
        console.error('No existe el archivo:', INPUT)
        process.exit(1)
    }

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
        draco({ compressionLevel: LEVEL })
    )
    await io.write(OUTPUT, doc)
    console.log(`✅ GLB comprimido (Draco-only, nivel=${LEVEL}): ${OUTPUT}`)
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})
