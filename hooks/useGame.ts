import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket, emit } from './useSocket';
import {
  applyMove,
  applyWall,
  checkWinner,
  getAdjacentSquare,
  getValidMoves,
  getDeflectedJumps,
  isWallPlacementValid,
  normalizeEdge,
} from '@shared/game';
import type { Direction, Edge, Position } from '@shared/types';

export function useGame({
  online = false,
  computer = false,
  onSocketError,
}: {
  online?: boolean;
  computer?: boolean;
  onSocketError?: () => void;
} = {}) {
  useSocket({ enabled: online, onSocketError });

  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);
  const roomCode = useGameStore((s) => s.roomCode);
  const setGameState = useGameStore((s) => s.setGameState);
  const setHighlightedSquares = useGameStore((s) => s.setHighlightedSquares);
  const draggingWall = useGameStore((s) => s.draggingWall);
  const setDraggingWall = useGameStore((s) => s.setDraggingWall);
  const setWallPreview = useGameStore((s) => s.setWallPreview);
  const clearSelection = useGameStore((s) => s.clearSelection);

  // Hot-seat: always act as whichever color's turn it is.
  // Online / computer: act only as the assigned playerColor.
  const activeColor = (online || computer) ? playerColor : (gameState?.currentTurn ?? null);

  function isMyTurn(): boolean {
    if (!gameState || gameState.phase !== 'choosing') return false;
    if (!online && !computer) return true;
    if (!playerColor) return false;
    return playerColor === gameState.currentTurn;
  }

  function onSelectPiece(): void {
    if (!isMyTurn() || !gameState || !activeColor) return;

    const myPos = activeColor === 'red' ? gameState.redPosition : gameState.bluePosition;
    const oppPos = activeColor === 'red' ? gameState.bluePosition : gameState.redPosition;
    const validDirs = getValidMoves(gameState);
    const deflected = getDeflectedJumps(gameState);

    const destinations: Position[] = [];
    for (const dir of validDirs) {
      const adj = getAdjacentSquare(myPos, dir);
      if (!adj) continue;
      if (adj.row === oppPos.row && adj.col === oppPos.col) {
        const behind = getAdjacentSquare(oppPos, dir);
        if (behind) destinations.push(behind);
      } else {
        destinations.push(adj);
      }
    }
    for (const dj of deflected) {
      if (!destinations.some((d) => d.row === dj.landPos.row && d.col === dj.landPos.col)) {
        destinations.push(dj.landPos);
      }
    }

    setHighlightedSquares(destinations, deflected);
  }

  function onConfirmMove(dir: Direction, landingOverride?: Position): void {
    if (!online) {
      if (!gameState) return;
      try {
        const next = applyMove(gameState, dir, landingOverride);
        const winner = checkWinner(next);
        setGameState(winner ? { ...next, winner, phase: 'game_over' } : next);
      } catch {
        // invalid move — ignore
      }
      clearSelection();
      return;
    }
    if (!roomCode) return;
    emit('move_piece', { roomCode, direction: dir, landingOverride });
    clearSelection();
  }

  function onStartWallDrag(): void {
    if (!isMyTurn() || !gameState || !activeColor) return;
    const wallsRemaining =
      activeColor === 'red' ? gameState.redWallsRemaining : gameState.blueWallsRemaining;
    if (wallsRemaining === 0) return;
    setDraggingWall(true);
  }

  function onWallDragMove(edge: Edge): void {
    if (!gameState) return;
    const isValid = isWallPlacementValid(gameState, edge);
    setWallPreview(edge, isValid);
  }

  function onConfirmWall(edge: Edge): void {
    if (!online) {
      if (!gameState) return;
      try {
        const next = applyWall(gameState, edge);
        setGameState(next);
      } catch {
        // invalid wall — ignore
      }
      clearSelection();
      return;
    }
    if (!roomCode) return;
    emit('place_wall', { roomCode, wall: normalizeEdge(edge) });
    clearSelection();
  }

  // Auto-highlight valid moves at the start of the player's turn so they never
  // need to tap their piece first. Runs whenever the turn changes, the phase
  // changes, or a wall drag ends.
  useEffect(() => {
    if (draggingWall) return;
    onSelectPiece();
    // onSelectPiece reads current store state and guards isMyTurn() internally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentTurn, gameState?.phase, draggingWall]);

  return {
    isMyTurn,
    onSelectPiece,
    onConfirmMove,
    onStartWallDrag,
    onWallDragMove,
    onConfirmWall,
    getValidMoves: (): Direction[] => (gameState ? getValidMoves(gameState) : []),
    isWallPlacementValid: (wall: Edge): boolean =>
      gameState ? isWallPlacementValid(gameState, wall) : false,
  };
}
