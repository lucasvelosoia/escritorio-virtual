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
            webSecurity: false, // DESATIVA TRAVA DE SEGURANÇA PARA FETCH LOCAL
            preload: path.join(__dirname, 'electron-preload.cjs')
        }
    });

    // DURANTE O DESENVOLVIMENTO: Carregamos o seu servidor local (Vite)
    // Para isso, você precisa rodar 'npm run dev' em outro terminal
    win.loadURL('http://localhost:5173');
    
    // CASO QUEIRA CARREGAR A PRODUÇÃO:
    // win.loadURL('https://escritorio-virtual-pi.vercel.app/');
    
    // Abre o console automaticamente para vermos erros
    win.webContents.openDevTools();

    // --- CADEADO DE NAVEGAÇÃO ---
    // Impede que sites externos "sequestrem" a janela principal do jogo
    win.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('http://localhost:5173')) {
            console.log('[Electron] Bloqueando navegação externa da janela principal:', url);
            event.preventDefault();
        }
    });

    // Redireciona popups para o navegador interno (opcional) ou impede abertura
    win.webContents.setWindowOpenHandler(({ url }) => {
        console.log('[Electron] Tentativa de popup bloqueada/redirecionada:', url);
        return { action: 'deny' };
    });

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
