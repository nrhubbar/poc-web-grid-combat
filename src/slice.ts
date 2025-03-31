/**
 * This file is the main slice for all state.
 * I think this should be broken down, but let me try implementing everything as a single super state.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {TURN_STATES, TurnStateType } from './game/turnState'
import { PlayerType } from './game/player';
import Coordinates from './board/coordinates';
import { GridType } from './board/gridGeneration';
import { Move, Invasion } from './soldier/actions';
import Soldier from './soldier/soldier';
import { getInitialState } from './init';
import { handleCellClick } from './actions/cellAction';

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


function handleCellClickReducer(state: CurrentState, action: PayloadAction<Coordinates>) {
    // Todo: finish implementing "handleCellClick" in here

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
    }
}

function handleSoldierClickReducer(state: CurrentState, action: PayloadAction<number>) {
    // TODO: implement Soldier Click Reducer in here
}


//// BOARD RESETTERS - Should these do something to the Current State as well?
const intSortFunction = (a: number, b: number) => a - b;

export function resetCellInvasionsReducer(state: CurrentState): void {
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

export function resetCellMovesReducer(state: CurrentState): void {
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

export function resetBoardCellStyleReducer(state: CurrentState): void {
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

    }
})

