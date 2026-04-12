const { contextBridge } = require('electron');

// Expõe uma marca indelével que o jogo pode ler mesmo com identidades trocadas
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform
});
