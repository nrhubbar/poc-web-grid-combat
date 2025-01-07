import { handleCellClick } from "./actions/cellAction";
import { handleSoldierClick } from "./actions/soldierAction";
import Coordinates from "./board/coordinates";
import { handleNextPhase } from "./game/turnState";
import { getInitialState, BOARD_INDEX } from "./init";
import { getActionsContent } from "./soldier/actions";

const GAME_ELEMENT = document.getElementById("game") as HTMLDivElement;

let currentState = getInitialState();

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

  GAME_ELEMENT.innerHTML = `
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

renderBoard();
