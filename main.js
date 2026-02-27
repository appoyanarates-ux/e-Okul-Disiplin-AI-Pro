import { app, BrowserWindow, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { autoUpdater } from "electron-updater";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.logger = console;

console.log('Uygulama başlatılıyor...');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#f3f4f6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, "dist/index.html"));

  // Ensure focus when restored from taskbar
  win.on('show', () => {
    setTimeout(() => {
      win.focus();
    }, 100);
  });

  // Check for updates
  win.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

// Auto-updater Events
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Güncelleme Mevcut',
    message: `Yeni bir sürüm (${info.version}) mevcut. Şimdi indirmek ister misiniz?`,
    buttons: ['Evet', 'Sonra']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Güncelleme Hazır',
    message: 'Güncelleme indirildi. Uygulama güncellenmek üzere yeniden başlatılacak.',
    buttons: ['Tamam']
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (err) => {
  console.error('Güncelleme hatası:', err);
});

app.whenReady().then(createWindow);
