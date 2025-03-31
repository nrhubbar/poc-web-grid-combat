import Coordinates from "../board/coordinates";
import { TURN_STATES } from "../game/turnState";
import Soldier from "./soldier";

// TODO: This whole module needs to be refactored

/**
 * Only to be used by {Move}.
 * Represents the move of a soldier from a cell.
 */
class Order {
    sourceCoordinate: Coordinates;
    soldier: Soldier;
  
    constructor(sourceCoordinate: Coordinates, soldier: Soldier) {
        this.sourceCoordinate = sourceCoordinate;
        this.soldier = soldier;
    }
}
  
export class Move {
    private static MOVE_ID = 0;
  
    targetCoordinate: Coordinates;
    id: number;
    orders: Order[];
  
    constructor(
      sourceCoordinate: Coordinates,
      targetCoordinate: Coordinates,
      soldier: Soldier
    ) {
        this.targetCoordinate = targetCoordinate;
        this.id = Move.MOVE_ID++;
        this.orders = [new Order(sourceCoordinate, soldier)];
    
        currentState.grid[sourceCoordinate.q][sourceCoordinate.r].addMove(this.id);
        currentState.grid[targetCoordinate.q][targetCoordinate.r].addMove(this.id);
    }
  
    addNewSoldier(sourceCoordinate: Coordinates, soldier: Soldier): void {
        this.soldiers.push(soldier);
        this.sourceCoordinates.push(sourceCoordinate);
        this.orders.push(new Order(sourceCoordinate, soldier));
        currentState.grid[sourceCoordinate.q][sourceCoordinate.r].addMove(this.id);
    }
  
    removeSoldier(): void {
      //todo
    }
  
    get sourceCoordinates(): Coordinates[] {
        return this.orders.map((order) => order.sourceCoordinate); // TODO: make this unique
    }
  
    get soldiers(): Soldier[] {
        return this.orders.map((order) => order.soldier);
    }
}
  
export class Invasion {
    private static INVASION_ID = 0;
  
    targetCoordinate: Coordinates;
    invasionId: number;
    orders: Order[];
  
    constructor(
      sourceCoordinate: Coordinates,
      targetCoordinate: Coordinates,
      attackingSoldier: Soldier
    ) {
        this.targetCoordinate = targetCoordinate;
        this.invasionId = Invasion.INVASION_ID++;
        this.orders = [new Order(sourceCoordinate, attackingSoldier)];
    
        currentState.grid[sourceCoordinate.q][sourceCoordinate.r].addInvasion(
            this.invasionId
        );
        currentState.grid[targetCoordinate.q][targetCoordinate.r].addInvasion(
            this.invasionId
        );
    }
  
    addNewAttacker(sourceCoordinate: Coordinates, attackingSoldier: Soldier): void {
        this.orders.push(new Order(sourceCoordinate, attackingSoldier));
        this.sourceCoordinates.push(sourceCoordinate);
  
        currentState.grid[sourceCoordinate.q][sourceCoordinate.r].addInvasion(
            this.invasionId
        );
    }
  
    get attackingSoldiers(): Soldier[] {
        return this.orders.map((order) => order.soldier);
    }
  
    get sourceCoordinates(): Coordinates[] {
        return this.orders.map((order) => order.sourceCoordinate);
    }
}

export function getActionsContent(): string {
    switch (currentState.turnState) {
        case TURN_STATES.PLACE_REINFORCEMENTS:
            return `
        <h3> Reinforcements </h3>
        ${new Array(currentState.remainingReinforcements).fill(null).map((_, i) => {
                return `
            <div class="reinforcement" id="reinforcement-${i}" >
              <h4 class="reinforcment-number"> ${i} </h4>
            </div>
          `;
            }).join("")}
      `;
        case TURN_STATES.MOVEMENT_SELECTING_CELL:
        case TURN_STATES.MOVEMENT_SELECTING_SOLDIER:
        case TURN_STATES.SELECTING_MOVE:
            return `
        <h3> Moves: </h3>
        ${currentState.moves
                    .map((move) => {
                        return `
              <div class="moves" id="move-${move.id}">
                <h4 class="move-number"> ${move.id} </h4>
                <p>
                  From: ${move.sourceCoordinates.join(", ")}
                  To: ${move.targetCoordinate}
                  Soldiers: [${move.soldiers.map((soldier) => soldier.id).join(", ")}]
                </p>
              </div>
            `;
                    })
                    .join("")}
      `;
        case TURN_STATES.COMBAT_SELECTING_CELL:
        case TURN_STATES.COMBAT_SELECTING_SOLDIER:
        case TURN_STATES.SELECTING_COMBAT:
            return `
        <h3> Invasions: </h3>
        ${currentState.invasions
                    .map((invasion, i) => {
                        return `
              <div class="invasions" id="invasion-${i}">
                <h4 class="invasion-number"> ${i} </h4>
                <p>
                  From: [${invasion.sourceCoordinates.join(", ")}]
                  To: ${invasion.targetCoordinate}
                  Soldiers: [${invasion.attackingSoldiers.map((soldier) => soldier.id).join(", ")}]
                </p>
              </div>
            `;
                    })
                    .join("")}
      `;
        default:
            console.error(`Can't render ActionContent for ${currentState.turnState}`);
            break;
    }
    console.error(`Should've returned content before reaching here for: ${currentState.turnState}`);
    return "";
}
