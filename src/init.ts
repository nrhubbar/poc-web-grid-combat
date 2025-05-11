import { generateBoardIndex, generateInitialBoard } from "./board/gridGeneration";
import { City } from "./game/cell";
import { PLAYERS } from "./game/player";
import { TERRAIN } from "./game/terrain";
import { TURN_STATES } from "./game/turnState";
import { CurrentState } from "./slice";


const BOARD_HEIGHT = 6;
const BOARD_WIDTH = 9;
const STARTING_TURN_STATE = TURN_STATES.PLACE_REINFORCEMENTS;
const STARTING_REMAINING_REINFORCEMENTS = 2;
const STARTING_PLAYER = PLAYERS.BLUE;
const BOARD_INDEX = generateBoardIndex(BOARD_HEIGHT, BOARD_WIDTH);
const STARTING_GRID = generateInitialBoard(BOARD_INDEX);
// Initialize the Cities
STARTING_GRID[0][0].city = new City("Miele", PLAYERS.BLUE);
STARTING_GRID[BOARD_WIDTH - Math.ceil(BOARD_HEIGHT / 2)][BOARD_HEIGHT - 1].city = new City("Putz", PLAYERS.GREEN); // [7, 4]
STARTING_GRID[4][3].terrain = TERRAIN.FOREST;
STARTING_GRID[5][3].terrain = TERRAIN.FOREST;
STARTING_GRID[4][2].terrain = TERRAIN.FOREST;
STARTING_GRID[5][2].terrain = TERRAIN.FOREST;
STARTING_GRID[3][4].terrain = TERRAIN.FOREST;
STARTING_GRID[1][3].terrain = TERRAIN.MOUNTAIN;

function getInitialState(): CurrentState {
    return {
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
}

export {
    getInitialState,
    BOARD_INDEX,
};
