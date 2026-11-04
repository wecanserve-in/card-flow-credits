import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type SheetOption = {
  key: string;
  label: string;
  hint?: string;
};

type Props = {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedKey?: string | null;
  emptyText?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
};

/** A simple pick-one list that slides up from the bottom (any number of options). */
export default function OptionSheet({
  visible,
  title,
  options,
  selectedKey,
  emptyText,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 26 + insets.bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>

        {options.length === 0 ? (
          <Text style={styles.empty}>{emptyText || "Nothing to show."}</Text>
        ) : (
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((option) => {
              const active = option.key === selectedKey;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.75}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    onSelect(option.key);
                    onClose();
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
                    {option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#09A84E" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,20,0.4)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingBottom: 26,
  },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: "#DDE3DF", marginVertical: 10 },
  title: { fontSize: 17, fontWeight: "800", color: "#17261D", marginBottom: 8 },
  empty: { color: "#7B8580", fontSize: 14, paddingVertical: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  rowActive: { backgroundColor: "#F2FBF6" },
  label: { fontSize: 15, fontWeight: "700", color: "#20262C" },
  labelActive: { color: "#078E42" },
  hint: { marginTop: 2, fontSize: 12, color: "#8E969D", fontWeight: "500" },
  cancel: { marginTop: 10, height: 48, borderRadius: 14, backgroundColor: "#F1F3F2", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#5F6B65", fontWeight: "800", fontSize: 15 },
});
