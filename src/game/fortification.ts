
export interface FortificationType {
    name: string;
    style: string;
    attackRollModifier: number;
    defenceRollModifier: number;
}


export const FORTIFICATION = Object.freeze({
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