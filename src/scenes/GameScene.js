import { SECTORS } from '../data/sectors.js';
import { EMPLOYEES } from '../data/employees.js';
import { AdminEditMode } from '../utils/AdminEditMode.js';
import { TaskManager } from '../ui/TaskManager.js';
import { AvatarCustomizer } from '../ui/AvatarCustomizer.js';
import { MultiplayerService } from '../utils/MultiplayerService.js';

const T = 32;

// Itens que NÃO bloqueiam passagem (decorativos finos)
const NO_COLLIDE = new Set([
    'laptop-black-down', 'screen-black-down', 'screen-white-down',
    'clock', 'folders', 'bin', 'coffee-dispenser',
    'plant-small', 'plant-small-blue', 'plant-small-cyan', 'plant-small-red',
]);

// Aplica hitbox no "rodapé" do objeto (última linha de tiles)
// Assim o jogador colide só com a base, não com a parte aérea do sprite
function _applyHitbox(sp) {
    if (!sp.body) return;
    if (NO_COLLIDE.has(sp.texture?.key)) {
        sp.body.enable = false;
        return;
    }
    const w  = sp.width;
    const h  = sp.height;
    const bh = Math.min(h, T);        // hitbox height = 1 tile
    const oy = h - bh;                // offset vertical: rodapé
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
        this.computers = [];        // {sprite, sectorId}
        this.taskManager = new TaskManager();
        this.sectorZones = new Map(); // Store sector visuals: id -> {rect, label}
        this.npcs = [];              // Store employee NPCs
        this.avatarCustomizer = new AvatarCustomizer({
            onSave: (base) => this._updatePlayerStyle(base)
        });
        this._promptText = null;
        this._lastUpdate = 0;
        this._lastUpdate = 0;
    }

    async _loadInitialData() {
        let layout = null;
        let employees = null;
        
        if (this.multiplayer.active) {
            layout = await this.multiplayer.getLayout();
            employees = await this.multiplayer.getEmployees();
        }
        
        // Fallback p/ localStorage se o banco estiver vazio ou inativo
        if (!layout) layout = this.admin.loadLocal();
        if (layout) this._loadSavedLayout(layout);
        else {
            this._decorateMarketing(); this._decorateDesenvolvimento();
            this._decorateRH(); this._decorateReuniao();
        }

        // Se o Supabase tiver funcionários, substitui os locais
        if (employees && employees.length > 0) {
            // Atualiza o array global (importado)
            EMPLOYEES.length = 0; 
            EMPLOYEES.push(...employees);
        }
        
        // this._spawnEmployees(); // Removidos os funcionários fakes
    }

    create() {
        this.multiplayer = new MultiplayerService(this);
        
        // ── Mapa WA padrão ────────────────────────────────────────────
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

        // ── Grupo de física estática para móveis ──────────────────────
        this.furnitureGroup = this.physics.add.staticGroup();

        // Admin / Modo Layout
        this.admin = new AdminEditMode(this, this.furnitureGroup, {
            avatarCustomizer: this.avatarCustomizer
        });

        // Tenta carregar do Supabase primeiro
        this._loadInitialData();

        // ── Zonas e Labels dos setores clicáveis ──────────────────────
        this._drawSectorZones();

        // ── Personagem Principal ──────────────────────────────────────
        const spawnX = 14 * T;
        const spawnY = 9  * T;
        this._createCharacterAnims();
        
        // Recupera estilo salvo ou usa padrão
        this.playerFullKey = localStorage.getItem('player-full-key') || 'male-01-1';
        
        this.player = this.physics.add.sprite(spawnX, spawnY, this.playerFullKey, 1)
            .setScale(1.5).setDepth(50);
            
        this.player.body.setSize(16, 14).setOffset(8, 16);
        if (collLayer) this.physics.add.collider(this.player, collLayer);
        this.physics.add.collider(this.player, this.furnitureGroup);

        // ── Câmera ────────────────────────────────────────────────────
        this.cameras.main
            .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
            .startFollow(this.player, true, 0.08, 0.08)
            .setZoom(2.5)
            .setBackgroundColor('#0c0a1e');

        // ── Input / HUD ───────────────────────────────────────────────
        this.cursors  = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D,E');
        this._createHUD();
        
        this.wasdKeys.E.on('down', () => {
            if (this.taskManager.isOpen()) { this.taskManager.close(); return; }
            if (this.nearComputer) {
                const sector = SECTORS.find(s => s.id === this.nearComputer.sectorId);
                if (sector) { this.taskManager.open(sector); return; }
            }
            // Se estiver dentro de um setor, abre o Kanban dele
            if (this.activeSector) this.taskManager.open(this.activeSector);
        });

        // Prompt flutuante "E - abrir tasks"
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

        // Removidos os bonecos automáticos (NPCs) para focar apenas no multiplayer real

        // Conecta botões do HUD (HTML)
        const chatBtn = document.getElementById('btn-chat');
        if (chatBtn) {
            chatBtn.onclick = () => {
                const panel = document.getElementById('chat-panel');
                panel?.classList.toggle('open');
            };
        }

        const tasksBtn = document.getElementById('btn-tasks');
        if (tasksBtn) {
            tasksBtn.onclick = () => {
                const panel = document.getElementById('task-board');
                panel?.classList.toggle('open');
            };
        }
        
        const customizeBtn = document.getElementById('btn-customize');
        if (customizeBtn) {
            customizeBtn.onclick = () => this.avatarCustomizer.open();
        }

        // Conecta Chat Multi (Input)
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('focus', () => {
                if (this.input && this.input.keyboard) {
                    this.input.keyboard.enabled = false;
                }
            });
            chatInput.addEventListener('blur', () => {
                if (this.input && this.input.keyboard) {
                    this.input.keyboard.enabled = true;
                }
            });

            chatInput.onkeydown = (e) => {
                // Impede o evento de chegar a qualquer listener global fora, por garantia
                e.stopPropagation(); 
                if (e.key === 'Enter' && chatInput.value.trim() !== '') {
                    this.multiplayer.sendChatMessage(chatInput.value.trim());
                    chatInput.value = '';
                }
            };
        }

        // Restrição de Admin para Modo Layout e Identificação do Usuário
        const userEmail = localStorage.getItem('user-email');
        const userName = userEmail ? userEmail.split('@')[0] : 'Visitante';
        const displayEl = document.getElementById('user-display-name');
        
        console.log('HUD Update debug:', { userEmail, userName, foundDisplayEl: !!displayEl });

        if (displayEl) {
            displayEl.textContent = `${userName} (Você)`;
        }

        const lBtn = document.getElementById('btn-layout');
        const cBtn = document.getElementById('btn-chat');
        const custBtn = document.getElementById('btn-customize');

        console.log('Buttons Check debug:', { 
            layoutBtn: !!lBtn, 
            chatBtn: !!cBtn, 
            customizeBtn: !!custBtn 
        });

        if (lBtn) {
            if (userEmail === 'admin@escritorio.com') {
                lBtn.style.display = 'flex';
                lBtn.onclick = () => this.admin.toggle();
            } else {
                lBtn.style.display = 'none';
            }
        }
    }

    // ── Helper: cria computador e associa a um setor ──────────────────
    _computer(x, y, key, sectorId, depth = 7) {
        const sp = this._furniture(x, y, key, depth);
        // Marca o item no admin para persistir o sectorId
        const item = this.admin.items[this.admin.items.length - 1];
        if (item) item.sectorId = sectorId;
        this.computers.push({ sprite: sp, sectorId });
        return sp;
    }

    // ── Helper: cria móvel com hitbox de física e registra no admin ───
    _furniture(x, y, key, depth = 6, originX = 0, originY = 0) {
        const sp = this.furnitureGroup.create(x, y, key)
            .setOrigin(originX, originY)
            .setDepth(depth);
        _applyHitbox(sp);
        
        const item = this.admin.register(sp, key);
        
        // Atribui setor baseado na posição
        const sector = this._getSectorAt(x, y, sp.displayWidth, sp.displayHeight, originX, originY);
        if (sector) item.sectorId = sector.id;

        this._makeFurnitureInteractive(sp);
        return sp;
    }

    _getSectorAt(x, y, w, h, ox, oy) {
        const cx = x + (w * (0.5 - ox));
        const cy = y + (h * (0.5 - oy));
        return SECTORS.find(s => 
            cx >= s.pixelX && cx < s.pixelX + s.pixelW && 
            cy >= s.pixelY && cy < s.pixelY + s.pixelH
        );
    }

    _makeFurnitureInteractive(sp) {
        const w = sp.width;
        const h = sp.height;
        const ox = sp.originX * w;
        const oy = sp.originY * h;
        
        sp.setInteractive(
            new Phaser.Geom.Rectangle(-ox, -oy, w, h),
            Phaser.Geom.Rectangle.Contains
        );
        sp.input.cursor = 'pointer';

        // Feedback visual ao passar o mouse
        sp.on('pointerover', () => { if (!this.admin.active) sp.setTint(0xc4b5fd); });
        sp.on('pointerout',  () => { sp.clearTint(); });

        sp.on('pointerdown', (pointer) => {
            if (this.admin.active || this.taskManager.isOpen()) return;
            // Abre o Kanban ao clicar
            this._handleFurnitureClick(sp);
        });
    }

    _handleFurnitureClick(sp) {
        const item = this.admin.items.find(i => i.sprite === sp);
        let sectorId = item?.sectorId;

        if (!sectorId) {
            const sector = this._getSectorAt(sp.x, sp.y, sp.displayWidth, sp.displayHeight, sp.originX, sp.originY);
            sectorId = sector?.id;
        }

        if (sectorId) {
            const sector = SECTORS.find(s => s.id === sectorId);
            if (sector) this.taskManager.open(sector);
        }
    }

    // ── Restaura layout salvo do localStorage ─────────────────────────
    _loadSavedLayout(layout) {
        layout.forEach(({ key, x, y, angle, depth, scaleX, scaleY, originX, originY, sectorId }) => {
            const sp = this.furnitureGroup.create(x, y, key)
                .setOrigin(originX ?? 0, originY ?? 0)
                .setDepth(depth ?? 6)
                .setScale(scaleX ?? 1, scaleY ?? 1)
                .setAngle(angle ?? 0);
            _applyHitbox(sp);
            
            const item = this.admin.register(sp, key);
            
            // Recupera o setor salvo ou encontra por posição
            item.sectorId = sectorId;
            if (!item.sectorId) {
                const sector = this._getSectorAt(sp.x, sp.y, sp.displayWidth, sp.displayHeight, sp.originX, sp.originY);
                if (sector) item.sectorId = sector.id;
            }

            this._makeFurnitureInteractive(sp);

            // Registra como computador se for um item de informática
            if (item.sectorId && (key.includes('laptop') || key.includes('screen'))) {
                this.computers.push({ sprite: sp, sectorId: item.sectorId });
            }
        });
        this.furnitureGroup.refresh();
    }

    // ── MARKETING — sala esquerda (col 1-6, row 3-12) ────────────────
    _decorateMarketing() {
        [[1,3],[1,6]].forEach(([dx,dy]) => {
            this._furniture(dx*T, dy*T,     'table-narrow-brown');
            this._furniture(dx*T, (dy+3)*T, 'chair-pink-down');
            this._computer( dx*T, dy*T,     'laptop-black-down', 'marketing');
        });
        this._furniture(3*T, 3*T,  'shelf-big-filled');
        this._furniture(5*T, 10*T, 'plant-small', 7);
        this._furniture(4*T, 5*T,  'bin');
        this._furniture(3*T, 7*T,  'folders');
        [4,6,8].forEach(dy => this._furniture(6*T, dy*T, 'table-small-white'));
    }

    // ── DESENVOLVIMENTO — centro-esquerda (col 8-15, row 3-12) ───────
    _decorateDesenvolvimento() {
        [[8,3],[8,6],[10,3]].forEach(([dx,dy]) => {
            this._furniture(dx*T, dy*T,     'table-narrow-brown');
            this._furniture(dx*T, (dy+3)*T, 'chair-blue-down');
            this._computer( dx*T, dy*T,     'screen-black-down', 'desenvolvimento');
        });
        this._furniture(12*T, 3*T,  'printer');
        this._furniture(13*T, 10*T, 'plant-small-cyan', 7);
        this._furniture(11*T, 8*T,  'clock');
        [3,5,7,9].forEach(dy => this._furniture(15*T, dy*T, 'table-small-grey'));
    }

    // ── COMERCIAL — centro-direita (col 16-21, row 3-12) ─────────────
    _decorateRH() {
        this._furniture(17*T, 4*T,  'couch-grey-down');
        this._furniture(20*T, 4*T,  'armchair-grey-down');
        this._furniture(17*T, 8*T,  'table-narrow-brown');
        this._furniture(17*T, 11*T, 'chair-red-down');
        this._computer( 17*T, 8*T,  'laptop-black-down', 'comercial');
        this._furniture(20*T, 8*T,  'shelf-big-filled');
        this._furniture(20*T, 10*T, 'folders', 7);
        this._furniture(16*T, 11*T, 'plant-small-red', 7);
        this._furniture(21*T, 11*T, 'bin');
        [3,6].forEach(dy => this._furniture(22*T, dy*T, 'bookshelf'));
    }

    // ── SALA DE REUNIÃO — sala direita (col 23-29, row 3-12) ─────────
    _decorateReuniao() {
        this._furniture(24*T, 5*T, 'table-brown');
        this._furniture(26*T, 5*T, 'table-brown');
        [[24,4,'up'],[26,4,'up'],[24,8,'down'],[26,8,'down']].forEach(([dx,dy,dir]) => {
            this._furniture(dx*T, dy*T, `chair-green-${dir}`, 7);
        });
        this._furniture(25*T, 3*T,  'big-screen-white-down');
        this._furniture(28*T, 10*T, 'coffee-dispenser');
        this._furniture(23*T, 10*T, 'plant-small-blue', 7);
    }

    _drawSectorZones() {
        SECTORS.forEach(s => {
            const hex = s.color;
            // Retângulo de fundo sutil
            const zone = this.add.rectangle(s.pixelX, s.pixelY, s.pixelW, s.pixelH, hex, 0.03)
                .setOrigin(0, 0)
                .setDepth(2)
                .setStrokeStyle(1, hex, 0.15);

            zone.setInteractive({ useHandCursor: true });
            zone.on('pointerdown', (pointer) => {
                if (this.admin.active || this.taskManager.isOpen()) return;
                // Abre o Kanban se clicar no chão do setor
                this.taskManager.open(s);
            });

            // Feedback visual ao passar o mouse no "chão" do setor
            zone.on('pointerover', () => { 
                if (!this.admin.active) zone.setFillStyle(hex, 0.08).setStrokeStyle(2, hex, 0.4); 
            });
            zone.on('pointerout', () => { 
                zone.setFillStyle(hex, 0.03).setStrokeStyle(1, hex, 0.15); 
            });

            // Label do setor no topo
            const label = this.add.text(
                s.pixelX + s.pixelW / 2,
                s.pixelY + 4,
                `◈ ${s.label} ◈`,
                { fontFamily: 'Outfit, monospace', fontSize: '7px', color: '#' + hex.toString(16).padStart(6,'0'),
                  fontWeight: '800', letterSpacing: '1px',
                  backgroundColor: '#000000aa', padding: { x: 6, y: 3 } }
            ).setOrigin(0.5, 0).setDepth(20);

            this.sectorZones.set(s.id, { rect: zone, label });
        });
    }

    // ── NPCs: Bonecos dos Funcionários ────────────────────────────────
    _spawnEmployees() {
        // Limpa NPCs existentes
        this.npcs.forEach(n => {
            n.sprite.destroy();
            n.label.destroy();
        });
        this.npcs = [];

        EMPLOYEES.forEach((emp, index) => {
            const sector = SECTORS.find(s => s.id === emp.sectorId);
            if (!sector) return;

            const gridX = 1 + (index % Math.max(1, sector.tileW-2));
            const gridY = 1 + Math.floor(index / Math.max(1, sector.tileW-2));
            
            const x = sector.pixelX + gridX * T + T/2;
            const y = sector.pixelY + gridY * T + T/2;

            // Usa o estilo definido no funcionário (full-key) ou um padrão
            const fullKey = emp.avatarFullKey || (index % 2 === 0 ? `male-${String((index%17)+1).padStart(2,'0')}-1` : `female-${String((index%22)+1).padStart(2,'0')}-1`);
            
            const sp = this.add.sprite(x, y, fullKey, 1)
                .setScale(1.5).setDepth(40);
            sp.play(`${fullKey}-down-idle`, true);
            
            const label = this.add.text(x, y - 28, emp.name, {
                fontFamily: 'Outfit, sans-serif', fontSize: '9px', color: '#fff',
                backgroundColor: '#000000aa', padding: { x: 5, y: 3 },
                fontWeight: '800'
            }).setOrigin(0.5).setDepth(60);

            this.npcs.push({ 
                emp, sprite: sp, label, 
                targetX: x, targetY: y, 
                state: 'idle', dir: 'down',
                timer: this.time.now + 2000 + Math.random() * 5000 
            });
        });
    }

    // ── Update NPCs: Movimento aleatório ─────────────────────────────
    _updateNPCs(time, delta) {
        this.npcs.forEach(n => {
            const fullKey = n.sprite.texture.key;
            if (time > n.timer) {
                if (n.state === 'idle') {
                    const sector = SECTORS.find(s => s.id === n.emp.sectorId);
                    if (sector) {
                        n.targetX = sector.pixelX + 32 + Math.random() * (sector.pixelW - 64);
                        n.targetY = sector.pixelY + 32 + Math.random() * (sector.pixelH - 64);
                        n.state = 'moving';
                    }
                } else {
                    n.state = 'idle';
                    n.timer = time + 3000 + Math.random() * 7000;
                    n.sprite.play(`${fullKey}-${n.dir}-idle`, true);
                }
            }

            if (n.state === 'moving') {
                const dx = n.targetX - n.sprite.x;
                const dy = n.targetY - n.sprite.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 2) {
                    n.state = 'idle';
                    n.timer = time + 2000 + Math.random() * 5000;
                    n.sprite.play(`${fullKey}-${n.dir}-idle`, true);
                } else {
                    const speed = 0.5;
                    const vx = (dx / dist) * speed;
                    const vy = (dy / dist) * speed;
                    
                    let dir = 'down';
                    if (Math.abs(vx) > Math.abs(vy)) dir = vx > 0 ? 'right' : 'left';
                    else dir = vy > 0 ? 'down' : 'up';
                    n.dir = dir;

                    n.sprite.x += vx;
                    n.sprite.y += vy;
                    n.sprite.play(`${fullKey}-${dir}`, true);
                    
                    n.label.x = n.sprite.x;
                    n.label.y = n.sprite.y - 28;
                }
            }
        });
    }

    // ── HUD ───────────────────────────────────────────────────────────
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

    // ── Animações ─────────────────────────────────────────────────────
    _createCharacterAnims() {
        const dirs = [
            {name:'down',row:0},{name:'left',row:1},
            {name:'right',row:2},{name:'up',row:3},
        ];
        
        const bases = [
            ...Array.from({length: 17}, (_, i) => `male-${String(i+1).padStart(2, '0')}`),
            ...Array.from({length: 22}, (_, i) => `female-${String(i+1).padStart(2, '0')}`)
        ];

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
        this._createCharacterAnims(); // Garante anims para a nova base
        
        this.player.setTexture(fullKey);
        this.player.play(`${fullKey}-${this.currentDir}-idle`, true);
        
        // Ajusta corpo de física
        if (this.player.body) {
            this.player.body.setSize(16, 14).setOffset(8, 16);
        }
    }

    // ── Update ────────────────────────────────────────────────────────
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

        // Envia posição p/ Supabase a cada 100ms se estiver ativo
        if (this.multiplayer.active && this.time.now > this._lastUpdate + 100) {
            this.multiplayer.updatePresence();
            this._lastUpdate = this.time.now;
        }

        // this._updateNPCs(this.time.now, 0); // Removido movimento de NPCs

        // Detecta setor
        const px=this.player.x, py=this.player.y;
        let found=null;
        for (const s of SECTORS) {
            if (px>=s.pixelX && px<s.pixelX+s.pixelW && py>=s.pixelY && py<s.pixelY+s.pixelH) {
                found=s; break;
            }
        }
        if (found !== this.activeSector) {
            this.activeSector = found;
            const hex = found ? '#'+found.color.toString(16).padStart(6,'0') : '#ffffff';
            this.sectorLabel.setText(found ? `◈ ${found.label}` : '').setColor(hex);
        }

        // ── Detecta computador próximo ─────────────────────────────
        const RANGE = 40;
        let nearest = null, nearDist = Infinity;
        for (const c of this.computers) {
            const d = Phaser.Math.Distance.Between(px, py, c.sprite.x + 16, c.sprite.y + 16);
            if (d < RANGE && d < nearDist) { nearest = c; nearDist = d; }
        }
        this.nearComputer = nearest;
        if (nearest && !this.taskManager.isOpen() && !this.admin.active) {
            this._promptText.setPosition(nearest.sprite.x + 16, nearest.sprite.y - 6).setVisible(true);
        } else {
            this._promptText.setVisible(false);
        }
    }
}
