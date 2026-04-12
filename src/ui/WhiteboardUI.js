export class WhiteboardUI {
    constructor(scene) {
        this.scene = scene;
        this._el = null;
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentColor = '#8b5cf6';
        this.currentSize = 3;
        this.lastX = 0;
        this.lastY = 0;
    }

    open() {
        if (this._el) return;
        
        this._el = this._build();
        document.body.appendChild(this._el);
        this._initCanvas();
        
        // Bloquear teclado do jogo
        if (this.scene.input?.keyboard) this.scene.input.keyboard.enabled = false;

        requestAnimationFrame(() => {
            this._el.style.opacity = '1';
            const win = this._el.querySelector('.whiteboard-win');
            if (win) win.style.transform = 'translateY(0) scale(1)';
        });
    }

    close() {
        if (!this._el) return;
        this._el.style.opacity = '0';
        setTimeout(() => {
            this._el?.remove();
            this._el = null;
            if (this.scene.input?.keyboard) this.scene.input.keyboard.enabled = true;
        }, 300);
    }

    _initCanvas() {
        this.canvas = this._el.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Ajustar tamanho real do canvas
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.canvas.onmousedown = (e) => this._startDrawing(e);
        this.canvas.onmousemove = (e) => this._draw(e);
        this.canvas.onmouseup = () => this._stopDrawing();
        this.canvas.onmouseleave = () => this._stopDrawing();
    }

    _startDrawing(e) {
        this.isDrawing = true;
        [this.lastX, this.lastY] = [e.offsetX, e.offsetY];
    }

    _draw(e) {
        if (!this.isDrawing) return;
        
        const x = e.offsetX;
        const y = e.offsetY;

        this._renderLine(this.lastX, this.lastY, x, y, this.currentColor, this.currentSize);
        
        // Enviar para o servidor (Multiplayer)
        if (this.scene.multiplayer) {
            this.scene.multiplayer.sendWhiteboardDraw({
                x1: this.lastX, y1: this.lastY,
                x2: x, y2: y,
                color: this.currentColor,
                size: this.currentSize
            });
        }

        [this.lastX, this.lastY] = [x, y];
    }

    _renderLine(x1, y1, x2, y2, color, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.stroke();
    }

    // Método chamado pelo Multiplayer para desenhar vindo de fora
    externalDraw(data) {
        if (!this.ctx) return;
        this._renderLine(data.x1, data.y1, data.x2, data.y2, data.color, data.size);
    }

    _stopDrawing() {
        this.isDrawing = false;
    }

    _build() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.6);
            backdrop-filter: blur(10px); display:flex; align-items:center;
            justify-content:center; z-index:35000; opacity:0; transition:all .3s ease;
            font-family:'Outfit', sans-serif;
        `;

        const win = document.createElement('div');
        win.className = 'whiteboard-win';
        win.style.cssText = `
            width: 90vw; height: 85vh; background: #fff; border-radius: 24px;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 50px 100px -20px rgba(0,0,0,0.8);
            transform: translateY(20px) scale(0.95); transition: all .4s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        win.innerHTML = `
            <div style="height:70px; background:#1e293b; display:flex; align-items:center; padding:0 30px; justify-content:space-between">
                <div style="display:flex; align-items:center; gap:15px">
                    <span style="font-size:24px">🖌️</span>
                    <h3 style="color:#fff; margin:0; font-size:18px; font-weight:800">WHITEBOARD COLABORATIVO</h3>
                </div>
                
                <div style="display:flex; gap:10px; background:rgba(255,255,255,0.05); padding:8px; border-radius:15px">
                    <button class="wb-tool" data-color="#000" style="width:30px; height:30px; border-radius:50%; background:#000; border:2px solid #fff; cursor:pointer"></button>
                    <button class="wb-tool" data-color="#ef4444" style="width:30px; height:30px; border-radius:50%; background:#ef4444; border:none; cursor:pointer"></button>
                    <button class="wb-tool" data-color="#3b82f6" style="width:30px; height:30px; border-radius:50%; background:#3b82f6; border:none; cursor:pointer"></button>
                    <button class="wb-tool" data-color="#10b981" style="width:30px; height:30px; border-radius:50%; background:#10b981; border:none; cursor:pointer"></button>
                    <button class="wb-tool" data-color="#8b5cf6" style="width:30px; height:30px; border-radius:50%; background:#8b5cf6; border:none; cursor:pointer"></button>
                    <div style="width:1px; background:rgba(255,255,255,0.1); margin:0 5px"></div>
                    <button id="wb-clear" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-weight:800; padding:0 10px">LIMPAR TUDO</button>
                </div>

                <button id="wb-close" style="background:rgba(255,255,255,0.1); border:none; color:#fff; width:40px; height:40px; border-radius:12px; cursor:pointer; font-size:20px">×</button>
            </div>
            <div style="flex-grow:1; cursor:crosshair; background:#fff; position:relative">
                <canvas style="width:100%; height:100%"></canvas>
            </div>
        `;

        overlay.appendChild(win);

        // Eventos de ferramentas
        win.querySelectorAll('.wb-tool').forEach(btn => {
            btn.onclick = () => {
                win.querySelectorAll('.wb-tool').forEach(b => b.style.border = 'none');
                btn.style.border = '2px solid #fff';
                this.currentColor = btn.dataset.color;
            };
        });

        win.querySelector('#wb-clear').onclick = () => {
             if (confirm('Deseja apagar tudo na lousa?')) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
             }
        };

        win.querySelector('#wb-close').onclick = () => this.close();
        overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

        return overlay;
    }
}
