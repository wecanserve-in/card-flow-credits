import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ExportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={28}
          color="#111827"
        />
      </TouchableOpacity>

      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="document-text"
            size={80}
            color="#F59E0B"
          />

          <Ionicons
            name="checkmark-circle"
            size={34}
            color="#22C55E"
            style={styles.checkIcon}
          />
        </View>

        <Text style={styles.title}>
          Export Ready!
        </Text>

        <Text style={styles.subtitle}>
          Your contacts Excel file is ready.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons
            name="download-outline"
            size={22}
            color="#fff"
          />

          <Text style={styles.primaryText}>
            Download Excel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Ionicons
            name="share-social-outline"
            size={22}
            color="#111827"
          />

          <Text style={styles.secondaryText}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 20,
  },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  iconContainer: {
    position: "relative",
    marginBottom: 30,
  },

  checkIcon: {
    position: "absolute",
    right: -10,
    bottom: 0,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 10,
    color: "#6B7280",
    textAlign: "center",
    fontSize: 16,
  },

  buttonContainer: {
    marginBottom: 30,
  },

  primaryButton: {
    height: 58,
    backgroundColor: "#22C55E",
    borderRadius: 18,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    marginBottom: 14,
  },

  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 10,
  },

  secondaryButton: {
    height: 58,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  secondaryText: {
    marginLeft: 10,
    color: "#111827",
    fontWeight: "700",
  },
});