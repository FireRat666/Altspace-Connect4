(function () {
    /**
     * Banter Connect 4 Embed Script
     * A fully synced multiplayer Connect 4 game for Banter.
     */

    // --- Configuration (Pre-Init) ---
    // We capture this immediately to ensure we get the correct script tag parameters
    // before any async operations (which might lose document.currentScript context).
    const config = {
        boardPosition: [0, 1.1, 0],
        boardRotation: [0, 0, 0],
        boardScale: [1, 1, 1],
        instance: window.location.href.split('?')[0],
        hideUI: false,
        turnCooldown: 5, // Seconds before the same person can move for the other side; 0 = off
        lockTimeout: 90, // Seconds a seated player can leave their turn before others can take the seat; 0 = off
        cullDistance: 20, // Metres from the game beyond which it switches itself off; 0 = always on
        volume: 0.4, // Sound effect volume, 0-1; 0 = no sounds
        soundNear: 2.5, // Metres from the game where sounds are at full volume
        soundFar: 10, // Metres from the game where sounds fade out completely
        hideBoard: false,
        useCustomModels: true,
        lighting: 'lit',
        addLights: false
    };

    // Helper to parse Vector3 - returns array [x,y,z]
    const parseVector3 = (str, defaultVal) => {
        if (!str) return defaultVal;
        const s = str.trim();
        if (s.includes(' ')) {
            const parts = s.split(' ').map(Number);
            if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
        }
        const num = parseFloat(s);
        if (!isNaN(num)) {
            return [num, num, num];
        }
        return defaultVal;
    };

    // Parse URL params or script attributes immediately
    const currentScript = document.currentScript;
    const scriptSrc = currentScript ? currentScript.src : null;

    if (currentScript) {
        const getParam = (name, defaultValue) => {
            if (!currentScript) return defaultValue;
            
            const getFromURL = (key) => {
                try {
                    const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
                    const url = new URL(currentScript.src, base);
                    const params = new URLSearchParams(url.search);
                    if (params.has(key)) return params.get(key);
                    const lowerKey = key.toLowerCase();
                    for (const [pKey, pVal] of params.entries()) {
                        if (pKey.toLowerCase() === lowerKey) {
                            return pVal;
                        }
                    }
                } catch (e) {}
                return null;
            };

            const getFromScriptTag = (key) => {
                try {
                    if (currentScript.hasAttribute(key)) {
                        return currentScript.getAttribute(key);
                    }
                    const lowerKey = key.toLowerCase();
                    if (currentScript.hasAttribute(lowerKey)) {
                        return currentScript.getAttribute(lowerKey);
                    }
                    const datasetKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    if (currentScript.dataset && currentScript.dataset[datasetKey] !== undefined) {
                        return currentScript.dataset[datasetKey];
                    }
                } catch (e) {}
                return null;
            };

            const keys = [name];
            const aliases = {
                boardPosition: ['position', 'board-position'],
                boardRotation: ['rotation', 'board-rotation'],
                boardScale: ['scale', 'board-scale'],
                hideUI: ['hide-ui'],
                turnCooldown: ['turn-cooldown'],
                lockTimeout: ['lock-timeout', 'seat-timeout', 'idle-timeout'],
                cullDistance: ['cull-distance', 'render-distance'],
                volume: ['sound-volume'],
                soundNear: ['sound-near'],
                soundFar: ['sound-far'],
                hideBoard: ['hide-board'],
                useCustomModels: ['use-custom-models'],
                addLights: ['add-lights'],
                useAOBaking: ['use-ao-baking'],
                boardSize: ['board-size'],
                piecesOpacity: ['pieces-opacity'],
                scoreboardPosition: ['scoreboard-position'],
                scoreboardRotation: ['scoreboard-rotation'],
                scoreboardScale: ['scoreboard-scale']
            };

            if (aliases[name]) {
                aliases[name].forEach(alias => {
                    if (!keys.includes(alias)) keys.push(alias);
                });
            }

            for (const key of keys) {
                const val = getFromURL(key);
                if (val !== null) return val;
            }
            for (const key of keys) {
                const val = getFromScriptTag(key);
                if (val !== null) return val;
            }

            return defaultValue;
        };

        config.hideUI = getParam('hideUI', String(config.hideUI)) === 'true';
        config.turnCooldown = parseFloat(getParam('turnCooldown', String(config.turnCooldown)));
        if (isNaN(config.turnCooldown)) config.turnCooldown = 5;
        config.lockTimeout = parseFloat(getParam('lockTimeout', String(config.lockTimeout)));
        if (isNaN(config.lockTimeout)) config.lockTimeout = 90;
        config.cullDistance = parseFloat(getParam('cullDistance', String(config.cullDistance)));
        if (isNaN(config.cullDistance)) config.cullDistance = 20;
        config.volume = parseFloat(getParam('volume', String(config.volume)));
        if (isNaN(config.volume)) config.volume = 0.4;
        config.soundNear = parseFloat(getParam('soundNear', String(config.soundNear)));
        if (isNaN(config.soundNear)) config.soundNear = 2.5;
        config.soundFar = parseFloat(getParam('soundFar', String(config.soundFar)));
        if (isNaN(config.soundFar)) config.soundFar = 10;
        config.hideBoard = getParam('hideBoard', String(config.hideBoard)) === 'true';
        config.instance = getParam('instance', config.instance);
        config.useCustomModels = getParam('useCustomModels', String(config.useCustomModels)) === 'true';
        config.lighting = getParam('lighting', config.lighting);
        // 'lit' is a true/false switch (a checkbox in the snippet editor); it overrides 'lighting'.
        const litParam = getParam('lit', null);
        if (litParam !== null) config.lighting = litParam === 'true' ? 'lit' : 'unlit';
        config.addLights = getParam('addLights', String(config.addLights)) !== 'false';

        config.boardScale = parseVector3(getParam('boardScale'), config.boardScale);
        config.boardPosition = parseVector3(getParam('boardPosition'), config.boardPosition);
        config.boardRotation = parseVector3(getParam('boardRotation'), config.boardRotation);

        config.scoreboardPosition = parseVector3(getParam('scoreboardPosition'), null);
        // 0 0 0 means automatic (the turn sign's default spot)
        if (config.scoreboardPosition && config.scoreboardPosition.every(n => n === 0)) config.scoreboardPosition = null;
        config.scoreboardRotation = parseVector3(getParam('scoreboardRotation'), null);
        config.scoreboardScale = parseVector3(getParam('scoreboardScale'), null);
    }

    // --- Main Game Logic (Deferred until BS is ready) ---
    let initialized = false;
    const initGame = async () => {
        if (initialized) return;
        initialized = true;
        console.log("Connect4: Initializing Game...");

        // Convert config arrays to BS.Vector3
        config.boardPosition = new BS.Vector3(...config.boardPosition);
        config.boardRotation = new BS.Vector3(...config.boardRotation);
        config.boardScale = new BS.Vector3(...config.boardScale);

        const COLORS = {
            board: '#1E5BC6',    // Classic Blue Board
            red: '#D50000',      // Red Piece
            yellow: '#FFD400',    // Yellow Piece
            empty: '#FFFFFF',    // Empty slot (transparent-ish visual)
            winHighlight: '#00FF00', // Green highlight for winning pieces
            hover: '#4488FF'     // Column hover effect
        };

        class Connect4Game {
            constructor() {
                this.rows = 6;
                this.cols = 7;
                this.board = this.createEmptyBoard();
                this.currentPlayer = 1; // 1 = Red, 2 = Yellow
                this.winner = null;
                this.winningCells = [];
                this.gameOver = false;
            }
    
            createEmptyBoard() {
                return Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
            }
    
            reset() {
                this.board = this.createEmptyBoard();
                this.currentPlayer = 1;
                this.winner = null;
                this.winningCells = [];
                this.gameOver = false;
            }
    
            loadState(state) {
                this.board = state.board;
                this.currentPlayer = state.currentPlayer;
                this.winner = state.winner;
                if (this.winner) {
                    this.checkWin();
                } else {
                    this.winningCells = [];
                    this.gameOver = false;
                }
            }
    
            getState() {
                return {
                    board: this.board,
                    currentPlayer: this.currentPlayer,
                    winner: this.winner,
                    lastModified: this.lastModified
                };
            }
    
            simulateDrop(col) {
                if (this.gameOver) return null;
                if (col < 0 || col >= this.cols) return null;
    
                const boardCopy = this.board.map(row => [...row]);
                let placedRow = -1;
    
                for (let row = 0; row < this.rows; row++) {
                    if (boardCopy[row][col] === 0) {
                        boardCopy[row][col] = this.currentPlayer;
                        placedRow = row;
                        console.log(`Connect4: SimulateDrop Col ${col} -> Placed at Row ${row}`);
                        break;
                    }
                }
    
                if (placedRow === -1) return null;
    
                let nextPlayer = (this.currentPlayer === 1 ? 2 : 1);
                let nextWinner = this.winner;
                let nextGameOver = this.gameOver;
    
                const tempGame = new Connect4Game();
                tempGame.board = boardCopy;
                tempGame.rows = this.rows;
                tempGame.cols = this.cols;
                tempGame.currentPlayer = this.currentPlayer;
    
                if (tempGame.checkWin()) {
                    nextWinner = this.currentPlayer;
                    nextGameOver = true;
                } else if (tempGame.checkDraw()) {
                    nextWinner = 'draw';
                    nextGameOver = true;
                }
    
                return {
                    board: boardCopy,
                    currentPlayer: nextGameOver ? this.currentPlayer : nextPlayer,
                    winner: nextWinner,
                    lastModified: Date.now()
                };
            }
    
            dropPiece(col) {
                if (this.gameOver) return false;
                if (col < 0 || col >= this.cols) return false;
    
                for (let row = 0; row < this.rows; row++) {
                    if (this.board[row][col] === 0) {
                        this.board[row][col] = this.currentPlayer;
                        console.log(`Connect4: DropPiece Col ${col} -> Placed at Row ${row}`);
    
                        if (this.checkWin()) {
                            this.winner = this.currentPlayer;
                            this.gameOver = true;
                        } else if (this.checkDraw()) {
                            this.winner = 'draw';
                            this.gameOver = true;
                        } else {
                            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                        }
                        return true;
                    }
                }
                return false;
            }
    
            checkDraw() {
                return this.board.every(row => row.every(cell => cell !== 0));
            }
    
            checkWin() {
                const directions = [
                    [0, 1], [1, 0], [1, 1], [1, -1]
                ];
    
                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.cols; c++) {
                        const player = this.board[r][c];
                        if (player === 0) continue;
    
                        for (const [dr, dc] of directions) {
                            let cells = [[r, c]];
                            for (let i = 1; i < 4; i++) {
                                const nr = r + dr * i;
                                const nc = c + dc * i;
                                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === player) {
                                    cells.push([nr, nc]);
                                } else {
                                    break;
                                }
                            }
                            if (cells.length === 4) {
                                this.winningCells = cells;
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
        }

        const PIECE_MODELS = {
            1: 'DiscRed.glb',
            2: 'DiscYellow.glb',
            'highlight': 'DiscGreen.glb'
        };
        
        function getModelUrl(modelName) {
            try {
                if (scriptSrc) {
                    return new URL(`../Models/${modelName}`, scriptSrc).href;
                }
            } catch (e) { console.error("Error resolving model URL:", e); }
            return `../Models/${modelName}`;
        }
    
        const state = {
            root: null,
            piecesRoot: null,
            slots: [],
            columns: [],
            isSyncing: false,
            game: new Connect4Game()
        };
    
        function hexToVector4(hex) {
            let c = hex.substring(1);
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const num = parseInt(c, 16);
            return new BS.Vector4(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255, 1);
        }

        // The same colour, darker by `factor` (0 to 1)
        function darker(hex, factor) {
            const v = hexToVector4(hex);
            return new BS.Vector4(v.x * factor, v.y * factor, v.z * factor, 1);
        }

        async function setupScene() {
            console.log("Connect4: Setup Scene Started");
            state.root = await new BS.GameObject("Connect4_Root").Async();
            let t = await state.root.AddComponent(new BS.Transform());
            t.position = config.boardPosition;
            t.localEulerAngles = config.boardRotation;
            t.localScale = config.boardScale;
    
            if (config.useCustomModels && config.lighting === 'lit' && config.addLights) {
                const lightGO = await new BS.GameObject("Connect4_DirectionalLight");
                await lightGO.SetParent(state.root, false);
                let lightTrans = await lightGO.AddComponent(new BS.Transform());
                lightTrans.localPosition = new BS.Vector3(0, 2, -2);
                lightTrans.localEulerAngles = new BS.Vector3(45, 0, 0);
                await lightGO.AddComponent(new BS.Light(1, new BS.Vector4(1, 1, 1, 1), 1, 0.1));
            }
    
            const rows = 6;
            const cols = 7;
            const startX = -0.3;
            const startY = 0.1;
            const gapX = 0.1;
            const gapY = 0.1;
            const barWidth = 0.02;
            const gridHeight = (rows * gapY) + barWidth;
    
            if (!config.hideBoard) {
                const frameRoot = await new BS.GameObject("Frame_Root").Async();
                await frameRoot.SetParent(state.root, false);
                await frameRoot.AddComponent(new BS.Transform());
                const frameDepth = 0.03;
    
                // The outside edge is thicker and deeper than the bars between the slots. It is
                // pushed outwards by the extra thickness, so its inner face lines up with where a
                // thin bar would be and the outer slots stay the same size as the rest.
                const edgeWidth = 0.04;
                const edgeDepth = 0.05;
                const extra = edgeWidth - barWidth;
                for (let i = 0; i <= cols; i++) {
                    const isEdge = i === 0 || i === cols;
                    const outward = isEdge ? (i === 0 ? -1 : 1) * extra / 2 : 0;
                    const barX = (startX - (gapX / 2)) + (i * gapX) + outward;
                    const centerY = startY + ((rows - 1) * gapY) / 2;
                    await createBanterObject(frameRoot, BS.GeometryType.BoxGeometry,
                        { width: isEdge ? edgeWidth : barWidth, height: gridHeight + (isEdge ? extra * 2 : 0), depth: isEdge ? edgeDepth : frameDepth },
                        COLORS.board, new BS.Vector3(barX, centerY, 0));
                }
    
                const gridWidth = (cols * gapX) + barWidth;
                const centerX = startX + ((cols - 1) * gapX) / 2;
                for (let i = 0; i <= rows; i++) {
                    const isEdge = i === 0 || i === rows;
                    const outward = isEdge ? (i === 0 ? -1 : 1) * extra / 2 : 0;
                    const barY = (startY - (gapY / 2)) + (i * gapY) + outward;
                    await createBanterObject(frameRoot, BS.GeometryType.BoxGeometry,
                        { width: gridWidth + (isEdge ? extra * 2 : 0), height: isEdge ? edgeWidth : barWidth, depth: isEdge ? edgeDepth : frameDepth },
                        COLORS.board, new BS.Vector3(centerX, barY, 0));
                }

                // Two feet under the bottom corners, like the classic stand
                const bottomY = startY - (gapY / 2) - barWidth / 2 - extra;
                for (const side of [-1, 1]) {
                    const footX = centerX + side * ((cols * gapX) / 2 + extra / 2);
                    await createBanterObject(frameRoot, BS.GeometryType.BoxGeometry,
                        { width: 0.05, height: 0.03, depth: 0.24 },
                        COLORS.board, new BS.Vector3(footX, bottomY - 0.015, 0));
                }
            }
    
            state.piecesRoot = await new BS.GameObject("Pieces_Root").Async();
            await state.piecesRoot.SetParent(state.root, false);
            await state.piecesRoot.AddComponent(new BS.Transform());
    
            const piecesZ = 0;
    
            for (let r = 0; r < 6; r++) {
                state.slots[r] = [];
                for (let c = 0; c < 7; c++) {
                    const x = startX + (c * gapX);
                    const y = startY + (r * gapY);
                    const pos = new BS.Vector3(x, y, piecesZ);
                    state.slots[r][c] = {
                        sphere: null,
                        redModel: null,
                        yellowModel: null,
                        greenModel: null,
                        pos: pos,
                        r: r,
                        c: c
                    };
                }
            }
    
            const columnZ = 0;
            const columnDepth = 0.05;
            for (let c = 0; c < 7; c++) {
                const x = startX + (c * gapX);
                const pos = new BS.Vector3(x, startY + ((rows - 1) * gapY) / 2, columnZ);
                const colWidth = gapX * 0.7;
    
                const colObj = await new BS.GameObject(`Column_${c}`).Async();
                await colObj.SetParent(state.root, false);
                const ct = await colObj.AddComponent(new BS.Transform());
                ct.localPosition = pos;
                await colObj.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0, 0, 0), new BS.Vector3(colWidth, gridHeight, columnDepth)));
                await colObj.SetLayer(5);
                colObj.name = `Column_${c}`;
                colObj.On('click', () => {
                    console.log(`Connect4: Column ${c} clicked`);
                    handleColumnClick(c);
                });
            }
    
            panel = createGamePanel({
                title: "Connect 4",
                key: `connect4_game_${config.instance}`,
                root: state.root,
                centre: config.boardPosition,
                sides: [
                    { id: 1, label: 'RED', bg: '#c62828', fg: '#ffffff' },
                    { id: 2, label: 'YELLOW', bg: '#fdd835', fg: '#111111' }
                ],
                turn: () => state.game.winner ? null : state.game.currentPlayer,
                status: turnStatusText,
                resetFreely: () => !!state.game.winner || state.game.board.every(r => r.every(c => c === 0)),
                reset: () => { state.game.reset(); syncState(); },
                getState: () => state.game.getState(),
                position: [0, 0.95, 0],
                scale: 0.12
            });
            await panel.build();

            setupListeners();
            checkForExistingState();
            console.log("Connect4: Setup Scene Complete");
        }
    
        function getGeoArgs(type, dims) {
            const w = dims.width || 1;
            const h = dims.height || 1;
            const d = dims.depth || 1;
            const r = dims.radius || 0.5;
            const PI2 = 6.283185;
    
            if (type === BS.GeometryType.BoxGeometry) {
                return [type, null, w, h, d];
            } else if (type === BS.GeometryType.SphereGeometry) {
                return [
                    type, null, w, h, d,
                    24, 16, 1,
                    r, 24,
                    0, PI2, 0, PI2,
                    8, false,
                    r, r
                ];
            } else if (type === BS.GeometryType.CylinderGeometry) {
                 return [
                    type, null, 
                    1, h, 1,
                    1, 1, 1,
                    r, 24,
                    0, PI2, 0, PI2,
                    8, false,
                    r, r
                ];
            } else {
                return [
                    type, null, w, h, d, 1, 1, 1,
                    r, 24, 0, PI2, 0, PI2, 8, false,
                    r, r,
                    0, 1, 24, 8, 0.4, 16, PI2, 2, 3, 5, 5, 0, ""
                ];
            }
        }
    
        async function createBanterObject(parent, type, dims, colorHex, pos, hasCollider = false, opacity = 1.0, cacheBust = null) {
            const obj = await new BS.GameObject("Geo").Async();
            await obj.SetParent(parent, false);
    
            let t = await obj.AddComponent(new BS.Transform());
            if (pos) t.localPosition = pos;
    
            const fullArgs = getGeoArgs(type, dims);
            await obj.AddComponent(new BS.BanterGeometry(...fullArgs));
    
            const color = hexToVector4(colorHex);
            color.w = opacity;
    
            // See-through objects need the transparent shader, even when lit
            let shader = "Unlit/Diffuse";
            if (opacity < 1.0) {
                shader = "Unlit/DiffuseTransparent";
            } else if (config.lighting === 'lit') {
                shader = "Standard";
            }
            
            await obj.AddComponent(new BS.BanterMaterial(shader, "", color, BS.MaterialSide.Front, false, cacheBust || ""));
    
            if (hasCollider) {
                let colSize;
                if (type === BS.GeometryType.BoxGeometry) {
                    colSize = new BS.Vector3(dims.width || 1, dims.height || 1, dims.depth || 1);
                } else {
                    const r = dims.radius || 0.5;
                    const h = dims.height || 1;
                    colSize = new BS.Vector3(r * 2, h, r * 2);
                }
                await obj.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0, 0, 0), colSize));
                await obj.SetLayer(5);
            }
    
            return obj;
        }
    
        async function createCustomPiece(parent, player, pos) {
            const modelName = PIECE_MODELS[player];
            if (!modelName) {
                console.error(`No model for player ${player}`);
                return null;
            }
    
            const piece = await new BS.GameObject(`CustomPiece_${player}`).Async();
            await piece.SetParent(parent, false);
    
            let t = await piece.AddComponent(new BS.Transform());
            if (pos) t.localPosition = pos;
            
            t.localScale = new BS.Vector3(0.045, 0.045, 0.045);
            t.localEulerAngles = new BS.Vector3(90, 0, 0);
    
            const url = getModelUrl(modelName);
            
            try {
                await piece.AddComponent(new BS.BanterGLTF(url, false, false, false, false, false, false));
                const colorHex = player === 1 ? COLORS.red : COLORS.yellow;
                const colorVec4 = hexToVector4(colorHex);
                const shader = config.lighting === 'lit' ? "Standard" : "Unlit/Diffuse";
                await piece.AddComponent(new BS.BanterMaterial(shader, "", colorVec4, BS.MaterialSide.Front, false));
            } catch (glbErr) {
                console.error(`Failed to load GLTF for player ${player}:`, glbErr);
            }
    
            return piece;
        }
    
        function handleColumnClick(col) {
            if (state.game.winner) return;
            if (state.isSyncing) {
                console.log("Connect4: Input Locked (Syncing or Spam Protection)");
                return;
            }
    
            const nextState = state.game.simulateDrop(col);
            if (nextState) {
                if (!panel.mayMove(state.game.currentPlayer)) return;
                console.log("Connect4: Locking Input & Sending Move...");
                state.isSyncing = true;
                if (turnOnCooldown(state.game.currentPlayer)) { state.isSyncing = false; return; }
                syncState(stampMove(nextState, state.game.currentPlayer));
            }
        }
    
        const SOUND_FILES = { drop1: 1, drop2: 1, drop3: 1, drop4: 1, drop5: 1, drop6: 1, win: 1, draw: 1, reset: 1 }; // name: number of takes

        // --- Sounds ---
        // Short sound effects for moves, captures, wins and resets. Each client works out what changed
        // between two game states and plays the matching sound, so everyone hears every move. Joining is
        // silent, and our own move echoed back by the space only plays once. The files are in Sounds/
        // next to this script (made by sound-tools/make_sounds.py). `volume` (0-1) sets the level;
        // 0 turns sounds off.
        const MUTE_KEY = 'banterGames_muted_connect4';
        const sounds = { files: SOUND_FILES, cache: {}, live: false, prev: null, prevKey: null, muted: false };
        try { sounds.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { }

        function soundAudio(file) {
            let a = sounds.cache[file];
            if (!a) {
                a = sounds.cache[file] = new Audio(new URL(`Sounds/${file}.ogg`, scriptSrc || window.location.href).href);
                a.preload = 'auto';
            }
            return a;
        }

        // `name` is a key of SOUND_FILES; ones with several takes pick one at random.
        function playSound(name, delayMs = 0) {
            if (!(config.volume > 0) || sounds.muted) return;
            const volume = config.volume * distanceGain(config.boardPosition, config.soundNear, config.soundFar);
            if (volume < 0.005) return; // too far away to hear
            const takes = sounds.files[name] || 1;
            const file = takes > 1 ? name + (1 + Math.floor(Math.random() * takes)) : name;
            setTimeout(() => {
                try {
                    const audio = soundAudio(file).cloneNode();
                    audio.volume = Math.min(1, volume);
                    audio.play().catch(() => {});
                } catch (e) { }
            }, delayMs);
        }

        // Call after every state change; repeats of the same state are ignored.
        function soundForState() {
            let next;
            try { next = soundSnapshot(); } catch (e) { return; }
            if (!next) return;
            const key = JSON.stringify(next);
            if (key === sounds.prevKey) return;
            const prev = sounds.prev;
            sounds.prev = JSON.parse(key);
            sounds.prevKey = key;
            if (sounds.live && prev) {
                try { chooseSounds(prev, sounds.prev); } catch (e) { console.warn("Sound error", e); }
            }
        }

        // Call once the saved game (if any) has loaded; sounds play from then on.
        function startSounds() {
            soundForState();
            sounds.live = true;
            headTracker();
            if (config.volume > 0) {
                for (const [name, takes] of Object.entries(sounds.files)) {
                    if (takes > 1) for (let i = 1; i <= takes; i++) soundAudio(name + i);
                    else soundAudio(name);
                }
            }
        }

        // --- Hearing distance ---
        // Sounds fade with the local player's distance from the game: full volume within `near` metres,
        // silent from `far` metres, so people elsewhere in the world aren't disturbed. The head position
        // comes from an empty object attached to the player's head (Unity reports where it is), or from
        // pose-update until that works. All the games on a page share one tracker.
        function headTracker() {
            if (window.BanterGamesHead) return window.BanterGamesHead;
            const head = window.BanterGamesHead = { marker: null, attaching: false, markerPos: null, posePos: null };
            const scene = BS.BanterScene.GetInstance();
            scene.On('pose-update', e => {
                const h = e && e.detail && e.detail.head;
                if (h && h.position) head.posePos = h.position;
            });
            const attach = async () => {
                const uid = scene.localUser && scene.localUser.uid;
                if (!uid || head.marker || head.attaching) return;
                head.attaching = true;
                try {
                    const go = await new BS.GameObject("GameSoundsHead").Async();
                    head.marker = go;
                    if (typeof BS.AttachedObject === 'function') {
                        const point = BS.AvatarBoneName ? BS.AvatarBoneName.HEAD : 0;
                        const attached = await go.AddComponent(new BS.AttachedObject({ uid, avatarAttachmentPoint: point }));
                        await attached.Attach(uid);
                    } else if (typeof scene.LegacyAttachObject === 'function' && BS.LegacyAttachmentPosition) {
                        await scene.LegacyAttachObject(go, uid, BS.LegacyAttachmentPosition.HEAD);
                    } else {
                        return; // no way to attach here: pose-update only
                    }
                    const PN = BS.PN || BS.PropertyName;
                    if (typeof go.WatchTransform === 'function' && PN) {
                        await go.WatchTransform([PN.position], t => {
                            if (head.marker === go && t && t.position) head.markerPos = t.position;
                        });
                    }
                } finally {
                    head.attaching = false;
                }
            };
            const tryAttach = () => attach().catch(e => console.warn("Game sounds: could not follow the head", e));
            // The SDK drops attachments when the player leaves, so the marker is made again when they
            // come back (a moment later, so the SDK is ready).
            scene.On('user-left', e => {
                if (!(e && e.detail && e.detail.isLocal)) return;
                try { if (head.marker) head.marker.Destroy(); } catch (err) { }
                head.marker = null;
                head.markerPos = null;
            });
            scene.On('user-joined', e => {
                if (e && e.detail && e.detail.isLocal && !head.marker) setTimeout(tryAttach, 5000);
            });
            (async () => {
                while (!scene.localUser || scene.localUser.uid === undefined) await new Promise(r => setTimeout(r, 500));
                await tryAttach();
            })();
            return head;
        }

        // 0-1: how loud a sound from `centre` (a world position) is for the local player.
        function distanceGain(centre, near, far) {
            const head = headTracker();
            const p = head.markerPos || head.posePos;
            if (!p || !centre) return 1; // not known yet, so play it
            const d = Math.hypot(p.x - centre.x, p.y - centre.y, p.z - centre.z);
            if (d <= near) return 1;
            if (!(far > near) || d >= far) return 0;
            const f = 1 - (d - near) / (far - near);
            return f * f;
        }

        // Cells (of a 2D board) that differ between two boards.
        function boardDiff(a, b) {
            const out = [];
            for (let r = 0; r < b.length; r++) {
                for (let c = 0; c < b[r].length; c++) {
                    const was = a[r] ? a[r][c] : undefined;
                    if (was !== b[r][c]) out.push({ r, c, was, now: b[r][c] });
                }
            }
            return out;
        }

        function soundSnapshot() {
            return { board: state.game.board, winner: state.game.winner || null };
        }

        function chooseSounds(prev, next) {
            const changes = boardDiff(prev.board, next.board);
            const added = changes.filter(d => !d.was && d.now);
            if (changes.length && next.board.every(row => row.every(v => !v))) return playSound('reset');
            if (added.length !== 1) return;
            // Row 0 is the bottom, so a disc in row 0 has fallen past all six rows.
            const rowsFallen = Math.max(1, Math.min(6, next.board.length - added[0].r));
            playSound('drop' + rowsFallen);
            if (next.winner && !prev.winner) playSound(next.winner === 'draw' ? 'draw' : 'win', 120 + rowsFallen * 60);
        }

        // --- Turn cooldown ---
        // Stops one person from taking both sides' turns by accident (a double click, or moving again
        // before the other player has had a chance). After you move, if it is now the other side's
        // turn, you must wait `turnCooldown` seconds before you can move for them. Someone playing on
        // their own can still play both sides; they just wait. Extra turns for the same side are not
        // affected. The time is only ever compared on the mover's own clock.
        const turnGuard = { lastMove: null };

        function localUid() {
            const user = BS.BanterScene.GetInstance().localUser;
            return user && user.uid !== undefined ? String(user.uid) : null;
        }

        // True (and shows a notice) if the local user has to wait before moving for `side`.
        function turnOnCooldown(side) {
            const m = turnGuard.lastMove;
            const uid = localUid();
            if (!m || !uid || !(config.turnCooldown > 0) || m.uid !== uid || m.side === side) return false;
            const left = config.turnCooldown * 1000 - (Date.now() - m.at);
            if (left <= 0) return false;
            showTurnNotice(`Other player's turn (${Math.ceil(left / 1000)}s)`);
            return true;
        }

        // Marks outgoing state as a move by the local user for `side`.
        function stampMove(data, side) {
            turnGuard.lastMove = { uid: localUid(), side, at: Date.now() };
            data.lastMove = turnGuard.lastMove;
            return data;
        }

        // Call with every state loaded from the space. A reset has no lastMove, which clears it.
        function loadLastMove(data) {
            turnGuard.lastMove = (data && data.lastMove) || null;
        }

        function turnStatusText() {
            const names = {1:'Red',2:'Yellow'};
            const g = state.game;
            if (g.winner === 'draw') return "Draw!";
            if (g.winner) return `${names[g.winner]} wins!`;
            return `${names[g.currentPlayer]}'s turn`;
        }

        function syncState(newState) {
            const key = `connect4_game_${config.instance}`;
            const data = panel.stamp(newState || state.game.getState());
            BS.BanterScene.GetInstance().SetPublicSpaceProps({ [key]: JSON.stringify(data) });
        }
    
        // Redraws can overlap (e.g. loading saved state on join while the first sync event
        // arrives). Two overlapping redraws both create a piece for the same empty slot and one
        // gets orphaned, so it is never hidden again (e.g. after a reset). Run one at a time,
        // and redraw once more if a new one was requested mid-run.
        let redrawing = null;
        let redrawAgain = false;
        function updateVisuals() {
            soundForState();
            redrawAgain = true;
            if (!redrawing) {
                redrawing = (async () => {
                    try {
                        while (redrawAgain) {
                            redrawAgain = false;
                            await renderVisuals();
                            updateTurnBoard();
                        }
                    } finally {
                        redrawing = null;
                    }
                })();
            }
            return redrawing;
        }

        async function renderVisuals() {
            if (!state.piecesRoot) return;
    
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 7; c++) {
                    const cell = state.game.board[r][c];
                    const slot = state.slots[r][c];
                    const isWinCell = state.game.winningCells.some(([wr, wc]) => wr === r && wc === c);
                    
                    if(!slot) continue;
    
                    if (slot.sphere) slot.sphere.SetActive(false);
                    if (slot.redModel) slot.redModel.SetActive(false);
                    if (slot.yellowModel) slot.yellowModel.SetActive(false);
                    if (slot.greenModel) slot.greenModel.SetActive(false);
    
                    if (cell === 0) continue;
    
                    if (config.useCustomModels) {
                         if (isWinCell) {
                            if (!slot.greenModel) {
                                slot.greenModel = await createCustomPiece(state.piecesRoot, 'highlight', slot.pos);
                            }
                            if (slot.greenModel) slot.greenModel.SetActive(true);
                         } else {
                            if (cell === 1) {
                                if (!slot.redModel) {
                                    slot.redModel = await createCustomPiece(state.piecesRoot, 1, slot.pos);
                                }
                                if (slot.redModel) slot.redModel.SetActive(true);
                            }
                            if (cell === 2) {
                                if (!slot.yellowModel) {
                                    slot.yellowModel = await createCustomPiece(state.piecesRoot, 2, slot.pos);
                                }
                                if (slot.yellowModel) slot.yellowModel.SetActive(true);
                            }
                         }
                    } else {
                        if (!slot.sphere) {
                            // A flat round checker standing in the slot, with a darker raised ring in the middle
                            const disc = await createBanterObject(state.piecesRoot, BS.GeometryType.CylinderGeometry,
                                { radius: 0.044, height: 0.022 }, COLORS.empty, slot.pos, false, 1.0, `sphere_${slot.r}_${slot.c}`);
                            disc.GetComponent(BS.ComponentType.Transform).localEulerAngles = new BS.Vector3(90, 0, 0);
                            await disc.SetLayer(5);
                            slot.sphereRing = await createBanterObject(disc, BS.GeometryType.CylinderGeometry,
                                { radius: 0.03, height: 0.026 }, COLORS.empty, null, false, 1.0, `ring_${slot.r}_${slot.c}`);
                            slot.sphere = disc;
                        }
    
                        if (slot.sphere) {
                            slot.sphere.SetActive(true);
                            let pieceColor = (cell === 1) ? COLORS.red : COLORS.yellow;
                            if (isWinCell) {
                                pieceColor = COLORS.winHighlight;
                            }
                            const matType = BS.ComponentType.Material ?? BS.ComponentType.BanterMaterial;
                            const mat = slot.sphere.GetComponent(matType);
                            if (mat) mat.color = hexToVector4(pieceColor);
                            const ringMat = slot.sphereRing && slot.sphereRing.GetComponent(matType);
                            if (ringMat) ringMat.color = darker(pieceColor, 0.8);
                        }
                    }
                }
            }
        }
    
        async function checkForExistingState() {
            const key = `connect4_game_${config.instance}`;
            const scene = BS.BanterScene.GetInstance();
    
            const getProp = () => {
                const s = scene.spaceState;
                return (s.public && s.public[key]) || (s.protected && s.protected[key]);
            };
    
            let val = getProp();
    
            if (val) {
                try {
                    const data = JSON.parse(val);
                    state.game.loadState(data);
                    loadLastMove(data);
                    panel.load(data);
                    updateVisuals();
                } catch (e) {
                    console.error("Failed to parse connect4 state", e);
                }
            }
            startSounds();
        }
    
        function setupListeners() {
            const key = `connect4_game_${config.instance}`;
            BS.BanterScene.GetInstance().On("space-state-changed", e => {
                const changes = e.detail.changes;
                if (changes && changes.find(c => c.property === key)) {
                    const scene = BS.BanterScene.GetInstance();
                    const s = scene.spaceState;
                    const val = (s.public && s.public[key]) || (s.protected && s.protected[key]);
    
                    if (val) {
                        try {
                            console.log("Connect4: Received State Change -> Loading & Unlocking");
                            const data = JSON.parse(val);
                            state.game.loadState(data);
                            loadLastMove(data);
                            panel.load(data);
                            updateVisuals();
                            state.isSyncing = false;
                        } catch (e) { console.error(e); }
                    }
                }
            });
        }

        function showTurnNotice(text) { if (panel) panel.notice(text); }
        function updateTurnBoard() { if (panel) panel.update(); }

        let panel = null;
        // --- Game panel: turn, seats, Reset and Mute, seat locking, and switching off when far away ---
        // The same code is in each of the two-player board games (it started in Chess). It uses the
        // game's own `config`, `sounds`, `MUTE_KEY`, `headTracker` and `localUid`.
        //
        // Seats: each side can be claimed by one player, and then only they can move for it. A seat can
        // be taken over when its player has left the space, or has left their turn untouched for
        // `lockTimeout` seconds. Unclaimed sides can be moved by anyone. While a game is under way only
        // its seated players (or the space host) can reset it, unless a seat is empty or idle.
        //
        // Switching off: beyond `cullDistance` metres the game's root object is shrunk to nothing, and it
        // grows back on return. The panel isn't removed and built again (the app doesn't free everything
        // a deleted UI panel used, so that leaked memory each time), nor switched off (a BanterUI panel
        // loses its contents when switched off). Moves made meanwhile still arrive.
        //
        // opts: {
        //   title, key (space state key), root (GameObject), centre (world Vector3),
        //   sides: [{ id, label, bg, fg }]   id = the side value the game uses for turns,
        //   turn(): side id whose turn it is, or null when the game is over,
        //   status(): text for the header,
        //   resetFreely(): true when anyone may reset (nothing played yet, or the game is over),
        //   reset(): resets the game (and syncs it),
        //   getState(): the game's current state object, used when only the seats change,
        //   buttons: [{ text, color, onClick }]   extra buttons beside Reset,
        //   position: [x, y, z] default panel position relative to the root,
        //   scale: default panel scale (multiplied by config.scoreboardScale)
        // }
        function createGamePanel(opts) {
            const scene = BS.BanterScene.GetInstance();
            const P = { seats: {}, lastActionTime: 0, data: null, ui: null, building: null, culled: false, notice: '', noticeTimer: null };
            const v3 = a => Array.isArray(a) ? new BS.Vector3(...a) : a;

            const me = () => {
                const u = scene.localUser;
                return u && u.uid !== undefined ? { uid: String(u.uid), name: u.name || 'Player' } : null;
            };
            const present = uid => !!uid && ((scene.localUser && String(scene.localUser.uid) === String(uid)) || !!(scene.users && scene.users[uid]));
            // Idle: it is that side's turn and nothing has happened for lockTimeout seconds.
            const idle = side => {
                if (!(config.lockTimeout > 0) || opts.turn() !== side || !P.lastActionTime) return false;
                return Date.now() - P.lastActionTime > config.lockTimeout * 1000;
            };
            const free = side => { const s = P.seats[side]; return !s || !present(s.uid) || idle(side); };
            const isHost = () => {
                const m = me();
                if (!m) return false;
                if (scene.space && scene.space.owner && String(scene.space.owner.uid) === m.uid) return true;
                const uids = Object.keys(scene.users || {}).map(String).sort();
                return uids.length > 0 && uids[0] === m.uid;
            };

            // --- State ---
            // Adds the seats to an outgoing game state. Call for every state the game writes.
            function stamp(data) {
                data.seats = { ...P.seats };
                data.lastActionTime = Date.now();
                P.data = data;
                P.lastActionTime = data.lastActionTime;
                return data;
            }
            // Call with every game state loaded from the space.
            function load(data) {
                P.data = data || null;
                P.seats = (data && data.seats) || {};
                P.lastActionTime = (data && data.lastActionTime) || 0;
                update();
            }
            function writeSeats(seats) {
                P.seats = seats;
                const base = P.data || opts.getState();
                const data = stamp({ ...base, seats });
                scene.SetPublicSpaceProps({ [opts.key]: JSON.stringify(data) });
                update();
            }

            // --- Rules ---
            // True if the local player may move for `side`. Takes over an abandoned seat; otherwise
            // shows a notice and returns false when someone else holds it.
            function mayMove(side) {
                const seat = P.seats[side];
                if (!seat) return true;
                const m = me();
                if (m && String(seat.uid) === m.uid) return true;
                if (m && free(side)) {
                    const label = (opts.sides.find(s => s.id === side) || {}).label || side;
                    notice(`${label} was ${present(seat.uid) ? 'idle' : 'empty'} - seat taken`);
                    const seats = { ...P.seats, [side]: { uid: m.uid, name: m.name } };
                    for (const s of opts.sides) if (s.id !== side && seats[s.id] && String(seats[s.id].uid) === m.uid) seats[s.id] = null;
                    P.seats = seats; // the move that follows writes them
                    return true;
                }
                notice(`It is ${seat.name}'s turn`);
                return false;
            }
            function mayReset() {
                if (opts.resetFreely()) return true;
                const claimed = opts.sides.filter(s => P.seats[s.id]);
                if (claimed.length === 0) return true;
                const m = me();
                if (m && claimed.some(s => String(P.seats[s.id].uid) === m.uid)) return true;
                if (isHost()) return true;
                if (opts.sides.some(s => P.seats[s.id] && free(s.id))) return true;
                notice("Only the seated players can reset a game in progress");
                return false;
            }
            function clickSeat(side) {
                const m = me();
                if (!m) return notice("Could not find your user id");
                const seat = P.seats[side];
                const label = (opts.sides.find(s => s.id === side) || {}).label || side;
                if (seat && String(seat.uid) === m.uid) {
                    writeSeats({ ...P.seats, [side]: null });
                    notice(`You left ${label}`);
                } else if (!seat || free(side)) {
                    const seats = { ...P.seats, [side]: { uid: m.uid, name: m.name } };
                    for (const s of opts.sides) if (s.id !== side && seats[s.id] && String(seats[s.id].uid) === m.uid) seats[s.id] = null;
                    writeSeats(seats);
                    notice(`You took ${label}`);
                } else {
                    notice(`${label} is taken by ${seat.name}`);
                }
            }
            function clickReset() {
                if (!mayReset()) return;
                opts.reset();
                notice("Game reset");
            }

            // --- Panel ---
            function notice(text) {
                P.notice = text;
                clearTimeout(P.noticeTimer);
                P.noticeTimer = setTimeout(() => { P.notice = ''; update(); }, 3000);
                update();
            }
            function seatText(side) {
                const seat = P.seats[side.id];
                const m = me();
                if (!seat) return `${side.label}: [CLAIM]`;
                if (m && String(seat.uid) === m.uid) return `${side.label}: YOU [LEAVE]`;
                if (!present(seat.uid)) return `${side.label}: Left [TAKE]`;
                if (idle(side.id)) return `${side.label}: ${seat.name} (idle) [TAKE]`;
                return `${side.label}: ${seat.name}`;
            }
            function update() {
                const ui = P.ui;
                if (!ui || P.culled) return;
                try {
                    ui.status.text = opts.status();
                    ui.notice.text = P.notice;
                    if (ui.mute) ui.mute.text = sounds.muted ? "UNMUTE" : "MUTE";
                    const turn = opts.turn();
                    const m = me();
                    for (const side of opts.sides) {
                        const btn = ui.seatBtns[side.id];
                        const seat = P.seats[side.id];
                        btn.text = seatText(side);
                        let border = '#666666';
                        if (seat && !present(seat.uid)) border = '#e57373';
                        else if (seat && idle(side.id)) border = '#ffb300';
                        else if (turn === side.id) border = '#4CAF50';
                        else if (seat && m && String(seat.uid) === m.uid) border = '#2e7d32';
                        btn.SetStyles({ borderColor: border, borderWidth: turn === side.id ? '4px' : '2px' });
                    }
                } catch (e) { }
            }

            async function build() {
                if (config.hideUI || P.ui || P.building) return;
                P.building = (async () => {
                    const pos = config.scoreboardPosition && !config.scoreboardPosition.every(n => n === 0) ? config.scoreboardPosition : opts.position;
                    const mul = config.scoreboardScale || [1, 1, 1];
                    const base = opts.scale || 0.24;
                    const obj = await new BS.GameObject({
                        name: opts.title + "_Panel",
                        parent: opts.root,
                        localPosition: v3(pos),
                        localEulerAngles: v3(config.scoreboardRotation || [0, 0, 0]),
                        localScale: new BS.Vector3(base * mul[0], base * mul[1], base * mul[2])
                    }).Async();
                    const bb = await obj.AddComponent(new BS.BanterBillboard({ smoothing: 1, enableXAxis: false, enableYAxis: true }));
                    bb.enableXAxis = false;
                    const panel = await obj.AddComponent(new BS.BanterUI(new BS.Vector2(650, 270), false));
                    const clear = { backgroundColor: 'rgba(0,0,0,0)' };
                    const rootEl = panel.CreateVisualElement();
                    await rootEl.Async();
                    rootEl.SetStyles({
                        backgroundColor: 'rgba(15, 18, 26, 0.94)', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: '14px', paddingBottom: '14px', paddingLeft: '18px', paddingRight: '18px',
                        borderRadius: '16px', borderWidth: '3px', borderColor: 'rgba(80, 95, 125, 0.85)',
                        width: '100%', height: '100%'
                    });
                    if (rootEl.parent && rootEl.parent.SetStyles) rootEl.parent.SetStyles(clear);
                    const row = async (extra) => {
                        const r = panel.CreateVisualElement(rootEl);
                        await r.Async();
                        r.SetStyles({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', ...clear, ...extra });
                        return r;
                    };
                    const label = async (parent, text, styles) => {
                        const l = panel.CreateLabel(undefined, parent);
                        await l.Async();
                        l.text = text;
                        l.SetStyles({ ...clear, ...styles });
                        return l;
                    };
                    const button = async (parent, text, styles, onClick) => {
                        const b = panel.CreateButton(parent);
                        await b.Async();
                        if (b.parent && b.parent.SetStyles) b.parent.SetStyles({ ...clear, backgroundImage: 'none' });
                        b.text = text;
                        b.SetStyles({ color: 'white', fontWeight: 'bold', borderRadius: '8px', borderWidth: '0px', backgroundImage: 'none', ...styles });
                        b.OnClick(() => { try { onClick(); } catch (e) { console.error(opts.title + ": button error", e); } });
                        return b;
                    };

                    const header = await row({ marginBottom: '4px' });
                    await label(header, opts.title.toUpperCase(), { color: '#f0f0f0', fontSize: '26px', fontWeight: 'bold', marginRight: '10px' });
                    const status = await label(header, '', { color: '#ffcc00', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', flexGrow: '1' });

                    const seatsRow = await row({ marginTop: '6px', marginBottom: '6px' });
                    const seatBtns = {};
                    for (const side of opts.sides) {
                        seatBtns[side.id] = await button(seatsRow, '', {
                            backgroundColor: side.bg, color: side.fg, fontSize: '20px',
                            paddingTop: '10px', paddingBottom: '10px', paddingLeft: '10px', paddingRight: '10px',
                            borderWidth: '2px', borderColor: '#666666', flexGrow: '1', flexBasis: '0', marginLeft: '6px', marginRight: '6px'
                        }, () => clickSeat(side.id));
                    }

                    const actions = await row({});
                    const small = { fontSize: '18px', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '18px', paddingRight: '18px', marginRight: '10px' };
                    await button(actions, "RESET", { backgroundColor: '#c62828', ...small }, clickReset);
                    for (const extra of (opts.buttons || [])) await button(actions, extra.text, { backgroundColor: extra.color || '#1565c0', ...small }, extra.onClick);
                    const mute = await button(actions, sounds.muted ? "UNMUTE" : "MUTE", { backgroundColor: '#37474f', ...small }, () => {
                        sounds.muted = !sounds.muted;
                        try { localStorage.setItem(MUTE_KEY, sounds.muted ? '1' : '0'); } catch (e) { }
                        update();
                    });
                    const noticeLabel = await label(actions, '', { color: '#ff7043', fontSize: '16px', textAlign: 'right', flexGrow: '1' });

                    P.ui = { obj, status, seatBtns, mute, notice: noticeLabel };
                    update();
                })().catch(e => console.warn(opts.title + ": could not build the panel", e)).finally(() => {
                    P.building = null;
                });
                return P.building;
            }

            // --- Switching off when far away ---
            function setCulled(culled) {
                P.culled = culled;
                try {
                    opts.root.GetComponent(BS.ComponentType.Transform).localScale = culled ? new BS.Vector3(0, 0, 0) : config.boardScale;
                } catch (e) { console.warn(opts.title + ": could not switch the game on/off", e); }
                if (!culled) update();
            }
            function checkDistance() {
                const head = headTracker();
                const p = head.markerPos || head.posePos;
                const c = opts.centre;
                if (!p || !c) return; // position not known yet (it arrives once the player moves)
                const d = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z);
                // Off past cullDistance, on again a metre inside it, so it doesn't flicker at the edge.
                const off = P.culled ? d > config.cullDistance - 1 : d > config.cullDistance;
                if (off !== P.culled) setCulled(off);
            }

            // --- Start ---
            if (config.cullDistance > 0) setInterval(checkDistance, 1000);
            setInterval(update, 10000); // so idle and departed players show up
            scene.On("user-joined", () => update());
            // Frees the seats of a player who leaves. Only one player still here (the lowest uid) writes it.
            scene.On("user-left", e => {
                const u = e && e.detail;
                const left = u && (u.uid ?? (u.user && u.user.uid));
                const m = me();
                if (!left || !m || m.uid === String(left)) return;
                const held = opts.sides.filter(s => P.seats[s.id] && String(P.seats[s.id].uid) === String(left));
                if (held.length === 0) return update();
                const others = Object.keys(scene.users || {}).map(String).filter(x => x !== String(left));
                if (!others.includes(m.uid)) others.push(m.uid);
                if (others.sort()[0] !== m.uid) return update();
                const seats = { ...P.seats };
                for (const s of held) seats[s.id] = null;
                writeSeats(seats);
            });

            const api = { build, stamp, load, mayMove, notice, update, clickSeat, clickReset };
            // For debugging from the browser console: window.__gamePanels[key].debug()
            (window.__gamePanels = window.__gamePanels || {})[opts.key] = {
                ...api,
                debug: () => ({ culled: P.culled, seats: P.seats, lastActionTime: P.lastActionTime, turn: opts.turn(),
                    ui: P.ui && { status: P.ui.status.text, notice: P.ui.notice.text, seats: Object.fromEntries(Object.entries(P.ui.seatBtns).map(([k, b]) => [k, b.text])) } })
            };
            return api;
        }

        setupScene();
    };

    // --- Check for BS availability ---
    if (window.BS) {
        initGame();
    } else {
        window.addEventListener("unity-loaded", initGame);
        window.addEventListener("bs-loaded", initGame);
    }

})();