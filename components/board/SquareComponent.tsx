import { Dimensions, TouchableOpacity, View } from 'react-native';
import type { Position } from '@shared/types';

export const CELL_SIZE = (Dimensions.get('window').width - 32) / 9;

type Props = {
  position: Position;
  isHighlighted: boolean;
  onPress: () => void;
};

export function SquareComponent({ isHighlighted, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={isHighlighted ? 0.7 : 1}
      onPress={onPress}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: '#F5F0E8',
        borderWidth: 0.5,
        borderColor: '#C8BFA8',
      }}
    >
      {isHighlighted && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,180,150,0.35)',
          }}
        />
      )}
    </TouchableOpacity>
  );
}
