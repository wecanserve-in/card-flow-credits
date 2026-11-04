import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import { auth } from "../services/firebase";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** True when the signed-in user has an email + password login (not Google only). */
export const hasPasswordLogin = () =>
  Boolean(auth.currentUser?.providerData.some((p) => p.providerId === "password"));

/** Asks for the current password, then sets a new one. */
export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (saving) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    onClose();
  };

  const save = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;

    if (next.length < 6) {
      Alert.alert("Password Too Short", "The new password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      Alert.alert("Passwords Don't Match", "Please type the same new password twice.");
      return;
    }
    if (next === current) {
      Alert.alert("Same Password", "The new password must be different from the current one.");
      return;
    }

    try {
      setSaving(true);
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      setSaving(false);
      close();
      Alert.alert("Password Changed", "Use your new password the next time you sign in.");
    } catch (error: any) {
      setSaving(false);
      const code = error?.code || "";
      if (code.includes("wrong-password") || code.includes("invalid-credential")) {
        Alert.alert("Wrong Password", "Your current password is not correct.");
      } else if (code.includes("too-many-requests")) {
        Alert.alert("Too Many Attempts", "Please wait a few minutes and try again.");
      } else if (code.includes("network")) {
        Alert.alert("No Internet", "Please check your connection and try again.");
      } else {
        Alert.alert("Couldn't Change Password", "Please try again.");
      }
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!saving}
        placeholder={label}
        placeholderTextColor="#A0A7AE"
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>For {auth.currentUser?.email}</Text>

          {field("Current password", current, setCurrent)}
          {field("New password", next, setNext)}
          {field("Confirm new password", confirm, setConfirm)}

          <TouchableOpacity onPress={() => setShow((v) => !v)} style={styles.showRow}>
            <Text style={styles.showText}>{show ? "Hide passwords" : "Show passwords"}</Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={close} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.save, (!current || !next || !confirm) && styles.disabled]}
              onPress={save}
              disabled={saving || !current || !next || !confirm}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,20,0.45)", justifyContent: "center", padding: 22 },
  sheet: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20 },
  title: { fontSize: 19, fontWeight: "800", color: "#17261D" },
  subtitle: { marginTop: 4, marginBottom: 14, fontSize: 13, color: "#7B8580", fontWeight: "500" },
  field: { marginBottom: 12 },
  label: { fontSize: 12.5, fontWeight: "700", color: "#5F6B65", marginBottom: 6 },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1, borderColor: "#E1E6E3",
    backgroundColor: "#F7F9F8", paddingHorizontal: 14, fontSize: 15, color: "#17261D",
  },
  showRow: { alignSelf: "flex-start", paddingVertical: 4 },
  showText: { color: "#09A84E", fontWeight: "700", fontSize: 13 },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  button: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: "#F1F3F2" },
  cancelText: { color: "#5F6B65", fontWeight: "800", fontSize: 15 },
  save: { backgroundColor: "#09A84E" },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.55 },
});
