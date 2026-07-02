import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RULES } from '../../lib/rulesContent';

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

// Shown once on a player's first login. Deliberately a small centered card
// (not a full-screen route like /(game)/rules) so it reads as a quick primer,
// not a page the user has to navigate away from.
export function HowToPlayModal({ visible, onClose }: HowToPlayModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>How to Play</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {RULES.map((rule, i) => (
              <View key={rule.title} style={styles.row}>
                <View style={styles.numberWrap}>
                  <Text style={styles.number}>{i + 1}</Text>
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleBody}>{rule.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '75%',
    backgroundColor: '#FAF7F2',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 14,
  },
  list: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  numberWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  number: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  textWrap: { flex: 1 },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  ruleBody: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  closeBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
