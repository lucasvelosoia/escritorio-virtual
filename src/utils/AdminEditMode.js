const STORAGE_KEY = 'escritorio-furniture-layout';
const SNAP        = 32;

import { SECTORS } from '../data/sectors.js';
import { EMPLOYEES, saveEmployees } from '../data/employees.js';

// Catálogo de assets disponíveis para adicionar
export const ASSET_CATALOG = [
    {
        group: 'Mesas',
        items: [
            { key: 'table-brown',        label: 'Mesa Grande'     },
            { key: 'table-dark-brown',   label: 'Mesa Escura'     },
            { key: 'table-narrow-brown', label: 'Mesa Estreita'   },
            { key: 'table-small-grey',   label: 'Mesa P. Cinza'   },
            { key: 'table-small-white',  label: 'Mesa P. Branca'  },
        ],
    },
    {
        group: 'Cadeiras',
        items: [
            { key: 'chair-blue-down',     label: 'Cadeira Azul'    },
            { key: 'chair-green-down',    label: 'Cadeira Verde'   },
            { key: 'chair-grey-down',     label: 'Cadeira Cinza'   },
            { key: 'chair-red-down',      label: 'Cadeira Vermelha'},
            { key: 'chair-pink-down',     label: 'Cadeira Rosa'    },
            { key: 'couch-grey-down',     label: 'Sofá Cinza'      },
            { key: 'couch-blue-down',     label: 'Sofá Azul'       },
            { key: 'couch-brown-down',    label: 'Sofá Marrom'     },
            { key: 'armchair-grey-down',  label: 'Poltrona Cinza'  },
            { key: 'armchair-blue-down',  label: 'Poltrona Azul'   },
        ],
    },
    {
        group: 'Informática',
        items: [
            { key: 'screen-black-down',     label: 'Monitor Preto'   },
            { key: 'screen-white-down',     label: 'Monitor Branco'  },
            { key: 'big-screen-black-down', label: 'Telão Preto'     },
            { key: 'big-screen-white-down', label: 'Telão Branco'    },
            { key: 'laptop-black-down',     label: 'Notebook'        },
            { key: 'printer',               label: 'Impressora'      },
        ],
    },
    {
        group: 'Estantes',
        items: [
            { key: 'shelf-big-filled', label: 'Estante c/ Livros' },
            { key: 'bookshelf',        label: 'Estante Cheia'     },
            { key: 'bookshelf-double', label: 'Estante Dupla'     },
            { key: 'shelf',            label: 'Estante Vazia'     },
            { key: 'shelf-big',        label: 'Estante G. Vazia'  },
        ],
    },
    {
        group: 'Plantas',
        items: [
            { key: 'plant',            label: 'Planta Grande'  },
            { key: 'plant-large',      label: 'Planta Larga'   },
            { key: 'plant-small',      label: 'Planta P.'      },
            { key: 'plant-small-blue', label: 'Planta Azul'    },
            { key: 'plant-small-cyan', label: 'Planta Ciano'   },
            { key: 'plant-small-red',  label: 'Planta Vermelha'},
        ],
    },
    {
        group: 'Props',
        items: [
            { key: 'coffee-dispenser', label: 'Café'         },
            { key: 'clock',            label: 'Relógio'      },
            { key: 'folders',          label: 'Pastas'       },
            { key: 'bin',              label: 'Lixeira'      },
        ],
    },
];

export class AdminEditMode {
    constructor(scene, furnitureGroup, config = {}) {
        this.scene = scene;
        this.furnitureGroup = furnitureGroup;
        this.avatarCustomizer = config.avatarCustomizer;
        this.active = false;
        this.selected   = null;
        this.items      = [];
        this._highlight = null;
        this._btn = document.getElementById('btn-layout');
        if (this._btn) {
            this._btn.onclick = () => this.toggle();
        }
    }

    // ── Registra um móvel ─────────────────────────────────────────────
    register(sprite, key) {
        this.items.push({ sprite, key, depth: sprite.depth });
        return sprite;
    }

    toggle() { this.active ? this._exit() : this._enter(); }

    // ── Ativa ─────────────────────────────────────────────────────────
    _enter() {
        this.active = true;
        if (this._btn) {
            this._btn.innerText = '⊠ Sair Layout';
            this._btn.style.background = '#4c1d95';
        }
        this._buildHUD();
        this._buildPanel();
        this._enableInteraction();
    }

    // ── Desativa ──────────────────────────────────────────────────────
    _exit() {
        this.active = false;
        this._cancelAdd();
        this._deselect();
        this._disableInteraction();
        if (this._btn) {
            this._btn.innerText = '⊞ Modo Layout';
            this._btn.style.background = '';
        }
        this._hud?.destroy();   this._hud   = null;
        this._panel?.remove();  this._panel = null;
    }

    // ── HUD ───────────────────────────────────────────────────────────
    _buildHUD() {
        this._hud = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height - 52,
            'drag=mover  •  R=girar  •  Delete=remover  •  S=salvar  •  clique no asset para adicionar',
            { fontFamily:'monospace', fontSize:'9px', color:'#c4b5fd',
              backgroundColor:'#4c1d9599', padding:{x:10,y:5} }
        ).setScrollFactor(0).setDepth(300).setOrigin(0.5, 1);
    }

    // ── Painel de assets ──────────────────────────────────────────────
    _buildPanel() {
        const panel = document.createElement('div');
        panel.id = 'asset-panel';
        panel.style.cssText = `
            position:fixed; left:0; top:50%; transform:translateY(-50%);
            width:160px; max-height:70vh;
            background:#0f172a; border:1px solid #7c3aed;
            border-left:none; border-radius:0 12px 12px 0;
            z-index:500; font-family:monospace;
            display:flex; flex-direction:column;
        `;

        // ── Cabeçalho com botão minimizar ─────────────────────────────
        const header = document.createElement('div');
        header.style.cssText = `
            display:flex; align-items:center; justify-content:space-between;
            padding:6px 8px; border-bottom:1px solid #1e293b; flex-shrink:0;
        `;
        header.innerHTML = `
            <span style="font-size:8px;color:#7c3aed;letter-spacing:1px">ASSETS</span>
            <button id="asset-panel-toggle" title="Minimizar" style="
                background:none; border:none; color:#7c3aed; cursor:pointer;
                font-size:14px; line-height:1; padding:0 2px;
            ">‹</button>
        `;
        panel.appendChild(header);

        // ── Corpo scrollável ──────────────────────────────────────────
        const body = document.createElement('div');
        body.id = 'asset-panel-body';
        body.style.cssText = `
            overflow-y:auto; padding:6px 8px;
            scrollbar-width:thin; scrollbar-color:#334155 transparent;
        `;
        panel.appendChild(body);
        
        // ── BOTÃO SALVAR GERAL (Destaque) ─────────────────────────────
        const saveAllBtn = document.createElement('button');
        saveAllBtn.innerHTML = '💾 SALVAR LAYOUT AGORA';
        saveAllBtn.style.cssText = `
            width: calc(100% - 16px); margin: 8px; padding: 12px;
            background: #7c3aed; color: #fff; border: none;
            border-radius: 8px; font-weight: 800; cursor: pointer;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
            font-family: monospace; font-size: 11px; transition: all 0.2s;
            flex-shrink: 0;
        `;
        saveAllBtn.onmouseover = () => saveAllBtn.style.background = '#6d28d9';
        saveAllBtn.onmouseout  = () => saveAllBtn.style.background = '#7c3aed';
        saveAllBtn.onclick = () => {
            this.save();
            this.saveSectors();
            if (this.scene.multiplayer && this.scene.multiplayer.active) {
                this.scene.multiplayer.saveEmployees(EMPLOYEES);
            }
        };
        body.appendChild(saveAllBtn);

        // ── NOVO: Gerenciamento de Setores ────────────────────────────
        const sectorHeader = document.createElement('div');
        sectorHeader.style.cssText = `font-size:8px; color:#10b981; margin:8px 0 8px; padding:0 4px; letter-spacing:1px; font-weight:700`;
        sectorHeader.textContent = 'EDITAR ÁREAS E SETORES';
        body.appendChild(sectorHeader);

        // ── ITEM DA LOUSA (WHITEBOARD) INTEGRADO ──
        const wbItem = document.createElement('div');
        wbItem.style.cssText = `padding:8px; border-radius:8px; background:#1e293b; margin-bottom:8px; border-left:3px solid #60a5fa;`;
        wbItem.innerHTML = `
            <div style="font-size:9px; color:#fff; font-weight:600; margin-bottom:4px">◈ Whiteboard</div>
            <button id="draw-wb-btn" style="
                width:100%; padding:4px; background:rgba(96, 165, 250, 0.05); color:#60a5fa;
                border:1px solid #60a5fa; border-radius:4px; font-size:9px;
                cursor:pointer; font-weight:700; transition: all .2s;
            ">✏️ Redesenhar Lousa</button>
        `;
        wbItem.querySelector('#draw-wb-btn').onclick = () => this._startDrawingWhiteboard(wbItem.querySelector('#draw-wb-btn'));
        body.appendChild(wbItem);

        SECTORS.forEach(s => {
            const hex = '#' + s.color.toString(16).padStart(6,'0');
            const sItem = document.createElement('div');
            sItem.style.cssText = `
                padding:8px; border-radius:8px; background:#1e293b; margin-bottom:8px;
                border-left:3px solid ${hex}; display:flex; flex-direction:column; gap:6px;
            `;
            sItem.innerHTML = `
                <div style="font-size:9px; color:#fff; font-weight:600">${s.label}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px">
                    <div style="display:flex; flex-direction:column; gap:2px">
                        <span style="font-size:7px; color:#64748b">X (tiles)</span>
                        <input type="number" data-id="${s.id}" data-prop="tileX" value="${s.tileX}" style="background:#0f172a; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:2px">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:2px">
                        <span style="font-size:7px; color:#64748b">Y (tiles)</span>
                        <input type="number" data-id="${s.id}" data-prop="tileY" value="${s.tileY}" style="background:#0f172a; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:2px">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:2px">
                        <span style="font-size:7px; color:#64748b">Larg.</span>
                        <input type="number" data-id="${s.id}" data-prop="tileW" value="${s.tileW}" style="background:#0f172a; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:2px">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:2px">
                        <span style="font-size:7px; color:#64748b">Alt.</span>
                        <input type="number" data-id="${s.id}" data-prop="tileH" value="${s.tileH}" style="background:#0f172a; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:2px">
                    </div>
                </div>
            `;
            sItem.querySelectorAll('input').forEach(input => {
                input.oninput = (e) => {
                    const val = parseInt(e.target.value) || 0;
                    s[input.dataset.prop] = val;
                    // Emite evento para a GameScene atualizar o visual
                    this.scene.events.emit('sector-updated', s);
                };
            });

            const drawBtn = document.createElement('button');
            drawBtn.innerHTML = '✏️ Redesenhar';
            drawBtn.style.cssText = `
                width:100%; padding:4px; background:rgba(255,255,255,0.05); color:#10b981;
                border:1px solid #10b981; border-radius:4px; font-size:9px;
                cursor:pointer; font-weight:700; margin-top:4px; transition: all .2s;
            `;
            drawBtn.onclick = () => this._startDrawingSector(s.id, drawBtn);
            sItem.appendChild(drawBtn);

            body.appendChild(sItem);
        });

        const saveSectorsBtn = document.createElement('button');
        saveSectorsBtn.innerHTML = '💾 Salvar Áreas e Lousa';
        saveSectorsBtn.style.cssText = `
            width:100%; padding:6px; background:#10b981; color:#fff;
            border:none; border-radius:6px; font-family:monospace; font-size:10px;
            cursor:pointer; margin:4px 0 16px; font-weight:700;
        `;
        saveSectorsBtn.onclick = () => this.saveSectors();
        body.appendChild(saveSectorsBtn);

        // Removemos o bloco antigo da whiteboard que ficava solto

        // ── NOVO: Gerenciamento de Funcionários (Bonecos) ───────────
        const empHeader = document.createElement('div');
        empHeader.style.cssText = `font-size:8px; color:#fbbf24; margin:12px 0 8px; padding:0 4px; letter-spacing:1px; font-weight:700; border-top:1px solid #1e293b; padding-top:12px`;
        empHeader.textContent = 'FUNCIONÁRIOS (BONECOS)';
        body.appendChild(empHeader);

        const empContainer = document.createElement('div');
        empContainer.id = 'emp-mgmt-container';
        body.appendChild(empContainer);

        const renderEmps = () => {
            empContainer.innerHTML = '';
            EMPLOYEES.forEach((emp, index) => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding:8px; background:#1e293b; border-radius:8px; margin-bottom:8px;
                    border-left:3px solid #fbbf24; display:flex; flex-direction:column; gap:4px;
                `;
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <input type="text" value="${emp.name}" style="background:none; border:none; color:#fff; font-size:10px; font-weight:600; width:110px; outline:none">
                        <button style="background:none; border:none; color:#f87171; cursor:pointer; font-size:14px">×</button>
                    </div>
                    <select style="width:100%; background:#0f172a; color:#fff; font-size:9px; border:1px solid #334155; border-radius:4px; padding:2px">
                        ${SECTORS.map(s => `<option value="${s.id}" ${s.id===emp.sectorId?'selected':''}>${s.label}</option>`).join('')}
                    </select>
                    <button class="customize-emp-btn" style="width:100%; padding:4px; background:rgba(251, 191, 36, 0.1); color:#fbbf24; border:1px solid #fbbf24; border-radius:4px; font-size:9px; font-weight:700; cursor:pointer; margin-top:2px">
                        🎨 Mudar Avatar: ${emp.avatarBase || 'Padrão'}
                    </button>
                `;
                item.querySelector('.customize-emp-btn').onclick = () => {
                    if (this.avatarCustomizer) {
                        const originalOnSave = this.avatarCustomizer.onSave;
                        
                        this.avatarCustomizer.onSave = (fullKey) => {
                            emp.avatarFullKey = fullKey;
                            saveEmployees();
                            // Sincroniza com Supabase
                            if (this.scene.multiplayer.active) {
                                this.scene.multiplayer.saveEmployees(EMPLOYEES);
                            }
                            renderEmps();
                            this.scene.events.emit('employees-updated');
                        };

                        // Garantir que restaure ao fechar
                        const originalClose = this.avatarCustomizer.close.bind(this.avatarCustomizer);
                        this.avatarCustomizer.close = () => {
                            this.avatarCustomizer.onSave = originalOnSave;
                            this.avatarCustomizer.close = originalClose;
                            originalClose();
                        };

                        this.avatarCustomizer.open();
                    }
                };
                item.querySelector('button:not(.customize-emp-btn)').onclick = () => {
                    EMPLOYEES.splice(index, 1);
                    saveEmployees();
                    if (this.scene.multiplayer.active) {
                        this.scene.multiplayer.saveEmployees(EMPLOYEES);
                    }
                    renderEmps();
                    this.scene.events.emit('employees-updated');
                };
                item.querySelector('input').onchange = (e) => {
                    emp.name = e.target.value;
                    saveEmployees();
                    this.scene.events.emit('employees-updated');
                };
                item.querySelector('select').onchange = (e) => {
                    emp.sectorId = e.target.value;
                    saveEmployees();
                    this.scene.events.emit('employees-updated');
                };
                empContainer.appendChild(item);
            });
        };
        renderEmps();

        const addEmpBtn = document.createElement('button');
        addEmpBtn.innerHTML = '👤 Adicionar Boneco';
        addEmpBtn.style.cssText = `
            width:100%; padding:6px; background:#fbbf24; color:#000;
            border:none; border-radius:6px; font-family:monospace; font-size:10px;
            cursor:pointer; margin-bottom:16px; font-weight:700;
        `;
        addEmpBtn.onclick = () => {
            EMPLOYEES.push({ id: 'emp-'+Date.now(), name: 'Novo Boneco', sectorId: SECTORS[0].id });
            saveEmployees();
            renderEmps();
            this.scene.events.emit('employees-updated');
        };
        body.appendChild(addEmpBtn);

        const assetHeader = document.createElement('div');
        assetHeader.style.cssText = `font-size:8px; color:#7c3aed; margin:12px 0 8px; padding:0 4px; letter-spacing:1px; font-weight:700; border-top:1px solid #1e293b; padding-top:12px`;
        assetHeader.textContent = 'CATÁLOGO DE MÓVEIS';
        body.appendChild(assetHeader);

        // ── Lógica de minimizar ───────────────────────────────────────
        let minimized = false;
        header.querySelector('#asset-panel-toggle').onclick = () => {
            minimized = !minimized;
            body.style.display      = minimized ? 'none' : '';
            panel.style.width       = minimized ? '32px' : '160px';
            panel.style.borderRadius = minimized ? '0 8px 8px 0' : '0 12px 12px 0';
            header.querySelector('#asset-panel-toggle').textContent = minimized ? '›' : '‹';
            header.querySelector('span').style.display = minimized ? 'none' : '';
        };

        ASSET_CATALOG.forEach(({ group, items }) => {
            const groupEl = document.createElement('div');
            groupEl.style.cssText = `
                font-size:8px; color:#7c3aed; letter-spacing:1px;
                margin:8px 0 4px; padding:0 4px; text-transform:uppercase;
            `;
            groupEl.textContent = group;
            body.appendChild(groupEl);

            items.forEach(({ key, label }) => {
                const item = document.createElement('div');
                item.dataset.assetKey = key;
                item.style.cssText = `
                    display:flex; align-items:center; gap:6px;
                    padding:4px 6px; border-radius:6px; cursor:pointer;
                    transition:background .15s; margin-bottom:2px;
                `;
                item.innerHTML = `
                    <canvas width="24" height="24" data-preview="${key}"
                        style="image-rendering:pixelated;flex-shrink:0;border-radius:3px;background:#1e293b"></canvas>
                    <span style="font-size:9px;color:#94a3b8;line-height:1.2">${label}</span>
                `;
                item.onmouseenter = () => { if (this._addingKey !== key) item.style.background = '#1e293b'; };
                item.onmouseleave = () => { if (this._addingKey !== key) item.style.background = ''; };
                item.onclick = () => this._startAdding(key, item);
                body.appendChild(item);
            });
        });

        document.body.appendChild(panel);
        this._panel = panel;

        // Renderiza previews nos canvas após frame
        requestAnimationFrame(() => this._renderPreviews());
    }

    // Desenha preview do sprite no <canvas> do painel
    _renderPreviews() {
        const canvases = this._panel?.querySelectorAll('canvas[data-preview]');
        canvases?.forEach(canvas => {
            const key = canvas.dataset.preview;
            const tex = this.scene.textures.get(key);
            if (!tex) return;
            const src = tex.getSourceImage();
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 24, 24);
            // Desenha o primeiro frame (32×32 ou tamanho real) escalado para 24×24
            const sw = Math.min(src.width,  32);
            const sh = Math.min(src.height, 32);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(src, 0, 0, sw, sh, 0, 0, 24, 24);
        });
    }

    // ── Modo "adicionar objeto" ───────────────────────────────────────
    _startAdding(key, itemEl) {
        this._cancelAdd();
        this._addingKey = key;

        // Destaca item selecionado no painel
        this._panel.querySelectorAll('[data-asset-key]').forEach(el => {
            el.style.background = el.dataset.assetKey === key ? '#4c1d95' : '';
        });

        // Cria ghost (sprite semitransparente) que segue o cursor
        const cam    = this.scene.cameras.main;
        const worldX = cam.scrollX + this.scene.scale.width  / 2;
        const worldY = cam.scrollY + this.scene.scale.height / 2;
        this._ghost  = this.scene.add.image(worldX, worldY, key)
            .setAlpha(0.55).setDepth(200).setOrigin(0, 0);

        // Move ghost com o mouse
        this._onPointerMove = (pointer) => {
            if (!this._ghost) return;
            const wx = Math.round((pointer.worldX) / SNAP) * SNAP;
            const wy = Math.round((pointer.worldY) / SNAP) * SNAP;
            this._ghost.setPosition(wx, wy);
        };
        this.scene.input.on('pointermove', this._onPointerMove);

        // Click no mapa → place
        this._onPointerDown = (pointer) => {
            if (!this._addingKey) return;
            // Ignora cliques dentro do painel DOM
            if (pointer.event.target.closest('#asset-panel')) return;
            this._placeObject(pointer);
        };
        this.scene.input.on('pointerdown', this._onPointerDown);

        // ESC cancela
        this._escKey = this.scene.input.keyboard.addKey('ESC');
        this._escKey.once('down', () => this._cancelAdd());
    }

    _placeObject(pointer) {
        const wx = Math.round(pointer.worldX / SNAP) * SNAP;
        const wy = Math.round(pointer.worldY / SNAP) * SNAP;
        const sp = this.furnitureGroup
            ? this.furnitureGroup.create(wx, wy, this._addingKey)
            : this.scene.add.image(wx, wy, this._addingKey);
        sp.setOrigin(0, 0).setDepth(6).setAngle(this._ghost?.angle ?? 0);
        if (sp.body) {
            const h  = sp.height;
            const bh = Math.min(h, 32);
            sp.body.setSize(sp.width, bh, false).setOffset(0, h - bh);
            sp.body.reset(sp.x, sp.y);
        }
        this.furnitureGroup?.refresh();
        this._makeInteractive(sp);
        const item = this.register(sp, this._addingKey);
        
        // Atribui o setor baseado na posição de inserção
        const sector = this._getSectorAt(sp);
        if (sector) item.sectorId = sector.id;

        this._toast(`+ ${this._addingKey}`);

        // Mantém no modo de adição para colocar vários
    }

    // ── Modo "desenhar setor" ─────────────────────────────────────────
    _startDrawingSector(id, btn) {
        if (this._drawingSectorId === id) {
            this._cancelDrawing();
            return;
        }
        this._cancelAdd();
        this._drawingSectorId = id;
        
        // UI Feedback
        btn.style.background = '#10b981';
        btn.style.color      = '#fff';
        this._toast(`Clique e arraste p/ desenhar ${id.toUpperCase()}`);

        const overlay = this.scene.add.graphics().setDepth(1000);
        
        this._onDrawDown = (pointer) => {
            if (pointer.event.target.tagName === 'BUTTON' || pointer.event.target.closest('#asset-panel')) return;
            const tx = Math.floor(pointer.worldX / SNAP);
            const ty = Math.floor(pointer.worldY / SNAP);
            this._startPoint = { tx, ty };
        };

        this._onDrawMove = (pointer) => {
            if (!this._startPoint) return;
            const tx = Math.floor(pointer.worldX / SNAP);
            const ty = Math.floor(pointer.worldY / SNAP);
            
            const x1 = Math.min(this._startPoint.tx, tx);
            const y1 = Math.min(this._startPoint.ty, ty);
            const x2 = Math.max(this._startPoint.tx, tx);
            const y2 = Math.max(this._startPoint.ty, ty);
            
            const sector = SECTORS.find(s => s.id === this._drawingSectorId);
            if (sector) {
                sector.tileX = x1;
                sector.tileY = y1;
                sector.tileW = (x2 - x1) + 1;
                sector.tileH = (y2 - y1) + 1;
                this.scene.events.emit('sector-updated', sector);
                
                // Atualiza os inputs no painel
                const panelInputs = this._panel.querySelectorAll(`input[data-id="${id}"]`);
                panelInputs.forEach(input => {
                    input.value = sector[input.dataset.prop];
                });
            }
        };

        this._onDrawUp = () => {
            if (this._startPoint) {
                this._cancelDrawing();
                this._toast('Área definida ✓');
            }
        };

        this.scene.input.on('pointerdown', this._onDrawDown);
        this.scene.input.on('pointermove', this._onDrawMove);
        this.scene.input.on('pointerup',   this._onDrawUp);
    }

    // ── Modo "desenhar lousa" ─────────────────────────────────────────
    _startDrawingWhiteboard(btn) {
        this._cancelAdd();
        btn.style.background = '#60a5fa';
        btn.style.color      = '#fff';
        this._toast('Clique e arraste p/ desenhar a LOUSA');

        this._onDrawDown = (pointer) => {
            if (pointer.event.target.closest('#asset-panel')) return;
            const tx = Math.floor(pointer.worldX / SNAP);
            const ty = Math.floor(pointer.worldY / SNAP);
            this._startPoint = { tx, ty };
        };

        this._onDrawMove = (pointer) => {
            if (!this._startPoint) return;
            const tx = Math.floor(pointer.worldX / SNAP);
            const ty = Math.floor(pointer.worldY / SNAP);
            
            const x1 = Math.min(this._startPoint.tx, tx);
            const y1 = Math.min(this._startPoint.ty, ty);
            const x2 = Math.max(this._startPoint.tx, tx);
            const y2 = Math.max(this._startPoint.ty, ty);
            
            const tw = (x2 - x1) + 1;
            const th = (y2 - y1) + 1;

            if (this.scene.whiteboardArea) {
                this.scene.whiteboardArea.setPosition(x1 * SNAP + (tw * SNAP)/2, y1 * SNAP + (th * SNAP)/2);
                this.scene.whiteboardArea.setSize(tw * SNAP, th * SNAP);
                if (this.scene.whiteboardText) this.scene.whiteboardText.setPosition(this.scene.whiteboardArea.x, this.scene.whiteboardArea.y);
            }
        };

        this._onDrawUp = () => {
            if (this._startPoint) {
                this._cancelDrawing();
                this._toast('Lousa definida ✓');
                this.saveSectors();
            }
        };

        this.scene.input.on('pointerdown', this._onDrawDown);
        this.scene.input.on('pointermove', this._onDrawMove);
        this.scene.input.on('pointerup',   this._onDrawUp);
    }

    _cancelDrawing() {
        this._drawingSectorId = null;
        this._startPoint      = null;
        this.scene.input.off('pointerdown', this._onDrawDown);
        this.scene.input.off('pointermove', this._onDrawMove);
        this.scene.input.off('pointerup',   this._onDrawUp);
        
        // Reset botões UI
        this._panel?.querySelectorAll('button').forEach(b => {
            if (b.innerText.includes('Redesenhar')) {
                b.style.background = '';
                b.style.color      = '#10b981';
            }
        });
    }

    _cancelAdd() {
        this._cancelDrawing();
        this._ghost?.destroy();
        this._ghost      = null;
        this._addingKey  = null;
        if (this._onPointerMove) { this.scene.input.off('pointermove', this._onPointerMove); this._onPointerMove = null; }
        if (this._onPointerDown) { this.scene.input.off('pointerdown', this._onPointerDown); this._onPointerDown = null; }
        this._panel?.querySelectorAll('[data-asset-key]').forEach(el => el.style.background = '');
    }

    // ── Hit area explícita cobrindo toda a textura ────────────────────
    // Resolve problema de pixels transparentes não sendo clicáveis
    _makeInteractive(sprite) {
        const w = sprite.width;
        const h = sprite.height;
        const ox = sprite.originX * w;
        const oy = sprite.originY * h;
        sprite.setInteractive(
            new Phaser.Geom.Rectangle(-ox, -oy, w, h),
            Phaser.Geom.Rectangle.Contains
        );
        this.scene.input.setDraggable(sprite);
        sprite.input.cursor = 'grab';

        // Feedback visual
        sprite.on('pointerover', () => { if (!this.active) sprite.setTint(0xe2e8f0); });
        sprite.on('pointerout',  () => { if (!this.active) sprite.clearTint(); });
    }

    // ── Interatividade nos sprites ────────────────────────────────────
    _enableInteraction() {
        this.items.forEach(({ sprite }) => this._makeInteractive(sprite));

        this.scene.input.on('dragstart', (pointer, obj) => {
            if (!this.active) return;
            this._cancelAdd();
            this._select(obj);
            obj.setDepth(100);
        });

        this.scene.input.on('drag', (pointer, obj, dragX, dragY) => {
            if (!this.active) return;
            // dragX/Y = posição do centro do objeto no mundo
            // Ajusta pelo offset de origem para snap correto
            const offX = obj.originX * obj.width;
            const offY = obj.originY * obj.height;
            obj.x = Math.round((dragX - offX) / SNAP) * SNAP + offX;
            obj.y = Math.round((dragY - offY) / SNAP) * SNAP + offY;
            this._moveHighlight(obj);
        });

        this.scene.input.on('dragend', (pointer, obj) => {
            if (!this.active) return;
            const itm = this.items.find(i => i.sprite === obj);
            if (itm) obj.setDepth(itm.depth ?? 6);

            if (obj.body) { obj.body.reset(obj.x, obj.y); }
            this.furnitureGroup?.refresh();

            // Atualiza o setor do item se ele foi movido
            if (itm) {
                const sector = this._getSectorAt(obj);
                itm.sectorId = sector ? sector.id : null;
            }
        });

        this.scene.input.on('gameobjectdown', (pointer, obj) => {
            if (!this.active || this._addingKey) return;
            this._select(obj);
        });

        this._keyDelete = this.scene.input.keyboard.addKey('DELETE');
        this._keyBack   = this.scene.input.keyboard.addKey('BACKSPACE');
        this._keySave   = this.scene.input.keyboard.addKey('S');
        this._keyRotate = this.scene.input.keyboard.addKey('R');

        this._keyDelete.on('down', () => { if (this.active) this._removeSelected(); });
        this._keyBack.on('down',   () => { if (this.active) this._removeSelected(); });
        this._keySave.on('down',   () => { if (this.active) this.save(); });
        this._keyRotate.on('down', () => { if (this.active) this._rotate90(); });
    }

    _disableInteraction() {
        this.items.forEach(({ sprite }) => {
            if (this.scene.input) this.scene.input.setDraggable(sprite, false);
            if (sprite.input) sprite.input.cursor = 'pointer';
        });
        this.scene.input.off('dragstart');
        this.scene.input.off('drag');
        this.scene.input.off('dragend');
        this.scene.input.off('gameobjectdown');
    }

    // ── Seleção ───────────────────────────────────────────────────────
    _select(sprite) {
        this._deselect();
        this.selected   = sprite;
        this._highlight = this.scene.add.rectangle(
            sprite.x, sprite.y,
            sprite.displayWidth  + 4,
            sprite.displayHeight + 4,
            0x7c3aed, 0
        ).setStrokeStyle(2, 0xc4b5fd, 1).setDepth(99).setOrigin(0.5);
    }

    _deselect() {
        this._highlight?.destroy();
        this._highlight = null;
        this.selected   = null;
    }

    _moveHighlight(sprite) {
        if (!this._highlight) return;
        this._highlight.x = sprite.x;
        this._highlight.y = sprite.y;
    }

    // ── Rotação ───────────────────────────────────────────────────────
    _rotate90() {
        // Roda o ghost (ao adicionar) ou o sprite selecionado
        const target = this._ghost ?? this.selected;
        if (!target) return;
        target.angle = (target.angle + 90) % 360;
        // Atualiza o highlight para cobrir a nova dimensão
        if (this._highlight && this.selected) {
            const rotated = target.angle % 180 !== 0;
            this._highlight.width  = (rotated ? this.selected.displayHeight : this.selected.displayWidth)  + 4;
            this._highlight.height = (rotated ? this.selected.displayWidth  : this.selected.displayHeight) + 4;
        }
    }

    // ── Remoção ───────────────────────────────────────────────────────
    _removeSelected() {
        if (!this.selected) return;
        const idx = this.items.findIndex(i => i.sprite === this.selected);
        if (idx !== -1) this.items.splice(idx, 1);
        if (this.furnitureGroup) {
            this.furnitureGroup.remove(this.selected, true, true);
            this.furnitureGroup.refresh();
        } else {
            this.selected.destroy();
        }
        this._deselect();
    }

    // ── Persistência ──────────────────────────────────────────────────
    save() {
        const layout = this.items.map(({ sprite, key, sectorId }) => ({
            key,
            x: sprite.x, y: sprite.y,
            angle:   sprite.angle,
            depth:   sprite.depth,
            scaleX:  sprite.scaleX,  scaleY:  sprite.scaleY,
            originX: sprite.originX, originY: sprite.originY,
            sectorId,
        }));
        
        // Salva Localmente (Backup)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
        
        // Sincroniza com Supabase
        if (this.scene.multiplayer && this.scene.multiplayer.active) {
            this.scene.multiplayer.saveLayout(layout);
        }
        
        this._toast('Layout sincronizado ✓');
    }

    saveSectors() {
        const bounds = {};
        SECTORS.forEach(s => {
            bounds[s.id] = { tileX: s.tileX, tileY: s.tileY, tileW: s.tileW, tileH: s.tileH };
        });
        localStorage.setItem('escritorio-sectors-bounds', JSON.stringify(bounds));
        
        // Sincroniza Setores com Supabase
        if (this.scene.multiplayer && this.scene.multiplayer.active) {
            this.scene.multiplayer.saveSectors(bounds);
        }

        // NOVO: Salva os limites da Lousa também
        if (this.scene.whiteboardArea) {
            const wbData = {
                x: this.scene.whiteboardArea.x,
                y: this.scene.whiteboardArea.y,
                w: this.scene.whiteboardArea.width,
                h: this.scene.whiteboardArea.height
            };
            localStorage.setItem('escritorio-whiteboard-bounds', JSON.stringify(wbData));
            if (this.scene.multiplayer && this.scene.multiplayer.active) {
                this.scene.multiplayer.saveWhiteboard(wbData);
            }
        }
        
        this._toast('Configurações sincronizadas ✓');
    }

    loadLocal() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
        catch { return null; }
    }

    _getSectorAt(sp) {
        const cx = sp.x + (sp.displayWidth * (0.5 - sp.originX));
        const cy = sp.y + (sp.displayHeight * (0.5 - sp.originY));
        return SECTORS.find(s => 
            cx >= s.pixelX && cx < s.pixelX + s.pixelW && 
            cy >= s.pixelY && cy < s.pixelY + s.pixelH
        );
    }

    // ── Toast ─────────────────────────────────────────────────────────
    _toast(msg) {
        const el = document.createElement('div');
        el.textContent = msg;
        el.style.cssText = `
            position:fixed; bottom:58px; left:50%; transform:translateX(-50%);
            background:#7c3aed; color:#fff; font-family:monospace; font-size:12px;
            padding:6px 16px; border-radius:6px; z-index:3000; pointer-events:none;
            animation:fadeout 1.8s forwards;
        `;
        if (!document.getElementById('toast-style')) {
            const s = document.createElement('style');
            s.id = 'toast-style';
            s.textContent = '@keyframes fadeout{0%{opacity:1}70%{opacity:1}100%{opacity:0}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1900);
    }
}
