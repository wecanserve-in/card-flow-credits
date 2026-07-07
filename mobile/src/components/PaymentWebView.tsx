import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import {
  buildRazorpayCheckoutHtml,
  PaymentWebViewMessage,
  RazorpayCheckoutOrder,
} from "../utils/payment";

interface PaymentWebViewProps {
  order: RazorpayCheckoutOrder;
  onMessage: (message: PaymentWebViewMessage) => void;
}

export default function PaymentWebView({ order, onMessage }: PaymentWebViewProps) {
  const html = useMemo(() => buildRazorpayCheckoutHtml(order), [order]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      onMessage(JSON.parse(event.nativeEvent.data) as PaymentWebViewMessage);
    } catch {
      onMessage({
        type: "failure",
        reason: "checkout_failed",
        message: "Unable to read payment response.",
      });
    }
  };

  return (
    <WebView
      source={{ html, baseUrl: "https://checkout.razorpay.com" }}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      startInLoadingState
      onMessage={handleMessage}
      onError={() =>
        onMessage({
          type: "failure",
          reason: "network_error",
          message: "Unable to open payment gateway. Please check your connection.",
        })
      }
      renderLoading={() => (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#5B4BFF" />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "#F5F7FF",
    justifyContent: "center",
  },
});
