export class AvatarCustomizer {
    constructor(callbacks) {
        this.onSave = callbacks.onSave;
        
        // Formato salvo: "male-01-1"
        const savedKey = localStorage.getItem('player-full-key') || 'male-01-1';
        const parts = savedKey.split('-');
        
        this.selectedType = parts[0] || 'male';                  // male, female
        this.selectedBaseNum = parseInt(parts[1]) || 1;          // 1-17 ou 1-22
        this.selectedVariant = parseInt(parts[2]) || 1;          // 1-4

        this.el = null;
    }

    open() {
        if (this.el) return;
        this.el = document.createElement('div');
        this.el.id = 'avatar-customizer';
        this.el.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(15, 23, 42, 0.95); backdrop-filter:blur(12px);
            display:flex; align-items:center; justify-content:center; z-index:10000;
            font-family:'Outfit', sans-serif;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background:#1e293b; border:1px solid #334155; padding:40px;
            border-radius:32px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);
            width:400px; display:flex; flex-direction:column; align-items:center; gap:24px;
            animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        card.innerHTML = `
            <div style="text-align:center">
                <h2 style="color:#fff; margin:0; font-size:26px; letter-spacing:-0.5px">Personalizar Boneco</h2>
                <p style="color:#94a3b8; font-size:14px; margin:8px 0 0">Escolha seu estilo e cor de pele</p>
            </div>

            <div id="avatar-preview-box" style="
                width:180px; height:180px; background:radial-gradient(circle, #334155 0%, #1e293b 100%);
                border-radius:24px; border:2px solid #475569; position:relative; overflow:hidden;
                display:flex; align-items:center; justify-content:center;
                box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
            ">
                <div id="preview-sprite" style="
                    width:32px; height:32px; 
                    transform:scale(3.5); 
                    image-rendering:pixelated;
                    background-position: -32px 0;
                "></div>
            </div>

            <div style="width:100%; display:flex; flex-direction:column; gap:16px">
                <!-- Seletor de Base (Inclui pele e roupa) -->
                <div>
                    <label style="color:#94a3b8; font-size:12px; font-weight:700; text-transform:uppercase; margin-bottom:8px; display:block">Estilo e Pele</label>
                    <div style="display:flex; align-items:center; gap:12px">
                        <button id="base-prev" style="background:#334155; color:#fff; border:none; width:44px; height:44px; border-radius:12px; cursor:pointer; font-size:18px">←</button>
                        <div id="base-val" style="flex:1; background:#0f172a; color:#8b5cf6; border:1px solid #334155; height:44px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-weight:800; text-transform:uppercase">MALE 01</div>
                        <button id="base-next" style="background:#334155; color:#fff; border:none; width:44px; height:44px; border-radius:12px; cursor:pointer; font-size:18px">→</button>
                    </div>
                </div>

                <!-- Seletor de Variante (Cabelo e cores) -->
                <div>
                    <label style="color:#94a3b8; font-size:12px; font-weight:700; text-transform:uppercase; margin-bottom:8px; display:block">Cor e Variante</label>
                    <div style="display:flex; align-items:center; gap:12px">
                        <button id="var-prev" style="background:#334155; color:#fff; border:none; width:44px; height:44px; border-radius:12px; cursor:pointer; font-size:18px">←</button>
                        <div id="var-val" style="flex:1; background:#0f172a; color:#10b981; border:1px solid #334155; height:44px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-weight:800">VARIANTE 1</div>
                        <button id="var-next" style="background:#334155; color:#fff; border:none; width:44px; height:44px; border-radius:12px; cursor:pointer; font-size:18px">→</button>
                    </div>
                </div>
            </div>

            <button id="save-btn" style="
                width:100%; background:linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                color:#fff; border:none; padding:18px; border-radius:20px; cursor:pointer;
                font-weight:800; font-size:16px; transition:all 0.2s; margin-top:8px;
                box-shadow:0 10px 15px -3px rgba(124, 58, 237, 0.3);
            ">Confirmar Avatar</button>
            <button id="close-btn" style="background:transparent; color:#64748b; border:none; cursor:pointer; font-size:14px">Voltar</button>
        `;

        this.el.appendChild(card);
        document.body.appendChild(this.el);

        this._setupListeners();
        this._updatePreview();
    }

    _setupListeners() {
        this.el.querySelector('#base-prev').onclick = () => {
            this.selectedBaseNum--;
            if (this.selectedBaseNum < 1) {
                if (this.selectedType === 'male') { this.selectedType = 'female'; this.selectedBaseNum = 22; }
                else { this.selectedType = 'male'; this.selectedBaseNum = 17; }
            }
            this._updatePreview();
        };
        this.el.querySelector('#base-next').onclick = () => {
            this.selectedBaseNum++;
            const max = this.selectedType === 'male' ? 17 : 22;
            if (this.selectedBaseNum > max) {
                if (this.selectedType === 'male') { this.selectedType = 'female'; this.selectedBaseNum = 1; }
                else { this.selectedType = 'male'; this.selectedBaseNum = 1; }
            }
            this._updatePreview();
        };

        this.el.querySelector('#var-prev').onclick = () => {
            this.selectedVariant = (this.selectedVariant === 1) ? 4 : this.selectedVariant - 1;
            this._updatePreview();
        };
        this.el.querySelector('#var-next').onclick = () => {
            this.selectedVariant = (this.selectedVariant === 4) ? 1 : this.selectedVariant + 1;
            this._updatePreview();
        };

        this.el.querySelector('#save-btn').onclick = () => {
            const numStr = String(this.selectedBaseNum).padStart(2, '0');
            const key = `${this.selectedType}-${numStr}-${this.selectedVariant}`;
            localStorage.setItem('player-full-key', key);
            if (this.onSave) this.onSave(key);
            this.close();
        };
        this.el.querySelector('#close-btn').onclick = () => this.close();
    }

    _updatePreview() {
        const type = this.selectedType;
        const numStr = String(this.selectedBaseNum).padStart(2, '0');
        const variant = this.selectedVariant;
        
        const fileName = `${type.charAt(0).toUpperCase() + type.slice(1)}%20${numStr}-${variant}.png`;

        this.el.querySelector('#base-val').textContent = `${type} ${numStr}`;
        this.el.querySelector('#var-val').textContent = `VARIANTE ${variant}`;
        
        const sprite = this.el.querySelector('#preview-sprite');
        sprite.style.backgroundImage = `url('/assets/wa/characters/pipoya/${fileName}')`;
    }

    close() {
        if (this.el) {
            this.el.remove();
            this.el = null;
        }
    }
}
