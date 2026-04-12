export class BrowserUI {
    constructor(scene) {
        this.scene = scene;
        this._el = null;
        this.currentUrl = 'https://www.google.com/search?igu=1'; // Versão embutível do Google
    }

    open(initialUrl) {
        if (this._el) return;
        if (initialUrl) this.currentUrl = initialUrl;
        
        this._el = this._build();
        document.body.appendChild(this._el);
        
        // Bloquear teclado do jogo enquanto o navegador estiver aberto
        if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.enabled = false;
        }

        requestAnimationFrame(() => {
            this._el.style.opacity = '1';
            const modal = this._el.querySelector('.browser-window');
            if (modal) modal.style.transform = 'translateY(0) scale(1)';
        });
    }

    close() {
        if (!this._el) return;
        
        this._el.style.opacity = '0';
        const modal = this._el.querySelector('.browser-window');
        if (modal) modal.style.transform = 'translateY(20px) scale(0.95)';
        
        setTimeout(() => {
            this._el?.remove();
            this._el = null;
            // Reativar teclado do jogo
            if (this.scene.input && this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = true;
            }
        }, 400);
    }

    _build() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            display:flex; align-items:center; justify-content:center;
            z-index:30000; opacity:0; transition:all .4s cubic-bezier(0.16, 1, 0.3, 1);
            font-family:'Outfit', sans-serif;
        `;

        const window = document.createElement('div');
        window.className = 'browser-window';
        window.style.cssText = `
            width: 90vw; height: 85vh; max-width: 1400px;
            background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.6);
            display: flex; flex-direction: column; overflow: hidden;
            transform: translateY(20px) scale(0.95); transition: all .5s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        // Barra de Título / URL
        const header = document.createElement('div');
        header.style.cssText = `
            height: 60px; background: #0f172a; display: flex; align-items: center;
            padding: 0 20px; gap: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);
        `;

        // Botões de controle estilo Mac
        header.innerHTML = `
            <div style="display:flex; gap:8px">
                <div class="br-btn" style="width:12px; height:12px; border-radius:50%; background:#ff5f56; cursor:pointer;" id="br-close"></div>
                <div style="width:12px; height:12px; border-radius:50%; background:#ffbd2e;"></div>
                <div style="width:12px; height:12px; border-radius:50%; background:#27c93f;"></div>
            </div>
            
            <div style="flex-grow:1; background:rgba(255,255,255,0.05); border-radius:8px; display:flex; align-items:center; padding:0 15px; height:36px; border:1px solid rgba(255,255,255,0.1)">
                <span style="color:#64748b; margin-right:10px; font-size:12px">🔒</span>
                <input type="text" id="br-url-input" value="${this.currentUrl}" style="
                    background:transparent; border:none; color:#cbd5e1; outline:none; 
                    font-size:14px; width:100%; font-family:monospace;
                " />
            </div>

            <button id="br-refresh" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:18px">↻</button>
        `;

        // Container do Iframe
        const content = document.createElement('div');
        content.style.cssText = `flex-grow:1; background:#fff; position:relative;`;
        
        const iframe = document.createElement('iframe');
        iframe.id = 'br-iframe';
        iframe.src = this.currentUrl;
        iframe.style.cssText = `width:100%; height:100%; border:none; background:#fff;`;
        
        content.appendChild(iframe);
        window.appendChild(header);
        window.appendChild(content);
        overlay.appendChild(window);

        // Eventos
        const closeBtn = header.querySelector('#br-close');
        closeBtn.onclick = () => this.close();

        const input = header.querySelector('#br-url-input');
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                let url = input.value.trim();
                if (!url.startsWith('http')) url = 'https://' + url;
                iframe.src = url;
            }
        };

        const refreshBtn = header.querySelector('#br-refresh');
        refreshBtn.onclick = () => {
            iframe.src = iframe.src;
        };

        // Fechar ao clicar no fundo
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };

        return overlay;
    }
}
