import './style.css';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { AuthSystem } from './ui/AuthSystem.js';

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
