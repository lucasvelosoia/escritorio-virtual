export class WorkstationMenu {
    constructor(scene) {
        this.scene = scene;
        this._el = null;
    }

    open(sector, onBrowser, onKanban) {
        if (this._el) return;
        
        this._el = this._build(sector, onBrowser, onKanban);
        document.body.appendChild(this._el);
        
        requestAnimationFrame(() => {
            this._el.style.opacity = '1';
            const modal = this._el.querySelector('.menu-content');
            if (modal) modal.style.transform = 'translateY(0) scale(1)';
        });
    }

    close() {
        if (!this._el) return;
        this._el.style.opacity = '0';
        const modal = this._el.querySelector('.menu-content');
        if (modal) modal.style.transform = 'translateY(10px) scale(0.98)';
        setTimeout(() => {
            this._el?.remove();
            this._el = null;
        }, 300);
    }

    _build(sector, onBrowser, onKanban) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(10, 15, 28, 0.4);
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            display:flex; align-items:center; justify-content:center;
            z-index:25000; opacity:0; transition:all .3s ease;
            font-family:'Outfit', sans-serif;
        `;

        const menu = document.createElement('div');
        menu.className = 'menu-content';
        menu.style.cssText = `
            background: rgba(30, 41, 59, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px; width: 320px; padding: 24px;
            box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.6);
            transform: translateY(10px) scale(0.98); transition: all .3s cubic-bezier(0.16, 1, 0.3, 1);
            color: #fff; text-align: center;
        `;

        const title = sector ? sector.label : 'Estação de Trabalho';
        menu.innerHTML = `
            <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #8b5cf6;">${title.toUpperCase()}</h3>
            <p style="margin: 0 0 24px; font-size: 13px; color: #94a3b8;">O que deseja fazer hoje?</p>
            
            <div style="display:flex; flex-direction:column; gap:12px">
                <button id="opt-kanban" style="
                    padding: 14px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);
                    background: rgba(16, 185, 129, 0.1); color: #6ee7b7; font-weight: 700;
                    cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 10px;
                ">
                    <span style="font-size:18px">📋</span> Ver Roadmap
                </button>

                <button id="opt-browser" style="
                    padding: 14px; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.3);
                    background: rgba(139, 92, 246, 0.1); color: #c4b5fd; font-weight: 700;
                    cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 10px;
                ">
                    <span style="font-size:18px">🌐</span> Abrir Navegador
                </button>

                <button id="opt-close" style="
                    margin-top: 8px; padding: 10px; border: none; background: transparent;
                    color: #64748b; font-weight: 600; cursor: pointer; font-size: 13px;
                ">CANCELAR</button>
            </div>
        `;

        overlay.appendChild(menu);

        // Eventos
        const btnK = menu.querySelector('#opt-kanban');
        const btnB = menu.querySelector('#opt-browser');
        const btnC = menu.querySelector('#opt-close');

        const hoverEffect = (el, bg) => {
            el.onmouseover = () => { el.style.background = bg; el.style.transform = 'translateY(-2px)'; };
            el.onmouseout = () => { el.style.background = bg.replace('0.2', '0.1'); el.style.transform = 'none'; };
        };

        hoverEffect(btnK, 'rgba(16, 185, 129, 0.2)');
        hoverEffect(btnB, 'rgba(139, 92, 246, 0.2)');

        btnK.onclick = () => { this.close(); onKanban(); };
        btnB.onclick = () => { this.close(); onBrowser(); };
        btnC.onclick = () => this.close();
        overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

        return overlay;
    }
}
