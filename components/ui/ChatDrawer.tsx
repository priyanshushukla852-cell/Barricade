import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export type ChatMessage = {
  id: string;
  senderId: string;
  senderNickname: string;
  text: string;
  timestamp: number;
  isMine: boolean;
};

interface Props {
  visible: boolean;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

export function ChatDrawer({ visible, messages, onSend, onClose }: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  // Scroll to bottom when opened or a new message arrives while open.
  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [visible, messages.length]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          style={styles.drawer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chat</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.row, item.isMine ? styles.rowMine : styles.rowTheirs]}>
                <View style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {!item.isMine && (
                    <Text style={styles.senderName}>{item.senderNickname}</Text>
                  )}
                  <Text style={[styles.bubbleText, item.isMine && styles.bubbleTextMine]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No messages yet. Say hi!</Text>
              </View>
            }
          />

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message…"
              placeholderTextColor="#AAA"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              maxLength={200}
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draft.trim()}
            >
              <Text style={styles.sendBtnText}>Send</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    height: '72%',
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D8',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeBtn: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: '#4A3728',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#EDEBE5',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#AAA',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8E2D8',
    backgroundColor: '#FAF7F2',
  },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1.5,
    borderColor: '#D0C8B8',
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  sendBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
