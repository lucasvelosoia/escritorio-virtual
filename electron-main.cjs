const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        titleBarStyle: 'hiddenInset', // Visual premium de Mac
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true, // Habilita a tag especial que pula bloqueios de site
        }
    });

    // Carrega a versão do seu escritório que está no ar
    // Ou você pode carregar o http://localhost:5173 se estiver rodando local
    win.loadURL('https://escritorio-virtual-pi.vercel.app/');

    // --- O PULO DO GATO (Nível Master) ---
    // Removemos TODOS os bloqueios de segurança que impedem sites (como Google/YouTube) de abrirem
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = details.responseHeaders;
        
        // Remove cabeçalhos restritivos
        delete headers['x-frame-options'];
        delete headers['X-Frame-Options'];
        delete headers['content-security-policy'];
        delete headers['Content-Security-Policy'];

        callback({
            responseHeaders: {
                ...headers,
                'Access-Control-Allow-Origin': ['*'],
                'Access-Control-Allow-Methods': ['*']
            }
        });
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
