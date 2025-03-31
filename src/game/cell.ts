import Soldier from "../soldier/soldier";
import Coordinates from "../board/coordinates";
import { PlayerType } from "./player";
import { TERRAIN, TerrainType } from "./terrain";
import { FORTIFICATION, FortificationType } from "./fortification";
import { Attack, Defence } from "../combat/combatResolution";
import { GridType } from "../board/gridGeneration";

export class City {
    name: string;
    player: PlayerType;
  
    constructor(name: string, player: PlayerType) {
      this.name = name;
      this.player = player;
    }
  }
  
  export class Cell {
    #soldiers: { [id: number]: Soldier };
    terrain: TerrainType;
    fortification: FortificationType;
    city?: City;
    isLegalMove: boolean;
    isLegalInvasion: boolean;
    moves: Set<number>;
    invasions: Set<number>;
  
    constructor(
      soldiers: { [id: number]: Soldier } = {},
      terrain: TerrainType = TERRAIN.PLAIN,
      fortification: FortificationType = FORTIFICATION.NONE,
      city?: City
    ) {
      this.#soldiers = soldiers;
      this.terrain = terrain;
      this.fortification = fortification;
      this.city = city;
      this.isLegalMove = false;
      this.isLegalInvasion = false;
      this.moves = new Set();
      this.invasions = new Set();
    }
  
    /**
     * Return the inner html for this cell.
     */
    getBoardContent(): string {
      let cityContent = "";
      if (this.city) {
        cityContent = `
          <div class="city">
            ${this.city.name}
          </div>
        `;
      }
  
      let soldierContent = "";
      if (this.soldiers && this.soldiers.length === 1) {
        // If just 1 soldier, show that soldier
        soldierContent = `
          <div class="soldiers">
            <div class="soldier ${this.soldiers[0].getStyleClasses()}">
              ${this.soldiers[0].attack}-${this.soldiers[0].defence}-${this.soldiers[0].movement}
            </div>
          </div>
        `;
      } else if (this.soldiers && this.soldiers.length > 1) {
        // If there are multiple soldiers, display a sum of Attack and Defence
        soldierContent = `
          <div class="soldiers">
            <div class="soldier ${this.soldiers[0].getStyleClasses()}">
              ${this.soldiers
                .map((s) => s.attack)
                .reduce((acc, val) => acc + val, 0)}-${this.soldiers
          .map((s) => s.defence)
          .reduce((acc, val) => acc + val, 0)}
            </div>
          </div>
        `;
      }
  
      const moveContent = `
        <div class="cell-moves">
          ${[...this.moves].join(", ")}
        </div>
      `;
      const invasionContent = `
        <div class="cell-invasions">
          ${[...this.invasions].join(", ")}
        </div>
      `;
  
      return `
        <div class="${this.terrain.style} ${this.fortification.style}">
          ${soldierContent ? soldierContent : cityContent}
          ${moveContent}
          ${invasionContent}
        </div>
      `;
    }
  
    getCellInfoContent(): string {
      let cityContent = "";
      if (this.city) {
        cityContent = `
          <div class="city-info">
            ${this.city.name}
          </div>
        `;
      }
      const terrainContent = `
        <div class="terrain-info">
          Type: ${this.terrain.name}
          Movement Points: ${this.terrain.movement}
          Attack Roll Modifier: ${this.terrain.attackRollModifier}
          Defence Roll Movdifier: ${this.terrain.defenceRollModifier}
        </div>
      `;
      const fortificationContent = `
        <div class="fortification-info">
          Level: ${this.fortification.name}
          Attack Roll Modifier: ${this.fortification.attackRollModifier}
          Defence Roll Movdifier: ${this.fortification.defenceRollModifier}
        </div>
      `;
      const soldierContent = `
        <div class="soldier-info-container">
          ${
            this.soldiers
              .map((soldier) => {
                return `
                  <div class="soldier-info clickable ${soldier.getStyleClasses()}" data-soldier-id="${soldier.id}">
                    ${soldier.attack}-${soldier.defence}-${soldier.movement}
                  </div>
                `;
              })
              .join("")
          }
        </div>
      `;
      return `
        ${cityContent}
        ${terrainContent}
        ${fortificationContent}
        ${soldierContent}
      `;
    }
  
    canPlace(soldier: Soldier): boolean {
      if (!this.city) {
        return false;
      }
      return soldier.player === this.city.player;
    }
  
    getPlayer(): PlayerType | null {
      if (this.soldiers.length > 0) {
        return this.soldiers[0].player;
      }
  
      return null;
    }
  
    killSoldiers(): void {
      this.#soldiers = {};
    }
  
    getMoves(coordinate: Coordinates, grid: GridType): Coordinates[] {
      const allMoves = this.soldiers.map((soldier) =>
        soldier.getMoves(coordinate, grid)
      ).flatMap((x) => x);
  
      const uniqueMoves = new Set(allMoves);
  
      return [...uniqueMoves];
    }
  
    getTargets(coordinate: Coordinates, grid: GridType): Coordinates[] {
      const allTargets = this.soldiers.map((soldier) =>
        soldier.getTargets(coordinate, grid)
      ).flatMap((x) => x);
  
      const uniqueTargets = new Set(allTargets);
  
      return [...uniqueTargets];
    }
  
    getAttack(): Attack {
      return new Attack(
        0,
        this.terrain.attackRollModifier + this.fortification.attackRollModifier
      );
    }
  
    getDefence(): Defence {
      const soldierDefence = Object.values(this.#soldiers)
        .map((soldier) => soldier.getDefence())
        .reduce(Defence.sumDefence(), new Defence(0, 0));
  
      return new Defence(
        soldierDefence.defence,
        soldierDefence.defenceRollModifier +
          this.terrain.defenceRollModifier +
          this.fortification.defenceRollModifier
      );
    }
  
    addNewSoldier(soldier: Soldier): void {
      this.#soldiers[soldier.id] = soldier;
    }
  
    getSoldierById(soldierId: number): Soldier | undefined {
      return this.#soldiers[soldierId];
    }
  
    removeSoldierById(soldierId: number): void {
      delete this.#soldiers[soldierId];
    }
  
    get soldiers(): Soldier[] {
      return [...Object.values(this.#soldiers)];
    }
  
    get moveStyle(): string {
      return this.isLegalMove ? "empty-move" : "";
    }
  
    get invasionStyle(): string {
      return this.isLegalInvasion ? "attack-move" : "";
    }
  
    resetCellStyle(): void {
      this.isLegalMove = false;
      this.isLegalInvasion = false;
    }
  
    addMove(moveId: number): void {
      this.moves.add(moveId);
    }
  
    clearMoves(): void {
      this.moves.clear();
    }
  
    addInvasion(invasionId: number): void {
      this.invasions.add(invasionId);
    }
  
    clearInvasions(): void {
      this.invasions.clear();
    }
}

