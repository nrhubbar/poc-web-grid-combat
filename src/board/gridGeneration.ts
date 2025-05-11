import { Cell } from "../game/cell";

export interface GridType {
    [q: number]: {
      [r: number]: Cell;
    };
}

export function generateBoardIndex(height: number, width: number): number[][][] {
    const gridIndex: number[][][] = [];
  
    for (let r = 0; r < height; r++) {
      const row: number[][] = [];
      const offset = Math.floor(r / 2);
  
      for (let q = -offset; q < width - offset; q++) {
        row.push([q, r]);
      }
      gridIndex.push(row);
    }
  
    return gridIndex;
  }
  
export function generateInitialBoard(
    boardIndex: number[][][]
  ): GridType {
    const grid: GridType = {};
  
    boardIndex.forEach((row) => {
      row.forEach((pair) => {
        if (grid[pair[0]]) {
          grid[pair[0]][pair[1]] = new Cell();
        } else {
          grid[pair[0]] = {};
          grid[pair[0]][pair[1]] = new Cell();
        }
      });
    });
  
    return grid;
  }