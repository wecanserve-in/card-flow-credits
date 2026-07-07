import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getStringParam } from "../utils/payment";

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams();
  const planName = getStringParam(params.planName) || "Your plan";
  const paymentId = getStringParam(params.paymentId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={74} color="#22C55E" />
        </View>

        <Text style={styles.title}>Payment successful</Text>
        <Text style={styles.message}>{planName} is active now.</Text>

        {!!paymentId && <Text style={styles.paymentId}>Payment ID: {paymentId}</Text>}

        <TouchableOpacity style={styles.button} onPress={() => router.replace("/home")}>
          <Text style={styles.buttonText}>Back to Home</Text>
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
    backgroundColor: "#ECFDF5",
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
    marginTop: 10,
    textAlign: "center",
  },
  paymentId: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 18,
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
