const T = 32;

const SAVED_BOUNDS = JSON.parse(localStorage.getItem('escritorio-sectors-bounds') || '{}');

export const SECTORS = [
    {
        id: 'marketing', label: 'MARKETING', color: 0xec4899,
        tileX: 1, tileY: 3, tileW: 6, tileH: 10,
        files: [
            { name: 'Estratégia Q2.pdf' }, { name: 'Briefing Campanha.docx' }, { name: 'Logo v3.png' },
        ],
        projects: [
            { name: 'Campanha Lançamento', status: 'em andamento' },
            { name: 'Rebranding',          status: 'backlog' },
        ],
        tasks: [
            { id: 't1', title: 'Criar post LinkedIn',    status: 'todo',  priority: 'alta',   assignee: 'Ana' },
            { id: 't2', title: 'Revisar copy anúncio',   status: 'doing', priority: 'alta',   assignee: 'Carlos' },
            { id: 't3', title: 'Aprovar arte final',     status: 'done',  priority: 'média',  assignee: 'Ana' },
            { id: 't4', title: 'Briefing campanha Q3',   status: 'todo',  priority: 'baixa',  assignee: '' },
            { id: 't5', title: 'Atualizar identidade',   status: 'done',  priority: 'média',  assignee: 'Carlos' },
        ],
    },
    {
        id: 'desenvolvimento', label: 'DESENVOLVIMENTO', color: 0x6366f1,
        tileX: 8, tileY: 3, tileW: 8, tileH: 10,
        files: [
            { name: 'README.md' }, { name: 'arquitetura.drawio' }, { name: 'sprint-log.json' },
        ],
        projects: [
            { name: 'Plataforma Web v2', status: 'em andamento' },
            { name: 'API Mobile',        status: 'em andamento' },
            { name: 'Dashboard Admin',   status: 'backlog' },
        ],
        tasks: [
            { id: 't1', title: 'Corrigir bug #142',      status: 'done',  priority: 'alta',   assignee: 'Lucas' },
            { id: 't2', title: 'Code review PR #88',     status: 'doing', priority: 'alta',   assignee: 'Lucas' },
            { id: 't3', title: 'Deploy staging',         status: 'doing', priority: 'média',  assignee: 'Bruna' },
            { id: 't4', title: 'Atualizar dependências', status: 'todo',  priority: 'baixa',  assignee: '' },
            { id: 't5', title: 'Escrever testes E2E',    status: 'todo',  priority: 'média',  assignee: 'Bruna' },
            { id: 't6', title: 'Migração banco v3',      status: 'todo',  priority: 'alta',   assignee: '' },
        ],
    },
    {
        id: 'reuniao', label: 'SALA DE REUNIÃO', color: 0x10b981,
        tileX: 23, tileY: 3, tileW: 7, tileH: 10,
        files: [
            { name: 'Ata 12-03.docx' }, { name: 'Pauta Semanal.pdf' },
        ],
        projects: [
            { name: 'OKRs Q2', status: 'em andamento' },
        ],
        tasks: [
            { id: 't1', title: 'Reunião diária 09h',       status: 'doing', priority: 'alta',  assignee: 'Time' },
            { id: 't2', title: 'Retrospectiva sprint 5',   status: 'todo',  priority: 'média', assignee: '' },
            { id: 't3', title: 'Apresentar resultados Q1', status: 'done',  priority: 'alta',  assignee: 'Ana' },
            { id: 't4', title: 'Definir OKRs Q3',          status: 'todo',  priority: 'alta',  assignee: '' },
        ],
    },
    {
        id: 'comercial', label: 'COMERCIAL', color: 0xf59e0b,
        tileX: 16, tileY: 3, tileW: 6, tileH: 10,
        files: [
            { name: 'Política Interna.pdf' }, { name: 'Contratos 2024.zip' },
        ],
        projects: [
            { name: 'Processo Seletivo Dev', status: 'em andamento' },
            { name: 'Onboarding Q2',         status: 'backlog' },
        ],
        tasks: [
            { id: 't1', title: 'Entrevistar candidato João', status: 'doing', priority: 'alta',  assignee: 'Marta' },
            { id: 't2', title: 'Enviar holerites Abril',     status: 'todo',  priority: 'alta',  assignee: 'Marta' },
            { id: 't3', title: 'Atualizar organograma',      status: 'done',  priority: 'baixa', assignee: 'Marta' },
            { id: 't4', title: 'Onboarding novo dev',        status: 'todo',  priority: 'média', assignee: '' },
        ],
    },
];

// Aplica bounds salvos
SECTORS.forEach(s => {
    const b = SAVED_BOUNDS[s.id];
    if (b) {
        s.tileX = b.tileX;
        s.tileY = b.tileY;
        s.tileW = b.tileW;
        s.tileH = b.tileH;
    }
    // Helpers computados
    Object.defineProperties(s, {
        pixelX: { get() { return this.tileX * T; } },
        pixelY: { get() { return this.tileY * T; } },
        pixelW: { get() { return this.tileW * T; } },
        pixelH: { get() { return this.tileH * T; } },
    });
});
