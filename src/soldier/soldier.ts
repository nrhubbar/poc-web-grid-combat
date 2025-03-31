import Coordinates from "../board/coordinates";
import { GridType } from "../board/gridGeneration";
import { Attack, Defence } from "../combat/combatResolution";
import { PlayerType, PLAYERS } from "../game/player";

export default class Soldier {
    private static GLOBAL_SOLDIER_ID = 0;
  
    player: PlayerType;
    attack: number;
    defence: number;
    #movement: number;
    attackRollModifier: number;
    defenceRollModifier: number;
    hasMovedThisTurn: boolean;
    hasAttackedThisTurn: boolean;
    id: number;
    #attackRange: number;
  
    constructor(
      player: PlayerType,
      attack: number = 1,
      defence: number = 1,
      movement: number = 4,
      attackRollModifier: number = 0,
      defenceRollModifier: number = 0,
      attackRange: number = 1
    ) {
      this.player = player;
      this.attack = attack;
      this.defence = defence;
      this.#movement = movement;
      this.attackRollModifier = attackRollModifier;
      this.defenceRollModifier = defenceRollModifier;
      this.hasMovedThisTurn = false;
      this.hasAttackedThisTurn = false;
      this.id = Soldier.GLOBAL_SOLDIER_ID++;
      this.#attackRange = attackRange;
    }
  
    getStyleClasses(): string {
      const playerStyle =
        this.player === PLAYERS.BLUE
          ? "prussian-blue"
          : this.player === PLAYERS.GREEN
          ? "forest-green"
          : "";
      return playerStyle;
    }
  
    getAttack(): Attack {
      return new Attack(this.attack, this.attackRollModifier);
    }
  
    getDefence(): Defence {
      return new Defence(this.defence, this.defenceRollModifier);
    }
  
    getMoves(coordinate: Coordinates, grid: GridType, depthRemaining: number = this.movement): Coordinates[] {
      let coordinates: Coordinates[] = [];
      if (depthRemaining < 0) {
        coordinates = [];
      } else if (depthRemaining == 0) {
        coordinates = [coordinate];
      } else {
        const allMoves = coordinate
          .getNeighbors()
          .filter((_coordinate) => {
            // if move is inbounds
            return _coordinate.isInbounds(grid);
          })
          .map((_coordinate) => {
            const terrainMovementCost = grid[_coordinate.q][_coordinate.r].terrain.movement;
            return this.getMoves(_coordinate, grid, depthRemaining - terrainMovementCost);
          })
          .filter((x) => x.length > 0)
          .flatMap((x) => x);
  
        coordinates = allMoves;
      }
  
      return coordinates;
    }
  
    getTargets(coordinate: Coordinates, grid: GridType): Coordinates[] {
      return this.getMoves(coordinate, grid, this.attackRange);
    }
  
    get movement(): number {
      if (this.hasMovedThisTurn) {
        return 0;
      }
      return this.#movement;
    }
  
    get attackRange(): number {
      if (this.hasAttackedThisTurn) {
        return 0;
      }
      return this.#attackRange;
    }
  }