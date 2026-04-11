import { createClient } from '@supabase/supabase-js';

export class MultiplayerService {
    constructor(scene) {
        this.scene = scene;
        this.url = import.meta.env.VITE_SUPABASE_URL;
        this.key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!this.url || !this.key || this.url.includes('SUA_URL')) {
            console.warn('Supabase não configurado. Rodando em modo Local.');
            this.active = false;
            return;
        }

        this.supabase = createClient(this.url, this.key);
        this.userId = localStorage.getItem('user-id') || ('user-' + Math.random().toString(36).substring(2, 9));
        this.sessionId = this.userId + '-' + Math.random().toString(36).substring(2, 9);
        this.userName = localStorage.getItem('user-email')?.split('@')[0] || 'Visitante';
        this.active = true;
        this.isSubscribed = false;
        
        this.remotePlayers = new Map(); // id -> {sprite, label}
        
        this.channel = this.supabase.channel('virtual-office-room', {
            config: {
                presence: { key: this.sessionId }
            }
        });

        this._init();
        this.fetchChatHistory();
    }

    async fetchChatHistory() {
        const { data, error } = await this.supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (data) {
            data.forEach(msg => this._handleChatMessage({ name: msg.user_name, text: msg.message }, true));
        }
    }

    _init() {
        this.channel
            .on('presence', { event: 'sync' }, () => {
                const state = this.channel.presenceState();
                console.log('Syncing Presence:', state);
                this._syncPlayers(state);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Player joined:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Player left:', key);
                this._removePlayer(key);
            })
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                this._handleChatMessage(payload);
            })
            .on('broadcast', { event: 'move' }, ({ payload }) => {
                if (payload.id === this.sessionId) return;
                
                if (!this.remotePlayers.has(payload.id)) {
                    this._createRemotePlayer(payload.id, payload);
                } else {
                    this._updateRemotePlayer(payload.id, payload);
                }
            })
            .subscribe(async (status) => {
                console.log('Supabase Channel Status:', status);
                if (status === 'SUBSCRIBED') {
                    this.isSubscribed = true;
                    await this.updatePresence();
                }
            });
    }

    async updatePresence() {
        if (!this.active || !this.isSubscribed) return;
        const player = this.scene.player;
        if (!player) return;

        try {
            await this.channel.track({
                name: this.userName,
                x: player.x,
                y: player.y,
                fullKey: this.scene.playerFullKey,
                dir: this.scene.currentDir,
                anim: player.anims.currentAnim?.key
            });
        } catch (e) {
            console.warn('Erro ao atualizar presença:', e);
        }
    }

    sendMovement(player) {
        if (!this.active || !this.isSubscribed) return;
        this.channel.send({
            type: 'broadcast',
            event: 'move',
            payload: {
                id: this.sessionId,
                name: this.userName,
                x: player.x,
                y: player.y,
                fullKey: this.scene.playerFullKey,
                dir: this.scene.currentDir,
                anim: player.anims.currentAnim?.key
            }
        });
    }

    async sendChatMessage(text) {
        if (!this.active) {
            this._handleChatMessage({ id: this.sessionId, name: 'Você (Local)', text });
            return;
        }

        // Salva no Banco para Histórico
        await this.supabase.from('chat_messages').insert([
            { user_name: this.userName, message: text }
        ]);

        // Ouve via Broadcast p/ velocidade instantânea
        this.channel.send({
            type: 'broadcast',
            event: 'chat',
            payload: { id: this.sessionId, name: this.userName, text }
        });
        this._handleChatMessage({ id: this.sessionId, name: 'Você', text });
    }

    _syncPlayers(state) {
        Object.entries(state).forEach(([id, presences]) => {
            if (id === this.sessionId) return;
            const data = presences[0];
            if (!data) return;

            if (!this.remotePlayers.has(id)) {
                this._createRemotePlayer(id, data);
            } else {
                this._updateRemotePlayer(id, data);
            }
        });
    }

    _createRemotePlayer(id, data) {
        console.log('Creating remote player:', id, data.fullKey);
        // Garante que as animações existam para este estilo
        this.scene._createCharacterAnims(); 

        const sprite = this.scene.add.sprite(data.x, data.y, data.fullKey, 1)
            .setScale(1.5).setDepth(45).setAlpha(0);
        
        // Nome flutuante
        const label = this.scene.add.text(data.x, data.y - 28, data.name, {
            fontFamily: 'Outfit, sans-serif', fontSize: '10px', color: '#fff',
            backgroundColor: '#8b5cf6aa', padding: { x: 6, y: 3 },
            fontWeight: '800'
        }).setOrigin(0.5).setDepth(60).setAlpha(0);

        this.remotePlayers.set(id, { sprite, label });

        // Fade in suave
        this.scene.tweens.add({ targets: [sprite, label], alpha: 1, duration: 500 });
    }

    _updateRemotePlayer(id, data) {
        const p = this.remotePlayers.get(id);
        if (!p) return;

        // Suaviza movimento (Lerp ou Tween)
        this.scene.tweens.add({
            targets: p.sprite,
            x: data.x,
            y: data.y,
            duration: 100 // Sincroniza com a taxa de update
        });

        p.label.setPosition(data.x, data.y - 28);

        // Troca textura e animação se necessário
        if (p.sprite.texture.key !== data.fullKey) {
            p.sprite.setTexture(data.fullKey);
        }
        
        if (data.anim && this.scene.anims.exists(data.anim)) {
            p.sprite.play(data.anim, true);
        }
    }

    _removePlayer(id) {
        const p = this.remotePlayers.get(id);
        if (p) {
            this.scene.tweens.add({
                targets: [p.sprite, p.label],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    p.sprite.destroy();
                    p.label.destroy();
                }
            });
            this.remotePlayers.delete(id);
        }
    }

    _handleChatMessage(data, isHistory = false) {
        const panel = document.querySelector('.chat-messages');
        if (!panel) return;

        const msg = document.createElement('div');
        msg.className = 'msg';
        const isSelf = data.name === 'Você' || data.name === 'Você (Local)';
        msg.innerHTML = `
            <span class="user" style="color:${isSelf ? '#a78bfa' : (isHistory ? '#64748b' : '#10b981')}; font-weight:800">${data.name}:</span>
            <span class="text">${data.text}</span>
        `;
        panel.appendChild(msg);
        panel.scrollTop = panel.scrollHeight;

        if (!isHistory) {
            msg.style.animation = 'messageSlide 0.3s ease-out forwards';
            if (data.id) this._showSpeechBubble(data.id, data.text);
        }
    }

    _showSpeechBubble(id, text) {
        let targetSprite = null;
        if (id === this.sessionId) {
            targetSprite = this.scene.player;
        } else {
            const p = this.remotePlayers.get(id);
            if (p) targetSprite = p.sprite;
        }

        if (!targetSprite) return;

        // Limpa balão anterior se existir (evita sobreposição no mesmo personagem)
        if (targetSprite.speechBubble) {
            this.scene.events.off('postupdate', targetSprite.bubbleUpdateFn);
            targetSprite.speechBubble.destroy();
        }

        // Formatação do Balão
        const bubble = this.scene.add.text(targetSprite.x, targetSprite.y - 45, text, {
            fontFamily: 'Outfit, sans-serif', fontSize: '11px', color: '#1e293b',
            backgroundColor: '#ffffffee', padding: { x: 8, y: 6 },
            fontWeight: '600', align: 'center',
            wordWrap: { width: 140, useAdvancedWrap: true }
        }).setOrigin(0.5, 1).setDepth(100);

        // Faz o balão seguir o personagem
        const updateBubble = () => {
            if (!bubble.active || !targetSprite.active) return;
            bubble.setPosition(targetSprite.x, targetSprite.y - 45);
        };
        this.scene.events.on('postupdate', updateBubble);

        targetSprite.speechBubble = bubble;
        targetSprite.bubbleUpdateFn = updateBubble;

        // Animação de sumiço após 4 segundos
        this.scene.time.delayedCall(4000, () => {
            if (!bubble.active) return;
            this.scene.tweens.add({
                targets: bubble,
                alpha: 0,
                y: bubble.y - 12,
                duration: 300,
                onComplete: () => {
                    this.scene.events.off('postupdate', updateBubble);
                    bubble.destroy();
                    if (targetSprite.speechBubble === bubble) {
                        targetSprite.speechBubble = null;
                        targetSprite.bubbleUpdateFn = null;
                    }
                }
            });
        });
    }

    // ── Novos métodos de persistência ──
    async saveLayout(layoutData) {
        if (!this.active) return;
        await this.supabase.from('office_layout').upsert({
            id: 'main-office',
            data: layoutData
        });
    }

    async getLayout() {
        if (!this.active) return null;
        const { data } = await this.supabase.from('office_layout').select('data').eq('id', 'main-office').single();
        return data?.data;
    }

    async saveEmployees(employees) {
        if (!this.active) return;
        // Simplificado: deleta e reinsere para manter o estado global
        await this.supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
        await this.supabase.from('employees').insert(employees.map(e => ({
            name: e.name,
            sector_id: e.sectorId,
            avatar_full_key: e.avatarFullKey
        })));
    }

    async getEmployees() {
        if (!this.active) return null;
        const { data } = await this.supabase.from('employees').select('*');
        return data?.map(d => ({
            id: d.id,
            name: d.name,
            sectorId: d.sector_id,
            avatarFullKey: d.avatar_full_key
        }));
    }
}
