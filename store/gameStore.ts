import { create } from 'zustand';
import type { Edge, GameState, PieceColor, Position } from '@shared/types';

interface GameStoreState {
  gameState: GameState | null;
  playerColor: PieceColor | null;
  roomCode: string | null;
  boardOrigin: { x: number; y: number } | null;
  highlightedSquares: Position[];
  draggingWall: boolean;
  wallPreview: Edge | null;
  wallPreviewValid: boolean;
  reconnecting: boolean;
}

interface GameStoreActions {
  setGameState: (gs: GameState | null) => void;
  setPlayerColor: (color: PieceColor | null) => void;
  setRoomCode: (code: string | null) => void;
  setBoardOrigin: (origin: { x: number; y: number } | null) => void;
  setHighlightedSquares: (squares: Position[]) => void;
  setDraggingWall: (val: boolean) => void;
  setWallPreview: (edge: Edge | null, valid: boolean) => void;
  setReconnecting: (val: boolean) => void;
  clearSelection: () => void;
}

export const useGameStore = create<GameStoreState & GameStoreActions>()((set) => ({
  gameState: null,
  playerColor: null,
  roomCode: null,
  boardOrigin: null,
  highlightedSquares: [],
  draggingWall: false,
  wallPreview: null,
  wallPreviewValid: false,
  reconnecting: false,

  setGameState: (gs) => set({ gameState: gs ?? null }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setRoomCode: (code) => set({ roomCode: code }),
  setBoardOrigin: (origin) => set({ boardOrigin: origin }),
  setHighlightedSquares: (squares) => set({ highlightedSquares: squares }),
  setDraggingWall: (val) => set({ draggingWall: val }),
  setWallPreview: (edge, valid) => set({ wallPreview: edge, wallPreviewValid: valid }),
  setReconnecting: (val) => set({ reconnecting: val }),
  clearSelection: () =>
    set({ highlightedSquares: [], draggingWall: false, wallPreview: null, wallPreviewValid: false }),
}));
