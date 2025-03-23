import { emit } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import { ITheme, Terminal } from "@xterm/xterm";

const VARIABLES = [
  "--palette0",
  "--palette1",
  "--palette2",
  "--palette3",
  "--palette4",
  "--palette5",
  "--palette6",
  "--palette7",
  "--palette8",
  "--palette9",
  "--palette10",
  "--palette11",
  "--palette12",
  "--palette13",
  "--palette14",
  "--palette15",
  "--background",
  "--foreground",
  "--cursor-color",
  "--selection-background",
  "--selection-foreground",
] as const;

function getTheme(): ITheme {
  const style = window.getComputedStyle(document.body);
  const colors = Object.fromEntries(VARIABLES.map(variable => [variable, style.getPropertyValue(variable)])) as Record<typeof VARIABLES[number], string>;

  return {
    background: colors["--background"],
    foreground: colors["--foreground"],
    cursor: colors["--cursor-color"],
    selectionBackground: colors["--selection-background"],
    selectionForeground: colors["--selection-foreground"],
    black: colors["--palette0"],
    red: colors["--palette1"],
    green: colors["--palette2"],
    yellow: colors["--palette3"],
    blue: colors["--palette4"],
    magenta: colors["--palette5"],
    cyan: colors["--palette6"],
    white: colors["--palette7"],
    brightBlack: colors["--palette8"],
    brightRed: colors["--palette9"],
    brightGreen: colors["--palette10"],
    brightYellow: colors["--palette11"],
    brightBlue: colors["--palette12"],
    brightMagenta: colors["--palette13"],
    brightCyan: colors["--palette14"],
    brightWhite: colors["--palette15"],
  }
}

async function createTTY() {

  const theme = getTheme();

  const terminal = new Terminal({
    theme,
    cursorBlink: true,
    allowProposedApi: true,
    allowTransparency: true,
  });

  const element = document.getElementById("terminal");
  if (!element) {
    return;
  }

  terminal.open(element);

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  fitAddon.fit();

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];

    fitAddon.fit();
    emit("resize", {
      cols: terminal.cols,
      rows: terminal.rows,
      pixel_height: entry.contentRect.height,
      pixel_width: entry.contentRect.width,
    });
  });
  observer.observe(element);
}

window.addEventListener("DOMContentLoaded", async () => {
  await createTTY();
});
