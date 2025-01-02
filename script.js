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
    }

    /**
     * Return the inner html for this cell.
     */
    getContent(shouldCascadeSoldiers) {
        let cityContent = "";
        if (this.city) {
            cityContent = `
                <div class="city">
                    ${this.city.name}
                </div>
            `;
        }

        let soldierContent = "";
        if (shouldCascadeSoldiers) {
            soldierContent = `
                <div class="soldiers">
                    ${this.soldiers.map((soldier, i) => {
                        return `
                            <div class="soldier ${soldier.getStyleClasses()}">
                                ${soldier.attack}-${soldier.defence}-${soldier.movement}
                            </div>
                        `;
                    }).join("")}
                </div>
            `;
        } else if (this.soldiers && this.soldiers.length > 0) {
            soldierContent = `
                <div class="soldiers">
                    <div class="soldier ${this.soldiers[0].getStyleClasses()}">
                        ${this.soldiers[0].attack}-${this.soldiers[0].defence}-${this.soldiers[0].movement}
                    </div>
                </div>
            `;
        }


        

        return `
            <div class="${this.terrain.style} ${this.fortification.style}">
                ${cityContent}
                ${soldierContent}
            </div>
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
const STARTING_REMAINING_REINFORCEMENTS = 1;
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
            return `
                <div class="cell" data-q="${q}" data-r="${r}" id="cell-wrapper-${q}-${r}">
                    ${cell.getContent(shouldShowSoldiers(new Coordinates(q, r)))}
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
        <div id="events-container">
            <h2> Events: </h2>
            <div id="log-container">
                <h3> Logs: </h3>
                ${currentState.logs.map(message => `<div class="logs"> ${message}</div>`).join("")}
            </div>
            <div id="moves-container" class="${shouldRenderMovesContainer() ? "show-container" : "hide-container"}">
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
            </div>
            <div id="invasions-container" class="${shouldRenderInvasionsContainer() ? "show-container" : "hide-container"}">
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
            </div>
        </div>
    `

    game.innerHTML = `
        ${title}
        ${infoPanel}
        ${board}
        ${logs}
    `;
    
    Array.from(document.querySelectorAll(".cell")).forEach(cell => {
        const q = parseInt(cell.dataset.q);
        const r = parseInt(cell.dataset.r);
        cell.addEventListener("click", () => handleCellClick(new Coordinates(q, r)));
    });

    document.getElementById("next-phase-button").addEventListener("click", () => handleNextPhase());
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
            break;
        }
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            const cell = currentState.grid[coordinate.q][coordinate.r];
    
            if (cell.getPlayer() !== currentState.currentPlayer) return; // Only allow current player's turn
    
            const moves = cell.getMoves(coordinate)
                .filter((_coordinate) => {
                    const target = currentState.grid[_coordinate.q][_coordinate.r];
                    return !target.getPlayer(); // || cell.getPlayer() === target.getPlayer(); // TODO: Allow support for "stacking" soldiers
                })
    
            if (moves.length <= 1) {
                console.error("This soldier has no moves");
                return;
            }
    
            moves.forEach((_coordinate) => {
                const target = currentState.grid[_coordinate.q][_coordinate.r];
    
                if (!target.getPlayer()) {
                    document.getElementById(`cell-wrapper-${_coordinate.q}-${_coordinate.r}`)
                        .classList
                        .add("empty-move");
                }
            });
            currentState = {
                ...currentState,
                turnState: TURN_STATES.SELECTING_MOVE,
                sourceCell: coordinate,
                validMoves: moves,
            };
            break;
        }
        case TURN_STATES.SELECTING_MOVE: {
            if (currentState.sourceCell == coordinate) {
                // Selected current cell, cancelling move
                currentState = {
                    ...currentState,
                    validMoves: [],
                    turnState: TURN_STATES.MOVEMENT_SELECTING_SOLDIER,
                };
                renderBoard();
                return;
            }
    
            if (currentState.validMoves.includes(coordinate)) {
                console.log("Attempting to move to illegal square")
                // todo: Clear sourceCell, validMoves, and go back to MOVEMENT_SELECTING_SOLDIER
                return;
            }
            
            if (!currentState.grid[coordinate.q][coordinate.r].getPlayer()) {
                currentState = {
                    ...currentState,
                    moves: [
                        ...currentState.moves,
                        new Move(currentState.sourceCell, coordinate, currentState.grid[currentState.sourceCell.q][currentState.sourceCell.r].soldiers),
                    ],
                    turnState: TURN_STATES.MOVEMENT_SELECTING_SOLDIER,
                };
            } else if (currentState.grid[coordinate.q][coordinate.r].getPlayer() != currentState.currentPlayer) {
                log.error("We are trying to break up 'attack' phase from 'movement' phase, this move should've been considered illegal");
                currentState = {
                    ...currentState,
                    logs: [
                        combat([currentState.sourceCell], coordinate),
                        ...currentState.logs,
                    ],
                    turnState: TURN_STATES.MOVEMENT_SELECTING_SOLDIER,
                };
            }
            renderBoard();
            break;
        }

        // Combat Planning Phase
        case TURN_STATES.COMBAT_SELECTING_CELL: {
            // TODO: Show each of the soldiers in this Cell
            break;
        }
        case TURN_STATES.COMBAT_SELECTING_SOLDIER: {
            const cell = currentState.grid[coordinate.q][coordinate.r];
    
            if (cell.getPlayer() !== currentState.currentPlayer) return; // Only allow current player's turn
    
            const targets = cell.getTargets(coordinate)
                .filter((_coordinate) => {
                    const target = currentState.grid[_coordinate.q][_coordinate.r];
                    return target.getPlayer() && cell.getPlayer() !== target.getPlayer();
                })
    
            if (targets.length < 1) {
                console.error("This soldier has no one to invade");
                return;
            }
    
            targets.forEach((_coordinate) => {
                const target = currentState.grid[_coordinate.q][_coordinate.r];
    
                if (!target.getPlayer()) {
                    log.error("We are trying to break up 'attack' phase from 'movement' phase, this shouldn't happen in the Combat Section.");
                    document.getElementById(`cell-wrapper-${_coordinate.q}-${_coordinate.r}`)
                        .classList
                        .add("empty-move");
                } else if (target.getPlayer() !== currentState.currentPlayer) {
                    document.getElementById(`cell-wrapper-${_coordinate.q}-${_coordinate.r}`)
                        .classList
                        .add("attack-move");
                }
            });
            currentState = {
                ...currentState,
                turnState: TURN_STATES.SELECTING_COMBAT,
                sourceCell: coordinate,
                validTargets: targets,
            };
            break;
        }
        case TURN_STATES.SELECTING_COMBAT: {
            if (currentState.sourceCell == coordinate) {
                // Selected current cell, cancelling invasion
                currentState = {
                    ...currentState,
                    validMoves: [],
                    turnState: TURN_STATES.COMBAT_SELECTING_SOLDIER,
                };
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
                            new Invasion([currentState.sourceCell], coordinate, currentState.grid[currentState.sourceCell.q][currentState.sourceCell.r].soldiers),
                        ],
                        turnState: TURN_STATES.COMBAT_SELECTING_SOLDIER,
                    };
                } else if (invasionsToSameTarget.length === 1) { // Existing invasion, append attacker
                    invasionsToSameTarget[0].addNewAttacker(currentState.sourceCell, currentState.grid[currentState.sourceCell.q][currentState.sourceCell.r].soldiers);
                    currentState = {
                        ...currentState,
                        turnState: TURN_STATES.COMBAT_SELECTING_SOLDIER,
                    }
                } else {
                    throw new Error("There should only ever be 1 invasion for the same defending cell.");
                }
            }
            renderBoard();
            break;
        }

        // Combat Resolution Phase?

        default: {
            log.error(`Unable to handle turnstate: ${currentState.turnState}`);
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
                turnState: TURN_STATES.MOVEMENT_SELECTING_SOLDIER,
            };
            break;
        }
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: { // TODO: add support for breaking out "attack phase" into separate phase from movement
            const moveLogs = currentState.moves.map((move) => {
                Cell.swapAllSoldiers(
                    currentState.grid[move.sourceCoordinate.q][move.sourceCoordinate.r], 
                    currentState.grid[move.targetCoordinate.q][move.targetCoordinate.r]);
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
                turnState: TURN_STATES.COMBAT_SELECTING_SOLDIER,
            };
            // endTurn();
            break;
        }
        case TURN_STATES.SELECTING_MOVE: { // This phase can only be moved out of, by completing a move. 'handleCellClick' should handle moving back to 'MOVEMENT_SELECTING_SOLDIER'
            console.error("Please finish making move.");
            return;
        }
        case TURN_STATES.COMBAT_SELECTING_SOLDIER: { // TODO
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
        remainingReinforcements: 1,
        moves: [],
        attacks: [],
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

function shouldRenderMovesContainer() {
    return [
        TURN_STATES.MOVEMENT_SELECTING_SOLDIER, 
        TURN_STATES.SELECTING_MOVE,
    ].includes(currentState.turnState);
}

function shouldRenderInvasionsContainer() {
    return [
        TURN_STATES.COMBAT_SELECTING_SOLDIER, 
        TURN_STATES.SELECTING_COMBAT,
    ].includes(currentState.turnState);
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
