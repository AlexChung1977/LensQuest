const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const WEB_URL = process.env.LENSQUEST_WEB_URL || 'http://localhost:5173';

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    title: 'LensQuest',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void mainWindow.loadURL(WEB_URL);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('lensquest:pickDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle(
  'lensquest:saveFiles',
  async (_event, payload) => {
    const root = payload?.rootDir;
    const files = Array.isArray(payload?.files) ? payload.files : [];
    if (!root || typeof root !== 'string') {
      throw new Error('缺少 rootDir');
    }
    const saved = [];
    for (const file of files) {
      const relative = String(file.relativePath || file.fileName || 'file.bin');
      const absolute = path.join(root, relative);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      const bytes = Buffer.from(file.base64, 'base64');
      await fs.writeFile(absolute, bytes);
      saved.push(absolute);
    }
    return { saved };
  },
);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
