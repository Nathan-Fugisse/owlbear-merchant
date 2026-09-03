import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * Compactador ZIP sem dependencias (usa apenas modulos nativos do Node).
 *
 * Uso:
 *   node scripts/zip.mjs            -> gera os dois zips (codigo fonte + build pronto)
 *   node scripts/zip.mjs source     -> so o codigo fonte
 *   node scripts/zip.mjs dist       -> so o build pronto (dist/)
 *   node scripts/zip.mjs all        -> os dois
 *
 * Nomes gerados:
 *   owlbear-merchant-v1.0.0-codigo-fonte.zip
 *   owlbear-merchant-v1.0.0-build-pronto.zip
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function dosDateTime(date) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, day };
}

function collect(dir, prefix = "", ignore = new Set()) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      entries.push(...collect(full, name, ignore));
    } else if (entry.isFile()) {
      entries.push({ full, name });
    }
  }
  return entries;
}

export function createZip(files, outFile) {
  const { time, day } = dosDateTime(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const raw = fs.readFileSync(file.full);
    const compressed = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const crc = crc32(raw);
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuffer, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + payload.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(
    outFile,
    Buffer.concat([...locals, centralBuffer, end]),
  );
  return { files: files.length, outFile };
}

const SOURCE_IGNORE = new Set([
  "node_modules",
  "dist",
  ".git",
  ".cache",
  ".vscode",
  ".idea",
  "coverage",
]);

const VERSION = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const DIST_ZIP = `owlbear-merchant-v${VERSION}-build-pronto.zip`;
const SOURCE_ZIP = `owlbear-merchant-v${VERSION}-codigo-fonte.zip`;

function zipDist() {
  if (!fs.existsSync("dist")) {
    console.error("dist/ nao existe. Rode `npm run build:github` antes.");
    process.exit(1);
  }
  const files = collect("dist", "owlbear-merchant");
  const result = createZip(files, DIST_ZIP);
  console.log(`✔ ${result.outFile}  ->  build pronto pra hospedar (${result.files} arquivos)`);
}

function zipSource() {
  const files = collect(".", "owlbear-merchant", SOURCE_IGNORE).filter(
    (file) => !file.name.endsWith(".zip"),
  );
  const result = createZip(files, SOURCE_ZIP);
  console.log(`✔ ${result.outFile}  ->  projeto completo (${result.files} arquivos)`);
}

const mode = process.argv[2] ?? "all";
if (mode === "dist") zipDist();
else if (mode === "source") zipSource();
else if (mode === "all") {
  zipDist();
  zipSource();
} else {
  console.error(`Modo desconhecido: ${mode}. Use dist | source | all`);
  process.exit(1);
}
