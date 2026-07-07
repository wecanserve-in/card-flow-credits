import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getStringParam } from "../utils/payment";

export default function PaymentFailedScreen() {
  const params = useLocalSearchParams();
  const reason = getStringParam(params.reason);
  const message =
    getStringParam(params.message) ||
    (reason === "cancelled" ? "Payment was cancelled." : "Payment could not be completed.");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="close-circle" size={74} color="#EF4444" />
        </View>

        <Text style={styles.title}>
          {reason === "cancelled" ? "Payment cancelled" : "Payment failed"}
        </Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.replace("/plans")}>
          <Text style={styles.buttonText}>Back to Plans</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 999,
    height: 118,
    justifyContent: "center",
    width: 118,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 28,
    textAlign: "center",
  },
  message: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 10,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#5B4BFF",
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    marginTop: 36,
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
});
