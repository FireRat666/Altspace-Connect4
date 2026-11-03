# Connect 4

A synced multiplayer upright Connect 4 board. Made for **SideQuest / AltspaceVR** worlds, and it also works in **Banter**.

There is no server: players stay in sync through the space's shared state, and the game is plain static files served from <https://connect4.firer.at>.

To try it, open <https://connect4.firer.at> in Altspace or Banter.

## Features

- Win detection in every direction
- A floating panel showing whose turn it is, with seats, Reset and Mute
- Seat locking: claim a side so only you can move it. While a game is under way only its seated players can reset it (or anyone, once a seat is left idle or empty)
- Switches itself off when you are far away, so it costs nothing elsewhere in the world
- Several independent boards in one world
- Built-in pieces or GLB models

## Add it to an Altspace world (snippet)

In a Creator SDK world, add an empty GameObject at the origin, click **Add Component > BS > Snippet** and type `connect4`. Or paste this into `Assets/WebRoot/index.html`, between the snippet section comments:

```html
<!-- snippet section -->
<bs-snippet name="connect4" title="Connect 4"
  description="Synced multiplayer upright Connect 4 board with seat locking."
  script="https://connect4.firer.at/snippet.js"
  room=""
  position="0 1.2 2"
  rotation="0 0 0"
  scale="1"
  lit="true"
  add-lights="false"
  turn-cooldown="5"
  lock-timeout="90"
  cull-distance="20"
  sound-volume="0.4"
  sound-near="2.5"
  sound-far="10"
  hide-ui="false"
  hide-board="false"
  use-custom-models="true"
  scoreboard-position="0 0 0"
  scoreboard-rotation="0 0 0"
  scoreboard-scale="1">
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
| `hideUI` | `hide-ui` | `false` | `true` hides the UI panel (turn, seats, Reset, Mute). |
| `scoreboardPosition` | `scoreboard-position` | `0 0 0` | Position of the UI panel, relative to the board. `0 0 0` puts it just above the board. The panel turns to face each player. |
| `scoreboardRotation` | `scoreboard-rotation` | `0 0 0` | UI panel rotation. |
| `scoreboardScale` | `scoreboard-scale` | `1` | UI panel size: `1` is normal, `2` twice as big. It also grows with the board's `scale`. |
| `turnCooldown` | `turn-cooldown` | `5` | Seconds after a move before the same person can move for the other side, so a double click or an eager player can't take the opponent's turn. Playing both sides alone still works after the wait. `0` turns it off. |
| `lockTimeout` | `lock-timeout` | `90` | Seconds a seated player can leave their turn untouched before anyone can take their seat. A seat also frees up when its player leaves the space. `0` turns the timeout off. Unclaimed sides can be moved by anyone. |
| `cullDistance` | `cull-distance` | `20` | Metres from the board beyond which the game switches itself off for you (board, pieces and panel), and back on when you come within a metre less. Moves made meanwhile show up when you return. `0` keeps it always on. |
| `volume` | `sound-volume` | `0.4` | Volume of the sound effects (moves, captures, wins, resets), from `0` to `1`, heard at full strength near the game. `0` turns them off. |
| `soundNear` | `sound-near` | `2.5` | Distance in metres from the game within which the sounds play at full `sound-volume`. |
| `soundFar` | `sound-far` | `10` | Distance in metres at which the sounds have faded out completely, so people elsewhere in the world aren't disturbed. |
| `hideBoard` | `hide-board` | `false` | `true` hides the board, e.g. to use your own. |
| `useCustomModels` | `use-custom-models` | `true` | Uses the GLB models in `Models/` for the pieces. `false` uses built-in shapes instead. |
| `lit` |  | `true` | Uses materials that react to scene lights. `false` uses unlit materials that ignore lighting. |
| `lighting` |  | `lit` | Older form of `lit`: `lit` or `unlit`. `lit` wins if both are set. |
| `addLights` | `add-lights` | `false` | With `lit="true"`, `true` adds a directional light, for worlds that have no lights of their own. |

Settings can be written as `boardPosition` or `board-position`; the snippet uses the hyphenated form.

A position of `0 0 0` means automatic: the UI panel sits just above the board. Any other value places it relative to the board.

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
