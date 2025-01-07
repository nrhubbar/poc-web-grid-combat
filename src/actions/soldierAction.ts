import { currentState, renderBoard } from "../app";
import { TURN_STATES } from "../game/turnState";


/**
 * Update 'currentState' based on cell click, then call renderBoard().
 * @param {number} soldierId
 * @returns
 */
export function handleSoldierClick(soldierId: number): void {
    switch (currentState.turnState) {
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
            const sourceCoordinate = currentState.sourceCell!;
            const cell = currentState.grid[sourceCoordinate.q][sourceCoordinate.r];
            const soldier = cell.getSoldierById(soldierId);

            if (!soldier) {
                console.error("Selected soldier not in expected cell, returning.");
                return;
            }

            if (soldier.player !== currentState.currentPlayer) {
                console.error(
                    `Something has gone terribly wrong, a soldier of the wrong cell was clickable. ${soldier.player}, ${currentState.currentPlayer}`
                );
            }

            if (soldier.hasMovedThisTurn) {
                console.error("Soldier already moved this turn, choose another one.");
                return;
            }

            const allMoves = soldier.getMoves(sourceCoordinate);
            const uniqueMoves = [...new Set(allMoves)];

            const legalMoves = uniqueMoves.filter((_coordinate) => {
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
            const sourceCoordinate = currentState.sourceCell!;
            const cell = currentState.grid[sourceCoordinate.q][sourceCoordinate.r];
            const soldier = cell.getSoldierById(soldierId);

            if (!soldier) {
                console.error("Selected soldier not in expected cell, returning.");
                return;
            }

            if (soldier.player !== currentState.currentPlayer) {
                console.error(
                    `Something has gone terribly wrong, a soldier of the wrong cell was clickable. ${soldier.player}, ${currentState.currentPlayer}`
                );
            }

            if (soldier.hasAttackedThisTurn) {
                console.error("Soldier already attacked this turn, choose another one.");
                return;
            }

            const allTargets = soldier.getTargets(sourceCoordinate);
            const uniqueTargets = [...new Set(allTargets)];

            const legalTargets = uniqueTargets.filter((_coordinate) => {
                const target = currentState.grid[_coordinate.q][_coordinate.r];
                return !!target.getPlayer() && soldier.player !== target.getPlayer();
            });

            if (legalTargets.length < 1) {
                console.error("This soldier has no targets");
                return;
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
            throw new Error(
                `Wrong state, should not have this listener: Current State: ${currentState.turnState} in handleSoldierClick`
            );
        }
    }
    renderBoard();
}
