export class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    preload() {
        const { width, height } = this.scale;
        const box = this.add.graphics().fillStyle(0x1e1b4b, 1).fillRect(0, 0, width, height);
        const bar = this.add.graphics();
        const bg  = this.add.graphics().fillStyle(0x1e293b, 1).fillRoundedRect(width/2-160, height/2-20, 320, 40, 8);
        this.add.text(width/2, height/2-50, 'escritório', {
            fontFamily: 'monospace', fontSize: '28px', color: '#8b5cf6', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.text(width/2, height/2+36, 'carregando...', {
            fontFamily: 'monospace', fontSize: '12px', color: '#64748b'
        }).setOrigin(0.5);

        this.load.on('progress', v => {
            bar.clear().fillStyle(0x8b5cf6, 1).fillRoundedRect(width/2-156, height/2-16, 312*v, 32, 6);
        });
        this.load.on('complete', () => { box.destroy(); bg.destroy(); bar.destroy(); });

        // ── Mapa ──────────────────────────────────────────────────────
        this.load.tilemapTiledJSON('office-map', '/maps/office.json');
        this.load.image('tileset5_export',        '/assets/wa/tilesets/tileset5_export.png');
        this.load.image('tileset6_export',        '/assets/wa/tilesets/tileset6_export.png');
        this.load.image('tileset1',               '/assets/wa/tilesets/tileset1.png');
        this.load.image('tileset1-repositioning', '/assets/wa/tilesets/tileset1-repositioning.png');
        this.load.image('Special_Zones',          '/assets/wa/tilesets/Special_Zones.png');

        // ── Personagens Pipoya (Curated Set) ─────────────────────────
        const chars = [
            ...Array.from({length: 17}, (_, i) => `Male ${String(i+1).padStart(2, '0')}`),
            ...Array.from({length: 22}, (_, i) => `Female ${String(i+1).padStart(2, '0')}`)
        ];

        chars.forEach(base => {
            for (let i = 1; i <= 4; i++) {
                const key = `${base}-${i}`.replace(' ', '-').toLowerCase(); // male-01-1
                this.load.spritesheet(key,
                    `/assets/wa/characters/pipoya/${base}-${i}.png`,
                    { frameWidth: 32, frameHeight: 32 });
            }
        });

        const col = '/assets/wa/collections';

        // ── Mesas ─────────────────────────────────────────────────────
        this.load.image('table-brown',        `${col}/Furniture/Table/TableBrown.png`);
        this.load.image('table-dark-brown',   `${col}/Furniture/Table/TableDarkBrown.png`);
        this.load.image('table-narrow-brown', `${col}/Furniture/Table/TableNarrowBrown.png`);
        this.load.image('table-small-grey',   `${col}/Furniture/Table/TableSmallGrey.png`);
        this.load.image('table-small-white',  `${col}/Furniture/Table/TableSmallWhite.png`);

        // ── Cadeiras ──────────────────────────────────────────────────
        ['Blue','Green','Grey','Red'].forEach(c => {
            ['Down','Up','Left','Right'].forEach(d => {
                this.load.image(`chair-${c.toLowerCase()}-${d.toLowerCase()}`,
                    `${col}/Furniture/Chair/Chair${c}${d}.png`);
            });
        });
        this.load.image('chair-pink-down', `${col}/Furniture/Chair/ChairLightRedDown.png`);

        // ── Sofás ─────────────────────────────────────────────────────
        ['Blue','Grey','Brown'].forEach(c => {
            this.load.image(`couch-${c.toLowerCase()}-down`, `${col}/Furniture/Couch/Couch${c}Down.png`);
        });

        // ── Poltronas ─────────────────────────────────────────────────
        ['Grey','Blue'].forEach(c => {
            this.load.image(`armchair-${c.toLowerCase()}-down`, `${col}/Furniture/Armchair/Armchair${c}Down.png`);
        });

        // ── Estantes ──────────────────────────────────────────────────
        this.load.image('shelf',     `${col}/Furniture/Shelf/Shelf.png`);
        this.load.image('shelf-big', `${col}/Furniture/Shelf/ShelfBig.png`);

        // ── Estantes cheias (PixelAgents) ─────────────────────────────
        this.load.image('bookshelf',        '/assets/pixelagents/furniture/BOOKSHELF/BOOKSHELF.png');
        this.load.image('bookshelf-double', '/assets/pixelagents/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png');

        // ── Livros (para compor shelf-big cheia) ──────────────────────
        for (let i = 1; i <= 5; i++) {
            this.load.image(`book${i}`, `${col}/Office/Props/Book${i}.png`);
        }

        // ── Pannels (divisórias) ───────────────────────────────────────
        this.load.image('pannel-left',  `${col}/Furniture/Pannel/PannelLeft.png`);
        this.load.image('pannel-right', `${col}/Furniture/Pannel/PannelRight.png`);

        // ── Informática ────────────────────────────────────────────────
        this.load.image('screen-black-down',    `${col}/Office/Computer/ScreenBlackDown.png`);
        this.load.image('screen-white-down',    `${col}/Office/Computer/ScreenWhiteDown.png`);
        this.load.image('big-screen-black-down',`${col}/Office/Computer/BigScreenBlackDown.png`);
        this.load.image('big-screen-white-down',`${col}/Office/Computer/BigScreenWhiteDown.png`);
        this.load.image('laptop-black-down',    `${col}/Office/Computer/LaptopBlackDown.png`);
        this.load.image('printer',              `${col}/Office/Computer/Printer.png`);

        // ── Plantas ────────────────────────────────────────────────────
        this.load.image('plant',           `${col}/Office/Plant/Plant.png`);
        this.load.image('plant-large',     `${col}/Office/Plant/PlantLarge.png`);
        this.load.image('plant-small',     `${col}/Office/Plant/PlantSmall.png`);
        this.load.image('plant-small-blue',`${col}/Office/Plant/PlantSmallBlue.png`);
        this.load.image('plant-small-cyan',`${col}/Office/Plant/PlantSmallCyan.png`);
        this.load.image('plant-small-red', `${col}/Office/Plant/PlantSmallRed.png`);

        // ── Props ─────────────────────────────────────────────────────
        this.load.image('coffee-dispenser', `${col}/Office/Props/CoffeeDispenser.png`);
        this.load.image('clock',            `${col}/Office/Props/Clock.png`);
        this.load.image('folders',          `${col}/Office/Props/Folders.png`);
        this.load.image('bin',              `${col}/Office/Props/Bin.png`);

        // ── Custom Asset ──────────────────────────────────────────────
        this.load.image('jukebox', '/assets/office/jukebox.png');
    }

    create() {
        try {
            this._bakeFilledShelf();
        } catch (e) {
            console.warn('Falla al crear shelf horneado:', e);
        }
        console.log('Boot completo, iniciando GameScene...');
        this.scene.start('GameScene');
    }

    // Compõe shelf-big + livros em uma RenderTexture e registra como 'shelf-big-filled'
    _bakeFilledShelf() {
        const W = 64, H = 96;
        const rt = this.add.renderTexture(0, 0, W, H);

        // Fundo: o shelf vazio
        rt.draw('shelf-big', 0, 0);

        // Posições dos livros nas 3 prateleiras do ShelfBig
        // Prateleira 1 (topo):  y ≈ 4
        // Prateleira 2 (meio):  y ≈ 36
        // Prateleira 3 (base):  y ≈ 68
        const shelves = [
            { y: 2,  books: ['book1','book2','book3','book4'] },
            { y: 34, books: ['book5','book1','book2','book3'] },
            { y: 66, books: ['book4','book5','book1','book2'] },
        ];

        shelves.forEach(({ y, books }) => {
            // Cada livro é 32px de largura; encaixamos 2 por prateleira (shelf tem 64px)
            // Escala os livros para caber: 2 livros × ~28px = ~56px
            books.slice(0, 2).forEach((key, i) => {
                rt.draw(key, i * 30 + 2, y);
            });
        });

        // Salva como textura reutilizável
        rt.saveTexture('shelf-big-filled');
        rt.destroy();
    }
}
