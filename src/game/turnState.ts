import Coordinates from "../board/coordinates";
import { GridType } from "../board/gridGeneration";
import { combat } from "../combat/combatResolution";
import { Invasion, Move } from "../soldier/actions";
import Soldier from "../soldier/soldier";
import { resetCellMoves, resetCellInvasions } from "./cell";
import { getNextTurn, PlayerType } from "./player";

export type TurnStateType = 
  | "PLACE_REINFORCEMENTS"
  | "MOVEMENT_SELECTING_CELL"
  | "MOVEMENT_SELECTING_SOLDIER"
  | "SELECTING_MOVE"
  | "COMBAT_SELECTING_CELL"
  | "COMBAT_SELECTING_SOLDIER"
  | "SELECTING_COMBAT";

export interface CurrentStateType {
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

export const TURN_STATES = Object.freeze({
    PLACE_REINFORCEMENTS: "PLACE_REINFORCEMENTS" as TurnStateType,
  
    // Move Phase:
    MOVEMENT_SELECTING_CELL: "MOVEMENT_SELECTING_CELL" as TurnStateType,
    MOVEMENT_SELECTING_SOLDIER: "MOVEMENT_SELECTING_SOLDIER" as TurnStateType,
    SELECTING_MOVE: "SELECTING_MOVE" as TurnStateType,
  
    // Invasion Phase:
    COMBAT_SELECTING_CELL: "COMBAT_SELECTING_CELL" as TurnStateType,
    COMBAT_SELECTING_SOLDIER: "COMBAT_SELECTING_SOLDIER" as TurnStateType,
    SELECTING_COMBAT: "SELECTING_COMBAT" as TurnStateType,
});

// TODO: endTurn and handleNextPhase should probably be "Actions"
/**
 * Sets the current player, to the next player.
 * Resets the grid state.
 */
export function endTurn(): void {
    currentState = {
        ...currentState,
        currentPlayer: getNextTurn(currentState.currentPlayer),
        turnState: TURN_STATES.PLACE_REINFORCEMENTS,
        remainingReinforcements: 2,
        moves: [],
        invasions: [],
        sourceCell: null,
        sourceSoldier: null,
    };

    Object.keys(currentState.grid)
        .map((q) => parseInt(q))
        .forEach((q) => {
            Object.keys(currentState.grid[q])
                .map((r) => parseInt(r))
                .map((r) => currentState.grid[q][r])
                .filter((cell) => currentState.currentPlayer === cell.getPlayer())
                .forEach((cell) => {
                    cell.soldiers.forEach((soldier) => {
                        soldier.hasMovedThisTurn = false;
                        soldier.hasAttackedThisTurn = false;
                        // TODO: Reset demoralization if implemented
                    });
                });
        });
}
export function handleNextPhase(): void {
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
                const targetCell = currentState.grid[move.targetCoordinate.q][move.targetCoordinate.r];
                move.orders.forEach((order) => {
                    const sourceCell = currentState.grid[order.sourceCoordinate.q][order.sourceCoordinate.r];
                    sourceCell.removeSoldierById(order.soldier.id);
                    targetCell.addNewSoldier(order.soldier);
                });

                return `${currentState.currentPlayer} moved to: ${move.targetCoordinate}`;
            });

            resetCellMoves();

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
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            console.error("Please finish selecting soldier to make move.");
            break;
        }
        case TURN_STATES.SELECTING_MOVE: {
            console.error("Please finish making move.");
            return;
        }

        case TURN_STATES.COMBAT_SELECTING_CELL: {
            const invasionLogs = currentState.invasions.map((invasion) => {
                return combat(invasion, currentState.grid);
            });
            currentState = {
                ...currentState,
                logs: [...invasionLogs, ...currentState.logs],
                invasions: [],
            };
            resetCellInvasions();
            endTurn();
            break;
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
                `Failed to handle nextPhase CurrentTurnState: ${currentState.turnState}`
            );
        }
    }

    renderBoard();
}

