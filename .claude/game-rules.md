# Game Rules (Source of Truth — no assumptions, no exceptions)

## Board
- 9×9 grid of squares. Squares identified by (row, col): row 0 = top, row 8 = bottom, col 0 = left, col 8 = right.
- All 81 squares are traversable. No blocked or special-type squares — entire board is open.
- Edges exist between every pair of horizontally or vertically adjacent squares. An edge is identified by the two squares it connects: `Edge = { from: Position; to: Position }` always stored with the lesser position first (row-major: smaller row first; if same row, smaller col first) to avoid duplicates.

## Starting Positions
- **Red** starts at row 0, col 4 (top row, center).
- **Blue** starts at row 8, col 4 (bottom row, center).
- These starting squares are also the WIN squares for the opponent.

## Winning Condition
- **Red wins** when its piece reaches row 8 (any column).
- **Blue wins** when its piece reaches row 0 (any column).
- Win is checked immediately after every move. Game ends instantly on a winning move.

## Pieces
- Each player has exactly **1 piece**.
- A piece occupies exactly one square at all times.
- Two pieces cannot occupy the same square — ever (except jump resolution, see below).

## Movement Rules (per turn: move piece)
- A piece moves exactly **1 square** per turn — up, down, left, or right. No diagonal movement.
- A move is **blocked** if a wall exists on the edge between the current square and the target square.
- A move is **blocked** if the target square is occupied by the opponent's piece, UNLESS the jump rule applies.
- A move is **invalid** if the target square is outside the 9×9 grid.

## Jump Rule
- Condition: opponent's piece is on the target square AND the square directly behind the opponent (2 squares away from the moving piece, same direction) is empty AND no wall blocks the edge between the opponent's square and the behind-square.
- If all conditions met: the moving piece jumps over the opponent and lands 2 squares away.
- If the behind-square is occupied OR a wall blocks it: the jump is not allowed — but the piece may use a **deflected jump** instead (see below).
- The jump is not optional — if conditions are met and the player moves in that direction, the jump always happens.

## Deflected Jump Rule
- When the straight-through jump is blocked (wall or out-of-bounds behind the opponent), the moving piece may instead land on any accessible adjacent cell of the opponent's square — excluding the cell the piece came from and any cell blocked by a wall.
- If no deflected landing is available, movement in that direction is entirely blocked.

## Barricade (Wall) Rules (per turn: place a wall)
- Each player has exactly **10 walls** total. Once all 10 are placed, that player must move their piece every remaining turn.
- A wall is placed on an **edge** between two adjacent squares (horizontal or vertical adjacency only).
- A wall blocks movement across that edge in **both directions** for both players.
- **Drag and drop UI:** Player drags a wall token from their hand and drops it onto the board. Wall snaps to the nearest valid edge on drop. Green preview = valid, red = invalid.
- **Intersection rule:** No two walls may cross each other. Two walls intersect if they share a midpoint (a horizontal wall and a vertical wall cross at the same grid intersection point). Must be checked on placement.
- **Chaining rule:** A new wall CAN share an endpoint with an existing wall (walls may touch at corners/ends). Walls cannot overlap the same edge.
- **Path rule (mandatory):** A wall placement is **invalid** if it leaves either player with zero possible paths to their target row. BFS/DFS must be run for both players after every attempted placement. If either player has no path, reject the placement.
- Walls are **permanent** — once placed, cannot be moved or removed.
- A player CAN place a wall that restricts their own movement — allowed as long as they still have a path to the goal.

## Turn Structure
- Each turn a player does exactly ONE action:
  1. Move their piece 1 square (or 2 if jump applies), OR
  2. Place one wall on any valid edge
- After the action, turn passes to the opponent.
- If the timer hits zero before the action is completed, that player loses immediately.

## Timer
- **Per-turn timer** (resets every turn, not a total clock).
- Configurable by the host before game starts: 1, 2, 3, or 5 minutes.
- Timer resets to the full configured value at the start of each player's turn.
- Timer runs and is enforced **server-side** using setTimeout. Client shows a countdown display only.
- If timer reaches zero: server emits `game_over` with the waiting player as winner, reason `'timeout'`. No automatic action is taken for the losing player.
