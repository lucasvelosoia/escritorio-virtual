import { SECTORS } from '../data/sectors.js';
import { EMPLOYEES } from '../data/employees.js';
import { AdminEditMode } from '../utils/AdminEditMode.js';
import { TaskManager } from '../ui/TaskManager.js';
import { AvatarCustomizer } from '../ui/AvatarCustomizer.js';
import { MultiplayerService } from '../utils/MultiplayerService.js';
import { JukeboxUI } from '../ui/JukeboxUI.js';
import { BrowserUI } from '../ui/BrowserUI.js';
import { WorkstationMenu } from '../ui/WorkstationMenu.js';

const T = 32;

// Itens que NÃO bloqueiam passagem (decorativos finos)
const NO_COLLIDE = new Set([
    'laptop-black-down', 'screen-black-down', 'screen-white-down',
    'clock', 'folders', 'bin', 'coffee-dispenser',
    'plant-small', 'plant-small-blue', 'plant-small-cyan', 'plant-small-red',
]);

function _applyHitbox(sp) {
    if (!sp.body) return;
    if (NO_COLLIDE.has(sp.texture?.key)) {
        sp.body.enable = false;
        return;
    }
    const w  = sp.width;
    const h  = sp.height;
    const bh = Math.min(h, T);
    const oy = h - bh;
    sp.body.setSize(w, bh, false);
    sp.body.setOffset(0, oy);
    sp.body.reset(sp.x, sp.y);
}

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.playerLayers = [];
        this.speed = 160;
        this.currentDir = 'down';
        this.activeSector = null;
        this.admin = null;
        this.computers = [];
        this.taskManager = new TaskManager();
        this.sectorZones = new Map();
        this.npcs = [];
        this.avatarCustomizer = new AvatarCustomizer({
            onSave: (base) => this._updatePlayerStyle(base)
        });
        this.jukeboxUI = new JukeboxUI(this);
        this.browserUI = new BrowserUI(this);
        this.workstationMenu = new WorkstationMenu(this);
        this._promptText = null;
        this._lastUpdate = 0;
    }

    async _loadInitialData() {
        let layout = null;
        let employees = null;
        let sectorsData = null;
        
        if (this.multiplayer.active) {
            layout = await this.multiplayer.getLayout();
            employees = await this.multiplayer.getEmployees();
            sectorsData = await this.multiplayer.getSectors();
        }
        
        if (!layout || (Array.isArray(layout) && layout.length === 0)) {
            layout = this.admin.loadLocal();
        }

        if (layout && Array.isArray(layout) && layout.length > 0) {
            this._loadSavedLayout(layout);
        } else {
            this._decorateMarketing(); 
            this._decorateDesenvolvimento();
            this._decorateRH(); 
            this._decorateReuniao();
        }

        if (employees && employees.length > 0) {
            EMPLOYEES.length = 0; 
            EMPLOYEES.push(...employees);
        }

        if (!sectorsData) {
            try { sectorsData = JSON.parse(localStorage.getItem('escritorio-sectors-bounds')); } catch(e) {}
        }
        if (sectorsData) {
            SECTORS.forEach(s => {
                if (sectorsData[s.id]) {
                    s.tileX = sectorsData[s.id].tileX;
                    s.tileY = sectorsData[s.id].tileY;
                    s.tileW = sectorsData[s.id].tileW;
                    s.tileH = sectorsData[s.id].tileH;
                }
            });
            this._drawSectorZones();
        }
        this.events.emit('employees-updated');
    }

    create() {
        console.log('GameScene: Iniciando criação...');
        this.multiplayer = new MultiplayerService(this);

        // --- REFERÊNCIAS DA HUD ---
        const jukeboxBtn = document.getElementById('btn-jukebox');
        const chatBtn    = document.getElementById('btn-chat');
        const chatPanel  = document.getElementById('chat-panel');
        const chatInput  = document.getElementById('chat-input');
        const tasksBtn   = document.getElementById('btn-tasks');
        const custBtn    = document.getElementById('btn-customize');
        const logoutBtn  = document.getElementById('btn-logout');

        // --- ATIVAÇÃO DE BOTÕES DA HUD (Prioridade Alta) ---
        try {
            if (jukeboxBtn) jukeboxBtn.onclick = () => this.jukeboxUI.open();
            if (chatBtn && chatInput) {
                chatBtn.onclick = () => {
                    if (chatPanel?.classList.contains('focused')) chatInput.blur();
                    else { chatPanel?.classList.add('focused'); chatInput.focus(); }
                };
            }
            if (tasksBtn) tasksBtn.onclick = () => document.getElementById('task-board')?.classList.toggle('open');
            if (custBtn)  custBtn.onclick  = () => this.avatarCustomizer.open();
            if (logoutBtn) logoutBtn.onclick = () => { localStorage.clear(); window.location.reload(); };

            // Atalhos de teclado para o Chat
            if (chatInput) {
                this.input.keyboard.on('keydown-T', (e) => {
                    if (document.activeElement !== chatInput) {
                        e.preventDefault();
                        chatPanel?.classList.add('focused');
                        setTimeout(() => chatInput.focus(), 10);
                    }
                });
                this.input.keyboard.on('keydown-ENTER', (e) => {
                    if (document.activeElement !== chatInput) {
                        e.preventDefault();
                        chatPanel?.classList.add('focused');
                        setTimeout(() => chatInput.focus(), 10);
                    }
                });
            }
        } catch (e) {
            console.error('Erro ao inicializar botões da HUD:', e);
        }

        const map = this.make.tilemap({ key: 'office-map' });
        const ts5  = map.addTilesetImage('tileset5_export',        'tileset5_export');
        const ts6  = map.addTilesetImage('tileset6_export',        'tileset6_export');
        const ts1  = map.addTilesetImage('tileset1',               'tileset1');
        const ts1r = map.addTilesetImage('tileset1-repositioning', 'tileset1-repositioning');
        const tsz  = map.addTilesetImage('Special_Zones',          'Special_Zones');
        const allTs = [ts5, ts6, ts1, ts1r, tsz];

        const SKIP = ['collisions', 'start'];
        map.layers.forEach(l => {
            if (!SKIP.includes(l.name)) map.createLayer(l.name, allTs, 0, 0);
        });

        const collLayer = map.getLayer('collisions')
            ? map.createLayer('collisions', allTs, 0, 0).setVisible(false)
            : null;
        if (collLayer) collLayer.setCollisionByExclusion([-1, 0]);

        this.furnitureGroup = this.physics.add.staticGroup();
        this.admin = new AdminEditMode(this, this.furnitureGroup, {
            avatarCustomizer: this.avatarCustomizer
        });

        this._loadInitialData();
        this._drawSectorZones();

        const spawnX = 14 * T;
        const spawnY = 9  * T;
        this._createCharacterAnims();
        this.playerFullKey = localStorage.getItem('player-full-key') || 'male-01-1';
        
        this.player = this.physics.add.sprite(spawnX, spawnY, this.playerFullKey, 1)
            .setScale(1.5).setDepth(50);
            
        this.player.body.setSize(16, 14).setOffset(8, 16);
        if (collLayer) this.physics.add.collider(this.player, collLayer);
        this.physics.add.collider(this.player, this.furnitureGroup);

        this.cameras.main
            .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
            .startFollow(this.player, true, 0.08, 0.08)
            .setZoom(2.5)
            .setBackgroundColor('#0c0a1e');

        this.cursors  = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D,E');
        this._createHUD();
        
        this.wasdKeys.E.on('down', () => {
            if (this.taskManager.isOpen()) { this.taskManager.close(); return; }
            if (this.nearComputer) {
                const sector = SECTORS.find(s => s.id === this.nearComputer.sectorId);
                if (sector && sector.id !== 'reuniao') {
                    this.workstationMenu.open(
                        sector,
                        () => this.browserUI.open(),
                        () => this.taskManager.open(sector)
                    );
                    return;
                }
            }
            if (this.nearJukebox) {
                this.jukeboxUI.open();
                return;
            }
            if (this.activeSector && this.activeSector.id !== 'reuniao') {
                this.workstationMenu.open(
                    this.activeSector,
                    () => this.browserUI.open(),
                    () => this.taskManager.open(this.activeSector)
                );
            }
        });

        this._promptText = this.add.text(0, 0, '[ E ] Tasks', {
            fontFamily: 'monospace', fontSize: '7px', color: '#fbbf24',
            backgroundColor: '#00000099', padding: { x: 4, y: 2 },
        }).setDepth(60).setOrigin(0.5, 1).setVisible(false);

        this.events.on('sector-updated', (s) => {
            const visual = this.sectorZones.get(s.id);
            if (visual) {
                visual.rect.setPosition(s.pixelX, s.pixelY).setSize(s.pixelW, s.pixelH);
                visual.label.setPosition(s.pixelX + s.pixelW / 2, s.pixelY + 4);
            }
        });

        // Configurações adicionais do Chat (Focus/Blur/Send)
        if (chatInput) {
            chatInput.addEventListener('focus', () => {
                if (this.input?.keyboard) this.input.keyboard.enabled = false;
            });
            chatInput.addEventListener('blur', () => {
                if (this.input?.keyboard) this.input.keyboard.enabled = true;
                chatPanel?.classList.remove('focused');
            });
            chatInput.onkeydown = (e) => {
                e.stopPropagation(); 
                if (e.key === 'Enter') {
                    if (chatInput.value.trim() !== '') {
                        this.multiplayer.sendChatMessage(chatInput.value.trim());
                        chatInput.value = '';
                    }
                    chatInput.blur();
                }
                if (e.key === 'Escape') chatInput.blur();
            };
        }

        const userEmail = localStorage.getItem('user-email');
        const userName = userEmail ? userEmail.split('@')[0] : 'Visitante';
        const displayEl = document.getElementById('user-display-name');
        if (displayEl) displayEl.textContent = `${userName} (Você)`;

        const lBtn = document.getElementById('btn-layout');
        if (lBtn) {
            if (userEmail === 'admin@escritorio.com') {
                lBtn.style.display = 'flex';
                lBtn.onclick = () => this.admin.toggle();
            } else {
                lBtn.style.display = 'none';
            }
        }
    }

    _computer(x, y, key, sectorId, depth = 7) {
        const sp = this._furniture(x, y, key, depth);
        const item = this.admin.items[this.admin.items.length - 1];
        if (item) item.sectorId = sectorId;
        this.computers.push({ sprite: sp, sectorId });
        return sp;
    }

    _furniture(x, y, key, depth = 6, originX = 0, originY = 0) {
        const sp = this.furnitureGroup.create(x, y, key).setOrigin(originX, originY).setDepth(depth);
        _applyHitbox(sp);
        const item = this.admin.register(sp, key);
        const sector = this._getSectorAt(x, y, sp.displayWidth, sp.displayHeight, originX, originY);
        if (sector) item.sectorId = sector.id;
        this._makeFurnitureInteractive(sp);
        
        // Se for uma mesa ou algo de trabalho, registramos para proximidade
        const isWork = key.includes('laptop') || key.includes('screen') || key.includes('table') || key.includes('desk') || key.includes('computer') || key.includes('office') || key.includes('monitor');
        if (isWork && item.sectorId) {
            this.computers.push({ sprite: sp, sectorId: item.sectorId });
        }
        return sp;
    }

    _getSectorAt(x, y, w, h, ox, oy) {
        const cx = x + (w * (0.5 - ox));
        const cy = y + (h * (0.5 - oy));
        return SECTORS.find(s => cx >= s.pixelX && cx < s.pixelX + s.pixelW && cy >= s.pixelY && cy < s.pixelY + s.pixelH);
    }

    _makeFurnitureInteractive(sp) {
        const w = sp.width, h = sp.height;
        const ox = sp.originX * w, oy = sp.originY * h;
        sp.setInteractive(new Phaser.Geom.Rectangle(-ox, -oy, w, h), Phaser.Geom.Rectangle.Contains);
        sp.input.cursor = 'pointer';
        sp.on('pointerover', () => { if (!this.admin.active) sp.setTint(0xc4b5fd); });
        sp.on('pointerout',  () => { sp.clearTint(); });
        sp.on('pointerdown', () => { if (!this.admin.active && !this.taskManager.isOpen()) this._handleFurnitureClick(sp); });
    }

    _handleFurnitureClick(sp) {
        console.log('Objeto clicado:', sp.texture.key);
        if (sp.texture.key === 'jukebox') {
            this.jukeboxUI.open();
            return;
        }
        
        const item = this.admin.items.find(i => i.sprite === sp);
        let sectorId = item?.sectorId;
        if (!sectorId) {
            const sector = this._getSectorAt(sp.x, sp.y, sp.displayWidth, sp.displayHeight, sp.originX, sp.originY);
            sectorId = sector?.id;
        }

        const sector = sectorId ? SECTORS.find(s => s.id === sectorId) : null;
        
        // Verificação ampliada para notebooks, telas e QUALQUER tipo de mesa (table, desk, office, monitor)
        const isWorkstation = 
            sp.texture.key.includes('laptop') || 
            sp.texture.key.includes('screen') || 
            sp.texture.key.includes('table') || 
            sp.texture.key.includes('desk') ||
            sp.texture.key.includes('computer') ||
            sp.texture.key.includes('office') ||
            sp.texture.key.includes('monitor');

        if (isWorkstation) {
            this.workstationMenu.open(
                sector,
                () => this.browserUI.open(),
                () => sector ? this.taskManager.open(sector) : null
            );
            return;
        }

        if (sector && sector.id !== 'reuniao') {
            this.workstationMenu.open(
                sector,
                () => this.browserUI.open(),
                () => this.taskManager.open(sector)
            );
        }
    }

    _loadSavedLayout(layout) {
        layout.forEach(({ key, x, y, angle, depth, scaleX, scaleY, originX, originY, sectorId }) => {
            const sp = this.furnitureGroup.create(x, y, key).setOrigin(originX ?? 0, originY ?? 0).setDepth(depth ?? 6).setScale(scaleX ?? 1, scaleY ?? 1).setAngle(angle ?? 0);
            _applyHitbox(sp);
            const item = this.admin.register(sp, key);
            item.sectorId = sectorId;
            if (!item.sectorId) {
                const sector = this._getSectorAt(sp.x, sp.y, sp.displayWidth, sp.displayHeight, sp.originX, sp.originY);
                if (sector) item.sectorId = sector.id;
            }
            this._makeFurnitureInteractive(sp);
            const isComp = key.includes('laptop') || key.includes('screen') || key.includes('table') || key.includes('desk') || key.includes('computer');
            if (item.sectorId && isComp) {
                this.computers.push({ sprite: sp, sectorId: item.sectorId });
            }
            if (key === 'jukebox') {
                this.jukeboxSprite = sp;
            }
        });
        this.furnitureGroup.refresh();
    }

    _decorateMarketing() {
        [[1,3],[1,6]].forEach(([dx,dy]) => {
            this._furniture(dx*T, dy*T, 'table-narrow-brown');
            this._furniture(dx*T, (dy+3)*T, 'chair-pink-down');
            this._computer( dx*T, dy*T, 'laptop-black-down', 'marketing');
        });
    }
    _decorateDesenvolvimento() {
        [[8,3],[8,6],[10,3]].forEach(([dx,dy]) => {
            this._furniture(dx*T, dy*T, 'table-narrow-brown');
            this._furniture(dx*T, (dy+3)*T, 'chair-blue-down');
            this._computer( dx*T, dy*T, 'screen-black-down', 'desenvolvimento');
        });
    }
    _decorateRH() {
        this._furniture(17*T, 8*T, 'table-narrow-brown');
        this._furniture(17*T, 11*T, 'chair-red-down');
        this._computer( 17*T, 8*T, 'laptop-black-down', 'comercial');
    }
    _decorateReuniao() {
        this._furniture(24*T, 5*T, 'table-brown');
        this._furniture(26*T, 5*T, 'table-brown');
        [[24,4,'up'],[26,4,'up'],[24,8,'down'],[26,8,'down']].forEach(([dx,dy,dir]) => {
            this._furniture(dx*T, dy*T, `chair-green-${dir}`, 7);
        });
        
        // Colocando a Jukebox
        this.jukeboxSprite = this._furniture(21*T, 5*T, 'jukebox', 7);
        this.jukeboxSprite.setScale(0.5); // Ajuste de escala para o pixel art premium
    }

    _drawSectorZones() {
        this.sectorZones.forEach(v => { v.rect.destroy(); v.label.destroy(); });
        this.sectorZones.clear();
        SECTORS.forEach(s => {
            const hex = s.color;
            const zone = this.add.rectangle(s.pixelX, s.pixelY, s.pixelW, s.pixelH, hex, 0.03).setOrigin(0, 0).setDepth(2).setStrokeStyle(1, hex, 0.15);
            zone.setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => { 
                if (!this.admin.active && !this.taskManager.isOpen() && s.id !== 'reuniao') {
                    this.workstationMenu.open(
                        s,
                        () => this.browserUI.open(),
                        () => this.taskManager.open(s)
                    );
                }
            });
            const labelStr = '#' + (hex !== undefined ? hex.toString(16).padStart(6,'0') : 'ffffff');
            const label = this.add.text(s.pixelX + s.pixelW / 2, s.pixelY + 4, `◈ ${s.label} ◈`, { 
                fontFamily: 'Outfit, monospace', fontSize: '7px', color: labelStr, fontWeight: '800', 
                backgroundColor: '#000000aa', padding: { x: 6, y: 3 } 
            }).setOrigin(0.5, 0).setDepth(20);
            this.sectorZones.set(s.id, { rect: zone, label });
        });
    }

    _createHUD() {
        this.add.text(8, 8, 'WASD mover  •  E abrir setor', {
            fontFamily: 'Outfit, sans-serif', fontSize: '9px', color: '#fff',
            backgroundColor: '#00000088', padding: { x: 8, y: 4 }
        }).setDepth(100);
        this.sectorLabel = this.add.text(this.scale.width / 2, 8, '', {
            fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
            backgroundColor: '#00000088', padding: { x: 8, y: 3 },
        }).setScrollFactor(0).setDepth(200).setOrigin(0.5, 0);
    }

    _createCharacterAnims() {
        const dirs = [{name:'down',row:0},{name:'left',row:1},{name:'right',row:2},{name:'up',row:3}];
        const bases = [...Array.from({length: 17}, (_, i) => `male-${String(i+1).padStart(2, '0')}`), ...Array.from({length: 22}, (_, i) => `female-${String(i+1).padStart(2, '0')}`)];
        bases.forEach(base => {
            for (let i = 1; i <= 4; i++) {
                const key = `${base}-${i}`;
                if (!this.textures.exists(key)) continue;
                dirs.forEach(({name,row}) => {
                    const b = row*3;
                    if (!this.anims.exists(`${key}-${name}`)) {
                        this.anims.create({key:`${key}-${name}`, frames:this.anims.generateFrameNumbers(key,{frames:[b,b+1,b+2]}), frameRate:8, repeat:-1});
                        this.anims.create({key:`${key}-${name}-idle`, frames:[{key,frame:b+1}], frameRate:1, repeat:0});
                    }
                });
            }
        });
    }

    _updatePlayerStyle(fullKey) {
        this.playerFullKey = fullKey;
        this._createCharacterAnims();
        this.player.setTexture(fullKey);
        this.player.play(`${fullKey}-${this.currentDir}-idle`, true);
        if (this.player.body) this.player.body.setSize(16, 14).setOffset(8, 16);
    }

    update() {
        const {left,right,up,down} = this.cursors;
        const {A,D,W,S} = this.wasdKeys;
        let vx=0, vy=0, moving=false;
        if (left.isDown  || A.isDown) { vx=-this.speed; this.currentDir='left';  moving=true; }
        if (right.isDown || D.isDown) { vx= this.speed; this.currentDir='right'; moving=true; }
        if (up.isDown    || W.isDown) { vy=-this.speed; this.currentDir='up';    moving=true; }
        if (down.isDown  || S.isDown) { vy= this.speed; this.currentDir='down';  moving=true; }
        if (vx && vy) { vx*=0.707; vy*=0.707; }
        this.player.body.setVelocity(vx, vy);
        if (moving) {
            const key = `${this.playerFullKey}-${this.currentDir}`;
            if (this.anims.exists(key)) this.player.play(key, true);
        } else {
            const key = `${this.playerFullKey}-${this.currentDir}-idle`;
            if (this.anims.exists(key)) this.player.play(key, true);
            this.player.body.setVelocity(0,0);
        }
        if (this.multiplayer.active && this.time.now > this._lastUpdate + 50) {
            if (moving || this._wasMoving) { this.multiplayer.sendMovement(this.player); this._lastUpdate = this.time.now; }
            this._wasMoving = moving;
        }

        const px=this.player.x, py=this.player.y;
        let found=null;
        for (const s of SECTORS) {
            if (px>=s.pixelX && px<s.pixelX+s.pixelW && py>=s.pixelY && py<s.pixelY+s.pixelH) { found=s; break; }
        }
        if (found !== this.activeSector) {
            this.activeSector = found;
            const hex = found ? '#'+found.color.toString(16).padStart(6,'0') : '#ffffff';
            this.sectorLabel.setText(found ? `◈ ${found.label}` : '').setColor(hex);
            if (found && found.id === 'reuniao') this._openMeeting();
            else this._closeMeeting();
        }

        const RANGE = 40;
        let nearest = null, nearDist = Infinity;
        for (const c of this.computers) {
            const d = Phaser.Math.Distance.Between(px, py, c.sprite.x + 16, c.sprite.y + 16);
            if (d < RANGE && d < nearDist) { nearest = c; nearDist = d; }
        }
        this.nearComputer = nearest;
        if (nearest && !this.taskManager.isOpen() && !this.admin.active) {
            this._promptText.setText('[ E ] Acessar Estação');
            this._promptText.setPosition(nearest.sprite.x + 16, nearest.sprite.y - 6).setVisible(true);
        } else this._promptText.setVisible(false);

        // Verificação de proximidade Jukebox
        const distJukebox = this.jukeboxSprite ? Phaser.Math.Distance.Between(px, py, this.jukeboxSprite.x + 16, this.jukeboxSprite.y + 16) : Infinity;
        this.nearJukebox = distJukebox < RANGE;
        if (this.nearJukebox && !this.jukeboxUI.isOpen() && !this.admin.active) {
            this._promptText.setText('[ E ] Jukebox');
            this._promptText.setPosition(this.jukeboxSprite.x + 16, this.jukeboxSprite.y - 6).setVisible(true);
        }
    }

    _openMeeting() {
        const modal = document.getElementById('meeting-modal');
        if (!modal || modal.classList.contains('active')) return;
        modal.classList.add('active');
        if (this.input.keyboard) this.input.keyboard.enabled = false;
        
        const container = document.getElementById('jitsi-container');
        const countTxt = document.getElementById('meeting-participants-count');
        const externalLink = document.getElementById('meeting-external-link');
        
        if (countTxt) countTxt.innerText = 'Iniciando conexão...';

        const initCall = () => {
            if (!window.JitsiMeetExternalAPI) {
                if (countTxt) countTxt.innerText = 'Erro de API. Recarregue a página.';
                return;
            }
            try {
                // Jitsi as a Service (JaaS) Configuration
                const appId = import.meta.env.VITE_JITSI_APP_ID || 'vpaas-magic-cookie-cfe2d6c46bde49169e6c80ebc0b80601';
                const domain = '8x8.vc';
                
                // Formato exigido pelo JaaS: AppID/RoomName
                const projectShort = (import.meta.env.VITE_SUPABASE_URL || 'office').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
                const roomName = `${appId}/Office_${projectShort}`;
                
                if (externalLink) {
                    externalLink.href = `https://${domain}/${roomName}`;
                    externalLink.style.display = 'flex';
                }

                if (this.jitsiApi) {
                    try { this.jitsiApi.dispose(); } catch(e) {}
                    this.jitsiApi = null;
                }
                
                if (container) container.innerHTML = '';

                const options = {
                    roomName: roomName,
                    width: '100%', height: '100%',
                    parentNode: container,
                    configOverwrite: { 
                        prejoinPageEnabled: false, 
                        startWithAudioMuted: false, 
                        disableDeepLinking: true,
                        enableWelcomePage: false,
                        enableClosePage: false,
                        // JaaS Specifics
                        disableThirdPartyRequests: true,
                        enableNoAudioDetection: true,
                        enableNoisyMicDetection: true
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_WATERMARK_FOR_GUESTS: false,
                    },
                    userInfo: { displayName: this.multiplayer.userName || 'Usuário' }
                };
                
                this.jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
                
                const iframe = this.jitsiApi.getIFrame();
                if (iframe) {
                    iframe.setAttribute('allow', 'camera *; microphone *; display-capture *; autoplay; clipboard-write; fullscreen');
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = 'none';
                }

                if (countTxt) countTxt.innerText = 'Canal Oficial Conectado';
                this.jitsiApi.addEventListener('readyToClose', () => this._closeMeeting());
            } catch (e) {
                if (countTxt) countTxt.innerText = 'Erro ao carregar canal oficial.';
                console.error(e);
            }
        };

        if (!window.JitsiMeetExternalAPI) {
            const script = document.createElement('script');
            script.src = 'https://8x8.vc/external_api.js';
            script.onload = initCall;
            document.head.appendChild(script);
        } else initCall();

        const leaveBtn = document.getElementById('btn-leave-meeting');
        if (leaveBtn) leaveBtn.onclick = () => { this.player.setPosition(22 * 32, 7 * 32); this._closeMeeting(); };
    }

    _closeMeeting() {
        const modal = document.getElementById('meeting-modal');
        if (modal) modal.classList.remove('active');
        if (this.input.keyboard) this.input.keyboard.enabled = true;
        if (this.jitsiApi) { try { this.jitsiApi.dispose(); } catch(e) {} this.jitsiApi = null; }
        const container = document.getElementById('jitsi-container');
        if (container) Array.from(container.children).forEach(c => c.remove());
        const externalLink = document.getElementById('meeting-external-link');
        if (externalLink) externalLink.style.display = 'none';
    }
}
