const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 280,
    x: screenWidth - 440,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minHeight: 280,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setOpacity(0.95);
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  try { trayIcon = nativeImage.createFromPath(iconPath); } 
  catch { trayIcon = nativeImage.createEmpty(); }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '⚙ Настройки (Ctrl+O)', click: () => mainWindow?.webContents.send('open-settings') },
    { type: 'separator' },
    { label: '🔄 Обновить погоду', click: () => mainWindow?.webContents.send('refresh-weather') },
    { type: 'separator' },
    { 
      label: 'ℹ️ О программе', 
      click: () => {
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
          type: 'info', title: 'О программе', 
          message: 'ClockAndWeather v1.3.1',
          detail: 'Разработчик: Виталий Стратиенко\nСайт: itbrutalik.ru\n\n⌨️ Горячие клавиши:\nCtrl+O — Настройки\nCtrl+E — Выход',
          buttons: ['OK']
        });
      }
    },
    { type: 'separator' },
    { label: '✕ Закрыть (Ctrl+E)', click: () => app.quit() }
  ]);

  tray.setToolTip('ClockAndWeather\n⌨️ Ctrl+O: Настройки | Ctrl+E: Выход');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.webContents.send('open-settings'));
}

// ================= IPC ОБРАБОТЧИКИ =================
ipcMain.on('set-opacity', (event, value) => {
  if (mainWindow && typeof value === 'number') {
    mainWindow.setOpacity(Math.max(0.1, Math.min(1, value)));
  }
});

ipcMain.on('set-always-on-top', (event, value) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(!!value, 'screen-saver');
});

ipcMain.on('set-window-size', (event, isMinimal) => {
  if (!mainWindow) return;
  try {
    if (isMinimal) {
      mainWindow.setSize(300, 50, true);
      mainWindow.setMinimumSize(300, 50);
    } else {
      mainWindow.setSize(420, 280, true);
      mainWindow.setMinimumSize(420, 200);
    }
    
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workArea;
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    let newX = x, newY = y;
    if (x + w > sw) newX = sw - w - 10;
    if (y + h > sh) newY = sh - h - 10;
    if (newX !== x || newY !== y) mainWindow.setPosition(newX, newY);
    
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('resize', isMinimal);
      }
    }, 50);
  } catch (err) { console.error('Resize error:', err); }
});

// 🔥 ОБРАБОТЧИК СКВОЗНЫХ КЛИКОВ
ipcMain.on('set-ignore-clicks', (event, ignore) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore);
  }
});

ipcMain.on('close-app', () => { app.quit(); });

// ================= ИНИЦИАЛИЗАЦИЯ =================
app.whenReady().then(() => {
  createWindow();
  createTray();

  // 🔥 ГОРЯЧИЕ КЛАВИШИ (Глобальные)
  
  // Открыть настройки (Ctrl + O)
  globalShortcut.register('CommandOrControl+O', () => {
    if (mainWindow) {
      mainWindow.webContents.send('open-settings');
      // При открытии настроек выключаем сквозные клики
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.webContents.send('update-ignore-clicks', false);
      // Делаем окно активным
      mainWindow.focus();
    }
  });

  // Выход из приложения (Ctrl + E)
  globalShortcut.register('CommandOrControl+E', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Очистка горячих клавиш при выходе
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});