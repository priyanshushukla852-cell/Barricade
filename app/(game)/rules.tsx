import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { RULES } from '../../lib/rulesContent';

export default function RulesScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Rules</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2', paddingTop: 20, paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { minWidth: 64 },
  backText: { fontSize: 15, color: '#4A3728', fontWeight: '600' },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#1A1A1A',
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  numberWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  number: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  textWrap: { flex: 1 },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  ruleBody: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
  },
});
