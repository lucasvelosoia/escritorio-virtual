import { supabase } from '../utils/supabaseClient.js';

export class AuthSystem {
    constructor(callbacks) {
        this.onAuthSuccess = callbacks.onAuthSuccess;
        this.el = null;
        this.supabase = supabase;
    }

    showSetupError() {
        if (this.el) return;
        this.el = document.createElement('div');
        this.el.id = 'auth-screen';
        this.el.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background: #0f172a; display:flex; align-items:center; justify-content:center;
            font-family: 'Outfit', sans-serif; z-index: 20000;
        `;
        const container = document.createElement('div');
        container.style.cssText = `
            background:#1e293b; border:1px solid #ef4444; padding:48px;
            border-radius:32px; box-shadow: 0 25px 50px -12px rgba(239,68,68,0.5);
            width:420px; text-align:center;
        `;
        container.innerHTML = `
            <div style="font-size:48px; margin-bottom:16px">⛔</div>
            <h1 style="color:#fff; margin:0 0 16px; font-size:24px">Ambiente Não Configurado</h1>
            <p style="color:#fca5a5; margin:0; font-size:15px; line-height: 1.5">
                Não consegui encontrar as chaves do Supabase no Vercel. 
                <br><br>
                Adicione <b>VITE_SUPABASE_URL</b> e <b>VITE_SUPABASE_ANON_KEY</b> nas variáveis de ambiente!
            </p>
        `;
        this.el.appendChild(container);
        document.body.appendChild(this.el);
    }

    async checkSession() {
        if (!this.supabase) return false;
        
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.onAuthSuccess(session.user);
            return true;
        }
        this.showLogin();
        return false;
    }

    async logout() {
        if (!this.supabase) return;
        await this.supabase.auth.signOut();
        localStorage.removeItem('user-email');
        localStorage.removeItem('user-id');
        window.location.reload();
    }

    showLogin() {
        if (this.el) return;
        this.el = document.createElement('div');
        this.el.id = 'auth-screen';
        this.el.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background: #0f172a; display:flex; align-items:center; justify-content:center;
            font-family: 'Outfit', sans-serif; z-index: 20000;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background:#1e293b; border:1px solid #334155; padding:48px;
            border-radius:32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            width:380px; text-align:center; animation: modalFadeIn 0.5s ease;
        `;

        container.innerHTML = `
            <div style="margin-bottom:32px">
                <div style="font-size:48px; margin-bottom:16px">💼</div>
                <h1 style="color:#fff; margin:0; font-size:28px; letter-spacing:-1px">Escritório Virtual</h1>
                <p style="color:#94a3b8; margin:8px 0 0; font-size:15px">Acesse sua estação de trabalho</p>
            </div>

            <div id="auth-form" style="display:flex; flex-direction:column; gap:16px">
                <input type="email" id="auth-email" placeholder="Seu e-mail profissional" style="
                    background:#0f172a; border:1px solid #334155; padding:16px; 
                    border-radius:12px; color:#fff; outline:none; font-size:15px;
                ">
                <input type="password" id="auth-pass" placeholder="Sua senha" style="
                    background:#0f172a; border:1px solid #334155; padding:16px; 
                    border-radius:12px; color:#fff; outline:none; font-size:15px;
                ">
                <div id="auth-error" style="color:#ef4444; font-size:13px; min-height:18px"></div>
                
                <button id="auth-submit" style="
                    background:linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    color:#fff; border:none; padding:18px; border-radius:12px;
                    font-weight:800; font-size:16px; cursor:pointer; transition:all 0.2s;
                    box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.3);
                ">Entrar no Escritório</button>
                
                <p style="color:#64748b; font-size:13px; margin-top:16px">
                    Não tem conta? <a href="#" id="toggle-register" style="color:#8b5cf6; text-decoration:none">Criar uma</a>
                </p>
            </div>
        `;

        this.el.appendChild(container);
        document.body.appendChild(this.el);

        this._setupEvents();
    }

    _setupEvents() {
        const submit = this.el.querySelector('#auth-submit');
        const emailInput = this.el.querySelector('#auth-email');
        const passInput = this.el.querySelector('#auth-pass');
        const errorDiv = this.el.querySelector('#auth-error');
        const toggle = this.el.querySelector('#toggle-register');
        
        let isRegister = false;

        toggle.onclick = (e) => {
            e.preventDefault();
            isRegister = !isRegister;
            submit.innerText = isRegister ? 'Criar Minha Conta' : 'Entrar no Escritório';
            toggle.innerText = isRegister ? 'Fazer Login' : 'Criar uma';
        };

        submit.onclick = async () => {
            const email = emailInput.value;
            const password = passInput.value;
            errorDiv.innerText = '';
            
            submit.disabled = true;
            submit.innerText = 'Processando...';

            const { data, error } = isRegister 
                ? await this.supabase.auth.signUp({ email, password })
                : await this.supabase.auth.signInWithPassword({ email, password });

            if (error) {
                errorDiv.innerText = error.message;
                submit.disabled = false;
                submit.innerText = isRegister ? 'Criar Minha Conta' : 'Entrar no Escritório';
            } else if (data.user) {
                this._hide();
                this.onAuthSuccess(data.user);
            }
        };
    }

    _hide() {
        if (this.el) {
            this.el.style.opacity = '0';
            this.el.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                this.el.remove();
                this.el = null;
            }, 500);
        }
    }
}
