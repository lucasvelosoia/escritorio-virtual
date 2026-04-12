import { supabase } from '../utils/supabaseClient.js';

export class JukeboxUI {
    constructor(scene) {
        this.scene = scene;
        this._el = null;
        this.tracks = [];
        this.currentSound = null;
        this.currentTrackId = null;
        this.volume = parseFloat(localStorage.getItem('jukebox-volume')) || 0.5;
    }

    async open() {
        if (this._el) return;
        
        // Carrega faixas do Supabase
        const { data, error } = await supabase
            .from('jukebox_tracks')
            .select('*')
            .order('title');
        
        if (error) {
            console.error('Erro ao carregar jukebox:', error);
            return;
        }
        
        this.tracks = data;
        this._el = this._build();
        document.body.appendChild(this._el);
        
        requestAnimationFrame(() => {
            this._el.style.opacity = '1';
            const modal = this._el.querySelector('.jukebox-modal');
            if (modal) modal.style.transform = 'scale(1)';
        });
    }

    close() {
        if (!this._el) return;
        this._el.style.opacity = '0';
        const modal = this._el.querySelector('.jukebox-modal');
        if (modal) modal.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this._el?.remove();
            this._el = null;
        }, 300);
    }

    isOpen() { return !!this._el; }

    _build() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.8);
            backdrop-filter: blur(8px); display:flex; align-items:center;
            justify-content:center; z-index:3000; opacity:0; transition:all .3s ease;
            font-family:'Outfit', sans-serif;
        `;

        const modal = document.createElement('div');
        modal.className = 'jukebox-modal';
        modal.style.cssText = `
            background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px; width: 400px; padding: 32px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            transform: scale(0.9); transition: all .4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            color: #fff; position: relative;
        `;

        const trackListHtml = this.tracks.map(t => `
            <div class="track-item" data-id="${t.id}" style="
                padding: 12px 16px; border-radius: 12px;
                background: ${this.currentTrackId === t.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)'};
                border: 1px solid ${this.currentTrackId === t.id ? 'rgba(139, 92, 246, 0.4)' : 'transparent'};
                margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;
                transition: all .2s;
            ">
                <div>
                    <div style="font-weight: 600; font-size: 14px; color: ${this.currentTrackId === t.id ? '#a78bfa' : '#f8fafc'}">${t.title}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px">${t.category || 'Ambient'}</div>
                </div>
                ${this.currentTrackId === t.id ? '<span style="font-size:12px">🔊</span>' : ''}
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px">
                <h2 style="margin:0; font-size:22px; font-weight:800; background:linear-gradient(to right, #fff, #a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Jukebox Office</h2>
                <button class="jb-close" style="background:none; border:none; color:#64748b; font-size:24px; cursor:pointer;">×</button>
            </div>

            <div style="max-height: 300px; overflow-y: auto; margin-bottom: 24px; scrollbar-width: thin; padding-right: 4px;">
                ${trackListHtml || '<div style="text-align:center; color:#64748b; padding:20px;">Nenhuma faixa encontrada.</div>'}
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; align-items:center">
                    <span style="font-size:12px; color:#64748b; font-weight:600">VOLUME</span>
                    <span style="font-size:12px; color:#a78bfa; font-weight:800">${Math.round(this.volume * 100)}%</span>
                </div>
                <input type="range" class="jb-volume" min="0" max="1" step="0.01" value="${this.volume}" style="
                    width:100%; height:4px; border-radius:10px; appearance:none; background:rgba(255,255,255,0.1); cursor:pointer;
                " />
            </div>

            <button class="jb-stop" style="
                margin-top: 24px; width: 100%; padding: 12px; border-radius: 12px;
                background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
                color: #fca5a5; font-weight: 700; font-size: 13px; cursor: pointer; transition: all .2s;
            ">PARAR MÚSICA</button>
        `;

        overlay.appendChild(modal);
        this._bindEvents(overlay);
        return overlay;
    }

    _bindEvents(el) {
        el.addEventListener('mousedown', e => { if (e.target === el) this.close(); });
        el.querySelector('.jb-close').onclick = () => this.close();

        const items = el.querySelectorAll('.track-item');
        items.forEach(item => {
            item.onclick = () => {
                const trackId = item.dataset.id;
                const track = this.tracks.find(t => t.id === trackId);
                if (track) this.playTrack(track);
                this._refresh();
            };
            item.onmouseover = () => { if (item.dataset.id !== this.currentTrackId) item.style.background = 'rgba(255,255,255,0.08)'; };
            item.onmouseout = () => { if (item.dataset.id !== this.currentTrackId) item.style.background = 'rgba(255,255,255,0.03)'; };
        });

        const vol = el.querySelector('.jb-volume');
        vol.oninput = (e) => {
            this.volume = parseFloat(e.target.value);
            localStorage.setItem('jukebox-volume', this.volume);
            if (this.currentSound) this.currentSound.setVolume(this.volume);
            el.querySelector('span[style*="a78bfa"]').innerText = `${Math.round(this.volume * 100)}%`;
        };

        el.querySelector('.jb-stop').onclick = () => {
            this.stop();
            this._refresh();
        };
    }

    playTrack(track) {
        this.stop();
        this.currentTrackId = track.id;
        
        // No Phaser, precisamos carregar e tocar.
        // Como o arquivo URL pode ser externo, usamos o HTML5 Audio para simplicidade ou o Phaser Loader.
        // Usar o Phaser.Sound permite integração melhor com a cena.
        
        const loader = this.scene.load.audio(track.id, track.url);
        loader.once('complete', () => {
            this.currentSound = this.scene.sound.add(track.id, { loop: true, volume: this.volume });
            this.currentSound.play();
        });
        this.scene.load.start();
    }

    stop() {
        if (this.currentSound) {
            this.currentSound.stop();
            this.currentSound = null;
        }
        this.currentTrackId = null;
    }

    _refresh() {
        if (!this._el) return;
        const newEl = this._build();
        newEl.style.opacity = '1';
        this._el.replaceWith(newEl);
        this._el = newEl;
    }
}
