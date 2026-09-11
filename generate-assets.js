/**
 * generate-assets.js
 * Script untuk membuat placeholder PNG assets untuk Expo
 * Dijalankan sekali: node generate-assets.js
 */

const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 PNG buffer (deep black #0B0B0C)
// PNG signature + IHDR + IDAT + IEND
function createMinimalPNG(r, g, b, width = 1, height = 1) {
  // This creates a valid 1x1 PNG in the specified color
  const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    const crcData = Buffer.concat([typeBytes, data]);
    crcBuf.writeUInt32BE(crc32(crcData));
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
  }

  // IHDR: width, height, bit depth, color type (2=RGB), compression, filter, interlace
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT: raw pixel data (filter byte 0 + RGB per row)
  // Using zlib compress - we'll use a simple uncompressed deflate
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0; // filter type
    for (let x = 0; x < width; x++) {
      const offset = y * (1 + width * 3) + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }

  // Simple zlib wrapper (deflate stored block)
  function zlibDeflate(data) {
    const cmf = 0x78; // deflate, window size 32K
    const flg = 0x01; // check bits
    const bfinal = 0x01; // final block
    const btype = 0x00; // no compression
    const len = data.length;
    const nlen = (~len) & 0xFFFF;
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt16LE(len, 0);
    lenBuf.writeUInt16LE(nlen, 2);

    // Adler32 checksum
    let s1 = 1, s2 = 0;
    for (let i = 0; i < data.length; i++) {
      s1 = (s1 + data[i]) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    const adler = Buffer.alloc(4);
    adler.writeUInt32BE((s2 << 16) | s1);

    return Buffer.concat([
      Buffer.from([cmf, flg]),
      Buffer.from([bfinal | (btype << 1)]),
      lenBuf,
      data,
      adler
    ]);
  }

  const idat = zlibDeflate(rawData);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', iend),
  ]);
}

// Create a simple colored square PNG using canvas-like approach
// For Expo, we need proper PNGs - let's use Node's built-in to write valid placeholders

const assetsDir = path.join(__dirname, 'assets', 'images');

// Colors for MB Club branding
const OBSIDIAN = [11, 11, 12];     // #0B0B0C
const GOLD = [201, 168, 76];       // #C9A84C
const CHARCOAL = [23, 24, 28];     // #17181C

const assets = [
  { name: 'icon.png', color: OBSIDIAN },
  { name: 'splash.png', color: OBSIDIAN },
  { name: 'adaptive-icon.png', color: GOLD },
  { name: 'favicon.png', color: OBSIDIAN },
  { name: 'notification-icon.png', color: GOLD },
];

assets.forEach(({ name, color }) => {
  const filePath = path.join(assetsDir, name);
  if (!fs.existsSync(filePath)) {
    const png = createMinimalPNG(color[0], color[1], color[2]);
    fs.writeFileSync(filePath, png);
    console.log(`✅ Created: assets/images/${name}`);
  } else {
    console.log(`⏭️  Skipped (exists): assets/images/${name}`);
  }
});

console.log('\n✨ Asset generation complete!');
console.log('💡 Replace these placeholder PNGs with proper branding assets before publishing.\n');
