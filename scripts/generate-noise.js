/**
 * Noise Texture Generator
 * Generates a subtle, tileable noise PNG for premium visual effects.
 * Run with: node scripts/generate-noise.js
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const SIZE = 256; // Tileable size (power of 2 for best results)
const NOISE_INTENSITY = 35; // 0-255, lower = more subtle

/**
 * Simple seeded random for reproducibility
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate grayscale noise pixel value
 */
function generateNoisePixel(x, y, seed = 12345) {
  // Combine position with seed for pseudo-random value
  const hash = x * 374761393 + y * 668265263 + seed;
  const random = seededRandom(hash);
  // Center around 128 (neutral gray) with controlled intensity
  const noise = 128 + (random - 0.5) * NOISE_INTENSITY;
  return Math.max(0, Math.min(255, Math.round(noise)));
}

/**
 * Create PNG file data
 */
function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = createIHDRChunk(width, height);

  // IDAT chunk (image data)
  const idat = createIDATChunk(width, height, pixels);

  // IEND chunk
  const iend = createIENDChunk();

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function createIHDRChunk(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data.writeUInt8(8, 8);   // Bit depth
  data.writeUInt8(4, 9);   // Color type (grayscale with alpha)
  data.writeUInt8(0, 10);  // Compression method
  data.writeUInt8(0, 11);  // Filter method
  data.writeUInt8(0, 12);  // Interlace method

  return createChunk('IHDR', data);
}

function createIDATChunk(width, height, pixels) {
  // Create raw scanlines with filter byte (0 = no filter)
  const rawData = [];

  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte: none
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 2;
      rawData.push(pixels[idx]);     // Gray value
      rawData.push(pixels[idx + 1]); // Alpha value
    }
  }

  const raw = Buffer.from(rawData);
  // Use Node.js built-in zlib for proper deflate compression
  const compressed = deflateSync(raw);

  return createChunk('IDAT', compressed);
}

function createIENDChunk() {
  return createChunk('IEND', Buffer.alloc(0));
}

/**
 * CRC32 for PNG chunks
 */
function crc32(data) {
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Main generation function
 */
function generateNoiseTexture() {
  console.log(`Generating ${SIZE}x${SIZE} noise texture...`);

  // Generate pixel data (grayscale + alpha)
  const pixels = new Uint8Array(SIZE * SIZE * 2);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 2;
      const gray = generateNoisePixel(x, y);
      pixels[idx] = gray;       // Grayscale value
      pixels[idx + 1] = 255;    // Full opacity (will be controlled via CSS)
    }
  }

  // Create PNG
  const png = createPNG(SIZE, SIZE, pixels);

  // Write to public folder
  const outputPath = join(__dirname, '..', 'public', 'noise.png');
  writeFileSync(outputPath, png);

  console.log(`Noise texture saved to: ${outputPath}`);
  console.log(`Size: ${SIZE}x${SIZE}px, ${png.length} bytes`);
  console.log('\nUsage in CSS:');
  console.log('  background-image: url("/noise.png");');
  console.log('  background-repeat: repeat;');
  console.log('  mix-blend-mode: overlay;');
  console.log('  opacity: 0.05;');
}

generateNoiseTexture();
