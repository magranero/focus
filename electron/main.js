import { app, Tray, Menu, shell, nativeImage, safeStorage, dialog, clipboard } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setDataDir } from '../server/paths.js';
import { setKeyProtector } from '../server/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let tray = null;
let serverPort = 8642;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(boot).catch((err) => {
    dialog.showErrorBox('FOCUS failed to start', String(err?.stack || err));
    app.quit();
  });
}

async function boot() {
  // macOS: background app, no dock icon — FOCUS lives in the browser + tray.
  if (process.platform === 'darwin') app.dock?.hide();

  setDataDir(app.getPath('userData'));
  if (safeStorage.isEncryptionAvailable()) {
    setKeyProtector({
      encrypt: (buf) => safeStorage.encryptString(buf.toString('base64')),
      decrypt: (buf) => Buffer.from(safeStorage.decryptString(buf), 'base64')
    });
  }

  const { createApp, PORT } = await import('../server/index.js');
  serverPort = PORT;
  await new Promise((resolve, reject) => {
    createApp().listen(PORT, '127.0.0.1', resolve).on('error', reject);
  });

  createTray();

  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });

  const firstRun = !app.getLoginItemSettings().wasOpenedAtLogin;
  if (firstRun) shell.openExternal(homeUrl());
}

function homeUrl() {
  return `http://localhost:${serverPort}`;
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('FOCUS — your start page');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open FOCUS', click: () => shell.openExternal(homeUrl()) },
      { label: 'Settings', click: () => shell.openExternal(`${homeUrl()}/#settings`) },
      { type: 'separator' },
      {
        label: `Set as start page: copy ${homeUrl()}`,
        click: () => clipboard.writeText(homeUrl())
      },
      { type: 'separator' },
      { label: 'Quit FOCUS', click: () => app.quit() }
    ])
  );
  tray.on('click', () => shell.openExternal(homeUrl()));
}

app.on('window-all-closed', (e) => e.preventDefault?.());
