/**
 * Generador manual de ZIP con compresión STORE (sin compresión)
 * Compatible con parsers Java más estrictos (como los de SUNAT)
 */

export function createStoreZip(filename: string, content: string): Buffer {
  const contentBuffer = Buffer.from(content, 'utf-8')
  const crc = crc32(contentBuffer)

  const localHeader = Buffer.alloc(30)
  localHeader.writeUInt32LE(0x04034b50, 0)     // Local file header signature
  localHeader.writeUInt16LE(20, 4)              // Version needed to extract (2.0)
  localHeader.writeUInt16LE(0, 6)               // General purpose bit flag (no data descriptor)
  localHeader.writeUInt16LE(0, 8)               // Compression method (0 = STORE)
  localHeader.writeUInt16LE(0, 10)              // File last modification time
  localHeader.writeUInt16LE(0, 12)              // File last modification date
  localHeader.writeUInt32LE(crc, 14)            // CRC-32
  localHeader.writeUInt32LE(contentBuffer.length, 18) // Compressed size
  localHeader.writeUInt32LE(contentBuffer.length, 22)   // Uncompressed size
  localHeader.writeUInt16LE(filename.length, 26)      // Filename length
  localHeader.writeUInt16LE(0, 28)                    // Extra field length

  const centralDir = Buffer.alloc(46)
  centralDir.writeUInt32LE(0x02014b50, 0)       // Central directory header signature
  centralDir.writeUInt16LE(20, 4)                 // Version made by
  centralDir.writeUInt16LE(20, 6)               // Version needed to extract
  centralDir.writeUInt16LE(0, 8)                // General purpose bit flag
  centralDir.writeUInt16LE(0, 10)               // Compression method
  centralDir.writeUInt16LE(0, 12)               // File last modification time
  centralDir.writeUInt16LE(0, 14)               // File last modification date
  centralDir.writeUInt32LE(crc, 16)             // CRC-32
  centralDir.writeUInt32LE(contentBuffer.length, 20)  // Compressed size
  centralDir.writeUInt32LE(contentBuffer.length, 24)  // Uncompressed size
  centralDir.writeUInt16LE(filename.length, 28)       // Filename length
  centralDir.writeUInt16LE(0, 30)                     // Extra field length
  centralDir.writeUInt16LE(0, 32)                     // Comment length
  centralDir.writeUInt16LE(0, 34)                     // Disk number start
  centralDir.writeUInt16LE(0, 36)                     // Internal file attributes
  centralDir.writeUInt32LE(0, 38)                     // External file attributes
  centralDir.writeUInt32LE(0, 42)                     // Relative offset of local header

  const endOfCentralDir = Buffer.alloc(22)
  endOfCentralDir.writeUInt32LE(0x06054b50, 0)  // End of central directory signature
  endOfCentralDir.writeUInt16LE(0, 4)           // Number of this disk
  endOfCentralDir.writeUInt16LE(0, 6)           // Disk with central directory
  endOfCentralDir.writeUInt16LE(1, 8)           // Number of entries on this disk
  endOfCentralDir.writeUInt16LE(1, 10)          // Total number of entries
  endOfCentralDir.writeUInt32LE(centralDir.length + filename.length, 12) // Size of central directory
  endOfCentralDir.writeUInt32LE(localHeader.length + filename.length + contentBuffer.length, 16) // Offset of start of central directory
  endOfCentralDir.writeUInt16LE(0, 20)          // ZIP file comment length

  return Buffer.concat([
    localHeader,
    Buffer.from(filename, 'utf-8'),
    contentBuffer,
    centralDir,
    Buffer.from(filename, 'utf-8'),
    endOfCentralDir,
  ])
}

/** CRC-32 simple implementation */
function crc32(buf: Buffer): number {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }

  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}
