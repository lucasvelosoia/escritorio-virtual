const COLUMNS = [
    { key: 'todo',  label: 'A Fazer',       color: '#64748b' },
    { key: 'doing', label: 'Em Andamento',  color: '#6366f1' },
    { key: 'done',  label: 'Concluído',     color: '#10b981' },
];

const PRIORITY_COLOR = { alta: '#f87171', média: '#fbbf24', baixa: '#94a3b8' };

export class TaskManager {
    constructor() {
        this._el      = null;
        this._sector  = null;
        this._dragSrc = null;   // card sendo arrastado
    }

    open(sector) {
        this._sector = sector;
        this._el?.remove();
        this._el = this._build(sector);
        document.body.appendChild(this._el);
        requestAnimationFrame(() => {
            this._el.style.opacity = '1';
            const modal = this._el.children[0];
            if (modal) modal.style.transform = 'translateY(0)';
        });
    }

    close() {
        if (!this._el) return;
        this._el.style.opacity = '0';
        const modal = this._el.children[0];
        if (modal) modal.style.transform = 'translateY(20px)';
        setTimeout(() => { this._el?.remove(); this._el = null; }, 250);
    }

    isOpen() { return !!this._el; }

    // ── Constrói o modal completo ──────────────────────────────────────
    _build(sector) {
        const hex = '#' + sector.color.toString(16).padStart(6, '0');

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed; inset:0; background:#000000aa;
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            display:flex; align-items:center; justify-content:center;
            z-index:2000; opacity:0; transition:opacity .3s ease-out;
            font-family:'Outfit', monospace, sans-serif;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background:linear-gradient(160deg, #0f172a 0%, #020617 100%);
            border:1px solid rgba(255,255,255,0.08);
            border-top:4px solid ${hex};
            border-radius:20px; width:92vw; max-width:1080px;
            height:85vh; display:flex; flex-direction:column;
            box-shadow:0 40px 100px -20px rgba(0,0,0,0.8);
            transform:translateY(30px);
            transition:transform .4s cubic-bezier(0.16, 1, 0.3, 1);
            overflow:hidden;
        `;

        modal.innerHTML = `
            ${this._buildHeader(sector, hex)}
            ${this._buildBoard(sector)}
        `;

        // Fecha ao clicar fora
        overlay.addEventListener('mousedown', e => { if (e.target === overlay) this.close(); });
        overlay.appendChild(modal);

        // Eventos depois de inserir no DOM
        setTimeout(() => {
            this._bindClose(overlay);
            this._bindDragDrop(overlay, sector);
            this._bindAddTask(overlay, sector);
            this._bindMoveButtons(overlay, sector);
        }, 0);

        return overlay;
    }

    // ── Header ────────────────────────────────────────────────────────
    _buildHeader(sector, hex) {
        const todo  = sector.tasks.filter(t => t.status === 'todo').length;
        const doing = sector.tasks.filter(t => t.status === 'doing').length;
        const done  = sector.tasks.filter(t => t.status === 'done').length;
        const total = sector.tasks.length;
        const pct   = total ? Math.round((done / total) * 100) : 0;

        return `
        <div style="padding:24px 32px; border-bottom:1px solid rgba(255,255,255,0.05); flex-shrink:0; background:rgba(255,255,255,0.02)">
            <div style="display:flex; justify-content:space-between; align-items:center">
                <div>
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px">
                        <span style="font-size:12px; color:${hex}; letter-spacing:3px; font-weight:800; text-transform:uppercase">
                            ${sector.label}
                        </span>
                        <div style="height:4px; width:4px; border-radius:50%; background:rgba(255,255,255,0.2)"></div>
                        <span style="font-size:12px; color:#64748b; font-weight:500">
                            ${total} tasks
                        </span>
                    </div>
                    <h2 style="font-size:26px; color:#f8fafc; margin:0; font-weight:800; letter-spacing:-0.5px">Kanban Board</h2>
                </div>
                <div style="display:flex; align-items:center; gap:24px">
                    <div style="text-align:right">
                        <div style="font-size:12px; color:#64748b; font-weight:600; margin-bottom:8px; text-transform:uppercase; letter-spacing:1px">Completion</div>
                        <div style="display:flex; align-items:center; gap:12px">
                            <div style="width:180px; height:8px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden">
                                <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, ${hex}, #fff); border-radius:10px; transition:width 1s cubic-bezier(0.34, 1.56, 0.64, 1)"></div>
                            </div>
                            <span style="font-size:14px; color:#f8fafc; font-weight:800">${pct}%</span>
                        </div>
                    </div>
                    <button class="tm-close" style="
                        background:rgba(255,255,255,0.05); border:none; color:#f8fafc; cursor:pointer;
                        width:36px; height:36px; border-radius:12px;
                        display:flex; align-items:center; justify-content:center;
                        font-size:24px; transition:all .2s ease;
                    " onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#f87171'" 
                       onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#f8fafc'">×</button>
                </div>
            </div>
        </div>`;
    }

    // ── Board Kanban ──────────────────────────────────────────────────
    _buildBoard(sector) {
        const cols = COLUMNS.map(col => {
            const tasks = sector.tasks.filter(t => t.status === col.key);
            return `
            <div class="tm-col" data-col="${col.key}" style="
                flex:1; min-width:0; display:flex; flex-direction:column; gap:0;
            ">
                <div style="
                    display:flex; align-items:center; justify-content:space-between;
                    padding:0 4px 12px;
                ">
                    <div style="display:flex; align-items:center; gap:8px">
                        <div style="width:8px; height:8px; border-radius:50%; background:${col.color}"></div>
                        <span style="font-size:11px; color:#94a3b8; font-weight:600; letter-spacing:.5px">
                            ${col.label.toUpperCase()}
                        </span>
                        <span style="font-size:10px; background:#1e293b; color:#64748b;
                            padding:1px 7px; border-radius:20px">${tasks.length}</span>
                    </div>
                    <button class="tm-add-btn" data-col="${col.key}" title="Adicionar task" style="
                        background:none; border:none; color:#334155; cursor:pointer;
                        font-size:18px; line-height:1; padding:0 4px;
                        transition:color .15s
                    " onmouseover="this.style.color='#6366f1'" onmouseout="this.style.color='#334155'">+</button>
                </div>

                <div class="tm-cards" data-col="${col.key}" style="
                    flex:1; min-height:80px; display:flex; flex-direction:column; gap:8px;
                    padding:4px 2px; border-radius:8px; transition:background .15s;
                ">
                    ${tasks.map(t => this._buildCard(t, col.color)).join('')}
                </div>
            </div>`;
        }).join('');

        return `
        <div style="
            display:flex; gap:16px; padding:20px 24px;
            overflow-y:auto; flex:1;
            scrollbar-width:thin; scrollbar-color:#1e293b transparent;
        ">
            ${cols}
        </div>
        <div style="
            padding:12px 24px; border-top:1px solid #1e293b; flex-shrink:0;
            display:flex; gap:8px; align-items:center
        ">
            <input class="tm-new-input" placeholder="Nova task..." style="
                flex:1; background:#1e293b; border:1px solid #334155; border-radius:8px;
                padding:8px 12px; color:#f8fafc; font-family:inherit; font-size:13px; outline:none;
            " />
            <select class="tm-new-priority" style="
                background:#1e293b; border:1px solid #334155; border-radius:8px;
                padding:8px 10px; color:#94a3b8; font-family:inherit; font-size:12px; outline:none;
            ">
                <option value="alta">🔴 Alta</option>
                <option value="média" selected>🟡 Média</option>
                <option value="baixa">⚪ Baixa</option>
            </select>
            <button class="tm-new-submit" style="
                background:#6366f1; border:none; border-radius:8px;
                padding:8px 16px; color:#fff; font-family:inherit; font-size:13px;
                cursor:pointer; font-weight:600; transition:background .15s;
            " onmouseover="this.style.background='#4f46e5'" onmouseout="this.style.background='#6366f1'">
                Adicionar
            </button>
        </div>`;
    }

    // ── Card individual ───────────────────────────────────────────────
    _buildCard(task, colColor) {
        const pColor = PRIORITY_COLOR[task.priority] || '#94a3b8';
        const avatar = task.assignee
            ? `<div style="
                width:20px; height:20px; border-radius:50%; background:#334155;
                display:flex; align-items:center; justify-content:center;
                font-size:9px; color:#94a3b8; flex-shrink:0
              ">${task.assignee.charAt(0)}</div>`
            : '';

        return `
        <div class="tm-card" draggable="true" data-id="${task.id}" data-status="${task.status}" style="
            background:#1e293b; border:1px solid #334155; border-radius:8px;
            padding:10px 12px; cursor:grab; user-select:none;
            transition:transform .15s, box-shadow .15s, border-color .15s;
        "
        onmouseover="this.style.borderColor='#475569'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px #00000066'"
        onmouseout="this.style.borderColor='#334155'; this.style.transform=''; this.style.boxShadow=''">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px">
                <span style="font-size:12px; color:#f1f5f9; line-height:1.4; font-weight:500">${task.title}</span>
                <button class="tm-del-btn" data-id="${task.id}" title="Remover" style="
                    background:none; border:none; color:#334155; cursor:pointer;
                    font-size:14px; line-height:1; flex-shrink:0; padding:0;
                    transition:color .15s
                " onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#334155'">×</button>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between">
                <div style="display:flex; gap:6px; align-items:center">
                    <span style="
                        font-size:9px; color:${pColor}; background:${pColor}22;
                        padding:2px 7px; border-radius:20px; font-weight:600; letter-spacing:.5px
                    ">${task.priority.toUpperCase()}</span>
                    ${this._buildMoveButtons(task)}
                </div>
                ${avatar}
            </div>
        </div>`;
    }

    _buildMoveButtons(task) {
        const prev = task.status === 'doing' ? 'todo'  : task.status === 'done' ? 'doing' : null;
        const next = task.status === 'todo'  ? 'doing' : task.status === 'doing' ? 'done' : null;
        let btns = '';
        if (prev) btns += `<button class="tm-move-btn" data-id="${task.id}" data-to="${prev}" title="Voltar" style="background:none;border:none;color:#475569;cursor:pointer;font-size:12px;padding:0 2px" onmouseover="this.style.color='#94a3b8'" onmouseout="this.style.color='#475569'">◀</button>`;
        if (next) btns += `<button class="tm-move-btn" data-id="${task.id}" data-to="${next}" title="Avançar" style="background:none;border:none;color:#475569;cursor:pointer;font-size:12px;padding:0 2px" onmouseover="this.style.color='#94a3b8'" onmouseout="this.style.color='#475569'">▶</button>`;
        return btns;
    }

    // ── Eventos ───────────────────────────────────────────────────────
    _bindClose(overlay) {
        overlay.querySelector('.tm-close')?.addEventListener('click', () => this.close());
        document.addEventListener('keydown', this._onKey = (e) => {
            if (e.key === 'Escape') { this.close(); document.removeEventListener('keydown', this._onKey); }
        });
    }

    _bindMoveButtons(overlay, sector) {
        overlay.addEventListener('click', e => {
            // Move card
            const moveBtn = e.target.closest('.tm-move-btn');
            if (moveBtn) {
                const task = sector.tasks.find(t => t.id === moveBtn.dataset.id);
                if (task) { task.status = moveBtn.dataset.to; this._refresh(sector); }
                return;
            }
            // Delete card
            const delBtn = e.target.closest('.tm-del-btn');
            if (delBtn) {
                sector.tasks = sector.tasks.filter(t => t.id !== delBtn.dataset.id);
                this._refresh(sector);
            }
        });
    }

    _bindAddTask(overlay, sector) {
        const submit = () => {
            const input    = overlay.querySelector('.tm-new-input');
            const priority = overlay.querySelector('.tm-new-priority');
            const title    = input?.value.trim();
            if (!title) return;
            sector.tasks.push({
                id:       'task-' + Date.now(),
                title,
                status:   'todo',
                priority: priority?.value || 'média',
                assignee: '',
            });
            input.value = '';
            this._refresh(sector);
        };

        overlay.querySelector('.tm-new-submit')?.addEventListener('click', submit);
        overlay.querySelector('.tm-new-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') submit();
            e.stopPropagation();
        });
    }

    // ── Drag & drop entre colunas ─────────────────────────────────────
    _bindDragDrop(overlay, sector) {
        overlay.addEventListener('dragstart', e => {
            const card = e.target.closest('.tm-card');
            if (!card) return;
            this._dragSrc = card.dataset.id;
            card.style.opacity = '0.4';
        });

        overlay.addEventListener('dragend', e => {
            const card = e.target.closest('.tm-card');
            if (card) card.style.opacity = '';
            this._dragSrc = null;
        });

        overlay.addEventListener('dragover', e => {
            e.preventDefault();
            const col = e.target.closest('.tm-cards');
            if (col) col.style.background = '#1e293b88';
        });

        overlay.addEventListener('dragleave', e => {
            const col = e.target.closest('.tm-cards');
            if (col) col.style.background = '';
        });

        overlay.addEventListener('drop', e => {
            e.preventDefault();
            const col = e.target.closest('.tm-cards');
            if (!col || !this._dragSrc) return;
            col.style.background = '';
            const task = sector.tasks.find(t => t.id === this._dragSrc);
            if (task) { task.status = col.dataset.col; this._refresh(sector); }
        });
    }

    // ── Re-renderiza o board ──────────────────────────────────────────
    _refresh(sector) {
        const newEl = this._build(sector);
        newEl.style.opacity = '1';
        this._el.replaceWith(newEl);
        this._el = newEl;
    }
}
