import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native'
import { useState, useMemo } from 'react'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'

const EMOJIS = [
  '⚽','🏀','🎾','🏐','🏈','🎱','🏓','🏸','🥊','🏋️',
  '🤸','🧘','🏃','🚴','🏊','⛷️','🛹','🧗','🤺','🎯','💃','🕺','🪩',
  '🎵','🎸','🎹','🎺','🎻','🥁','🎤','🎧','🎼','🎷',
  '🎨','🖌️','✏️','📸','🎭','🎬','🎪','🎠','🎡','🎢',
  '🍕','🍔','🌮','🍣','🍜','🥗','🍷','☕','🧁','🍰',
  '🏕️','🌲','🏔️','🌊','🌸','🌻','🦋','🐾','🌙','⭐',
  '🎮','🕹️','🃏','🎲','🧩','♟️','🎰','🎳','🎻','🎯',
  '📚','🔬','🎓','💡','🧪','🗺️','🔭','🖥️','🎙️','📝',
  '🎉','🎊','🥳','🎁','🎈','🪄','🎆','🎇','✨','🌈',
  '🚀','✈️','🛸','⛵','🚗','🏍️','🚂','🛺','🪂','🏄',
]

type Props = {
  value: string
  onChange: (emoji: string) => void
  compact?: boolean
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
    },
    triggerCompact: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      height: 52,
    },
    triggerEmoji: { fontSize: 28 },
    triggerLabel: { fontSize: 15, color: c.textSecondary },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '70%',
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    close: { fontSize: 18, color: c.textSecondary, padding: 4 },
    grid: { padding: 12 },
    emojiCell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      margin: 2,
    },
    emojiCellSelected: { backgroundColor: c.accent + '25' },
    emoji: { fontSize: 26 },
  })
}

export default function EmojiPicker({ value, onChange, compact }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [visible, setVisible] = useState(false)

  const select = (emoji: string) => {
    onChange(emoji)
    setVisible(false)
  }

  return (
    <>
      <TouchableOpacity
        style={compact ? styles.triggerCompact : styles.trigger}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.triggerEmoji}>{value}</Text>
        {!compact && <Text style={styles.triggerLabel}>Emoji seç</Text>}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Emoji Seç</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={EMOJIS}
              keyExtractor={(_, i) => String(i)}
              numColumns={8}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.emojiCell, item === value && styles.emojiCellSelected]}
                  onPress={() => select(item)}
                >
                  <Text style={styles.emoji}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.grid}
            />
          </View>
        </View>
      </Modal>
    </>
  )
}
