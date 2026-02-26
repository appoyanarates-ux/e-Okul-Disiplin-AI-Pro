
const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const url = require('url');

// Create the native browser window.
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "e-Okul Disiplin Asistanı",
    icon: path.join(__dirname, 'public/favicon.ico'), // Eğer icon varsa
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Basit yapılandırma için
      webSecurity: false // Yerel dosya erişimi için bazen gerekebilir
    }
  });

  // In production, set the menu to null to hide default electron menu
  // mainWindow.setMenu(null);

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, 'build/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  // Open the DevTools only in development
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
