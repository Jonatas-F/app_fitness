/**
 * Gera ícones PNG para PWA/Android a partir do logo SVG.
 *
 * Dependência: sharp (instale apenas quando for gerar os ícones)
 *   npm install sharp --save-dev
 *
 * Uso:
 *   node scripts/generate-pwa-icons.mjs
 *
 * Saída: public/icons/icon-{192,512}.png  e  icon-maskable-{192,512}.png
 */

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const iconsDir = join(root, "public", "icons");

if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

// Tenta importar sharp; se não estiver instalado, instrui o usuário.
let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "\n[generate-pwa-icons] sharp não encontrado.\n" +
    "Instale temporariamente e rode novamente:\n" +
    "  npm install sharp --save-dev\n" +
    "  node scripts/generate-pwa-icons.mjs\n"
  );
  process.exit(1);
}

const svgPath = join(root, "src", "assets", "logo_sp.svg");
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

// Cor de fundo do ícone (mesma do app: #070708)
const bg = { r: 7, g: 7, b: 8, alpha: 1 };

for (const size of sizes) {
  // Ícone normal (fundo escuro + logo centralizado)
  const padding = Math.round(size * 0.15);
  const logoSize = size - padding * 2;

  await sharp(svgBuffer)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: bg })
    .resize(size, size, { fit: "contain", background: bg })
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`));

  console.log(`✓  icon-${size}.png`);

  // Ícone maskable (logo ocupa 80% com safe zone)
  const maskablePadding = Math.round(size * 0.1);
  const maskableLogoSize = size - maskablePadding * 2;

  await sharp(svgBuffer)
    .resize(maskableLogoSize, maskableLogoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: bg })
    .resize(size, size, { fit: "contain", background: bg })
    .png()
    .toFile(join(iconsDir, `icon-maskable-${size}.png`));

  console.log(`✓  icon-maskable-${size}.png`);
}

console.log("\nÍcones PWA gerados em public/icons/\n");
