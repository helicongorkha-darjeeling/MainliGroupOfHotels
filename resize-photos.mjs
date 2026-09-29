#!/usr/bin/env node

/**
 * resize-photos.mjs
 *
 * Recursively processes every jpg/jpeg/png/webp/heic image inside
 * hotel_teesta_photos/, auto-rotates from EXIF, resizes so the longest
 * side is at most 1920 px (never upscales), strips metadata, and converts
 * to WebP quality 80.
 *
 * Output goes to hotel_teesta_photos_web/ mirroring the original folder
 * structure. Original files are never modified.
 */

import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// ── Config ──────────────────────────────────────────────────────────
const MAX_LONG_SIDE = 1920;
const WEBP_QUALITY = 80;
const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, "hotel_teesta_photos");
const OUTPUT_DIR = path.join(__dirname, "hotel_teesta_photos_web");

// ── Helpers ─────────────────────────────────────────────────────────

/** Recursively collect all supported image file paths. */
async function collectImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(fullPath)));
    } else if (SUPPORTED_EXTS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Pretty-print bytes as MB. */
function toMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍  Scanning for images …");
  const images = await collectImages(INPUT_DIR);
  console.log(`   Found ${images.length} image(s)\n`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalOriginalBytes = 0;
  let totalOutputBytes = 0;

  for (const srcPath of images) {
    const relPath = path.relative(INPUT_DIR, srcPath);
    // Change extension to .webp, keep the rest of the path
    const outRelPath =
      path.join(
        path.dirname(relPath),
        path.basename(relPath, path.extname(relPath))
      ) + ".webp";
    const outPath = path.join(OUTPUT_DIR, outRelPath);

    try {
      // Ensure output subdirectory exists
      await mkdir(path.dirname(outPath), { recursive: true });

      const srcStat = await stat(srcPath);
      totalOriginalBytes += srcStat.size;

      // Read + auto-rotate + get metadata
      const image = sharp(srcPath).rotate(); // auto-rotate from EXIF
      const metadata = await sharp(srcPath).metadata();

      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      const longestSide = Math.max(width, height);

      let pipeline = image;

      // Only downscale, never upscale
      if (longestSide > MAX_LONG_SIDE) {
        pipeline = pipeline.resize({
          width: width >= height ? MAX_LONG_SIDE : undefined,
          height: height > width ? MAX_LONG_SIDE : undefined,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      // Strip metadata and convert to WebP
      const buffer = await pipeline
        .removeAlpha() // drop alpha if not needed (optional, keeps file smaller for photos)
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      await writeFile(outPath, buffer);
      totalOutputBytes += buffer.length;

      processed++;
      const pct = ((processed + skipped + failed) / images.length * 100).toFixed(0);
      process.stdout.write(
        `\r   [${pct}%] Processed: ${processed} | Skipped: ${skipped} | Failed: ${failed}`
      );
    } catch (err) {
      failed++;
      console.error(`\n   ❌  Failed: ${relPath} — ${err.message}`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n");
  console.log("═══════════════════════════════════════════════");
  console.log("  📊  Resize Summary");
  console.log("═══════════════════════════════════════════════");
  console.log(`  ✅  Processed :  ${processed}`);
  console.log(`  ⏭️   Skipped   :  ${skipped}`);
  console.log(`  ❌  Failed    :  ${failed}`);
  console.log(`  📂  Original  :  ${toMB(totalOriginalBytes)} MB`);
  console.log(`  📦  Output    :  ${toMB(totalOutputBytes)} MB`);
  const savings = totalOriginalBytes > 0
    ? ((1 - totalOutputBytes / totalOriginalBytes) * 100).toFixed(1)
    : 0;
  console.log(`  💾  Savings   :  ${savings}%`);
  console.log("═══════════════════════════════════════════════");
  console.log(`\n  Output → ${OUTPUT_DIR}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
