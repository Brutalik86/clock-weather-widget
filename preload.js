const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openSettings: (callback) => ipcRenderer.on('open-settings', callback),
  refreshWeather: (callback) => ipcRenderer.on('refresh-weather', callback),
  closeApp: () => ipcRenderer.send('close-app'),
  setAlwaysOnTop: (value) => ipcRenderer.send('set-always-on-top', value),
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
  setWindowSize: (isMinimal) => ipcRenderer.send('set-window-size', isMinimal)
});