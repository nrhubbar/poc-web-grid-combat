
type PlayerType = "BLUE" | "GREEN";
type TurnStateType = 
  | "PLACE_REINFORCEMENTS"
  | "MOVEMENT_SELECTING_CELL"
  | "MOVEMENT_SELECTING_SOLDIER"
  | "SELECTING_MOVE"
  | "COMBAT_SELECTING_CELL"
  | "COMBAT_SELECTING_SOLDIER"
  | "SELECTING_COMBAT";

interface TerrainType {
  name: string;
  style: string;
  movement: number;
  attackRollModifier: number;
  defenceRollModifier: number;
}

interface FortificationType {
  name: string;
  style: string;
  attackRollModifier: number;
  defenceRollModifier: number;
}

interface CombatOddsResults {
  [odds: number]: string[];
}

interface GridType {
  [q: number]: {
    [r: number]: Cell;
  };
}

interface CurrentStateType {
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

const game = document.getElementById("game") as HTMLDivElement;

const intSortFunction = (a: number, b: number) => a - b;

const BOARD_HEIGHT = 6;
const BOARD_WIDTH = 9;


class Coordinates {
  q: number;
  r: number;
  s: number;

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
    this.s = -q - r;
  }

  isInbounds(): boolean {
    return !!(currentState.grid[this.q] && currentState.grid[this.q][this.r]);
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

class Attack {
  attack: number;
  attackRollModifier: number;

  constructor(attack: number, attackRollModifier: number) {
    this.attack = attack;
    this.attackRollModifier = attackRollModifier;
  }

  toString(): string {
    return JSON.stringify(this);
  }

  static sumAttack() {
    return (acc: Attack, val: Attack) => {
      return new Attack(
        acc.attack + val.attack,
        acc.attackRollModifier + val.attackRollModifier
      );
    };
  }
}

class Defence {
  defence: number;
  defenceRollModifier: number;

  constructor(defence: number, defenceRollModifier: number) {
    this.defence = defence;
    this.defenceRollModifier = defenceRollModifier;
  }

  toString(): string {
    return JSON.stringify(this);
  }

  static sumDefence() {
    return (acc: Defence, val: Defence) => {
      return new Defence(
        acc.defence + val.defence,
        acc.defenceRollModifier + val.defenceRollModifier
      );
    };
  }
}

class City {
  name: string;
  player: PlayerType;

  constructor(name: string, player: PlayerType) {
    this.name = name;
    this.player = player;
  }
}

class Cell {
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

  getMoves(coordinate: Coordinates): Coordinates[] {
    const allMoves = this.soldiers.map((soldier) =>
      soldier.getMoves(coordinate)
    ).flatMap((x) => x);

    const uniqueMoves = new Set(allMoves);

    return [...uniqueMoves];
  }

  getTargets(coordinate: Coordinates): Coordinates[] {
    const allTargets = this.soldiers.map((soldier) =>
      soldier.getTargets(coordinate)
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

class Soldier {
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

  getMoves(coordinate: Coordinates, depthRemaining: number = this.movement): Coordinates[] {
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
          return _coordinate.isInbounds();
        })
        .map((_coordinate) => {
          const terrainMovementCost =
            currentState.grid[_coordinate.q][_coordinate.r].terrain.movement;
          return this.getMoves(_coordinate, depthRemaining - terrainMovementCost);
        })
        .filter((x) => x.length > 0)
        .flatMap((x) => x);

      coordinates = allMoves;
    }

    return coordinates;
  }

  getTargets(coordinate: Coordinates): Coordinates[] {
    return this.getMoves(coordinate, this.attackRange);
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

class Move {
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

class Invasion {
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

function generateBoardIndex(height: number, width: number): number[][][] {
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

function generateInitialBoard(
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

const PLAYERS = Object.freeze({
  BLUE: "BLUE" as PlayerType,
  GREEN: "GREEN" as PlayerType,
});
const TURN_STATES = Object.freeze({
  PLACE_REINFORCEMENTS: "PLACE_REINFORCEMENTS" as TurnStateType,

  // Move Phase:
  MOVEMENT_SELECTING_CELL: "MOVEMENT_SELECTING_CELL" as TurnStateType,
  MOVEMENT_SELECTING_SOLDIER: "MOVEMENT_SELECTING_SOLDIER" as TurnStateType,
  SELECTING_MOVE: "SELECTING_MOVE" as TurnStateType,

  // Invasion Phase:
  COMBAT_SELECTING_CELL: "COMBAT_SELECTING_CELL" as TurnStateType,
  COMBAT_SELECTING_SOLDIER: "COMBAT_SELECTING_SOLDIER" as TurnStateType,
  SELECTING_COMBAT: "SELECTING_COMBAT" as TurnStateType,
});

const TERRAIN = Object.freeze({
  PLAIN: {
    name: "PLAIN",
    style: "terrain-plain",
    movement: 1,
    attackRollModifier: 0,
    defenceRollModifier: 0,
  } as TerrainType,
  FOREST: {
    name: "FOREST",
    style: "terrain-forest",
    movement: 2,
    attackRollModifier: 0,
    defenceRollModifier: 1,
  } as TerrainType,
  MOUNTAIN: {
    name: "MOUNTAIN",
    style: "terrain-mountain",
    movement: 4,
    attackRollModifier: -1,
    defenceRollModifier: 1,
  } as TerrainType,
});

const FORTIFICATION = Object.freeze({
  NONE: {
    name: "NONE",
    style: "none-fortification",
    attackRollModifier: 0,
    defenceRollModifier: 0,
  } as FortificationType,
  TRENCHES: {
    name: "TRENCHES",
    style: "trenches-fortification",
    attackRollModifier: 0,
    defenceRollModifier: 1,
  } as FortificationType,
  FORTRESS: {
    name: "FORTRESS",
    style: "fortress-fortification",
    attackRollModifier: 0,
    defenceRollModifier: 2,
  } as FortificationType,
});

const COMBAT_OUTCOMES = Object.freeze({
  /**
   * All Attacking units are eliminated.
   */
  ATTACKER_ELIMINATED: "ATTACKER_ELIMINATED",
  /**
   * Attacker must lose Attack strength "at least equal" to the defence strength of the defending units.
   */
  ATTACKER_ATTRITION: "ATTACKER_ATTRITION",
  /**
   * Attacker must retreat one hex, or lose unit with the largest Attack Strength, units that retreat are demoralized.
   */
  ATTACKER_DEMORALIZED: "ATTACKER_DEMORALIZED",
  /**
   * Attacker suffers "ATTACKER_DEMORALIZED", Defender suffers "DEFENDER_DEMORALIZED", the result is applied to the defender first.
   */
  BOTH_DEMORALIZED: "BOTH_DEMORALIZED",
  /**
   * Defender must retreat one hex, or lose unit with the highest Defence Strength, units that retreat are demoralized.
   */
  DEFENDER_DEMORALIZED: "DEFENDER_DEMORALIZED",
  /**
   * Defender eliminated, BUT attacker must lose attack strength "at least equal" to the defence strength.
   */
  DEFENDER_EXCHANGE: "DEFENDER_EXCHANGE",
  /**
   * All defending units are eliminated.
   */
  DEFENDER_ELIMINATED: "DEFENDER_ELIMINATED",
});

const COMBAT_RESULTS_BY_ODDS: CombatOddsResults = Object.freeze({
  0: [
    COMBAT_OUTCOMES.ATTACKER_ELIMINATED,
    COMBAT_OUTCOMES.ATTACKER_ELIMINATED,
    COMBAT_OUTCOMES.ATTACKER_ATTRITION,
    COMBAT_OUTCOMES.ATTACKER_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_DEMORALIZED,
  ],
  1: [
    COMBAT_OUTCOMES.ATTACKER_ELIMINATED,
    COMBAT_OUTCOMES.ATTACKER_ATTRITION,
    COMBAT_OUTCOMES.ATTACKER_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_EXCHANGE,
  ],
  2: [
    COMBAT_OUTCOMES.ATTACKER_ATTRITION,
    COMBAT_OUTCOMES.ATTACKER_ATTRITION,
    COMBAT_OUTCOMES.ATTACKER_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_EXCHANGE,
  ],
  3: [
    COMBAT_OUTCOMES.ATTACKER_ATTRITION,
    COMBAT_OUTCOMES.ATTACKER_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_EXCHANGE,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
  ],
  4: [
    COMBAT_OUTCOMES.ATTACKER_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_EXCHANGE,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
  ],
  5: [
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_EXCHANGE,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
  ],
  6: [
    COMBAT_OUTCOMES.BOTH_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_DEMORALIZED,
    COMBAT_OUTCOMES.DEFENDER_EXCHANGE,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
    COMBAT_OUTCOMES.DEFENDER_ELIMINATED,
  ],
});

const STARTING_TURN_STATE = TURN_STATES.PLACE_REINFORCEMENTS;
const STARTING_REMAINING_REINFORCEMENTS = 2;
const STARTING_PLAYER = PLAYERS.BLUE;
const BOARD_INDEX = generateBoardIndex(BOARD_HEIGHT, BOARD_WIDTH);
const STARTING_GRID = generateInitialBoard(BOARD_INDEX);

let currentState: CurrentStateType = {
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

// Initialize the Cities
currentState.grid[0][0].city = new City("Miele", PLAYERS.BLUE);
currentState.grid[BOARD_WIDTH - Math.ceil(BOARD_HEIGHT / 2)][
  BOARD_HEIGHT - 1
].city = new City("Putz", PLAYERS.GREEN); // [7, 4]
currentState.grid[4][3].terrain = TERRAIN.FOREST;
currentState.grid[5][3].terrain = TERRAIN.FOREST;
currentState.grid[4][2].terrain = TERRAIN.FOREST;
currentState.grid[5][2].terrain = TERRAIN.FOREST;
currentState.grid[3][4].terrain = TERRAIN.FOREST;
currentState.grid[1][3].terrain = TERRAIN.MOUNTAIN;

function renderBoard(): void {
  const title = `
    <div>
      <h1 id="title"> Grid Getters </h1>
    </div>
  `;
  const infoPanel = `
    <div id="info-panel-container">
      <div id="turn-tracker-container">
        <h3 id="turn-tracker"> Current Turn: ${currentState.currentPlayer}</h3>
      </div>
      <div id="next-phase-container">
        <button id="next-phase-button"> Next Phase </button>
      </div>
    </div>
  `;

  const boardHtml = BOARD_INDEX.map((row, i) => {
    const innerRow = row
      .map((pair) => {
        const q = pair[0];
        const r = pair[1];
        const cell = currentState.grid[q][r];
        
        return `
          <div class="cell ${cell.moveStyle} ${cell.invasionStyle}" data-q="${q}" data-r="${r}" id="cell-wrapper-${q}-${r}">
            ${cell.getBoardContent()}
          </div>
        `;
      })
      .join("");

    return `
      <div class="row ${i % 2 == 0 ? "" : "odd-row"}">
        ${innerRow}
      </div>
    `;
  }).join("");

  const board = `
    <div id="board" class="board" >
      ${boardHtml}
    </div>
  `;
  const menu = `
    <div id="menu">
      <div id="actions" class="menu-block">
        ${getActionsContent()}
      </div>
      <div id="cell-info" class="menu-block">
        <h3 class="menu-title"> Cell Info: </h3>
        <h4> Coordinates: ${currentState.sourceCell} </h4>
        ${
          currentState.sourceCell
            ? currentState.grid[currentState.sourceCell.q][
                currentState.sourceCell.r
              ].getCellInfoContent()
            : ""
        }
      </div>
    </div>
  `;

  const gameArea = `
    <div id="game-area">
      ${board}
      ${menu}
    </div>
  `;

  const logs = `
    <div id="events-container">
      <h2> Events: </h2>
      <div id="log-container">
        ${currentState.logs.map((message) => `<div class="logs"> ${message}</div>`).join("")}
      </div>
    </div>
  `;

  game.innerHTML = `
    ${title}
    ${infoPanel}
    ${gameArea}
    ${logs}
  `;

  Array.from(document.querySelectorAll(".cell")).forEach((cellEl) => {
    const qStr = (cellEl as HTMLElement).dataset.q;
    const rStr = (cellEl as HTMLElement).dataset.r;
    if (qStr == null || rStr == null) return;

    const q = parseInt(qStr);
    const r = parseInt(rStr);
    cellEl.addEventListener("click", () => handleCellClick(new Coordinates(q, r)));
  });

  Array.from(document.querySelectorAll(".soldier-info.clickable")).forEach((soldierEl) => {
    const soldierIdStr = (soldierEl as HTMLElement).dataset.soldierId;
    if (!soldierIdStr) return;

    const soldierId = parseInt(soldierIdStr);
    soldierEl.addEventListener("click", () => handleSoldierClick(soldierId));
  });

  const nextPhaseButton = document.getElementById("next-phase-button") as HTMLButtonElement;
  nextPhaseButton.addEventListener("click", () => handleNextPhase());
}

/**
 * Update 'currentState' based on cell click, then call renderBoard().
 * @param {number} soldierId 
 * @returns 
 */
function handleSoldierClick(soldierId: number): void {
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

function handleCellClick(coordinate: Coordinates): void {
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

      if (
        currentState.grid[coordinate.q][coordinate.r].getPlayer() &&
        currentState.grid[coordinate.q][coordinate.r].getPlayer() != currentState.currentPlayer
      ) {
        console.error(
          "We are trying to break up 'attack' phase from 'movement' phase, this move should've been considered illegal"
        );
      }

      const movesToSameCell = currentState.moves.filter((move) =>
        move.targetCoordinate.equals(coordinate)
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

      if (
        currentState.grid[coordinate.q][coordinate.r].getPlayer() !=
        currentState.currentPlayer
      ) {
        const invasionsToSameTarget = currentState.invasions.filter((invasion) =>
          invasion.targetCoordinate.equals(coordinate)
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

function handleNextPhase(): void {
  switch (currentState.turnState) {
    case TURN_STATES.PLACE_REINFORCEMENTS: {
      currentState = {
        ...currentState,
        logs: [
          `${currentState.currentPlayer} ended placing reinforcements, moving on to Movement Phase.`,
          ...currentState.logs,
        ],
        turnState: TURN_STATES.MOVEMENT_SELECTING_CELL,
      };
      break;
    }
    case TURN_STATES.MOVEMENT_SELECTING_CELL: {
      const moveLogs = currentState.moves.map((move) => {
        const targetCell = currentState.grid[move.targetCoordinate.q][
          move.targetCoordinate.r
        ];
        move.orders.forEach((order) => {
          const sourceCell = currentState.grid[order.sourceCoordinate.q][
            order.sourceCoordinate.r
          ];
          sourceCell.removeSoldierById(order.soldier.id);
          targetCell.addNewSoldier(order.soldier);
        });

        return `${currentState.currentPlayer} moved to: ${move.targetCoordinate}`;
      });

      resetCellMoves();

      currentState = {
        ...currentState,
        logs: [
          `${currentState.currentPlayer} is entering Combat Phase`,
          ...moveLogs,
          ...currentState.logs,
        ],
        moves: [],
        turnState: TURN_STATES.COMBAT_SELECTING_CELL,
        sourceCell: null,
      };
      break;
    }
    case TURN_STATES.MOVEMENT_SELECTING_SOLDIER: {
      console.error("Please finish selecting soldier to make move.");
      break;
    }
    case TURN_STATES.SELECTING_MOVE: {
      console.error("Please finish making move.");
      return;
    }

    case TURN_STATES.COMBAT_SELECTING_CELL: {
      const invasionLogs = currentState.invasions.map((invasion) => {
        return combat(invasion);
      });
      currentState = {
        ...currentState,
        logs: [...invasionLogs, ...currentState.logs],
        invasions: [],
      };
      resetCellInvasions();
      endTurn();
      break;
    }
    case TURN_STATES.COMBAT_SELECTING_SOLDIER: {
      console.error("Please finish selecting combat soldier");
      break;
    }
    case TURN_STATES.SELECTING_COMBAT: {
      console.error("Please finish selecting target cell");
      return;
    }
    default: {
      console.error(
        `Failed to handle nextPhase CurrentTurnState: ${currentState.turnState}`
      );
    }
  }

  renderBoard();
}

function combat(invasion: Invasion): string {
  const soldierAttack = invasion.attackingSoldiers
    .map((soldier) => soldier.getAttack())
    .reduce(Attack.sumAttack(), new Attack(0, 0));

  const cellAttack = invasion.sourceCoordinates
    .map((_coordinate) => currentState.grid[_coordinate.q][_coordinate.r].getAttack())
    .reduce(Attack.sumAttack(), new Attack(0, 0));

  const attack = new Attack(
    soldierAttack.attack + cellAttack.attack,
    soldierAttack.attackRollModifier + cellAttack.attackRollModifier
  );
  const defence = currentState.grid[invasion.targetCoordinate.q][
    invasion.targetCoordinate.r
  ].getDefence();

  const combatOdds = Math.floor(attack.attack / defence.defence);
  const dieRoll = Math.floor(Math.random() * 6) + 1;

  const roll =
    dieRoll +
    attack.attackRollModifier -
    defence.defenceRollModifier +
    (combatOdds > 6 ? combatOdds - 6 : 0);
  const boundedRoll = Math.min(Math.max(0, roll), 6); // clamp 0..6
  const boundedOdds = Math.min(Math.max(0, combatOdds), 6);

  const outcome = COMBAT_RESULTS_BY_ODDS[boundedOdds][boundedRoll];

  console.log(
    `Attack from: [${invasion.sourceCoordinates.join(", ")}], ${attack}; 
    Defence from: ${invasion.targetCoordinate}, ${defence}; 
    Combat Odds: ${combatOdds}; 
    Die Roll: ${dieRoll}; 
    Final Roll: ${roll}; 
    Outcome: ${outcome}`
  );

  switch (outcome) {
    case COMBAT_OUTCOMES.ATTACKER_ELIMINATED: {
      const message = `${currentState.grid[invasion.targetCoordinate.q][
        invasion.targetCoordinate.r
      ].getPlayer()} repelled the attack, Soldiers in attacking cells eliminated.`;
      invasion.orders.forEach((order) => {
        const sourceCell = currentState.grid[order.sourceCoordinate.q][
          order.sourceCoordinate.r
        ];
        sourceCell.removeSoldierById(order.soldier.id);
      });
      return message;
    }
    case COMBAT_OUTCOMES.ATTACKER_ATTRITION:
    case COMBAT_OUTCOMES.ATTACKER_DEMORALIZED:
    case COMBAT_OUTCOMES.BOTH_DEMORALIZED: {
      // Bounce, no change
      return "Bounce! Both soldiers live.";
    }
    case COMBAT_OUTCOMES.DEFENDER_DEMORALIZED:
    case COMBAT_OUTCOMES.DEFENDER_EXCHANGE:
    case COMBAT_OUTCOMES.DEFENDER_ELIMINATED: {
      const attackingCoordinate = invasion.sourceCoordinates[0];
      const message = `${currentState.grid[attackingCoordinate.q][
        attackingCoordinate.r
      ].getPlayer()} won the attack, Soldier in ${invasion.targetCoordinate} eliminated.`;

      currentState.grid[invasion.targetCoordinate.q][
        invasion.targetCoordinate.r
      ].killSoldiers();

      invasion.orders.forEach((order) => {
        const sourceCell = currentState.grid[order.sourceCoordinate.q][
          order.sourceCoordinate.r
        ];
        sourceCell.removeSoldierById(order.soldier.id);

        currentState.grid[invasion.targetCoordinate.q][
          invasion.targetCoordinate.r
        ].addNewSoldier(order.soldier);
      });
      return message;
    }
    default: {
      console.error(`Something has gone wrong handling Outcome: ${outcome}`);
    }
  }
  console.error(`Switch case should have returned handling Outcome: ${outcome}`);
  return "";
}

function getNextTurn(currentPlayer: PlayerType): PlayerType {
  return currentPlayer === PLAYERS.BLUE ? PLAYERS.GREEN : PLAYERS.BLUE;
}

/**
 * Sets the current player, to the next player.
 * Resets the grid state.
 */
function endTurn(): void {
  currentState = {
    ...currentState,
    currentPlayer: getNextTurn(currentState.currentPlayer),
    turnState: TURN_STATES.PLACE_REINFORCEMENTS,
    remainingReinforcements: 2,
    moves: [],
    invasions: [],
    sourceCell: null,
    sourceSoldier: null,
  };

  Object.keys(currentState.grid)
    .map((q) => parseInt(q))
    .sort(intSortFunction)
    .forEach((q) => {
      Object.keys(currentState.grid[q])
        .map((r) => parseInt(r))
        .sort(intSortFunction)
        .map((r) => currentState.grid[q][r])
        .filter((cell) => currentState.currentPlayer === cell.getPlayer())
        .forEach((cell) => {
          cell.soldiers.forEach((soldier) => {
            soldier.hasMovedThisTurn = false;
            soldier.hasAttackedThisTurn = false;
            // TODO: Reset demoralization if implemented
          });
        });
    });
}

function getActionsContent(): string {
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

function resetBoardCellStyle(): void {
  Object.keys(currentState.grid)
    .map((q) => parseInt(q))
    .sort(intSortFunction)
    .forEach((q) => {
      Object.keys(currentState.grid[q])
        .map((r) => parseInt(r))
        .sort(intSortFunction)
        .map((r) => currentState.grid[q][r])
        .forEach((cell) => {
          cell.resetCellStyle();
        });
    });
}

function resetCellMoves(): void {
  Object.keys(currentState.grid)
    .map((q) => parseInt(q))
    .sort(intSortFunction)
    .forEach((q) => {
      Object.keys(currentState.grid[q])
        .map((r) => parseInt(r))
        .sort(intSortFunction)
        .map((r) => currentState.grid[q][r])
        .forEach((cell) => {
          cell.clearMoves();
        });
    });
}

function resetCellInvasions(): void {
  Object.keys(currentState.grid)
    .map((q) => parseInt(q))
    .sort(intSortFunction)
    .forEach((q) => {
      Object.keys(currentState.grid[q])
        .map((r) => parseInt(r))
        .sort(intSortFunction)
        .map((r) => currentState.grid[q][r])
        .forEach((cell) => {
          cell.clearInvasions();
        });
    });
}

renderBoard();
