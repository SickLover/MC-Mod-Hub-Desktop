const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 设置文件路径
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

// ---------------------------------------------------------------------------
// 设置读写工具
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  curseforgeApiKey: '',
  defaultDownloadDir: '',
  checkUpdatesOnStartup: true,
};

function readSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('读取设置失败:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

function writeSettings(settings) {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('写入设置失败:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// IPC 处理
// ---------------------------------------------------------------------------

ipcMain.handle('getSettings', () => {
  return readSettings();
});

ipcMain.handle('saveSettings', (_event, settings) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  writeSettings(merged);
  return merged;
});

ipcMain.handle('selectDir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择默认下载目录',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// ---------------------------------------------------------------------------
// 窗口创建
// ---------------------------------------------------------------------------

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'MC Mod Hub',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// 应用生命周期
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
