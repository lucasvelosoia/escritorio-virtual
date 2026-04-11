import './style.css';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { AuthSystem } from './ui/AuthSystem.js';

// Visual Console para Debugging
const logDiv = document.createElement('div');
logDiv.style.cssText = 'position:fixed;top:40px;left:10px;width:300px;max-height:60vh;background:rgba(0,0,0,0.85);color:#0f0;font-size:11px;z-index:99999;overflow-y:auto;pointer-events:none;padding:12px;font-family:monospace;border-radius:8px;border:1px solid #334155;display:none;';
document.body.appendChild(logDiv);

const debugBtn = document.createElement('button');
debugBtn.innerText = '🛠 Debug Log';
debugBtn.style.cssText = 'position:fixed;top:10px;left:10px;z-index:100000;background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:4px 10px;border-radius:6px;font-size:10px;font-family:monospace;cursor:pointer;transition:all 0.2s;';
debugBtn.onmouseover = () => { debugBtn.style.color = '#fff'; debugBtn.style.borderColor = '#7c3aed'; };
debugBtn.onmouseout = () => { debugBtn.style.color = '#94a3b8'; debugBtn.style.borderColor = '#334155'; };
debugBtn.onclick = () => {
    const isHidden = logDiv.style.display === 'none';
    logDiv.style.display = isHidden ? 'block' : 'none';
    debugBtn.style.background = isHidden ? '#7c3aed' : '#1e293b';
    debugBtn.style.color = isHidden ? '#fff' : '#94a3b8';
};
document.body.appendChild(debugBtn);
function visualLog(msg, color='#0f0') {
    const el = document.createElement('div');
    el.style.color = color;
    el.innerText = msg;
    logDiv.appendChild(el);
    logDiv.scrollTop = logDiv.scrollHeight;
}
const origLog = console.log;
console.log = (...args) => { visualLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')); origLog(...args); };
const origErr = console.error;
console.error = (...args) => { visualLog('ERROR: ' + args.join(' '), '#f00'); origErr(...args); };
const origWarn = console.warn;
console.warn = (...args) => { visualLog('WARN: ' + args.join(' '), '#ff0'); origWarn(...args); };

window.onerror = function(msg, url, line) {
    visualLog('FATAL ERROR: ' + msg + ' at line ' + line, '#f00');
};

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width:  window.innerWidth,
    height: window.innerHeight,
    pixelArt: true,
    backgroundColor: '#0f172a',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false },
    },
    scene: [BootScene, GameScene],
};

// Gerenciador de Autenticação
const auth = new AuthSystem({
    onAuthSuccess: (user) => {
        console.log('Bem-vindo,', user.email);
        localStorage.setItem('user-email', user.email);
        localStorage.setItem('user-id', user.id);
        
        // Inicia o jogo apenas após logar
        document.getElementById('hud-main').style.display = 'flex';
        const game = new Phaser.Game(config);
        
        window.addEventListener('resize', () => {
            game.scale.resize(window.innerWidth, window.innerHeight);
        });
    }
});

// Verifica se já está logado ao carregar a página
auth.checkSession();

// Setup UI buttons
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        auth.logout();
    });
}
