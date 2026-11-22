// Preload: the only bridge between the page and Electron.
const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('deck', {
  // Real filesystem path for a dragged-in File object.
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file)
    } catch (_) {
      return ''
    }
  },
  pickAudioFiles: () => ipcRenderer.invoke('pick-audio-files'),
  listConfigs: () => ipcRenderer.invoke('list-configs'),
  saveConfig: (name, data) => ipcRenderer.invoke('save-config', name, data),
  loadConfig: (name) => ipcRenderer.invoke('load-config', name),
  deleteConfig: (name) => ipcRenderer.invoke('delete-config', name),
  autosave: (data) => ipcRenderer.invoke('autosave', data),
  autosaveLoad: () => ipcRenderer.invoke('autosave-load'),
})
