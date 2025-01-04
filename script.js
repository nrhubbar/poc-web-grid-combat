const game = document.getElementById("game");

const intSortFunction = (a, b) => a - b;

// const BOARD_HEIGHT = 3;
// const BOARD_WIDTH = 3;
const BOARD_SIZE = 5;

class Coordinates {
    constructor(q, r) {
        this.q = q;
        this.r = r;
        this.s = -q - r;
    }

    isInbounds() {
        const isQInbounds = Math.abs(this.q) < BOARD_SIZE;
        const isRInbounds = Math.abs(this.r) < BOARD_SIZE;
        const isSInbounds = Math.abs(this.s) < BOARD_SIZE;
            
        return isQInbounds && isRInbounds && isSInbounds;
    }

    getNeighbors() {
        return [
            new Coordinates(this.q + 1, this.r), new Coordinates(this.q + 1, this.r - 1), new Coordinates(this.q, this.r - 1),
            new Coordinates(this.q - 1, this.r), new Coordinates(this.q - 1, this.r + 1), new Coordinates(this.q, this.r + 1),
        ];
    }

    toString() {
        return `[${this.q}, ${this.r}]`;
    }

    equals(other) {
        if (!other) {
            return false;
        }

        return other.q == this.q && other.r == this.r && other.s == this.s;
    }
}

class Attack {

    constructor(attack, attackRollModifier) {
        this.attack = attack;
        this.attackRollModifier = attackRollModifier;
    }

    toString() {
        return JSON.stringify(this);
    }

    static sumAttack() {
        return (acc, val) => {
            return new Attack(acc.attack + val.attack, 
                acc.attackRollModifier + val.attackRollModifier);
        };
    }
}

class Defence {

    constructor(defence, defenceRollModifier) {
        this.defence = defence;
        this.defenceRollModifier = defenceRollModifier;
    }

    toString() {
        return JSON.stringify(this);
    }

    static sumDefence() {
        return (acc, val) => {
            return new Defence(acc.defence + val.defence, 
                acc.defenceRollModifier + val.defenceRollModifier);
        };
    }
}

class City {
    constructor(name, player) {
        this.name = name;
        this.player = player;
    }
}

class Cell {
    constructor(soldiers = [], terrain = TERRAIN.PLAIN, fortification = FORTIFICATION.NONE, city) {
        this.soldiers = soldiers;
        this.terrain = terrain;
        this.fortification = fortification;
        this.city = city;
        this.isLegalMove = false;
        this.isLegalInvasion = false;
    }

    /**
     * Return the inner html for this cell.
     */
    getBoardContent(shouldCascadeSoldiers) {
        let cityContent = "";
        if (this.city) {
            cityContent = `
                <div class="city">
                    ${this.city.name}
                </div>
            `;
        }

        let soldierContent = "";
        if (this.soldiers && this.soldiers.length === 1) { // If just 1 soldier, show that soldier
            soldierContent = `
                <div class="soldiers">
                    <div class="soldier ${this.soldiers[0].getStyleClasses()}">
                        ${this.soldiers[0].attack}-${this.soldiers[0].defence}-${this.soldiers[0].movement}
                    </div>
                </div>
            `;
        } else if (this.soldiers && this.soldiers.length > 1) { // If there are multiple soldiers, display a sum of Attack and Defence
            soldierContent = `
                <div class="soldiers">
                    <div class="soldier ${this.soldiers[0].getStyleClasses()}">
                        ${this.soldiers.map(s => s.attack).reduce((acc, val) => acc + val, 0)}-${this.soldiers.map((s) => s.defence).reduce((acc, val) => acc + val, 0)}
                    </div>
                </div>
            `;
        }


        

        return `
            <div class="${this.terrain.style} ${this.fortification.style}">
                ${soldierContent ? soldierContent : cityContent}
            </div>
        `;
    }

    getCellInfoContent() {
        let cityContent = "";
        if (this.city) {
            cityContent = `
                <div class="city-info">
                    ${this.city.name}
                </div>
            `;
        }
        const terrainContent = `
            <div class="terrain-info">
                Type: ${this.terrain.name}
                Movement Points: ${this.terrain.movement}
                Attack Roll Modifier: ${this.terrain.attackRollModifier}
                Defence Roll Movdifier: ${this.terrain.defenceRollModifier}
            </div>
        `;
        const fortificationContent = `
            <div class="fortification-info">
                Level: ${this.fortification.name}
                Attack Roll Modifier: ${this.fortification.attackRollModifier}
                Defence Roll Movdifier: ${this.fortification.defenceRollModifier}
            </div>
        `;
        const soldierContent = `
            <div class="soldier-info-container">
                ${
                    this.soldiers.map((soldier) => {
                        return `
                            <div class="soldier-info clickable ${soldier.getStyleClasses()}" data-soldier-id="${soldier.id}">
                               ${soldier.attack}-${soldier.defence}-${soldier.movement}
                            </div>
                        `;
                    }).join("")
                }
            </div>
        `;
        return `
            ${cityContent}
            ${terrainContent}
            ${fortificationContent}
            ${soldierContent}
        `;
    }

    canPlace(soldier) {
        if (!this.city) {
            return false;
        }

        return soldier.player === this.city.player;
    }

    getPlayer() {
        if (this.soldiers.length > 0) {
            return this.soldiers[0].player;
        }

        return null;
    }

    killSoldiers() {
        this.soldiers = [];
    }

    getMoves(coordinate) {
        const allMoves = this.soldiers.map(soldier => soldier.getMoves(coordinate)).flatMap(x => x);

        const uniqueMoves = new Set(allMoves);

        return [...uniqueMoves];
    }

    getTargets(coordinate) {
        const allTargets = this.soldiers.map(soldier => soldier.getTargets(coordinate)).flatMap(x => x);

        const uniqueTargets = new Set(allTargets);

        return [...uniqueTargets];
    }

    getAttack() {
        const soldierAttack = this.soldiers
            .map(soldier => soldier.getAttack())
            .reduce(Attack.sumAttack(), new Attack(0, 0));
        
        return new Attack(soldierAttack.attack, soldierAttack.attackRollModifier 
            + this.terrain.attackRollModifier 
            + this.fortification.attackRollModifier);
    }

    getDefence() {
        const soldierDefence = this.soldiers
            .map(soldier => soldier.getDefence())
            .reduce(Defence.sumDefence(), new Defence(0, 0));
        
        return new Defence(soldierDefence.defence, soldierDefence.defenceRollModifier 
            + this.terrain.defenceRollModifier 
            + this.fortification.defenceRollModifier);
    }

    static swapAllSoldiers(fromCell, toCell) {
        fromCell.soldiers.forEach(soldier => soldier.hasMovedThisTurn = true);

        toCell.soldiers = fromCell.soldiers;
        fromCell.soldiers = [];
    }

    get moveStyle() {
        return this.isLegalMove ? "empty-move" : "";
    }

    get invasionStyle() {
        return this.isLegalInvasion ? "attack-move" : "";
    }

    resetCellStyle() {
        this.isLegalMove = false;
        this.isLegalInvasion = false;
    }
}

class Soldier {

    static #GLOBAL_SOLDIER_ID = 0;

    #movement;
    #attackRange
    
    constructor(player, attack = 1, defence = 1, movement = 4, attackRollModifier = 0, defenceRollModifier = 0, attackRange = 2) {
        this.player = player;
        this.attack = attack;
        this.defence = defence;
        this.#movement = movement;
        this.attackRollModifier = attackRollModifier;
        this.defenceRollModifier = defenceRollModifier;
        this.hasMovedThisTurn = false; // TODO: This is just a simple flag, we may want to replace this with a "Plan Moves/Commit Moves" process.
        this.hasAttackedThisTurn = false; // TODO: This is just a simple flag, we may want to replace this with a "Plan Moves/Commit Moves" process.
        this.id = Soldier.#GLOBAL_SOLDIER_ID++;
        this.#attackRange = attackRange;
    }

    getStyleClasses() {
        const playerStyle = this.player === PLAYERS.BLUE ? "prussian-blue" : this.player === PLAYERS.GREEN ? "forest-green" : "";
        return [playerStyle];
    }

    getAttack() {
        return new Attack(this.attack, this.attackRollModifier);
    }

    getDefence() {
        return new Defence(this.defence, this.defenceRollModifier);
    }

    getMoves(coordinate, depthRemaining = this.movement) {

        let coordinates = [];
        if (depthRemaining < 0) {
            coordinates = [];
        } else if (depthRemaining == 0) {
            coordinates = [coordinate]
        } else {
            
            const allMoves = coordinate.getNeighbors()
                .filter((_coordinate) => { // if move is inbounds
                    return _coordinate.isInbounds();
                
                }).filter((_coordinate) => {
                    // TODO: This is a hack, to delay having to handle multiple soldier in a cell
                    // We want to support this eventually, but I don't know how it should render yet
                    // This logic enables the current play to move to empty cells, or enemy cells
                    return currentState.currentPlayer != currentState.grid[_coordinate.q][_coordinate.r].getPlayer();
                }).map((_coordinate) => {
                        const terrainMovementCost = currentState.grid[_coordinate.q][_coordinate.r].terrain.movement;
                        return this.getMoves(_coordinate, depthRemaining - terrainMovementCost)
                })
                .filter(x => x.length > 0)
                .flatMap(x => x);

            coordinates = allMoves;
        }

        return coordinates;

    }

    getTargets(coordinate) {
        return this.getMoves(coordinate, this.attackRange);
    }

    get movement() {
        if (this.hasMovedThisTurn) {
            return 0;
        }

        return this.#movement;
    }

    get attackRange() {
        if (this.hasAttackedThisTurn) {
            return 0;
        }

        return this.#attackRange
    }
}

class Move {
    constructor(sourceCoordinate, targetCoordinate, soldiers) {
        this.sourceCoordinate = sourceCoordinate;
        this.targetCoordinate = targetCoordinate;
        this.soldiers = soldiers;
    }
}

class Invasion {
    constructor(sourceCoordinates, targetCoordinate, attackingSoldiers) {
        this.sourceCoordinates = sourceCoordinates;
        this.targetCoordinate = targetCoordinate;
        this.attackingSoldiers = attackingSoldiers;
    }

    addNewAttacker(sourceCoordinate, attackingSoldiers) {
        this.sourceCoordinates.push(sourceCoordinate);
        this.attackingSoldiers = [
            ...this.attackingSoldiers,
            ...attackingSoldiers,
        ];
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
    PLACE_REINFORCEMENTS: "PLACE_REINFORCEMENTS",

    MOVEMENT_SELECTING_CELL: "MOVEMENT_SELECTING_CELL",
    MOVEMENT_SELECTING_SOLDIER: "MOVEMENT_SELECTING_SOLDIER",
    SELECTING_MOVE: "SELECTING_MOVE",

    COMBAT_SELECTING_CELL: "COMBAT_SELECTING_CELL",
    COMBAT_SELECTING_SOLDIER: "COMBAT_SELECTING_SOLDIER",
    SELECTING_COMBAT: "SELECTING_COMBAT",
});
const TERRAIN = Object.freeze({
    PLAIN: {name: "PLAIN", style: "terrain-plain", movement: 1, attackRollModifier: 0, defenceRollModifier: 0},
    FOREST: {name: "FOREST", style: "terrain-forest", movement: 2, attackRollModifier: 0, defenceRollModifier: 1},
    MOUNTAIN: {name: "MOUNTAIN", style: "terrain-mountain", movement: 4, attackRollModifier: -1, defenceRollModifier: 1},
});
const FORTIFICATION = Object.freeze({
    NONE: {name: "NONE", style: "none-fortification", attackRollModifier: 0, defenceRollModifier: 0},
    TRENCHES: {name: "TRENCHES", style: "trenches-fortification", attackRollModifier: 0, defenceRollModifier: 1},
    FORTRESS: {name: "FORTRESS", style: "fortress-fortification", attackRollModifier: 0, defenceRollModifier: 2},
});

const COMBAT_OUTCOMES = Object.freeze({
    /**
     * All Attacking units are eliminated.
     */
    ATTACKER_ELIMINATED: "ATTACKER_ELIMINATED",
    /**
     * Attacker must lose Attack strength "at least equal" to the defence strength of the defending units.
     * i.e. If the defence has 5pts, and the attacker has 3 units each with 3 attack, then the attacker loses 2 units.
     */
    ATTACKER_ATTRITION: "ATTACKER_ATTRITION",
    /**
     * Attacker must retreat one hex, or lose unit with the largest Attack Strength, units that retreat are demoralized.
     */
    ATTACKER_DEMORALIZED: "ATTACKER_DEMORALIZED",
    /**
     * Attacker suffers "ATTACKER_DEMORALIZED", Defender suffers "DEFENDER_DEMORALIZED", the result is applied to the defender first.
     */
    BOTH_DEMORALIZED: "BOTH_DEMORALIZED",
    /**
     * Devender must retreast one hex, or lose unit with the highest Defence Strength, units that retreat are demoarlized.
     */
    DEFENDER_DEMORALIZED: "DEFENDER_DEMORALIZED",
    /**
     * Defender eliminated, BUT attacker must lose attack strength "at least equal" to the defence strength.
     */
    DEFENDER_EXCHANGE: "DEFENDER_EXCHANGE",
    /**
     * All defending units are eliminated.
     */
    DEFENDER_ELIMINATED: "DEFENDER_ELIMINATED",
});
const COMBAT_RESULTS_BY_ODDS = Object.freeze({
    0: [COMBAT_OUTCOMES.ATTACKER_ELIMINATED, COMBAT_OUTCOMES.ATTACKER_ELIMINATED, COMBAT_OUTCOMES.ATTACKER_ATTRITION, COMBAT_OUTCOMES.ATTACKER_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_DEMORALIZED],
    1: [COMBAT_OUTCOMES.ATTACKER_ELIMINATED, COMBAT_OUTCOMES.ATTACKER_ATTRITION, COMBAT_OUTCOMES.ATTACKER_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_EXCHANGE],
    2: [COMBAT_OUTCOMES.ATTACKER_ATTRITION, COMBAT_OUTCOMES.ATTACKER_ATTRITION, COMBAT_OUTCOMES.ATTACKER_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_EXCHANGE],
    3: [COMBAT_OUTCOMES.ATTACKER_ATTRITION, COMBAT_OUTCOMES.ATTACKER_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_EXCHANGE, COMBAT_OUTCOMES.DEFENDER_ELIMINATED],
    4: [COMBAT_OUTCOMES.ATTACKER_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_EXCHANGE, COMBAT_OUTCOMES.DEFENDER_ELIMINATED, COMBAT_OUTCOMES.DEFENDER_ELIMINATED],
    5: [COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_EXCHANGE, COMBAT_OUTCOMES.DEFENDER_ELIMINATED, COMBAT_OUTCOMES.DEFENDER_ELIMINATED, COMBAT_OUTCOMES.DEFENDER_ELIMINATED],
    6: [COMBAT_OUTCOMES.BOTH_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_DEMORALIZED, COMBAT_OUTCOMES.DEFENDER_EXCHANGE, COMBAT_OUTCOMES.DEFENDER_ELIMINATED, COMBAT_OUTCOMES.DEFENDER_ELIMINATED, COMBAT_OUTCOMES.DEFENDER_ELIMINATED, COMBAT_OUTCOMES.DEFENDER_ELIMINATED], 
})

const STARTING_TURN_STATE = TURN_STATES.PLACE_REINFORCEMENTS;
const STARTING_REMAINING_REINFORCEMENTS = 2; // TODO: Doesn't really scale well.
const STARTING_PLAYER = PLAYERS.BLUE;
const STARTING_GRID = generateInitialBoard(BOARD_SIZE);

let currentState = {
    turnState: STARTING_TURN_STATE,
    remainingReinforcements: STARTING_REMAINING_REINFORCEMENTS,
    currentPlayer: STARTING_PLAYER,
    logs: [
        `It is ${STARTING_PLAYER} turn to place ${STARTING_REMAINING_REINFORCEMENTS} reinforcement(s).`
    ],
    grid: STARTING_GRID,
    moves: [],
    invasions: [],
};

// Initialize the soldiers
currentState.grid[-(BOARD_SIZE - 1)][0].city = new City("Miele", PLAYERS.BLUE); 
currentState.grid[(BOARD_SIZE - 1)][0].city = new City("Putz", PLAYERS.GREEN); 
currentState.grid[1][1].terrain = TERRAIN.FOREST;
currentState.grid[1][2].terrain = TERRAIN.FOREST;
currentState.grid[1][3].terrain = TERRAIN.FOREST;
currentState.grid[1][2].terrain = TERRAIN.FOREST;
currentState.grid[2][2].terrain = TERRAIN.FOREST;

currentState.grid[-1][1].terrain = TERRAIN.MOUNTAIN;

function renderBoard() {

    const title = `
        <div>
            <h1 id="title"> Grid Getters </h1>
        </div>
    `;
    const infoPanel = `
        <div id="info-panel-container">
            <div id="turn-tracker-container">
                <h3 id="turn-tracker"> Current Turn: ${currentState.currentPlayer}</h3>
            </div>
            <div id="next-phase-container">
                <button id="next-phase-button"> Next Phase </button>
            </div>
        </div>
    `;

    const boardHtml = Object.keys(currentState.grid).toSorted(intSortFunction).map((q) => {
        const innerRow = Object.keys(currentState.grid[q]).toSorted(intSortFunction).map((r) => {
            const cell = currentState.grid[q][r];
            const isActive = shouldShowSoldiers(new Coordinates(q, r));
            // TODO: Refactor out the calls to the cell's moveStyle and invasionStyle form this method, and move it into the cell's getBoardContent method.
            return `
                <div class="cell ${cell.moveStyle} ${cell.invasionStyle}" data-q="${q}" data-r="${r}" id="cell-wrapper-${q}-${r}">
                    ${cell.getBoardContent(isActive)}
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
    const menu = `
        <div id="menu">
            <div id="actions" class="menu-block">
                ${getActionsContent()}
            </div>
            <div id="cell-info" class="menu-block">
                <h3 class="menu-title"> Cell Info: </h3>
                <h4> Coordinates: ${currentState.sourceCell} </h4>
                ${currentState.sourceCell ? currentState.grid[currentState.sourceCell.q][currentState.sourceCell.r].getCellInfoContent() : ""}
            </div>
        </div>
    `;

    const gameArea = `
        <div id="game-area">
            ${board}
            ${menu}
        </div>
    `;

    const logs = `
        <div id="events-container">
            <h2> Events: </h2>
            <div id="log-container">
                ${currentState.logs.map(message => `<div class="logs"> ${message}</div>`).join("")}
            </div>
        </div>
    `

    game.innerHTML = `
        ${title}
        ${infoPanel}
        ${gameArea}
        ${logs}
    `;
    
    Array.from(document.querySelectorAll(".cell")).forEach(cell => {
        const q = parseInt(cell.dataset.q);
        const r = parseInt(cell.dataset.r);
        cell.addEventListener("click", () => handleCellClick(new Coordinates(q, r)));
    });

    Array.from(document.querySelectorAll(".soldier-info.clickable")).forEach(soldier => {
        const soldierId = parseInt(soldier.dataset.soldierId)
        soldier.addEventListener("click", () => handleSoldierClick(soldierId))
    })

    document.getElementById("next-phase-button").addEventListener("click", () => handleNextPhase());
}

/**
 * Update 'currentState' based on cell click, then call renderBoard().
 * @param {string} soldierId 
 * @returns 
 */
function handleSoldierClick(soldierId) {

    switch (currentState.turnState) {
        

        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            const sourceCoordinate = currentState.sourceCell;
            const cell = currentState.grid[sourceCoordinate.q][sourceCoordinate.r];
            const soldiersWithMatchingId = cell.soldiers.filter(_soldier => _soldier.id == soldierId);

            if (soldiersWithMatchingId.length == 0) {
                console.error("Selected soldier not in expected cell, returning.")
                return;
            }
            if (soldiersWithMatchingId.length > 1) {
                throw new Error(`Too many soldiers in cell with matching Id: ${soldierId}; ${soldiersWithMatchingId}; ${cell}`);
            }

            const soldier = soldiersWithMatchingId[0];

            if (soldier.player !== currentState.currentPlayer) {
                console.error(`Something has gone terribly wrong, a soldier of the wrong cell was clickable. ${soldier.player}, ${currentState.currentPlayer}`);
            }

            if (soldier.hasMovedThisTurn) {
                console.error("Soldier already moved this turn, choose another one.");
            }

            const allMoves = soldier.getMoves(sourceCoordinate)
                
            const uniqueMoves = [... new Set(allMoves)];

            const legalMoves = uniqueMoves
                .filter((_coordinate) => {
                    const target = currentState.grid[_coordinate.q][_coordinate.r];
                    return !target.getPlayer() || soldier.player === target.getPlayer();
                });
        
            if (legalMoves.length <= 1) {
                console.error("This soldier has no moves");
            }

            legalMoves.forEach((_coordinate) => {
                currentState.grid[_coordinate.q][_coordinate.r].isLegalMove = true;
            });

            currentState = {
                ...currentState,
                turnState: TURN_STATES.SELECTING_MOVE,
                sourceSoldier: soldier,
                sourceCell: sourceCoordinate,
                validMoves: legalMoves,
            };
            break;
        }

        case TURN_STATES.COMBAT_SELECTING_SOLDIER: {

            const sourceCoordinate = currentState.sourceCell;
            const cell = currentState.grid[sourceCoordinate.q][sourceCoordinate.r];
            const soldiersWithMatchingId = cell.soldiers.filter(_soldier => _soldier.id == soldierId);

            if (soldiersWithMatchingId.length == 0) {
                console.error("Selected soldier not in expected cell, returning.")
                return;
            }
            if (soldiersWithMatchingId.length > 1) {
                throw new Error(`Too many soldiers in cell with matching Id: ${soldierId}; ${soldiersWithMatchingId}; ${cell}`);
            }

            const soldier = soldiersWithMatchingId[0];

            if (soldier.player !== currentState.currentPlayer) {
                console.error(`Something has gone terribly wrong, a soldier of the wrong cell was clickable. ${soldier.player}, ${currentState.currentPlayer}`);
            }

            if (soldier.hasAttackedThisTurn) {
                console.error("Soldier already attacked this turn, choose another one.");
            }

            const allTargets = soldier.getTargets(sourceCoordinate);
                
            const uniqueTargets = [... new Set(allTargets)];

            const legalTargets = uniqueTargets
                .filter((_coordinate) => {
                    const target = currentState.grid[_coordinate.q][_coordinate.r];
                    return target.getPlayer() && soldier.player !== target.getPlayer();
                });
        
            if (legalTargets.length < 1) {
                console.error("This soldier has no targets");
            }

            legalTargets.forEach((_coordinate) => {
                currentState.grid[_coordinate.q][_coordinate.r].isLegalInvasion = true;
            });

            currentState = {
                ...currentState,
                turnState: TURN_STATES.SELECTING_COMBAT,
                sourceSoldier: soldier,
                sourceCell: sourceCoordinate,
                validTargets: legalTargets,
            };
            break;
        }

        default: {
            throw new Error(`Wrong state, should not have this listener: Current State: ${currentState.turnState} in handleSoldierClick`);
        }
    }
    renderBoard();
}

function handleCellClick(coordinate) {

    switch (currentState.turnState) {
        case TURN_STATES.PLACE_REINFORCEMENTS: {

            if (currentState.remainingReinforcements < 1) {
                console.error("No more reinforcements, move to next phase.");
                return;
            }
    
            const soldier = new Soldier(currentState.currentPlayer); // TODO: Make a more robust recruitment process
            if (!currentState.grid[coordinate.q][coordinate.r].canPlace(soldier)) {
                console.error("Can't place that there.")
                return;
            }
    
            currentState.grid[coordinate.q][coordinate.r].soldiers.push(soldier);
    
            currentState = {
                ...currentState,
                logs: [
                    `${currentState.currentPlayer} placed a soldier at ${coordinate}`,
                    ...currentState.logs,
                ],
                remainingReinforcements: currentState.remainingReinforcements - 1, // TODO: Should subtract by "cost" of soldier
            };
            renderBoard();
            break;
        }
        
        // Movement Phase:
        case TURN_STATES.MOVEMENT_SELECTING_CELL: {
            //TODO: Show all of the soldiers in this cell

            const cell = currentState.grid[coordinate.q][coordinate.r];
    
            if (cell.getPlayer() !== currentState.currentPlayer) {
                currentState = {
                    ...currentState,
                    sourceCell: coordinate,
                }
                renderBoard();
                return; // Only allow current player's turn
            }

            currentState = {
                ...currentState,
                sourceCell: coordinate,
                turnState: TURN_STATES.MOVEMENT_SELECTING_SOLDIER,
            };
            renderBoard();
            break;
        }
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            console.error("We don't want this to get invoked now.");
        }
        case TURN_STATES.SELECTING_MOVE: {
            if (currentState.sourceCell.equals(coordinate)) {
                // Selected current cell, cancelling move
                currentState = {
                    ...currentState,
                    validMoves: [],
                    turnState: TURN_STATES.MOVEMENT_SELECTING_CELL,
                    sourceCell: null,
                };
                resetBoardCellStyle();
                renderBoard();
                return;
            }
    
            if (currentState.validMoves.includes(coordinate)) {
                console.log("Attempting to move to illegal square")
                // todo: Clear sourceCell, validMoves, and go back to MOVEMENT_SELECTING_SOLDIER
                return;
            }

            if (currentState.grid[coordinate.q][coordinate.r].getPlayer() && (currentState.grid[coordinate.q][coordinate.r].getPlayer() != currentState.currentPlayer)) {
                console.error("We are trying to break up 'attack' phase from 'movement' phase, this move should've been considered illegal");
            }

            const movesFromSameCellToSameCell = currentState.moves
                .filter(move => move.sourceCoordinate.equals(currentState.sourceCell))
                .filter(move => move.targetCoordinate.equals(coordinate));
            
            if (movesFromSameCellToSameCell.length === 0) { // This is a new move
                currentState = {
                    ...currentState,
                    moves: [
                        ...currentState.moves,
                        new Move(currentState.sourceCell, coordinate, [currentState.sourceSoldier]),
                    ],
                    turnState: TURN_STATES.MOVEMENT_SELECTING_CELL,
                    sourceCell: null,
                };
            } else if (movesFromSameCellToSameCell.length === 1) { // Append to existing move
                movesFromSameCellToSameCell[0].soldiers = [
                    ...movesFromSameCellToSameCell[0].soldiers,
                    currentState.sourceSoldier,
                ];
                currentState = {
                    ...currentState,
                    turnState: TURN_STATES.MOVEMENT_SELECTING_CELL,
                    sourceCell: null,
                };
            } else {
                throw new Error("There should only ever be 1 move from the same cell, to the same cell.");
            }
            
            currentState.sourceSoldier.hasMovedThisTurn = true;
            resetBoardCellStyle();
            renderBoard();
            break;
        }

        // Combat Planning Phase
        case TURN_STATES.COMBAT_SELECTING_CELL: {
            const cell = currentState.grid[coordinate.q][coordinate.r];
            
            if (cell.getPlayer() !== currentState.currentPlayer) {
                currentState = {
                    ...currentState,
                    sourceCell: coordinate,
                }
                renderBoard();
                return; // Only allow current player's turn
            }

            currentState = {
                ...currentState,
                sourceCell: coordinate,
                turnState: TURN_STATES.COMBAT_SELECTING_SOLDIER,
            };
            renderBoard();
            break; 
            
        }
        case TURN_STATES.COMBAT_SELECTING_SOLDIER: {
            console.error("We don't want selecting soldier to trigger handleCellClick");
        }
        case TURN_STATES.SELECTING_COMBAT: {
            if (currentState.sourceCell == coordinate) {
                // Selected current cell, cancelling invasion
                currentState = {
                    ...currentState,
                    validMoves: [],
                    sourceCell: null,
                    turnState: TURN_STATES.COMBAT_SELECTING_CELL,
                };
                resetBoardCellStyle();
                renderBoard();
                return;
            }
    
            if (currentState.validTargets.includes(coordinate)) {
                console.log("Attempting to invade illegal square")
                // todo: Clear sourceCell, validMoves, and go back to MOVEMENT_SELECTING_SOLDIER
                return;
            }
            
            if (currentState.grid[coordinate.q][coordinate.r].getPlayer() != currentState.currentPlayer) {
    
                const invasionsToSameTarget = currentState.invasions.filter(invasion => invasion.targetCoordinate.equals(coordinate));
    
                if (invasionsToSameTarget.length === 0) { // New invasion to this target
                    currentState = {
                        ...currentState,
                        invasions: [
                            ...currentState.invasions,
                            new Invasion([currentState.sourceCell], coordinate, [currentState.sourceSoldier]),
                        ],
                        sourceCell: null,
                        turnState: TURN_STATES.COMBAT_SELECTING_CELL,
                    };
                } else if (invasionsToSameTarget.length === 1) { // Existing invasion, append attacker
                    invasionsToSameTarget[0].addNewAttacker(currentState.sourceCell, [currentState.sourceSoldier]);
                    currentState = {
                        ...currentState,
                        sourceCell: null,
                        turnState: TURN_STATES.COMBAT_SELECTING_CELL,
                    }
                } else {
                    throw new Error("There should only ever be 1 invasion for the same defending cell.");
                }
            }
            resetBoardCellStyle();
            renderBoard();
            break;
        }

        // Combat Resolution Phase?

        default: {
            console.error(`Unable to handle turnstate: ${currentState.turnState}`);
        }
    }
}

function handleNextPhase() {
    switch (currentState.turnState) {
        case TURN_STATES.PLACE_REINFORCEMENTS: {
            currentState = {
                ...currentState,
                logs: [
                    `${currentState.currentPlayer} ended placing reinforcements, moving on to Movement Phase.`,
                    ...currentState.logs,
                ],
                turnState: TURN_STATES.MOVEMENT_SELECTING_CELL,
            };
            break;
        }
        case TURN_STATES.MOVEMENT_SELECTING_CELL: {
            const moveLogs = currentState.moves.map((move) => {
                currentState.grid[move.sourceCoordinate.q][move.sourceCoordinate.r].soldiers = currentState.grid[move.sourceCoordinate.q][move.sourceCoordinate.r].soldiers
                    .filter(_soldier => !move.soldiers.includes(_soldier));
                
                currentState.grid[move.targetCoordinate.q][move.targetCoordinate.r].soldiers = [
                    ...currentState.grid[move.targetCoordinate.q][move.targetCoordinate.r].soldiers,
                    ...move.soldiers,
                ];

                return `${currentState.currentPlayer} moved to: ${move.targetCoordinate}`;
            });
            currentState = {
                ...currentState,
                logs: [
                    `${currentState.currentPlayer} is entering Combat Phase`,
                    ...moveLogs,
                    ...currentState.logs,
                ],
                moves: [],
                turnState: TURN_STATES.COMBAT_SELECTING_CELL,
                sourceCell: null,
            };
            break;
        }
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {// This phase can only be moved out of, by completing a move. 'handleCellClick' should handle moving back to 'MOVEMENT_SELECTING_SOLDIER'
            console.error("Please finish selecting soldier to make move.")
            // endTurn();
            break;
        }
        case TURN_STATES.SELECTING_MOVE: { // This phase can only be moved out of, by completing a move. 'handleCellClick' should handle moving back to 'MOVEMENT_SELECTING_SOLDIER'
            console.error("Please finish making move.");
            return;
        }

        case TURN_STATES.COMBAT_SELECTING_CELL: {
            const invasionLogs = currentState.invasions.map((invasion) => {
                return combat(invasion.sourceCoordinates, invasion.targetCoordinate);
            });
            currentState = {
                ...currentState,
                logs: [
                    ...invasionLogs,
                    ...currentState.logs,
                ],
                invasions: [],
            };
            endTurn();
            break;
        }
        case TURN_STATES.COMBAT_SELECTING_SOLDIER: { // TODO
            console.error("Please finish selecting combat soldier");
            break;
        }
        case TURN_STATES.SELECTING_COMBAT: {
            console.error("Please finish selecting target cell");
            return;
        }
        default: {
            console.error(`Failed to handle nextPhase CurrentTurnState: ${currentState.turnState}`);
        }
    }

    renderBoard();
}

function combat(attackingCoordinates, defendingCoordinate) { // TODO: Make this method have less side effects
    const attack = attackingCoordinates.map((_coordinate) => currentState.grid[_coordinate.q][_coordinate.r].getAttack())
        .reduce(Attack.sumAttack(), new Attack(0, 0));
    const defence = currentState.grid[defendingCoordinate.q][defendingCoordinate.r].getDefence();
    
    const combatOdds = Math.floor(attack.attack / defence.defence);
    const dieRoll = Math.floor(Math.random() * 6) + 1;

    const roll = dieRoll + attack.attackRollModifier - defence.defenceRollModifier + (combatOdds > 6 ? combatOdds - 6 : 0);
    const boundedRoll = Math.min(Math.max(0, roll), 6); // Roll can't be less than 0, or greater than 6.
    const boundedOdds = Math.min(Math.max(0, combatOdds), 6)

    const outcome = COMBAT_RESULTS_BY_ODDS[boundedOdds][boundedRoll];

    console.log(`Attack from: [${attackingCoordinates.join(', ')}], ${attack}; 
        Defence from: ${defendingCoordinate}, ${defence}; 
        Combat Odds: ${combatOdds}; 
        Die Roll: ${dieRoll}; 
        Final Roll: ${roll}; 
        Outcome: ${outcome}`);

    
    switch (outcome) {
        case COMBAT_OUTCOMES.ATTACKER_ELIMINATED: {
            // Defender wins
            const message = `${currentState.grid[defendingCoordinate.q][defendingCoordinate.r].getPlayer()} repelled the attack, Soldiers in attacking cells eliminated.`;
            attackingCoordinates.forEach((_coordinate) => currentState.grid[_coordinate.q][_coordinate.r].killSoldiers())
            return message;
        }
        case COMBAT_OUTCOMES.ATTACKER_ATTRITION: // TODO
        case COMBAT_OUTCOMES.ATTACKER_DEMORALIZED: // TODO
        case COMBAT_OUTCOMES.BOTH_DEMORALIZED: { // TODO: This is currently handled as a 'bounce', need proper logic
            // Bounce, no change
            return "Bounce! Both soldiers live.";

        }
        case COMBAT_OUTCOMES.DEFENDER_DEMORALIZED: // TODO
        case COMBAT_OUTCOMES.DEFENDER_EXCHANGE: // TODO
        case COMBAT_OUTCOMES.DEFENDER_ELIMINATED: {
            // Attacker wins
            // TODO: Assume first attacker, but need to add support multiple "attacking" cells
            const attackingCoordinate = attackingCoordinates[0];
            const message = `${currentState.grid[attackingCoordinate.q][attackingCoordinate.r].getPlayer()} won the attack, Soldier in ${defendingCoordinate} eliminated.`;
            currentState.grid[defendingCoordinate.q][defendingCoordinate.r].killSoldiers();
            Cell.swapAllSoldiers(
                currentState.grid[attackingCoordinate.q][attackingCoordinate.r],
                currentState.grid[defendingCoordinate.q][defendingCoordinate.r]
            );
            return message;
        }
        default: {
            console.error(`Something has gone wrong handling Outcome: ${outcome}`);
        }
    }
    console.error(`Switch case should have returned handling Outcome: ${outcome}`);
}

function getNextTurn(currentPlayer) {
    return currentPlayer === PLAYERS.BLUE ? PLAYERS.GREEN : PLAYERS.BLUE;
}

/**
 * Sets the current player, to the next player.
 * Resets the grid state.
 */
function endTurn() {
    currentState = {
        ...currentState,
        currentPlayer: getNextTurn(currentState.currentPlayer),
        turnState: TURN_STATES.PLACE_REINFORCEMENTS,
        remainingReinforcements: 2,
        moves: [],
        attacks: [],
        sourceCell: null,
        sourceSoldier: null,
    };

    Object.keys(currentState.grid).toSorted(intSortFunction).forEach((q) => {
        Object.keys(currentState.grid[q]).toSorted(intSortFunction)
            .map((r) => currentState.grid[q][r])
            .filter(cell => currentState.currentPlayer === cell.getPlayer())
            .forEach(cell => {
                cell.soldiers.forEach(soldier => {
                    soldier.hasMovedThisTurn = false;
                    soldier.hasAttackedThisTurn = false;
                });
            });
    });
}

function getActionsContent() {
    switch (currentState.turnState) {
        case TURN_STATES.PLACE_REINFORCEMENTS:
            // TODO: Implement more inner content for reinforcements

            return `
                <h3> Reinforcements </h3>
                ${new Array(currentState.remainingReinforcements).fill(null).map((sans, i) => {
                    return `
                        <div class="reinforcement" id="reinforcement-${i}" >
                            <h4 class="reinforcment-number"> ${i} </h4>
                        </div>
                    
                    `;
                }).join("")}
            `;
        case TURN_STATES.MOVEMENT_SELECTING_CELL:
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER:
        case TURN_STATES.SELECTING_MOVE:
            return `
                <h3> Moves: </h3>
                ${currentState.moves.map((move, i) => { 
                    return `
                        <div class="moves" id="move-${i}">
                            <h4 class="move-number"> ${i} </h4>
                            <p>
                                From: ${move.sourceCoordinate}
                                To: ${move.targetCoordinate}
                                Soldiers: [${move.soldiers.map(soldier => soldier.id).join(", ")}]
                            </p>
                        </div>
                    `;
                }).join("")}
            `;
        case TURN_STATES.COMBAT_SELECTING_CELL:
        case TURN_STATES.COMBAT_SELECTING_SOLDIER:
        case TURN_STATES.SELECTING_COMBAT:
            return `
                <h3> Invasions: </h3>
                ${currentState.invasions.map((invasion, i) => { 
                    return `
                        <div class="invasions" id="invasion-${i}">
                            <h4 class="invasion-number"> ${i} </h4>
                            <p>
                                From: [${invasion.sourceCoordinates.join(", ")}]
                                To: ${invasion.targetCoordinate}
                                Soldiers: [${invasion.attackingSoldiers.map(soldier => soldier.id).join(", ")}]
                            </p>
                        </div>
                    `;
                }).join("")}
            `;
        default:
            console.error(`Can't render ActionContent for ${currentState.turnState}`);
            break;
    }
    console.error(`Should've returned content before reaching here for: ${currentState.turnState}`);
    return "";
}

function resetBoardCellStyle() {
    Object.keys(currentState.grid).toSorted(intSortFunction).forEach((q) => {
        Object.keys(currentState.grid[q]).toSorted(intSortFunction)
            .map((r) => currentState.grid[q][r])
            .forEach(cell => {
                cell.resetCellStyle();
            });
    });
}

function shouldShowSoldiers(coordinate) {
    const isItCorrectTurnState = [
        TURN_STATES.MOVEMENT_SELECTING_SOLDIER,
        TURN_STATES.COMBAT_SELECTING_SOLDIER,
    ].includes(currentState.turnState);

    const isCellSelected = coordinate.equals(currentState.sourceCell);

    return isItCorrectTurnState && isCellSelected;
}

renderBoard();
