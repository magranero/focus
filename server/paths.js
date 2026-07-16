import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

/**
 * Resolves the data directory where FOCUS stores config, layout and widgets.
 * Inside Electron this is overridden with app.getPath('userData'); headless
 * (dev / plain node) falls back to a per-user directory.
 */
let dataDir = process.env.FOCUS_DATA_DIR ||
  path.join(os.homedir(), '.focus-homepage');

export function setDataDir(dir) {
  dataDir = dir;
}

export function getDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export function getWidgetsDir() {
  const dir = path.join(getDataDir(), 'widgets');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
