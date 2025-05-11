
export interface TerrainType {
    name: string;
    style: string;
    movement: number;
    attackRollModifier: number;
    defenceRollModifier: number;
}

export const TERRAIN = Object.freeze({
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
