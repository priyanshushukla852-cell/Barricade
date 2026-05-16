import { Text } from 'react-native';
import { useGameStore } from '../../store/gameStore';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TimerDisplay() {
  const seconds = useGameStore((s) => s.gameState?.timerSeconds ?? 0);
  return (
    <Text style={{ fontSize: 24, fontWeight: '700', color: seconds < 10 ? '#EE2222' : '#333333' }}>
      {formatTime(seconds)}
    </Text>
  );
}
