import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BoardComponent } from '../../components/board/BoardComponent';
import { TurnIndicator } from '../../components/ui/TurnIndicator';
import { PlayerTimer } from '../../components/ui/TimerDisplay';
import { WallHand } from '../../components/ui/WallHand';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ReconnectingOverlay } from '../../components/ui/ReconnectingOverlay';
import { ChatDrawer } from '../../components/ui/ChatDrawer';
import type { ChatMessage } from '../../components/ui/ChatDrawer';
import { useGame } from '../../hooks/useGame';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../hooks/useSocket';
import { socket } from '../../lib/socketClient';
import { applyMove, applyWall, checkWinner, getComputerMove, getValidMoves } from '@shared/game';
import type { AiDifficulty } from '@shared/game';
import type { Direction, Edge, PieceColor, Position } from '@shared/types';

export default function GameScreen() {
  const { mode, roomCode, difficulty: rawDifficulty } = useLocalSearchParams<{
    mode?: string;
    roomCode?: string;
    difficulty?: string;
  }>();
  const isOnline = mode === 'online';
  const isComputer = mode === 'computer';
  const difficulty: AiDifficulty = rawDifficulty === 'hard' ? 'hard' : 'easy';

  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const setBoardOrigin = useGameStore((s) => s.setBoardOrigin);

  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);

  // Which player's clock sits at the bottom (nearest the player) vs the top.
  // Local game: Blue at bottom (row 8), Red at top rotated 180° so they can read it.
  // Online: my color at bottom, opponent at top.
  const isLocal = !isOnline;
  const showTimer = isOnline || (gameState !== null && gameState.timerConfig !== 0);
  const bottomColor: PieceColor = isLocal ? 'blue' : (playerColor ?? 'blue');
  const topColor: PieceColor = bottomColor === 'red' ? 'blue' : 'red';

  const [boardFlashError, setBoardFlashError] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatOpenRef = useRef(false);

  function handleSocketError() {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setBoardFlashError(true);
    flashTimeoutRef.current = setTimeout(() => setBoardFlashError(false), 300);
  }

  const game = useGame({ online: isOnline, computer: isComputer, onSocketError: handleSocketError });
  const boardRef = useRef<View>(null);

  useEffect(() => {
    if (roomCode) setRoomCode(roomCode);
    return () => setRoomCode(null);
  }, [roomCode, setRoomCode]);

  // For online games, register this socket with the server room so broadcasts reach us.
  // Re-emit join_lobby on every reconnect so the server clears the disconnect timer
  // and the opponent's "connection lost" overlay disappears.
  useEffect(() => {
    if (!isOnline || !roomCode || !userId || !nickname) return;

    function onConnect() {
      emit('join_lobby', { roomCode: roomCode!, userId: userId!, nickname: nickname! });
    }

    socket.on('connect', onConnect);

    if (socket.connected) {
      emit('join_lobby', { roomCode, userId, nickname });
    } else {
      socket.connect();
      // join_lobby will fire via the connect event above
    }

    return () => {
      socket.off('connect', onConnect);
    };
  }, [isOnline, roomCode, userId, nickname]);

  // Client-side chess clock for local games.
  useEffect(() => {
    if (isOnline) return;
    const id = setInterval(() => {
      const state = useGameStore.getState().gameState;
      if (!state || state.timerConfig === 0) return;
      if (state.phase !== 'choosing') { clearInterval(id); return; }
      const active = state.currentTurn;
      const remaining = active === 'red' ? state.redTimeRemaining : state.blueTimeRemaining;
      const next = Math.max(0, remaining - 1);
      if (next === 0) {
        const winner: PieceColor = active === 'red' ? 'blue' : 'red';
        useGameStore.getState().setGameState({ ...state, winner, phase: 'game_over' });
      } else {
        useGameStore.getState().setGameState(
          active === 'red'
            ? { ...state, redTimeRemaining: next }
            : { ...state, blueTimeRemaining: next },
        );
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isOnline]);

  // Receive chat messages from the server.
  useEffect(() => {
    if (!isOnline) return;
    function onChatMessage(msg: {
      senderId: string;
      senderNickname: string;
      text: string;
      timestamp: number;
    }) {
      setChatMessages((prev) => [
        ...prev,
        { ...msg, id: `${msg.timestamp}-${msg.senderId}`, isMine: msg.senderId === userId },
      ]);
      if (!chatOpenRef.current) setUnreadCount((n) => n + 1);
    }
    socket.on('chat_message', onChatMessage);
    return () => { socket.off('chat_message', onChatMessage); };
  }, [isOnline, userId]);

  // Fire the computer's move when it's the computer's turn.
  useEffect(() => {
    if (!isComputer) return;
    if (!gameState || gameState.phase !== 'choosing') return;
    if (!playerColor || gameState.currentTurn === playerColor) return;

    const delay = difficulty === 'hard'
      ? 250 + Math.random() * 100   // 250–350 ms: minimax uses remaining 700 ms budget
      : 300 + Math.random() * 200;  // 300–500 ms: easy is fast, small pause feels natural
    const id = setTimeout(() => {
      const state = useGameStore.getState().gameState;
      if (!state || state.phase !== 'choosing') return;
      if (!playerColor || state.currentTurn === playerColor) return;

      const action = getComputerMove(state, difficulty);
      // Fix: if the computed action throws (e.g. an invalid deflected-jump landing),
      // fall back to the first legal move so the game never silently freezes.
      const applyFallbackMove = () => {
        for (const dir of getValidMoves(state)) {
          try {
            const next = applyMove(state, dir);
            const winner = checkWinner(next);
            useGameStore.getState().setGameState(winner ? { ...next, winner, phase: 'game_over' } : next);
            return;
          } catch { /* try next direction */ }
        }
      };
      if (action.type === 'move') {
        try {
          const next = applyMove(state, action.direction, action.landingOverride);
          const winner = checkWinner(next);
          useGameStore.getState().setGameState(winner ? { ...next, winner, phase: 'game_over' } : next);
        } catch { applyFallbackMove(); }
      } else {
        try {
          const next = applyWall(state, action.edge);
          useGameStore.getState().setGameState(next);
        } catch { applyFallbackMove(); }
      }
    }, delay);

    return () => clearTimeout(id);
  }, [isComputer, gameState?.currentTurn, gameState?.phase, playerColor, difficulty]);

  useEffect(() => {
    if (!isOnline && gameState?.phase === 'game_over' && gameState.winner) {
      const timedOut =
        gameState.timerConfig !== 0 &&
        (gameState.winner === 'blue'
          ? gameState.redTimeRemaining === 0
          : gameState.blueTimeRemaining === 0);
      router.replace({
        pathname: '/(game)/result',
        params: {
          winner: gameState.winner,
          reason: timedOut ? 'timeout' : 'reached_goal',
          mode,
          difficulty: rawDifficulty ?? 'easy',
          timerConfig: String(gameState.timerConfig),
        },
      });
    }
  }, [isOnline, gameState?.phase, gameState?.winner]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const measureBoard = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => {
      setBoardOrigin({ x, y });
    });
  }, [setBoardOrigin]);

  function openChat() {
    chatOpenRef.current = true;
    setChatOpen(true);
    setUnreadCount(0);
  }

  function closeChat() {
    chatOpenRef.current = false;
    setChatOpen(false);
  }

  function handleSendMessage(text: string) {
    if (!roomCode) return;
    emit('chat_message', { roomCode, text });
  }

  function handleSquarePress(position: Position, dir?: Direction, landingOverride?: Position) {
    if (dir !== undefined) {
      game.onConfirmMove(dir, landingOverride);
    } else {
      game.onSelectPiece();
    }
  }

  function handleWallDrop(edge: Edge) {
    game.onConfirmWall(edge);
  }

  return (
    <SafeAreaView style={styles.screen}>
      {showTimer && <PlayerTimer color={topColor} flipped={isLocal} />}

      <View style={styles.header}>
        <TurnIndicator />
      </View>

      {gameState === null ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4A3728" />
        </View>
      ) : (
        <View style={styles.boardContainer}>
          <View ref={boardRef} onLayout={measureBoard}>
            <BoardComponent onSquarePress={handleSquarePress} flashError={boardFlashError} />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.wallCounter}>
          <View style={[styles.counterDot, { backgroundColor: '#E24B4A' }]} />
          <Text style={styles.counterText}>{gameState?.redWallsRemaining ?? 10}</Text>
        </View>
        <WallHand onWallDragStart={game.onStartWallDrag} onWallDrop={handleWallDrop} computer={isComputer} />
        <View style={styles.wallCounter}>
          <View style={[styles.counterDot, { backgroundColor: '#378ADD' }]} />
          <Text style={styles.counterText}>{gameState?.blueWallsRemaining ?? 10}</Text>
        </View>
      </View>

      {showTimer && <PlayerTimer color={bottomColor} />}

      {isOnline && (
        <Pressable style={styles.chatFab} onPress={openChat}>
          <Text style={styles.chatFabIcon}>💬</Text>
          {unreadCount > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {isOnline && (
        <ChatDrawer
          visible={chatOpen}
          messages={chatMessages}
          onSend={handleSendMessage}
          onClose={closeChat}
        />
      )}

      <ReconnectingOverlay />
      <OfflineBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  wallCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 48,
  },
  counterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  chatFab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  chatFabIcon: {
    fontSize: 22,
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E24B4A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
});
