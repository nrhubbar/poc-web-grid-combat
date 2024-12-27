const game = document.getElementById("game");

// const BOARD_HEIGHT = 3;
// const BOARD_WIDTH = 3;
const BOARD_SIZE = 5;

class Cell {
    constructor(soldiers = [], terrain = TERRAIN.PLAIN) {
        this.soldiers = soldiers;
        this.terrain = terrain;
    }

    getStyleClasses() {
        let classes = [this.terrain.style];
        if (this.soldiers.length > 0) {
            return [
                ...classes,
                ...this.soldiers[0].getStyleClasses(),
            ];
        }

        return classes;
    }

    getPlayer() {
        if (this.soldiers.length > 0) {
            return this.soldiers[0].player;
        }

        return null;
    }

    static swapAllSoldiers(fromCell, toCell) {
        toCell.soldiers = fromCell.soldiers;
        fromCell.soldiers = [];
    }

    killSoldiers() {
        this.soldiers = [];
    }
}

class Soldier {
    constructor(player, attack = 1, defence = 1, movement = 1) {
        this.player = player;
        this.attack = attack;
        this.defence = defence;
        this.movement = movement;
    }

    getStyleClasses() {
        const playerStyle = this.player === PLAYERS.BLUE ? "prussian-blue" : this.player === PLAYERS.GREEN ? "forest-green" : "";
        return [playerStyle];
    }
}

function generateInitialBoard(size) {
    const grid = {};
      for (let q = -size + 1; q < size; q++) {
        grid[q] = {};
        for (let r = Math.max(-size + 1, -q - size + 1); r < Math.min(size, -q + size); r++) {
            grid[q][r] = new Cell();
        }
      }
      return grid;
}

const PLAYERS = Object.freeze({
    BLUE: "BLUE",
    GREEN: "GREEN",
});
const TURN_STATES = Object.freeze({
    SELECTING_SOLDIER: "SELECTING_SOLDIER",
    SELECTING_MOVE: "SELECTING_MOVE",
});
const TERRAIN = Object.freeze({
    PLAIN: {name: "PLAIN", style: "terrain-plain"},
    FOREST: {name: "FOREST", style: "terrain-forest"},
    MOUNTAIN: {name: "MOUNTAIN", style: "terrain-mountain"},
});


let currentState = {
    turnState: TURN_STATES.SELECTING_SOLDIER,
    currentPlayer: PLAYERS.BLUE,
    logs: [],
    grid: generateInitialBoard(BOARD_SIZE),
};

// Initialize the soldiers
currentState.grid[-(BOARD_SIZE - 1)][0].soldiers.push(new Soldier(PLAYERS.BLUE));
currentState.grid[(BOARD_SIZE - 1)][0].soldiers.push(new Soldier(PLAYERS.GREEN));
currentState.grid[1][1].terrain = TERRAIN.FOREST;
currentState.grid[-1][1].terrain = TERRAIN.MOUNTAIN;

function renderBoard() {

    const title = `
        <div>
            <h1 id="title"> Grid Getters </h1>
        </div>
    `;
    const turnTracker = `
        <div>
            <h3 id="turn-tracker"> Current Turn: ${currentState.currentPlayer}</h3>
        </div>
    `;

    const intSortFunction = (a, b) => a - b;

    const boardHtml = Object.keys(currentState.grid).toSorted(intSortFunction).map((q) => {
        const innerRow = Object.keys(currentState.grid[q]).toSorted(intSortFunction).map((r) => {
            const cell = currentState.grid[q][r];
            return `
                <div class="cell" data-q="${q}" data-r="${r}" id="cell-wrapper-${q}-${r}">
                    <div class='${cell.getStyleClasses().join(" ")}'></div>
                </div>
            `;
        }).join("");

        const offset = Math.abs(BOARD_SIZE + 1) * 31;
        return `
            <div class="row" style="margin-left:${offset}px">
                ${innerRow}
            </div>
        `;
    }).join("");
    const board = `
        <div id="board" class="board" >
            ${boardHtml}
        </div>
    `;

    const logs = `
        <h3> Events: </h3>
        <div class="log-container">
            ${currentState.logs.map(message => `<div class="logs"> ${message}</div>`).join("")}
        </div>
    `

    game.innerHTML = `
        ${title}
        ${turnTracker}
        ${board}
        ${logs}
    `;
    
    Array.from(document.querySelectorAll(".cell")).forEach(cell => {
        const q = parseInt(cell.dataset.q);
        const r = parseInt(cell.dataset.r);
        cell.addEventListener("click", () => handleCellClick(q, r));
    });
    }

function handleCellClick(q, r) {
    if (currentState.turnState === TURN_STATES.SELECTING_SOLDIER) {
        const cell = currentState.grid[q][r];

        if (cell.getPlayer() !== currentState.currentPlayer) return; // Only allow current player's turn

        // Find valid moves
        const moves = [
             [q + 1, r], [q + 1, r - 1], [q, r - 1],
             [q - 1, r], [q - 1, r + 1], [q, r + 1],
        ];

        moves.filter(([_q, _r]) => { // if move is inbounds
            const _s = -_q - _r;
            
            const isQInbounds = Math.abs(_q) < BOARD_SIZE;
            const isRInbounds = Math.abs(_r) < BOARD_SIZE;
            const isSInbounds = Math.abs(_s) < BOARD_SIZE;
                
            return isQInbounds && isRInbounds && isSInbounds;
        }).forEach(([_q, _r]) => {
            const target = currentState.grid[_q][_r];

            if (!target.getPlayer()) {
                document.getElementById(`cell-wrapper-${_q}-${_r}`)
                    .classList
                    .add("empty-move");
            } else if (target.getPlayer() !== currentState.currentPlayer) {
                document.getElementById(`cell-wrapper-${_q}-${_r}`)
                    .classList
                    .add("attack-move");
            }
        });
        currentState = {
            ...currentState,
            turnState: TURN_STATES.SELECTING_MOVE,
            sourceCell: [q, r],
            validMoves: moves,
        };
    } else if (currentState.turnState === TURN_STATES.SELECTING_MOVE) {
        if (currentState.validMoves.filter(cell => cell[0] == q && cell[1] == r).length == 0) {
            console.log("Attempting to move to illegal square")
            // todo: Clear sourceCell, validMoves, and go back to SELECTING_SOLDIER
            return;
        }
        
        if (!currentState.grid[q][r].getPlayer()) {
            Cell.swapAllSoldiers(
                currentState.grid[currentState.sourceCell[0]][currentState.sourceCell[1]], 
                currentState.grid[q][r]);

            currentState = {
                ...currentState,
                logs: [
                    `${currentState.currentPlayer} moved to: [${q}, ${r}]`,
                    ...currentState.logs,
                ],
                currentPlayer: getNextTurn(currentState.currentPlayer),
                turnState: TURN_STATES.SELECTING_SOLDIER,
            };
        } else if (currentState.grid[q][r].getPlayer() != currentState.currentPlayer) {
            currentState = {
                ...currentState,
                logs: [
                    combat(currentState.sourceCell[0], currentState.sourceCell[1], q, r),
                    ...currentState.logs,
                ],
                currentPlayer: getNextTurn(currentState.currentPlayer),
                turnState: TURN_STATES.SELECTING_SOLDIER,
            };
        }
        renderBoard();
    }
}

function combat(fromRow, fromCol, toRow, toCol) { // TODO: Make this method have less side effects
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll === 1 || roll === 2) {
        // Defender wins
        const message = `${currentState.grid[toRow][toCol].getPlayer()} repelled the attack, Soldier in [${fromRow}, ${fromCol}] eliminated.`;
        currentState.grid[fromRow][fromCol].killSoldiers();
        return message;
    } else if (roll === 3 || roll === 4) {
        // Bounce, no change
        return "Bounce! Both soldiers live.";
    } else if (roll === 5 || roll === 6) {
        // Attacker wins
        const message = `${currentState.grid[fromRow][fromCol].getPlayer()} won the attack, Soldier in [${toRow}, ${toCol}] eliminated.`;
        currentState.grid[toRow][toCol].killSoldiers();
        Cell.swapAllSoldiers(currentState.grid[fromRow][fromCol],
            currentState.grid[toRow][toCol]
        );
        return message;
    }
}

function getNextTurn(currentPlayer) {
    return currentPlayer === PLAYERS.BLUE ? PLAYERS.GREEN : PLAYERS.BLUE;
}

renderBoard();