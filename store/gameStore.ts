import { create } from 'zustand';
import type { Direction, Edge, GameState, PieceColor, Position } from '@shared/types';

export interface DeflectedJumpEntry {
  jumpDir: Direction;
  landPos: Position;
}

interface GameStoreState {
  gameState: GameState | null;
  playerColor: PieceColor | null;
  roomCode: string | null;
  boardOrigin: { x: number; y: number } | null;
  highlightedSquares: Position[];
  deflectedJumps: DeflectedJumpEntry[];
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
  setHighlightedSquares: (squares: Position[], deflected?: DeflectedJumpEntry[]) => void;
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
  deflectedJumps: [],
  draggingWall: false,
  wallPreview: null,
  wallPreviewValid: false,
  reconnecting: false,

  setGameState: (gs) => set({ gameState: gs ?? null }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setRoomCode: (code) => set({ roomCode: code }),
  setBoardOrigin: (origin) => set({ boardOrigin: origin }),
  setHighlightedSquares: (squares, deflected = []) =>
    set({ highlightedSquares: squares, deflectedJumps: deflected }),
  setDraggingWall: (val) => set({ draggingWall: val }),
  setWallPreview: (edge, valid) => set({ wallPreview: edge, wallPreviewValid: valid }),
  setReconnecting: (val) => set({ reconnecting: val }),
  clearSelection: () =>
    set({ highlightedSquares: [], deflectedJumps: [], draggingWall: false, wallPreview: null, wallPreviewValid: false }),
}));
