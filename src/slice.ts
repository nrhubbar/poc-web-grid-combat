/**
 * This file is the main slice for all state.
 * I think this should be broken down, but let me try implementing everything as a single super state.
 */

import { createSlice, Draft, PayloadAction } from '@reduxjs/toolkit';
import {TURN_STATES, TurnStateType } from './game/turnState'
import { getNextTurn, PlayerType } from './game/player';
import Coordinates from './board/coordinates';
import { GridType } from './board/gridGeneration';
import { Move, Invasion } from './soldier/actions';
import Soldier from './soldier/soldier';
import { getInitialState } from './init';
import { combat } from './combat/combatResolution';

export interface CurrentState {
    turnState: TurnStateType;
    remainingReinforcements: number;
    currentPlayer: PlayerType;
    logs: string[];
    grid: GridType;
    moves: Move[];
    invasions: Invasion[];
    sourceCell?: Coordinates | null;
    sourceSoldier?: Soldier | null;
    validMoves?: Coordinates[];
    validTargets?: Coordinates[];
}

const initialState = getInitialState();


function handleCellClickReducer(state: Draft<CurrentState>, action: PayloadAction<Coordinates>) {

    switch (state.turnState) {
        case TURN_STATES.PLACE_REINFORCEMENTS: {
            if (state.remainingReinforcements < 1) {
                console.error("No more reinforcements, move to next phase.");
                return;
            }

            const soldier = new Soldier(state.currentPlayer); // Simple recruitment
            if (!state.grid[action.payload.q][action.payload.r].canPlace(soldier)) {
                console.error("Can't place that there.");
                return;
            }

            state.grid[action.payload.q][action.payload.r].addNewSoldier(soldier);

            state.logs.push(`${state.currentPlayer} placed a soldier at ${action.payload}`)
            state.remainingReinforcements = state.remainingReinforcements - 1;

            break;
        }

        case TURN_STATES.MOVEMENT_SELECTING_CELL: {
            const cell = state.grid[action.payload.q][action.payload.r];

            if (cell.getPlayer() !== state.currentPlayer) {
                state.sourceCell = action.payload; // Why are we setting source cell?
                return; // Return early since this was an illegal click
            }

            state.sourceCell = action.payload;
            state.turnState = TURN_STATES.MOVEMENT_SELECTING_SOLDIER;
            break;
        }

        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            console.error("We don;t want this to get invoked now")
            // TODO: perhaps we should reset the turnstate to something else 
            // This happens when they should be selecting a soldier on the right pane
            // but instead maybe we should treat this as a "SELECTING CELL"?
            break;
        }

        case TURN_STATES.SELECTING_MOVE: {
            if (action.payload.equals(state.sourceCell)) {
                // Selected current cell, cancelling move
                state.validMoves = [];
                state.turnState = TURN_STATES.MOVEMENT_SELECTING_CELL;
                state.sourceCell = null;
                // TODO: Reset Board Cell Style hmm....
                return;
            }

            if (state.validMoves?.includes(action.payload)) {
                console.log("Attempting to move to illegal square.")
                // This feels like this if statement should be negated....
                return;
            }

            if (state.grid[action.payload.q][action.payload.r].getPlayer() &&
                    state.grid[action.payload.q][action.payload.r].getPlayer() != state.currentPlayer) {
                console.error("Illegal Move, can't move to a cell occupied by another player.")
                return;
            }

            const movesToSameCell = state.moves.filter((move) => move.targetCoordinate.equals(action.payload));

            if (movesToSameCell.length === 0) {
                state.moves.push(
                    new Move(
                        state.sourceCell!,
                        action.payload,
                        state.sourceSoldier!,
                        state.grid
                    )
                );
            } else if (movesToSameCell.length === 1) {
                // Append to existing move
                movesToSameCell[0].addNewSoldier(
                    state.sourceCell!,
                    state.sourceSoldier!,
                    state.grid,
                )
                movesToSameCell[0].soldiers.push(state.sourceSoldier!);

                state.turnState = TURN_STATES.MOVEMENT_SELECTING_CELL;
                state.sourceCell = null;
            } else {
                console.log(`Found more than one move to same target cell: ${movesToSameCell}`)
                alert("Found more than 1 move to the same destination");
                return;
            }

            state.sourceSoldier!.hasMovedThisTurn = true;
            // TODO: Reset Board Cell Style
            break;
        }

        // COMBAT Phases
        case TURN_STATES.COMBAT_SELECTING_CELL: {
            const cell = state.grid[action.payload.q][action.payload.r];

            if (cell.getPlayer() !== state.currentPlayer) {
                state.sourceCell = action.payload;
                return; // Why are we setting sourceCell??
            }

            state.sourceCell = action.payload;
            state.turnState = TURN_STATES.COMBAT_SELECTING_SOLDIER;
            break;
        }

        case TURN_STATES.COMBAT_SELECTING_SOLDIER: {
            console.error("We don;t want this to get invoked now")
            // TODO: perhaps we should reset the turnstate to something else 
            // This happens when they should be selecting a soldier on the right pane
            // but instead maybe we should treat this as a "SELECTING CELL"?
            break;
        }

        case TURN_STATES.SELECTING_COMBAT: {
            if (action.payload.equals(state.sourceCell)) {
                // Selected current cell, cancelling invasion.
                state.validTargets = [];
                state.sourceCell = null;
                state.turnState = TURN_STATES.COMBAT_SELECTING_CELL;

                // TODO: Reset Board Style
                return;
            }

            if (state.validTargets?.includes(action.payload)) {
                console.log("Attempting to invade illagal cell");
                // TODO: Again, it feels like that this conditional is flipped
            }

            if (state.grid[action.payload.q][action.payload.r].getPlayer() === state.currentPlayer) {
                console.log("Selected cell occupied by current player, this is NOT an invasion. Cancelling");
                return;
            }

            const invasionsToSameTarget = state.invasions.filter((invasion) => invasion.targetCoordinate.equals(action.payload));

            if (invasionsToSameTarget.length === 0) {
                // New Invasion
                state.invasions.push(
                    new Invasion(
                        state.sourceCell!,
                        action.payload,
                        state.sourceSoldier!,
                        state.grid,
                    )
                )
            } else if (invasionsToSameTarget.length === 1) {
                // Existing invasion
                invasionsToSameTarget[0].addNewAttacker(
                    state.sourceCell!,
                    state.sourceSoldier!,
                    state.grid
                )

                state.sourceCell = null;
                state.turnState = TURN_STATES.COMBAT_SELECTING_CELL;

            } else {
                console.error(`Multiple Invasions found for same target: ${invasionsToSameTarget}`);
                alert("Mulitple Invasions found for same target cell, there should only be 1");
            }

            state.sourceSoldier!.hasAttackedThisTurn = true;
            // TODO: Reset board style
            break;
        }

        default: {
            console.error(`Unable to handle turnstate: ${state.turnState}`);
            alert("Unable to hanlde turnstate");
        }
    }
}

function handleSoldierClickReducer(state: Draft<CurrentState>, action: PayloadAction<number>) {
    const soldierId = action.payload;

    switch(state.turnState) {
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            const sourceCoordinates = state.sourceCell!;
            const cell = state.grid[sourceCoordinates.q][sourceCoordinates.r];
            const soldier = cell.getSoldierById(soldierId); // TODO: Maybe above where I am seeing issues with the "writable draft soldier", I could use this method?

            if (!soldier) {
                console.error("Selceted Soldier NOT in expected cell, returning");
                // This probably means that the right pane is out of sync with soldiers in the selected cell
                alert("No soldier at currently selected cell")
                // TODO: perhaps I should reset the Turn State and sourceCell
                return;
            }

            if (soldier.player !== state.currentPlayer) {
                console.error("Something has gone erribly wrong, a soldier from the wrong player was in this cell!")
                alert("UH-OH, soldier of wrong player has been selected.");
            }

            if (soldier.hasMovedThisTurn) {
                console.error("Can't select current soldier they've already moved.");
                state.logs.push(`Can't select Soldier: ${soldierId}, they've already moved`);
                return;
                // TODO: perhaps we should reset here, and let the user select another cell
            }

            const allMoves = soldier.getMoves(sourceCoordinates, state.grid);
            const uniqueMoves = [... new Set(allMoves)];
            const legalMoves = uniqueMoves.filter((_coordinate) => {
                const target = state.grid[_coordinate.q][_coordinate.r];
                // The target could be empty, OR it could be occupied by the current player
                return !target.getPlayer() || soldier.player === target.getPlayer();
            });

            if (legalMoves.length <= 1) {
                console.error("This soldier has no legal moves.");
            }

            legalMoves.forEach(_coordinate => {
                state.grid[_coordinate.q][_coordinate.r].isLegalMove = true;
            });

            state.turnState = TURN_STATES.SELECTING_MOVE;
            state.sourceSoldier = soldier;
            state.sourceCell = sourceCoordinates;
            state.validMoves = legalMoves;
            break;
        }

        case TURN_STATES.COMBAT_SELECTING_SOLDIER: {
            const sourceCoordinates = state.sourceCell!;
            const cell = state.grid[sourceCoordinates.q][sourceCoordinates.r];
            const soldier = cell.getSoldierById(soldierId); // TODO: Maybe above where I am seeing issues with the "writable draft soldier", I could use this method?

            if (!soldier) {
                console.error("Selceted Soldier NOT in expected cell, returning");
                // This probably means that the right pane is out of sync with soldiers in the selected cell
                alert("No soldier at currently selected cell")
                // TODO: perhaps I should reset the Turn State and sourceCell
                return;
            }

            if (soldier.player !== state.currentPlayer) {
                console.error("Something has gone erribly wrong, a soldier from the wrong player was in this cell!")
                alert("UH-OH, soldier of wrong player has been selected.");
            }

            if (soldier.hasAttackedThisTurn) {
                console.error("Can't select current soldier they've already attacked.");
                state.logs.push(`Can't select Soldier: ${soldierId}, they've already attacked`);
                return;
                // TODO: perhaps we should reset here, and let the user select another cell
                // OR, perhaps we should support this changing the planned invasion of the selected soldier... hmmm
            }

            const allTargets = soldier.getTargets(sourceCoordinates, state.grid);
            const uniqueTargets = [... new Set(allTargets)];
            const legalTargets = uniqueTargets.filter((_coordinate) => {
                const target = state.grid[_coordinate.q][_coordinate.r];
                // There MUST be a player at the target cell, and it MUST NOT be the current player
                return !!target.getPlayer() || soldier.player !== target.getPlayer();
            });

            if (legalTargets.length < 1) {
                console.error("This soldier has no legal targets.");
            }

            legalTargets.forEach(_coordinate => {
                state.grid[_coordinate.q][_coordinate.r].isLegalMove = true;
            });

            state.turnState = TURN_STATES.SELECTING_MOVE;
            state.sourceSoldier = soldier;
            state.sourceCell = sourceCoordinates;
            state.validTargets = legalTargets;
            break;
        }

        case TURN_STATES.PLACE_REINFORCEMENTS:
        case TURN_STATES.MOVEMENT_SELECTING_CELL:
        case TURN_STATES.COMBAT_SELECTING_CELL:
        case TURN_STATES.SELECTING_COMBAT:
        case TURN_STATES.SELECTING_MOVE: {
            console.error(`Shouldn't receive this turnstate in Handle Soldier Click Reducer: ${state.turnState}`);
            alert("Whoops, why'd we get in this reducer with this turnstate?")
            break;
        }

        default: {
            console.error(`No handler for this TURN_STATE in Handle Soldier Click Reducer: ${state.turnState}`);
            break;
        }

    }
}


//// BOARD RESETTERS - Should these do something to the Current State as well?
const intSortFunction = (a: number, b: number) => a - b;

export function resetCellInvasionsReducer(state: Draft<CurrentState>): void {
    Object.keys(state.grid)
        .map((q) => parseInt(q))
        .sort(intSortFunction)
        .forEach((q) => {
            Object.keys(state.grid[q])
                .map((r) => parseInt(r))
                .sort(intSortFunction)
                .map((r) => state.grid[q][r])
                .forEach((cell) => {
                    cell.clearInvasions();
                });
        });
}

export function resetCellMovesReducer(state: Draft<CurrentState>): void {
    Object.keys(state.grid)
        .map((q) => parseInt(q))
        .sort(intSortFunction)
        .forEach((q) => {
            Object.keys(state.grid[q])
                .map((r) => parseInt(r))
                .sort(intSortFunction)
                .map((r) => state.grid[q][r])
                .forEach((cell) => {
                    cell.clearMoves();
                });
        });
}

export function resetBoardCellStyleReducer(state: Draft<CurrentState>): void {
    Object.keys(state.grid)
        .map((q) => parseInt(q))
        .sort(intSortFunction)
        .forEach((q) => {
            Object.keys(state.grid[q])
                .map((r) => parseInt(r))
                .sort(intSortFunction)
                .map((r) => state.grid[q][r])
                .forEach((cell) => {
                    cell.resetCellStyle();
                });
        });
}

export function endTurnReducer(state: Draft<CurrentState>): void {
    state.currentPlayer = getNextTurn(state.currentPlayer);
    state.turnState = TURN_STATES.PLACE_REINFORCEMENTS,
    state.remainingReinforcements = 2;
    state.moves = [];
    state.invasions = [];
    state.sourceCell= null;
    state.sourceSoldier = null;

    Object.keys(state.grid)
        .map((q) => parseInt(q))
        .forEach((q) => {
            Object.keys(state.grid[q])
                .map((r) => parseInt(r))
                .map((r) => state.grid[q][r])
                .filter((cell) => state.currentPlayer === cell.getPlayer())
                .forEach((cell) => {
                    cell.soldiers.forEach((soldier) => {
                        soldier.hasMovedThisTurn = false;
                        soldier.hasAttackedThisTurn = false;
                        // TODO: Reset demoralization if implemented
                    });
                });
        });
}

export function handleNextPhaseReducer(state: Draft<CurrentState>): void {
    switch (state.turnState) {
        case TURN_STATES.PLACE_REINFORCEMENTS: {
            state.logs.push(`${state.currentPlayer} ended placing reinforcements, moving on to Movement Phase.`);
            state.turnState = TURN_STATES.MOVEMENT_SELECTING_CELL;
            break;
        }

        case TURN_STATES.MOVEMENT_SELECTING_CELL: {
            const moveLogs = state.moves.map((move) => {
                const targetCell = state.grid[move.targetCoordinate.q][move.targetCoordinate.r];
                
                move.orders.forEach((order) => {
                    const sourceCell = state.grid[order.sourceCoordinate.q][order.sourceCoordinate.r];

                    sourceCell.removeSoldierById(order.soldier.id);
                    targetCell.addNewSoldier(order.soldier);
                });

                return `${state.currentPlayer} moved to: ${move.targetCoordinate}`;
            });

            // TODO: Reset Cell Moves

            state.logs.push(
                `${state.currentPlayer} is entering Combat Phase`,
                ...moveLogs,
            )
            state.moves = [];
            state.turnState = TURN_STATES.COMBAT_SELECTING_CELL;
            state.sourceCell = null;

            break;
        }

        case TURN_STATES.COMBAT_SELECTING_CELL: {
            const invasionLogs = state.invasions.map((invasion) => {
                return combat(invasion, state.grid);
            });

            state.logs.push(...invasionLogs);

            // TODO: Reset Cell Invasions
            // TODO: End Turn
            break;
        }

        // TODO: I think the following handling of these Turnstates is bad CX
        // We should instead just count this as they don't want to finish selecting anything
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            console.error("Please finish selecting soldier to make move.");
            break;
        }
        case TURN_STATES.SELECTING_MOVE: {
            console.error("Please finish making move.");
            return;
        }
        case TURN_STATES.COMBAT_SELECTING_SOLDIER: {
            console.error("Please finish selecting combat soldier");
            break;
        }
        case TURN_STATES.SELECTING_COMBAT: {
            console.error("Please finish selecting target cell");
            return;
        }
        default: {
            console.error(
                `Failed to handle nextPhase CurrentTurnState: ${state.turnState}`
            );
            alert("UH-OH, don't know how to handle this case.")
            break;
        }
    }
}

export const gameSlice = createSlice({
    name: 'GameSlice',
    initialState,
    reducers: {
        // Todo: Anything that mutates state needs to go in here
        handleCellClick: handleCellClickReducer,
        handleSoldierClick: handleSoldierClickReducer,

        resetCellInvasions: resetCellInvasionsReducer,
        resetCellMoves: resetCellMovesReducer,
        resetBoardCellStyle: resetBoardCellStyleReducer,

        handleNextPhase: handleNextPhaseReducer,
        endTurn: endTurnReducer,
    }
})

