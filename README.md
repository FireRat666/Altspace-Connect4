# Connect 4

A synced multiplayer upright Connect 4 board. Made for **SideQuest / AltspaceVR** worlds, and it also works in **Banter**.

There is no server: players stay in sync through the space's shared state, and the game is plain static files served from <https://connect4.firer.at>.

To try it, open <https://connect4.firer.at> in Altspace or Banter.

## Features

- Win detection in every direction
- Reset button
- Several independent boards in one world
- Built-in pieces or GLB models

## Add it to an Altspace world (snippet)

In a Creator SDK world, add an empty GameObject at the origin, click **Add Component > BS > Snippet** and type `connect4`. Or paste this into `Assets/WebRoot/index.html`, between the snippet section comments:

```html
<!-- snippet section -->
<bs-snippet name="connect4" title="Connect 4"
  description="Synced multiplayer upright Connect 4 board with a reset button."
  script="https://connect4.firer.at/snippet.js"
  room=""
  position="0 1.2 2"
  rotation="0 0 0"
  scale="1"
  lighting="unlit"
  add-lights="true"
  hide-ui="false"
  hide-board="false"
  use-custom-models="false"
  reset-position="0 -0.4 0">
  <bs-gizmo type="position" attribute="position"/>
  <bs-gizmo type="plane" attribute="position" size="0.72 0.62"/>
</bs-snippet>
<!-- end snippet section -->
```

- Each placement is its own game. Its sync id is `room`, or the placement's own id when `room` is empty. Give placements the same `room` to share one game.
- `position` and `rotation` are Unity world values, and `scale` can be a single number. The other settings are listed under [Settings](#settings). An empty setting uses the default.
- The Scene-view gizmo shows the board at its default size; it does not follow `scale`.
- Unity reads the snippet section as XML: quote every attribute, close every element, and write `&` as `&amp;`.

## Add it with a script tag

This works in an Altspace world's `Assets/WebRoot/index.html` (outside the snippet section) and in a Banter space's HTML:

```html
<script src="https://connect4.firer.at/Connect4.js" position="0 1.5 5"></script>
```

For more than one board in a space, give each one its own `instance`:

```html
<script src="https://connect4.firer.at/Connect4.js" instance="board1" position="-2 1.1 -2"></script>
<script src="https://connect4.firer.at/Connect4.js" instance="board2" position="2 1.1 -2"></script>
```

Settings can also go in the URL, as in older setups: `https://connect4.firer.at/Connect4.js?boardPosition=0+1.1+-2&boardScale=0.8`.

## Settings

| Setting | Also accepted | Default | Description |
| :--- | :--- | :--- | :--- |
| `instance` |  | page URL | Sync id. Boards with the same id share one game. In a snippet, use `room` instead. |
| `boardPosition` | `position`, `board-position` | `0 1.1 0` | Board position (x y z). |
| `boardRotation` | `rotation`, `board-rotation` | `0 0 0` | Board rotation in degrees (x y z). |
| `boardScale` | `scale`, `board-scale` | `1` | Board scale: one number, or x y z. |
| `resetPosition` | `reset-position` | `0 -0.4 0` | Reset button position, relative to the board. |
| `resetRotation` | `reset-rotation` | `0 0 0` | Reset button rotation, relative to the board. |
| `resetScale` | `reset-scale` | `1` | Reset button scale. |
| `hideUI` | `hide-ui` | `false` | `true` hides the buttons. |
| `hideBoard` | `hide-board` | `false` | `true` hides the board, e.g. to use your own. |
| `useCustomModels` | `use-custom-models` | `false` | `true` uses the GLB models in `Models/` for the pieces instead of built-in shapes. |
| `lighting` |  | `unlit` | `lit` uses materials that react to scene lights. |
| `addLights` | `add-lights` | `true` | With `lighting="lit"`, adds a directional light. Set `false` if the world has its own. |

Settings can be written as `boardPosition` or `board-position`; the snippet uses the hyphenated form.

## How to play

1. Connect four of your colour (red or yellow) in a row: across, up or diagonally.
2. Click a column to drop a piece into it.
3. Reset clears the board for everyone.

## Files

- `Connect4.js`: the game.
- `Models/`: piece models for `use-custom-models`.
- `snippet.js`, `snippet.html`: the Creator SDK snippet and its definition.
- `index.html`: a test page with a floor and the game.

## License

GPL-3.0. See [LICENSE](LICENSE).
