
import Coordinates from "../board/coordinates";
import { resetBoardCellStyle } from "../game/cell";
import { TURN_STATES } from "../game/turnState";
import { Invasion } from "../soldier/actions";
import Soldier from "../soldier/soldier";

export function handleCellClick(coordinate: Coordinates): void {
    switch (currentState.turnState) {
        case TURN_STATES.PLACE_REINFORCEMENTS: {
            if (currentState.remainingReinforcements < 1) {
                console.error("No more reinforcements, move to next phase.");
                return;
            }

            const soldier = new Soldier(currentState.currentPlayer); // Simple recruitment
            if (!currentState.grid[coordinate.q][coordinate.r].canPlace(soldier)) {
                console.error("Can't place that there.");
                return;
            }

            currentState.grid[coordinate.q][coordinate.r].addNewSoldier(soldier);

            currentState = {
                ...currentState,
                logs: [
                    `${currentState.currentPlayer} placed a soldier at ${coordinate}`,
                    ...currentState.logs,
                ],
                remainingReinforcements: currentState.remainingReinforcements - 1,
            };
            renderBoard();
            break;
        }

        // Movement Phase:
        case TURN_STATES.MOVEMENT_SELECTING_CELL: {
            const cell = currentState.grid[coordinate.q][coordinate.r];

            if (cell.getPlayer() !== currentState.currentPlayer) {
                currentState = {
                    ...currentState,
                    sourceCell: coordinate,
                };
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
            break;
        }
        case TURN_STATES.SELECTING_MOVE: {
            if (currentState.sourceCell?.equals(coordinate)) {
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

            if (currentState.validMoves?.includes(coordinate)) {
                console.log("Attempting to move to illegal square");
                // We keep the same approach as the original code (which had a possible logic slip).
                return;
            }

            if (currentState.grid[coordinate.q][coordinate.r].getPlayer() &&
                currentState.grid[coordinate.q][coordinate.r].getPlayer() != currentState.currentPlayer) {
                console.error(
                    "We are trying to break up 'attack' phase from 'movement' phase, this move should've been considered illegal"
                );
            }

            const movesToSameCell = currentState.moves.filter((move) => move.targetCoordinate.equals(coordinate)
            );

            if (movesToSameCell.length === 0) {
                // This is a new move
                currentState.moves.push(
                    new Move(
                        currentState.sourceCell!,
                        coordinate,
                        currentState.sourceSoldier!
                    )
                );
                currentState = {
                    ...currentState,
                    turnState: TURN_STATES.MOVEMENT_SELECTING_CELL,
                    sourceCell: null,
                };
            } else if (movesToSameCell.length === 1) {
                // Append to existing move
                movesToSameCell[0].addNewSoldier(
                    currentState.sourceCell!,
                    currentState.sourceSoldier!
                );
                movesToSameCell[0].soldiers.push(currentState.sourceSoldier!);

                currentState = {
                    ...currentState,
                    turnState: TURN_STATES.MOVEMENT_SELECTING_CELL,
                    sourceCell: null,
                };
            } else {
                throw new Error(
                    "There should only ever be 1 move from the same cell, to the same cell."
                );
            }

            currentState.sourceSoldier!.hasMovedThisTurn = true;
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
                };
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
            break;
        }
        case TURN_STATES.SELECTING_COMBAT: {
            if (currentState.sourceCell?.equals(coordinate)) {
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

            if (currentState.validTargets?.includes(coordinate)) {
                console.log("Attempting to invade illegal square");
                return;
            }

            if (currentState.grid[coordinate.q][coordinate.r].getPlayer() !=
                currentState.currentPlayer) {
                const invasionsToSameTarget = currentState.invasions.filter((invasion) => invasion.targetCoordinate.equals(coordinate)
                );

                if (invasionsToSameTarget.length === 0) {
                    // New invasion
                    currentState.invasions.push(
                        new Invasion(
                            currentState.sourceCell!,
                            coordinate,
                            currentState.sourceSoldier!
                        )
                    );
                    currentState = {
                        ...currentState,
                        sourceCell: null,
                        turnState: TURN_STATES.COMBAT_SELECTING_CELL,
                    };
                } else if (invasionsToSameTarget.length === 1) {
                    // Existing invasion
                    invasionsToSameTarget[0].addNewAttacker(
                        currentState.sourceCell!,
                        currentState.sourceSoldier!
                    );
                    currentState = {
                        ...currentState,
                        sourceCell: null,
                        turnState: TURN_STATES.COMBAT_SELECTING_CELL,
                    };
                } else {
                    throw new Error(
                        "There should only ever be 1 invasion for the same defending cell."
                    );
                }
            }
            currentState.sourceSoldier!.hasAttackedThisTurn = true;
            resetBoardCellStyle();
            renderBoard();
            break;
        }

        default: {
            console.error(`Unable to handle turnstate: ${currentState.turnState}`);
        }
    }
}
