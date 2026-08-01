import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  router,
  useLocalSearchParams,
} from "expo-router";

import PaymentWebView from "../components/PaymentWebView";
import {
  getNumberParam,
  getStringParam,
  PaymentWebViewMessage,
  RazorpayCheckoutOrder,
} from "../utils/payment";
import {
  refreshScanPack,
  verifyPayment,
} from "../services/paymentService";

export default function PaymentScreen() {
  const params = useLocalSearchParams();

  const order = useMemo<RazorpayCheckoutOrder>(() => {
    return {
      key: getStringParam(params.key),
      orderId: getStringParam(params.orderId),
      amount: getNumberParam(params.amount),
      currency:
        getStringParam(params.currency, "INR") ||
        "INR",
      planId: getStringParam(params.planId),
      planName:
        getStringParam(
          params.planName,
          "Subscription Plan"
        ) || "Subscription Plan",
      userName: getStringParam(params.userName),
      userEmail: getStringParam(params.userEmail),
      userPhone: getStringParam(params.userPhone),
      paymentMethod: getStringParam(
        params.paymentMethod,
        "auto"
      ),
    };
  }, [
    params.key,
    params.orderId,
    params.amount,
    params.currency,
    params.planId,
    params.planName,
    params.userName,
    params.userEmail,
    params.userPhone,
    params.paymentMethod,
  ]);

  const isOrderValid = useMemo(() => {
    return (
      Boolean(order.key) &&
      Boolean(order.orderId) &&
      Number.isFinite(order.amount) &&
      order.amount > 0 &&
      Boolean(order.currency) &&
      Boolean(order.planId)
    );
  }, [
    order.key,
    order.orderId,
    order.amount,
    order.currency,
    order.planId,
  ]);

  const [verifying, setVerifying] =
    useState(false);

  // Used to recreate checkout after retry.
  const [checkoutKey, setCheckoutKey] =
    useState(0);

  // Prevent duplicate Razorpay callbacks.
  const verifyingRef = useRef(false);

  // Prevent handling success/failure/dismissed repeatedly.
  const messageHandledRef = useRef(false);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/plans");
  }, []);

  const resetCheckout = useCallback(() => {
    verifyingRef.current = false;
    messageHandledRef.current = false;
    setVerifying(false);
    setCheckoutKey((previous) => previous + 1);
  }, []);

  const handlePaymentMessage = useCallback(
    async (message: PaymentWebViewMessage) => {
      console.log(
        "[PaymentScreen] Payment message:",
        message
      );

      if (message.type === "success") {
        if (
          verifyingRef.current ||
          messageHandledRef.current
        ) {
          console.log(
            "[PaymentScreen] Duplicate payment callback ignored."
          );
          return;
        }

        const paymentId =
          message.razorpay_payment_id;
        const responseOrderId =
          message.razorpay_order_id;
        const signature =
          message.razorpay_signature;

        if (
          !paymentId ||
          !responseOrderId ||
          !signature
        ) {
          console.error(
            "[PaymentScreen] Incomplete Razorpay response:",
            message
          );

          Alert.alert(
            "Invalid Payment Response",
            "Razorpay did not return complete payment information. Please try again.",
            [
              {
                text: "Try Again",
                onPress: resetCheckout,
              },
              {
                text: "Go Back",
                onPress: handleClose,
              },
            ]
          );

          return;
        }

        if (responseOrderId !== order.orderId) {
          console.error(
            "[PaymentScreen] Order mismatch:",
            {
              expectedOrderId: order.orderId,
              receivedOrderId: responseOrderId,
            }
          );

          Alert.alert(
            "Payment Verification Failed",
            "The returned payment does not match the current order.",
            [
              {
                text: "Try Again",
                onPress: resetCheckout,
              },
              {
                text: "Go Back",
                onPress: handleClose,
              },
            ]
          );

          return;
        }

        verifyingRef.current = true;
        messageHandledRef.current = true;
        setVerifying(true);

        try {
          console.log(
            "[PaymentScreen] Verifying payment on backend:",
            {
              orderId: responseOrderId,
              paymentId,
            }
          );

          const verificationResult =
            await verifyPayment({
              razorpay_order_id:
                responseOrderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });

          console.log(
            "[PaymentScreen] Verification response:",
            verificationResult
          );

          /*
           * Critical:
           * Do not show success merely because Razorpay called
           * its success handler.
           *
           * The backend must explicitly confirm success.
           */
          if (
            !verificationResult ||
            verificationResult.success !== true
          ) {
            throw new Error(
              verificationResult?.message ||
                "The backend could not verify this payment."
            );
          }

          try {
            await refreshScanPack();
          } catch (refreshError) {
            /*
             * Payment has already been securely verified.
             * Subscription refresh failure should not convert
             * a successful payment into a failed payment.
             */
            console.warn(
              "[PaymentScreen] Subscription refresh failed:",
              refreshError
            );
          }

          router.replace({
            pathname: "/payment-success",
            params: {
              planId: order.planId,
              planName: order.planName,
              paymentId,
              orderId: responseOrderId,
            },
          });
        } catch (error) {
          console.error(
            "[PaymentScreen] Verification failed:",
            error
          );

          verifyingRef.current = false;
          messageHandledRef.current = false;
          setVerifying(false);

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Payment verification failed.";

          Alert.alert(
            "Verification Failed",
            `${errorMessage}\n\nYour subscription has not been activated.`,
            [
              {
                text: "Verify Again",
                onPress: async () => {
                  /*
                   * Re-process the same Razorpay response.
                   * Useful when verification failed because of
                   * a temporary network or Firebase-token issue.
                   */
                  await handlePaymentMessage(message);
                },
              },
              {
                text: "Go Back",
                onPress: handleClose,
              },
            ],
            {
              cancelable: false,
            }
          );
        }

        return;
      }

      if (messageHandledRef.current) {
        return;
      }

      if (message.type === "dismissed") {
        messageHandledRef.current = true;

        console.log(
          "[PaymentScreen] Checkout dismissed."
        );

        Alert.alert(
          "Payment Cancelled",
          "You closed the payment screen. Your subscription has not been activated.",
          [
            {
              text: "Try Again",
              onPress: resetCheckout,
            },
            {
              text: "Go Back",
              onPress: handleClose,
            },
          ],
          {
            cancelable: false,
          }
        );

        return;
      }

      messageHandledRef.current = true;

      console.log(
        "[PaymentScreen] Payment failure:",
        {
          reason:
            "reason" in message
              ? message.reason
              : undefined,
          code:
            "code" in message
              ? message.code
              : undefined,
          description:
            "description" in message
              ? message.description
              : undefined,
          message:
            "message" in message
              ? message.message
              : undefined,
        }
      );

      const failureMessage =
        "message" in message && message.message
          ? message.message
          : "The payment could not be completed.";

      Alert.alert(
        "Payment Failed",
        `${failureMessage}\n\nYour subscription has not been activated.`,
        [
          {
            text: "Try Again",
            onPress: resetCheckout,
          },
          {
            text: "Go Back",
            onPress: handleClose,
          },
        ],
        {
          cancelable: false,
        }
      );
    },
    [
      handleClose,
      order.orderId,
      order.planId,
      order.planName,
      resetCheckout,
    ]
  );

  if (!isOrderValid) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Unable to start payment
          </Text>

          <Text style={styles.errorMessage}>
            The payment order details are missing or
            invalid. Please return to the plans page and
            create a new payment order.
          </Text>

          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>
              Payment details
            </Text>

            <Text style={styles.debugText}>
              Order ID:{" "}
              {order.orderId || "Missing"}
            </Text>

            <Text style={styles.debugText}>
              Key:{" "}
              {order.key
                ? "Available"
                : "Missing"}
            </Text>

            <Text style={styles.debugText}>
              Amount:{" "}
              {order.amount > 0
                ? order.amount
                : "Invalid"}
            </Text>

            <Text style={styles.debugText}>
              Currency:{" "}
              {order.currency || "Missing"}
            </Text>

            <Text style={styles.debugText}>
              Plan: {order.planId || "Missing"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.85}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (verifying) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.verifyContainer}>
          <ActivityIndicator
            size="large"
            color="#5B4BFF"
          />

          <Text style={styles.verifyTitle}>
            Verifying payment
          </Text>

          <Text style={styles.verifyText}>
            Please wait while we securely confirm your
            payment with the server.
          </Text>

          <Text style={styles.verifyWarning}>
            Do not close the application.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PaymentWebView
        key={checkoutKey}
        order={order}
        onMessage={handlePaymentMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FF",
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  errorTitle: {
    marginBottom: 12,
    color: "#18152D",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  errorMessage: {
    marginBottom: 20,
    color: "#66647A",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  debugBox: {
    width: "100%",
    maxWidth: 420,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "#DDDDF0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },

  debugTitle: {
    marginBottom: 10,
    color: "#27233F",
    fontSize: 15,
    fontWeight: "700",
  },

  debugText: {
    marginBottom: 5,
    color: "#67647A",
    fontSize: 13,
    lineHeight: 19,
  },

  closeButton: {
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#5B4BFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },

  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  verifyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  verifyTitle: {
    marginTop: 20,
    color: "#18152D",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  verifyText: {
    marginTop: 10,
    color: "#66647A",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  verifyWarning: {
    marginTop: 10,
    color: "#8A879C",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});