/**
 * Script to rename PGN files and playlist folders whose names contain characters
 * that should have been sanitized (e.g. #, [, ]).
 * Usage: npx tsx scripts/sanitize-filenames.ts [--dry-run]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeFilename } from './import-playlist.js';

const PGN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'pgn');

function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('(dry-run mode — nothing will be renamed)\n');

  let renamedDirs = 0;
  let skippedDirs = 0;
  let conflictDirs = 0;

  // Phase 1: Rename playlist folders (process deepest first to avoid path issues)
  console.log('── Folders ──');
  const dirs: string[] = [];
  for (const youtuberEntry of fs.readdirSync(PGN_DIR, { withFileTypes: true })) {
    if (!youtuberEntry.isDirectory()) continue;
    const youtuberPath = path.join(PGN_DIR, youtuberEntry.name);
    for (const playlistEntry of fs.readdirSync(youtuberPath, { withFileTypes: true })) {
      if (!playlistEntry.isDirectory()) continue;
      dirs.push(path.join(youtuberPath, playlistEntry.name));
    }
  }

  for (const dirPath of dirs) {
    const dirName = path.basename(dirPath);
    const sanitized = sanitizeFilename(dirName);

    if (sanitized === dirName) {
      skippedDirs++;
      continue;
    }

    const newPath = path.join(path.dirname(dirPath), sanitized);

    if (fs.existsSync(newPath)) {
      const rel = path.relative(PGN_DIR, dirPath);
      console.warn(`  ⚠ Conflict: ${rel} → ${sanitized} (target already exists)`);
      conflictDirs++;
      continue;
    }

    const rel = path.relative(PGN_DIR, dirPath);
    console.log(`  ${dryRun ? '○' : '✓'} ${rel} → ${sanitized}`);

    if (!dryRun) {
      fs.renameSync(dirPath, newPath);
    }
    renamedDirs++;
  }

  console.log(`Folders: ${renamedDirs} renamed, ${skippedDirs} unchanged, ${conflictDirs} conflicts\n`);

  // Phase 2: Rename PGN files
  console.log('── Files ──');
  const pgnFiles: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.pgn')) {
        pgnFiles.push(full);
      }
    }
  }

  walk(PGN_DIR);

  let renamed = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const filePath of pgnFiles) {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, '.pgn');
    const sanitized = sanitizeFilename(baseName);

    if (sanitized === baseName) {
      skipped++;
      continue;
    }

    const newPath = path.join(dir, sanitized + '.pgn');

    if (fs.existsSync(newPath)) {
      const rel = path.relative(PGN_DIR, filePath);
      console.warn(`  ⚠ Conflict: ${rel} → ${sanitized}.pgn (target already exists)`);
      conflicts++;
      continue;
    }

    const rel = path.relative(PGN_DIR, filePath);
    const newRel = path.relative(PGN_DIR, newPath);
    console.log(`  ${dryRun ? '○' : '✓'} ${rel} → ${path.basename(newRel)}`);

    if (!dryRun) {
      fs.renameSync(filePath, newPath);
    }
    renamed++;
  }

  console.log(`Files: ${renamed} renamed, ${skipped} unchanged, ${conflicts} conflicts`);
}

main();
