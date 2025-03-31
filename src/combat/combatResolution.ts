import { GridType } from "../board/gridGeneration";
import { Invasion } from "../soldier/actions";
import { COMBAT_RESULTS_BY_ODDS, COMBAT_OUTCOMES, CombatOutcomes } from "./results";

export class Attack {
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

export class Defence {
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

export function getCombatOutcome(invasion: Invasion, grid: GridType): CombatOutcomes {
  const soldierAttack = invasion.attackingSoldiers
        .map((soldier) => soldier.getAttack())
        .reduce(Attack.sumAttack(), new Attack(0, 0));

    const cellAttack = invasion.sourceCoordinates
        .map((_coordinate) => grid[_coordinate.q][_coordinate.r].getAttack())
        .reduce(Attack.sumAttack(), new Attack(0, 0));

    const attack = new Attack(
        soldierAttack.attack + cellAttack.attack,
        soldierAttack.attackRollModifier + cellAttack.attackRollModifier
    );
    const defence = grid[invasion.targetCoordinate.q][invasion.targetCoordinate.r].getDefence();

    const combatOdds = Math.floor(attack.attack / defence.defence);
    const dieRoll = Math.floor(Math.random() * 6) + 1;

    const roll = dieRoll +
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
  
}

export function combat(invasion: Invasion, grid: GridType): string {
    const outcome = getCombatOutcome(invasion, grid);

    switch (outcome) {
        // TODO: What to do with this Method, it should be a reducer based on the interactions with state, but how....
        case COMBAT_OUTCOMES.ATTACKER_ELIMINATED: {
            const message = `${currentState.grid[invasion.targetCoordinate.q][invasion.targetCoordinate.r].getPlayer()} repelled the attack, Soldiers in attacking cells eliminated.`;
            invasion.orders.forEach((order) => {
                const sourceCell = currentState.grid[order.sourceCoordinate.q][order.sourceCoordinate.r];
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
            const message = `${currentState.grid[attackingCoordinate.q][attackingCoordinate.r].getPlayer()} won the attack, Soldier in ${invasion.targetCoordinate} eliminated.`;

            currentState.grid[invasion.targetCoordinate.q][invasion.targetCoordinate.r].killSoldiers();

            invasion.orders.forEach((order) => {
                const sourceCell = currentState.grid[order.sourceCoordinate.q][order.sourceCoordinate.r];
                sourceCell.removeSoldierById(order.soldier.id);

                currentState.grid[invasion.targetCoordinate.q][invasion.targetCoordinate.r].addNewSoldier(order.soldier);
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
