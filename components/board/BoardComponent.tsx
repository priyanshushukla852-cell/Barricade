import { View } from 'react-native';
import { SquareComponent, CELL_SIZE } from './SquareComponent';
import { PieceComponent } from './PieceComponent';
import { WallOverlay } from './WallOverlay';
import { useGameStore } from '../../store/gameStore';
import type { Direction, Position } from '@shared/types';

const BOARD_PIXEL_SIZE = CELL_SIZE * 9;

type Props = {
  onSquarePress: (position: Position, dir?: Direction) => void;
  flashError?: boolean;
};

function directionFrom(from: Position, to: Position): Direction | undefined {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  if (dr !== 0) return dr < 0 ? 'up' : 'down';
  if (dc !== 0) return dc < 0 ? 'left' : 'right';
  return undefined;
}

export function BoardComponent({ onSquarePress, flashError = false }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);
  const highlightedSquares = useGameStore((s) => s.highlightedSquares);

  // Online red player sees the board flipped: red's side at the bottom, moving upward.
  const flipped = playerColor === 'red';

  // Local game: playerColor is null — always interactive for the active player.
  // Online game: only interactive when it's your assigned color's turn.
  const isMyTurn = !!gameState && (playerColor === null || playerColor === gameState.currentTurn);

  function handlePress(position: Position) {
    if (!gameState) return;
    // Local game: playerColor is null — act as whichever color's turn it is.
    const activeColor = playerColor ?? gameState.currentTurn;
    const myPos = activeColor === 'red' ? gameState.redPosition : gameState.bluePosition;
    const highlighted = highlightedSquares.some(
      (s) => s.row === position.row && s.col === position.col,
    );
    onSquarePress(position, highlighted ? directionFrom(myPos, position) : undefined);
  }

  return (
    <View
      style={[
        { width: BOARD_PIXEL_SIZE, height: BOARD_PIXEL_SIZE },
        flashError && { borderWidth: 2, borderColor: '#EE2222' },
      ]}
    >
      {Array.from({ length: 9 }, (_, visualRow) => {
        const dataRow = flipped ? 8 - visualRow : visualRow;
        return (
          <View key={dataRow} style={{ flexDirection: 'row' }}>
            {Array.from({ length: 9 }, (_, col) => (
              <SquareComponent
                key={col}
                position={{ row: dataRow, col }}
                isHighlighted={highlightedSquares.some((s) => s.row === dataRow && s.col === col)}
                onPress={() => handlePress({ row: dataRow, col })}
              />
            ))}
          </View>
        );
      })}

      {/* Piece overlay — box-none so PieceComponents receive their own taps */}
      {gameState && (
        <View
          style={{ position: 'absolute', top: 0, left: 0, width: BOARD_PIXEL_SIZE, height: BOARD_PIXEL_SIZE }}
          pointerEvents="box-none"
        >
          <PieceComponent
            color="red"
            position={gameState.redPosition}
            onPress={() => handlePress(gameState.redPosition)}
            disabled={!isMyTurn}
            flipped={flipped}
          />
          <PieceComponent
            color="blue"
            position={gameState.bluePosition}
            onPress={() => handlePress(gameState.bluePosition)}
            disabled={!isMyTurn}
            flipped={flipped}
          />
        </View>
      )}

      <WallOverlay flipped={flipped} />
    </View>
  );
}
