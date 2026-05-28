import { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import type { PieceColor, Position } from '@shared/types';
import { CELL_SIZE } from './SquareComponent';

const COLORS: Record<PieceColor, string> = {
  red: '#E24B4A',
  blue: '#378ADD',
};

const SPRING = { damping: 15, stiffness: 120 };

type Props = {
  color: PieceColor;
  position: Position;
  onPress: () => void;
  disabled: boolean;
  flipped?: boolean;
};

export function PieceComponent({ color, position, onPress, disabled, flipped = false }: Props) {
  const reducedMotion = useReducedMotion();
  const size = CELL_SIZE * 0.65;

  const visualRow = flipped ? 8 - position.row : position.row;
  const x = useSharedValue(position.col * CELL_SIZE);
  const y = useSharedValue(visualRow * CELL_SIZE);

  useEffect(() => {
    const targetX = position.col * CELL_SIZE;
    const targetY = (flipped ? 8 - position.row : position.row) * CELL_SIZE;
    if (reducedMotion) {
      x.value = targetX;
      y.value = targetY;
    } else {
      x.value = withSpring(targetX, SPRING);
      y.value = withSpring(targetY, SPRING);
    }
  }, [position.row, position.col, reducedMotion, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, animatedStyle]}>
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={0.7}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: COLORS[color],
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}
