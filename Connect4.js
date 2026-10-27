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
        resetPosition: [0, -0.4, 0], // Default below board
        resetRotation: [0, 0, 0],
        resetScale: [1, 1, 1],
        instance: window.location.href.split('?')[0],
        hideUI: false,
        turnCooldown: 5, // Seconds before the same person can move for the other side; 0 = off
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
                hideBoard: ['hide-board'],
                useCustomModels: ['use-custom-models'],
                addLights: ['add-lights'],
                useAOBaking: ['use-ao-baking'],
                boardSize: ['board-size'],
                piecesOpacity: ['pieces-opacity'],
                scoreboardPosition: ['scoreboard-position'],
                scoreboardRotation: ['scoreboard-rotation'],
                scoreboardScale: ['scoreboard-scale'],
                resetPosition: ['reset-position'],
                resetRotation: ['reset-rotation'],
                resetScale: ['reset-scale'],
                passPosition: ['pass-position'],
                passRotation: ['pass-rotation'],
                passScale: ['pass-scale']
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

        config.resetScale = parseVector3(getParam('resetScale'), config.resetScale);
        config.resetPosition = parseVector3(getParam('resetPosition'), config.resetPosition);
        config.resetRotation = parseVector3(getParam('resetRotation'), config.resetRotation);
        config.scoreboardPosition = parseVector3(getParam('scoreboardPosition'), null);
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
        config.resetPosition = new BS.Vector3(...config.resetPosition);
        config.resetRotation = new BS.Vector3(...config.resetRotation);
        config.resetScale = new BS.Vector3(...config.resetScale);

        const COLORS = {
            board: '#0055AA',    // Classic Blue Board
            red: '#D50000',      // Red Piece
            yellow: '#ffff00ff',   // yellow Piece
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

        // Puts a text label on a button's face (same approach as Go's buttons). `w` and `h` are the
        // face size in metres; text is sized to fit it. `pos`/`rot` place the label on that face.
        async function addButtonLabel(btn, text, w, h, pos, rot) {
            const label = await new BS.GameObject("Label").Async();
            await label.SetParent(btn, false);
            const lt = await label.AddComponent(new BS.Transform());
            lt.localPosition = pos;
            lt.localEulerAngles = rot;
            await label.AddComponent(new BS.BanterText(
                text, new BS.Vector4(1, 1, 1, 1), BS.HorizontalAlignment.Center, BS.VerticalAlignment.Center,
                h * 5, false, false, new BS.Vector2(w * 10, h * 10)
            ));
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
    
                for (let i = 0; i <= cols; i++) {
                    const barX = (startX - (gapX / 2)) + (i * gapX);
                    const centerY = startY + ((rows - 1) * gapY) / 2;
                    await createBanterObject(frameRoot, BS.GeometryType.BoxGeometry,
                        { width: barWidth, height: gridHeight, depth: frameDepth },
                        COLORS.board, new BS.Vector3(barX, centerY, 0));
                }
    
                const gridWidth = (cols * gapX) + barWidth;
                const centerX = startX + ((cols - 1) * gapX) / 2;
                for (let i = 0; i <= rows; i++) {
                    const barY = (startY - (gapY / 2)) + (i * gapY);
                    await createBanterObject(frameRoot, BS.GeometryType.BoxGeometry,
                        { width: gridWidth, height: barWidth, depth: frameDepth },
                        COLORS.board, new BS.Vector3(centerX, barY, 0));
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
    
            // With hideUI the reset button is invisible but still clickable, with its label showing (as in Go)
            const resetBtn = await createBanterObject(state.root, BS.GeometryType.BoxGeometry,
                { width: 0.2, height: 0.1, depth: 0.05 }, '#333333', config.resetPosition, true, config.hideUI ? 0.0 : 1.0);
            let rt = resetBtn.GetComponent(BS.ComponentType.Transform);
            rt.localEulerAngles = config.resetRotation;
            rt.localScale = config.resetScale;
            await addButtonLabel(resetBtn, "RESET", 0.2, 0.1, new BS.Vector3(0, 0, 0.030), new BS.Vector3(0, 180, 0));

            resetBtn.On('click', () => {
                console.log("Connect4: Reset clicked");
                state.game.reset();
                syncState();
            });
    
            await createTurnBoard(state.root, config.scoreboardPosition || [0, 0.85, 0], config.scoreboardRotation || [0, 0, 0], config.scoreboardScale || [1, 1, 1], 0.7, 0.14, false);
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
                console.log("Connect4: Locking Input & Sending Move...");
                state.isSyncing = true;
                if (turnOnCooldown(state.game.currentPlayer)) { state.isSyncing = false; return; }
                syncState(stampMove(nextState, state.game.currentPlayer));
            }
        }
    
        // --- Turn cooldown ---
        // Stops one person from taking both sides' turns by accident (a double click, or moving again
        // before the other player has had a chance). After you move, if it is now the other side's
        // turn, you must wait `turnCooldown` seconds before you can move for them. Someone playing on
        // their own can still play both sides; they just wait. Extra turns for the same side are not
        // affected. The time is only ever compared on the mover's own clock.
        const turnGuard = { lastMove: null, notice: '', noticeTimer: null, texts: [] };

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

        function showTurnNotice(text) {
            turnGuard.notice = text;
            clearTimeout(turnGuard.noticeTimer);
            turnGuard.noticeTimer = setTimeout(() => {
                turnGuard.notice = '';
                updateTurnBoard();
            }, 2500);
            updateTurnBoard();
        }

        function updateTurnBoard() {
            const text = turnGuard.notice || turnStatusText();
            turnGuard.texts.forEach(t => { t.text = text; });
        }

        // A small sign showing whose turn it is. Not created when hideUI is on. `twoSided` puts the
        // text on both faces, for table games played from both sides.
        async function createTurnBoard(parent, pos, rot, scale, w, h, twoSided) {
            if (config.hideUI) return;
            const v3 = a => Array.isArray(a) ? new BS.Vector3(...a) : a;
            const board = await new BS.GameObject("TurnBoard").Async();
            await board.SetParent(parent, false);
            const t = await board.AddComponent(new BS.Transform());
            t.localPosition = v3(pos);
            t.localEulerAngles = v3(rot);
            t.localScale = v3(scale);
            await board.AddComponent(new BS.BanterGeometry(BS.GeometryType.BoxGeometry, null, w, h, 0.02));
            const shader = config.lighting === 'lit' ? "Standard" : "Unlit/Diffuse";
            await board.AddComponent(new BS.BanterMaterial(shader, "", new BS.Vector4(0.96, 0.96, 0.86, 1), BS.MaterialSide.Front, false));

            const faces = twoSided ? [[0.012, 180], [-0.012, 0]] : [[0.012, 180]];
            for (const [z, yRot] of faces) {
                const textObj = await new BS.GameObject("TurnText").Async();
                await textObj.SetParent(board, false);
                const tt = await textObj.AddComponent(new BS.Transform());
                tt.localPosition = new BS.Vector3(0, 0, z);
                tt.localEulerAngles = new BS.Vector3(0, yRot, 0);
                turnGuard.texts.push(await textObj.AddComponent(new BS.BanterText(
                    "", new BS.Vector4(0, 0, 0, 1), BS.HorizontalAlignment.Center, BS.VerticalAlignment.Center,
                    h * 3, false, true, new BS.Vector2(w * 10, h * 10)
                )));
            }
            updateTurnBoard();
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
            const data = newState || state.game.getState();
            BS.BanterScene.GetInstance().SetPublicSpaceProps({ [key]: JSON.stringify(data) });
        }
    
        // Redraws can overlap (e.g. loading saved state on join while the first sync event
        // arrives). Two overlapping redraws both create a piece for the same empty slot and one
        // gets orphaned, so it is never hidden again (e.g. after a reset). Run one at a time,
        // and redraw once more if a new one was requested mid-run.
        let redrawing = null;
        let redrawAgain = false;
        function updateVisuals() {
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
                            const spherePiece = await createBanterObject(state.piecesRoot, BS.GeometryType.SphereGeometry,
                                { radius: 0.045 }, COLORS.empty, slot.pos, false, 1.0, `sphere_${slot.r}_${slot.c}`);
                            const pt = spherePiece.GetComponent(BS.ComponentType.Transform);
                            pt.localScale = new BS.Vector3(1, 1, 0.25);
                            await spherePiece.SetLayer(5);
                            slot.sphere = spherePiece;
                        }
    
                        if (slot.sphere) {
                            slot.sphere.SetActive(true);
                            let pieceColor = (cell === 1) ? COLORS.red : COLORS.yellow;
                            if (isWinCell) {
                                pieceColor = COLORS.winHighlight;
                            }
                            const mat = slot.sphere.GetComponent((BS.ComponentType.Material ?? BS.ComponentType.BanterMaterial));
                            if (mat) mat.color = hexToVector4(pieceColor);
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
                    updateVisuals();
                } catch (e) {
                    console.error("Failed to parse connect4 state", e);
                }
            }
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
                            updateVisuals();
                            state.isSyncing = false;
                        } catch (e) { console.error(e); }
                    }
                }
            });
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