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
        
        console.log('Abrindo Jukebox...');
        const btn = document.getElementById('btn-jukebox');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '<span class="btn-icon">⏳</span> Carregando...';

        try {
            // Carrega faixas do Supabase
            const { data, error } = await supabase
                .from('jukebox_tracks')
                .select('*')
                .order('title');
            
            if (error) throw error;
            this.tracks = data || [];
        } catch (err) {
            console.error('Erro ao carregar jukebox, usando fallbacks:', err);
            // Fallbacks de segurança se o banco falhar
            this.tracks = [
                { id: 'f1', title: 'Deep Focus (Lofi)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', category: 'Foco' },
                { id: 'f2', title: 'Interstellar Calm', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', category: 'Espaço' }
            ];
        } finally {
            if (btn) btn.innerHTML = originalText;
        }
        
        this._el = this._build();
        document.body.appendChild(this._el);
        
        requestAnimationFrame(() => {
            this._el.style.opacity = '1';
            const modal = this._el.querySelector('.jukebox-modal');
            if (modal) {
                modal.style.transform = 'translateY(0) scale(1)';
            }
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
            position:fixed; inset:0; background:rgba(10, 15, 28, 0.4);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            display:flex; align-items:center; justify-content:center;
            z-index:10000; opacity:0; transition:all .4s cubic-bezier(0.16, 1, 0.3, 1);
            font-family:'Outfit', sans-serif; pointer-events: auto;
        `;

        const modal = document.createElement('div');
        modal.className = 'jukebox-modal';
        modal.style.cssText = `
            background: linear-gradient(165deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 32px; width: 440px; padding: 40px;
            box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.1);
            transform: translateY(20px) scale(0.95); transition: all .5s cubic-bezier(0.16, 1, 0.3, 1);
            color: #fff; position: relative; overflow: hidden;
        `;

        // Luz de fundo decorativa
        const glow = document.createElement('div');
        glow.style.cssText = `
            position: absolute; top: -100px; right: -100px; width: 200px; height: 200px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
            pointer-events: none;
        `;
        modal.appendChild(glow);

        const trackListHtml = this.tracks.map(t => {
            const isActive = this.currentTrackId === t.id;
            return `
                <div class="track-item ${isActive ? 'active' : ''}" data-id="${t.id}" style="
                    padding: 16px 20px; border-radius: 18px;
                    background: ${isActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)'};
                    border: 1px solid ${isActive ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)'};
                    margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; gap: 16px;
                    transition: all .25s cubic-bezier(0.4, 0, 0.2, 1); position: relative;
                ">
                    <div style="
                        width: 40px; height: 40px; border-radius: 12px;
                        background: ${isActive ? 'var(--primary, #8b5cf6)' : 'rgba(255,255,255,0.1)'};
                        display: flex; align-items: center; justify-content: center; font-size: 18px;
                        box-shadow: ${isActive ? '0 0 20px rgba(139, 92, 246, 0.4)' : 'none'};
                    ">
                        ${isActive ? '🎵' : '📻'}
                    </div>
                    <div style="flex-grow: 1">
                        <div style="font-weight: 700; font-size: 15px; color: ${isActive ? '#fff' : '#cbd5e1'}">${t.title}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px">${t.category || 'Ambient'}</div>
                    </div>
                    ${isActive ? '<div class="playing-bars"><span></span><span></span><span></span></div>' : ''}
                </div>
            `;
        }).join('');

        modal.innerHTML += `
            <style>
                .track-item:hover { background: rgba(255,255,255,0.08) !important; transform: translateX(5px); border-color: rgba(255,255,255,0.2) !important; }
                .track-item.active:hover { background: rgba(139, 92, 246, 0.2) !important; transform: none; }
                .playing-bars { display: flex; gap: 3px; align-items: flex-end; height: 15px; }
                .playing-bars span { width: 3px; background: #a78bfa; border-radius: 10px; animation: barBounce 0.8s infinite ease-in-out; }
                .playing-bars span:nth-child(2) { animation-delay: 0.2s; }
                .playing-bars span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes barBounce { 0%, 100% { height: 5px; } 50% { height: 15px; } }
                
                input[type=range].jb-slider {
                    -webkit-appearance: none; width: 100%; background: transparent;
                }
                input[type=range].jb-slider::-webkit-slider-runnable-track {
                    width: 100%; height: 6px; cursor: pointer; background: rgba(255,255,255,0.1); border-radius: 10px;
                }
                input[type=range].jb-slider::-webkit-slider-thumb {
                    height: 18px; width: 18px; border-radius: 50%; background: #8b5cf6;
                    cursor: pointer; -webkit-appearance: none; margin-top: -6px;
                    box-shadow: 0 0 15px rgba(139, 92, 246, 0.6); border: 3px solid #fff;
                }
            </style>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px">
                <div>
                    <h2 style="margin:0; font-size:26px; font-weight:900; letter-spacing:-0.5px">Jukebox</h2>
                    <p style="margin:4px 0 0; color:#64748b; font-size:13px; font-weight:500">Sons para foco e imersão</p>
                </div>
                <button class="jb-close" style="
                    background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
                    color:#94a3b8; width:40px; height:40px; border-radius:12px;
                    font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;
                    transition: all .2s;
                ">×</button>
            </div>

            <div style="max-height: 320px; overflow-y: auto; margin-bottom: 32px; padding-right: 8px; scrollbar-width: thin;">
                ${trackListHtml || '<div style="text-align:center; color:#64748b; padding:40px;">Nenhuma faixa disponível.</div>'}
            </div>

            <div style="background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); margin: 0 -40px -40px; padding: 32px 40px; border-radius: 0 0 32px 32px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:16px; align-items:center">
                    <div style="display:flex; align-items:center; gap:8px">
                        <span style="font-size:16px">🔊</span>
                        <span style="font-size:13px; color:#94a3b8; font-weight:700; letter-spacing:1px">VOLUME</span>
                    </div>
                    <span style="font-size:15px; color:#a78bfa; font-weight:900">${Math.round(this.volume * 100)}%</span>
                </div>
                <input type="range" class="jb-slider jb-volume" min="0" max="1" step="0.01" value="${this.volume}" />
                
                <div style="display:flex; gap:12px; margin-top:24px">
                    <button class="jb-stop" style="
                        flex-grow:1; padding:14px; border-radius:16px;
                        background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
                        color: #fca5a5; font-weight:800; font-size:14px; cursor:pointer; transition:all .2s;
                    ">PARAR ÁUDIO</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        this._bindEvents(overlay);
        return overlay;
    }

    _bindEvents(el) {
        // Fechar ao clicar fora
        el.onclick = (e) => { if (e.target === el) this.close(); };
        
        const closeBtn = el.querySelector('.jb-close');
        closeBtn.onclick = () => this.close();
        closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(239, 68, 68, 0.2)'; closeBtn.style.color = '#fff'; };
        closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(255,255,255,0.05)'; closeBtn.style.color = '#94a3b8'; };

        const items = el.querySelectorAll('.track-item');
        items.forEach(item => {
            item.onclick = () => {
                const trackId = item.dataset.id;
                const track = this.tracks.find(t => t.id === trackId);
                if (track) this.playTrack(track);
            };
        });

        const vol = el.querySelector('.jb-volume');
        vol.oninput = (e) => {
            this.volume = parseFloat(e.target.value);
            localStorage.setItem('jukebox-volume', this.volume);
            if (this.currentSound) this.currentSound.setVolume(this.volume);
            el.querySelector('span[style*="a78bfa"]').innerText = `${Math.round(this.volume * 100)}%`;
        };

        const stopBtn = el.querySelector('.jb-stop');
        stopBtn.onclick = () => this.stop();
        stopBtn.onmouseover = () => { stopBtn.style.background = 'rgba(239, 68, 68, 0.2)'; stopBtn.style.transform = 'translateY(-2px)'; };
        stopBtn.onmouseout = () => { stopBtn.style.background = 'rgba(239, 68, 68, 0.1)'; stopBtn.style.transform = 'none'; };
    }

    playTrack(track) {
        console.log('Playing track:', track.title);
        this.stop();
        this.currentTrackId = track.id;
        
        // Se já carregamos este som antes, apenas tocamos
        if (this.scene.cache.audio.exists(track.id)) {
            this._startSound(track.id);
            this._refresh();
            return;
        }

        // Caso contrário, carregamos dinamicamente
        this.scene.load.audio(track.id, track.url);
        this.scene.load.once('complete', () => {
            this._startSound(track.id);
            this._refresh();
        });
        this.scene.load.start();
    }

    _startSound(key) {
        this.currentSound = this.scene.sound.add(key, { loop: true, volume: this.volume });
        this.currentSound.play();
    }

    stop() {
        if (this.currentSound) {
            this.currentSound.stop();
            this.currentSound = null;
        }
        this.currentTrackId = null;
        this._refresh();
    }

    _refresh() {
        if (!this._el) return;
        const newEl = this._build();
        newEl.style.opacity = '1';
        const newModal = newEl.querySelector('.jukebox-modal');
        newModal.style.transform = 'translateY(0) scale(1)';
        this._el.replaceWith(newEl);
        this._el = newEl;
    }
}
