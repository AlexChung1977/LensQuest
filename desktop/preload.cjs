const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lensquestDesktop', {
  isDesktop: true,
  pickDirectory: () => ipcRenderer.invoke('lensquest:pickDirectory'),
  saveFiles: (payload) => ipcRenderer.invoke('lensquest:saveFiles', payload),
});
