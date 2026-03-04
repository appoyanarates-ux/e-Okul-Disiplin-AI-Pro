import { app, BrowserWindow, dialog, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "electron-updater";
const { autoUpdater } = pkg;

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

  // Varsayılan menü çubuğunu tamamen kaldırır (File, Edit vb.)
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, "dist/index.html"));

  // Ensure focus when restored from taskbar
  win.on('show', () => {
    setTimeout(() => {
      win.focus();
    }, 100);
  });

  // Check for updates
  win.once('ready-to-show', () => {
    console.log('Güncelleme kontrolü başlatılıyor...');
    autoUpdater.checkForUpdatesAndNotify();
  });
}

// Auto-updater Events
autoUpdater.on('checking-for-update', () => {
  console.log('Güncelleme kontrol ediliyor...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Güncelleme mevcut:', info.version);
  dialog.showMessageBox({
    type: 'info',
    title: 'Güncelleme Mevcut',
    message: `Yeni bir sürüm (${info.version}) mevcut. Şimdi indirmek ister misiniz?`,
    buttons: ['Evet', 'Sonra']
  }).then((result) => {
    if (result.response === 0) {
      console.log('Güncelleme indirilmesi onaylandı.');
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Güncelleme mevcut değil. Mevcut sürüm güncel:', info.version);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Güncelleme indirildi:', info.version);
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
