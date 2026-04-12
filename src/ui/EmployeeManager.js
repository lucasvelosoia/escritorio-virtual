import { EMPLOYEES } from '../data/employees.js';

export class EmployeeManager {
    constructor(scene) {
        this.scene = scene;
        this.el = null;
        this.isOpening = false;
        
        // Configuração inicial do Avatar para novos funcionários
        this.newEmpAvatar = {
            type: 'male',
            num: 1,
            variant: 1
        };
    }

    open() {
        if (this.el || this.isOpening) return;
        this.isOpening = true;

        this.el = document.createElement('div');
        this.el.id = 'employee-manager-overlay';
        this.el.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; font-family: 'Outfit', sans-serif;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: #1e293b; width: 900px; height: 650px;
            border-radius: 32px; border: 1px solid #334155;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            display: flex; overflow: hidden;
            animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        container.innerHTML = `
            <!-- Sidebar: Lista de Funcionários -->
            <div style="width: 350px; border-right: 1px solid #334155; display: flex; flex-direction: column; background: #1e293b;">
                <div style="padding: 32px; border-bottom: 1px solid #334155;">
                    <h2 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: -0.5px">Equipe</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Gerencie os membros do escritório</p>
                </div>
                <div id="employee-list" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                    <!-- Lista será preenchida via JS -->
                </div>
            </div>

            <!-- Main Content: Formulário/Detalhes -->
            <div style="flex: 1; display: flex; flex-direction: column; background: #0f172a;">
                <div style="padding: 32px; display: flex; justify-content: space-between; align-items: center;">
                    <h2 id="form-title" style="color: #fff; margin: 0; font-size: 22px;">Novo Funcionário</h2>
                    <button id="close-manager" style="background: none; border: none; color: #64748b; font-size: 24px; cursor: pointer;">×</button>
                </div>

                <div style="flex: 1; padding: 0 40px 40px; overflow-y: auto;">
                    <div style="display: flex; gap: 32px; margin-bottom: 32px;">
                        <!-- Preview do Avatar -->
                        <div style="width: 140px;">
                            <label style="color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; display: block;">Visual</label>
                            <div id="emp-avatar-preview-box" style="
                                width: 140px; height: 140px; background: #1e293b; 
                                border-radius: 20px; border: 2px solid #334155;
                                display: flex; align-items: center; justify-content: center;
                                position: relative; overflow: hidden;
                            ">
                                <div id="emp-preview-sprite" style="
                                    width: 32px; height: 32px; transform: scale(3);
                                    image-rendering: pixelated; background-position: -32px 0;
                                "></div>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 12px;">
                                <button id="btn-prev-avatar" style="flex: 1; background: #334155; border: none; color: #fff; padding: 8px; border-radius: 8px; cursor: pointer;">←</button>
                                <button id="btn-next-avatar" style="flex: 1; background: #334155; border: none; color: #fff; padding: 8px; border-radius: 8px; cursor: pointer;">→</button>
                            </div>
                            <button id="btn-toggle-gender" style="width: 100%; margin-top: 8px; background: #0f172a; border: 1px solid #334155; color: #8b5cf6; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 800;">MUDAR GÊNERO</button>
                        </div>

                        <!-- Detalhes do Funcionário -->
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                            <div>
                                <label style="color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; display: block;">Nome Completo</label>
                                <input type="text" id="emp-name" placeholder="Ex: João Silva" style="
                                    width: 100%; background: #1e293b; border: 1px solid #334155; 
                                    padding: 14px 18px; border-radius: 12px; color: #fff; font-size: 15px; outline: none;
                                ">
                            </div>
                            <div>
                                <label style="color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; display: block;">Setor / Departamento</label>
                                <select id="emp-sector" style="
                                    width: 100%; background: #1e293b; border: 1px solid #334155; 
                                    padding: 14px 18px; border-radius: 12px; color: #fff; font-size: 15px; outline: none; appearance: none;
                                ">
                                    <option value="marketing">Marketing</option>
                                    <option value="desenvolvimento">Desenvolvimento</option>
                                    <option value="comercial">Comercial</option>
                                    <option value="reuniao">Diretoria</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 16px;">
                        <button id="btn-save-employee" style="
                            flex: 1; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                            color: #fff; border: none; padding: 18px; border-radius: 16px;
                            font-weight: 800; font-size: 16px; cursor: pointer; transition: all 0.2s;
                            box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.3);
                        ">Salvar Colaborador</button>
                    </div>
                </div>
            </div>
        `;

        this.el.appendChild(container);
        document.body.appendChild(this.el);

        requestAnimationFrame(() => {
            if (this.el) this.el.style.opacity = '1';
        });

        this._setupListeners();
        this._renderEmployeeList();
        this._updateAvatarPreview();
        this.isOpening = false;
        
        // Bloqueia input do Phaser
        if (this.scene.input.keyboard) this.scene.input.keyboard.enabled = false;
    }

    _setupListeners() {
        const closeBtn = this.el.querySelector('#close-manager');
        const saveBtn = this.el.querySelector('#btn-save-employee');
        const prevAv = this.el.querySelector('#btn-prev-avatar');
        const nextAv = this.el.querySelector('#btn-next-avatar');
        const genderBtn = this.el.querySelector('#btn-toggle-gender');

        closeBtn.onclick = () => this.close();

        prevAv.onclick = () => {
            this.newEmpAvatar.num--;
            const max = this.newEmpAvatar.type === 'male' ? 17 : 22;
            if (this.newEmpAvatar.num < 1) this.newEmpAvatar.num = max;
            this._updateAvatarPreview();
        };

        nextAv.onclick = () => {
            this.newEmpAvatar.num++;
            const max = this.newEmpAvatar.type === 'male' ? 17 : 22;
            if (this.newEmpAvatar.num > max) this.newEmpAvatar.num = 1;
            this._updateAvatarPreview();
        };

        genderBtn.onclick = () => {
            this.newEmpAvatar.type = this.newEmpAvatar.type === 'male' ? 'female' : 'male';
            this.newEmpAvatar.num = 1;
            this._updateAvatarPreview();
        };

        saveBtn.onclick = async () => {
            const nameInput = this.el.querySelector('#emp-name');
            const sectorSelect = this.el.querySelector('#emp-sector');
            
            if (!nameInput.value.trim()) {
                alert('Por favor, digite o nome do funcionário.');
                return;
            }

            const numStr = String(this.newEmpAvatar.num).padStart(2, '0');
            const avatarKey = `${this.newEmpAvatar.type}-${numStr}-${this.newEmpAvatar.variant}`;

            const newEmployee = {
                id: 'emp-' + Math.random().toString(36).substr(2, 9),
                name: nameInput.value.trim(),
                sectorId: sectorSelect.value,
                avatarFullKey: avatarKey
            };

            // Adiciona localmente
            EMPLOYEES.push(newEmployee);
            
            // Persiste no Supabase se disponível
            if (this.scene.multiplayer && this.scene.multiplayer.active) {
                saveBtn.innerText = 'Sincronizando...';
                saveBtn.disabled = true;
                await this.scene.multiplayer.saveEmployees(EMPLOYEES);
                saveBtn.innerText = 'Salvar Colaborador';
                saveBtn.disabled = false;
            } else {
                localStorage.setItem('escritorio-employees', JSON.stringify(EMPLOYEES));
            }

            nameInput.value = '';
            this._renderEmployeeList();
            this.scene.events.emit('employees-updated');
        };
    }

    _updateAvatarPreview() {
        const { type, num, variant } = this.newEmpAvatar;
        const numStr = String(num).padStart(2, '0');
        const fileName = `${type.charAt(0).toUpperCase() + type.slice(1)}%20${numStr}-${variant}.png`;
        const sprite = this.el.querySelector('#emp-preview-sprite');
        if (sprite) {
            sprite.style.backgroundImage = `url('/assets/wa/characters/pipoya/${fileName}')`;
        }
    }

    _renderEmployeeList() {
        const listContainer = this.el.querySelector('#employee-list');
        listContainer.innerHTML = '';

        if (EMPLOYEES.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 40px 20px; font-size: 14px;">
                    Nenhum funcionário cadastrado.
                </div>
            `;
            return;
        }

        EMPLOYEES.forEach((emp, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                background: #0f172a; padding: 12px; border-radius: 16px; 
                display: flex; align-items: center; gap: 12px; border: 1px solid transparent;
                transition: all 0.2s; cursor: default;
            `;

            // Avatar Thumbnail
            const [type, numStr, variant] = (emp.avatarFullKey || 'male-01-1').split('-');
            const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
            const fileName = `${typeCapitalized}%20${numStr}-${variant}.png`;

            item.innerHTML = `
                <div style="
                    width: 48px; height: 48px; background: #1e293b; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; overflow: hidden;
                ">
                    <div style="
                        width: 32px; height: 32px; transform: scale(1.5);
                        image-rendering: pixelated; background-position: -32px 0;
                        background-image: url('/assets/wa/characters/pipoya/${fileName}');
                    "></div>
                </div>
                <div style="flex: 1;">
                    <div style="color: #fff; font-size: 14px; font-weight: 600;">${emp.name}</div>
                    <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">${emp.sectorId}</div>
                </div>
                <button class="delete-emp" data-index="${index}" style="
                    background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; 
                    width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; font-size: 16px;
                ">×</button>
            `;

            const delBtn = item.querySelector('.delete-emp');
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Remover ${emp.name}?`)) {
                    EMPLOYEES.splice(index, 1);
                    if (this.scene.multiplayer && this.scene.multiplayer.active) {
                        await this.scene.multiplayer.saveEmployees(EMPLOYEES);
                    } else {
                        localStorage.setItem('escritorio-employees', JSON.stringify(EMPLOYEES));
                    }
                    this._renderEmployeeList();
                    this.scene.events.emit('employees-updated');
                }
            };

            listContainer.appendChild(item);
        });
    }

    close() {
        if (!this.el) return;
        this.el.style.opacity = '0';
        setTimeout(() => {
            if (this.el) {
                this.el.remove();
                this.el = null;
            }
            if (this.scene.input.keyboard) this.scene.input.keyboard.enabled = true;
        }, 300);
    }
}
