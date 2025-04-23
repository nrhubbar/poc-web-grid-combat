import { Draft } from "@reduxjs/toolkit";
import { GridType } from "./gridGeneration";

export default class Coordinates {
    q: number;
    r: number;
    s: number;
  
    constructor(q: number, r: number) {
      this.q = q;
      this.r = r;
      this.s = -q - r;
    }
  
    isInbounds(grid: Draft<GridType>): boolean {
      return !!(grid[this.q] && grid[this.q][this.r]);
    }
  
    getNeighbors(): Coordinates[] {
      return [
        new Coordinates(this.q + 1, this.r),
        new Coordinates(this.q + 1, this.r - 1),
        new Coordinates(this.q, this.r - 1),
        new Coordinates(this.q - 1, this.r),
        new Coordinates(this.q - 1, this.r + 1),
        new Coordinates(this.q, this.r + 1),
      ];
    }
  
    toString(): string {
      return `[${this.q}, ${this.r}]`;
    }
  
    equals(other?: Coordinates | null): boolean {
      if (!other) {
        return false;
      }
  
      return other.q == this.q && other.r == this.r && other.s == this.s;
    }
  }