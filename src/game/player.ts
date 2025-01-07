
export type PlayerType = "BLUE" | "GREEN";
export const PLAYERS = Object.freeze({
    BLUE: "BLUE" as PlayerType,
    GREEN: "GREEN" as PlayerType,
});export function getNextTurn(currentPlayer: PlayerType): PlayerType {
    return currentPlayer === PLAYERS.BLUE ? PLAYERS.GREEN : PLAYERS.BLUE;
}

