import React, { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import PaymentWebView from "../components/PaymentWebView";
import {
  activateSubscription,
  RazorpayPaymentSuccess,
  verifyPayment,
} from "../services/paymentService";
import {
  getStringParam,
  PaymentFailureReason,
  PaymentWebViewMessage,
  RazorpayCheckoutOrder,
} from "../utils/payment";

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const [statusText, setStatusText] = useState("Opening secure checkout...");
  const [verifying, setVerifying] = useState(false);
  const handledRef = useRef(false);

  const order: RazorpayCheckoutOrder = {
    key: getStringParam(params.key),
    orderId: getStringParam(params.orderId),
    amount: Number(getStringParam(params.amount)),
    currency: getStringParam(params.currency) || "INR",
    planId: getStringParam(params.planId),
    planName: getStringParam(params.planName),
  };

  const failPayment = (reason: PaymentFailureReason, message: string) => {
    if (handledRef.current) return;

    handledRef.current = true;
    router.replace({
      pathname: "/payment-failed",
      params: {
        reason,
        message,
        planId: order.planId,
      },
    });
  };

  const completePayment = async (payment: RazorpayPaymentSuccess) => {
    if (handledRef.current) return;

    handledRef.current = true;
    setVerifying(true);
    setStatusText("Verifying payment...");

    let failureReason: PaymentFailureReason = "network_error";
    let fallbackMessage = "Unable to verify payment. Please check your connection.";

    try {
      const verification = await verifyPayment(payment);

      if (!verification.success) {
        router.replace({
          pathname: "/payment-failed",
          params: {
            reason: "verification_failed",
            message: verification.message || "Payment verification failed.",
            planId: order.planId,
          },
        });
        return;
      }

      setStatusText("Activating subscription...");
      failureReason = "activation_failed";
      fallbackMessage = "Payment completed, but subscription activation failed.";
      const subscription = await activateSubscription(order.planId, payment);

      router.replace({
        pathname: "/payment-success",
        params: {
          planName: subscription.planName,
          paymentId: payment.razorpay_payment_id,
        },
      });
    } catch (error) {
      router.replace({
        pathname: "/payment-failed",
        params: {
          reason: failureReason,
          message: error instanceof Error ? error.message : fallbackMessage,
          planId: order.planId,
        },
      });
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentMessage = (message: PaymentWebViewMessage) => {
    if (message.type === "success") {
      void completePayment(message.payload);
      return;
    }

    if (message.type === "cancelled") {
      failPayment("cancelled", message.message);
      return;
    }

    failPayment(message.reason, message.message);
  };

  if (!order.key || !order.orderId || !order.amount || !order.planId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Payment unavailable</Text>
        <Text style={styles.message}>The payment order is invalid. Please try again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PaymentWebView order={order} onMessage={handlePaymentMessage} />

      {verifying && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#5B4BFF" />
          <Text style={styles.status}>{statusText}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FF",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F5F7FF",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(245, 247, 255, 0.92)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  status: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
});
