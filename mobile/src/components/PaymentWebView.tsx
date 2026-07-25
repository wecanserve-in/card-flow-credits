import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  WebView,
  WebViewMessageEvent,
} from "react-native-webview";

import { Ionicons } from "@expo/vector-icons";

import {
  buildRazorpayCheckoutHtml,
  IS_RAZORPAY_TEST_MODE,
  PaymentWebViewMessage,
  RazorpayCheckoutOrder,
} from "../utils/payment";

interface PaymentWebViewProps {
  order: RazorpayCheckoutOrder;

  onMessage: (
    message: PaymentWebViewMessage
  ) => void;
}

interface WebViewLoadRequest {
  url?: string;
  title?: string;
  loading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  navigationType?: string;
  mainDocumentURL?: string;
}

const WEB_URL_PREFIXES = [
  "https://",
  "http://",
  "about:",
  "data:",
  "blob:",
  "javascript:",
];

const PAYMENT_URL_PREFIXES = [
  "upi://",
  "tez://",
  "gpay://",
  "phonepe://",
  "paytmmp://",
  "bhim://",
  "cred://",
  "amazonpay://",
  "mobikwik://",
  "intent://",
];

const isNormalWebUrl = (
  url: string
): boolean => {
  const normalizedUrl = url
    .trim()
    .toLowerCase();

  return WEB_URL_PREFIXES.some(
    (prefix) =>
      normalizedUrl.startsWith(prefix)
  );
};

const isPaymentAppUrl = (
  url: string
): boolean => {
  const normalizedUrl = url
    .trim()
    .toLowerCase();

  return PAYMENT_URL_PREFIXES.some(
    (prefix) =>
      normalizedUrl.startsWith(prefix)
  );
};

const convertAndroidIntentToUpiUrl = (
  intentUrl: string
): string | null => {
  try {
    const normalizedUrl =
      intentUrl.toLowerCase();

    if (
      !normalizedUrl.startsWith(
        "intent://"
      )
    ) {
      return null;
    }

    const intentParts =
      intentUrl.split("#Intent;");

    if (!intentParts[0]) {
      return null;
    }

    const schemeMatch =
      intentUrl.match(
        /scheme=([^;]+)/i
      );

    const scheme =
      schemeMatch?.[1]
        ? decodeURIComponent(
            schemeMatch[1]
          )
        : "upi";

    return intentParts[0].replace(
      /^intent:\/\//i,
      `${scheme}://`
    );
  } catch (error) {
    console.error(
      "[PaymentWebView] Intent URL conversion failed:",
      error
    );

    return null;
  }
};

export default function PaymentWebView({
  order,
  onMessage,
}: PaymentWebViewProps) {
  const webViewRef =
    useRef<WebView>(null);

  const messageHandledRef =
    useRef(false);

  const externalAppOpeningRef =
    useRef(false);

  const html = useMemo(() => {
    console.log(
      "[PaymentWebView] Building checkout HTML:",
      {
        mode: IS_RAZORPAY_TEST_MODE
          ? "test"
          : "live",

        orderId: order.orderId,

        amount: order.amount,

        paymentMethod:
          order.paymentMethod ||
          "auto",
      }
    );

    return buildRazorpayCheckoutHtml(
      order
    );
  }, [
    order.key,
    order.orderId,
    order.amount,
    order.currency,
    order.planId,
    order.planName,
    order.userName,
    order.userEmail,
    order.userPhone,
    order.paymentMethod,
  ]);

  useEffect(() => {
    messageHandledRef.current =
      false;

    externalAppOpeningRef.current =
      false;
  }, [order.orderId]);

  const sendMessageOnce =
    useCallback(
      (
        message: PaymentWebViewMessage
      ) => {
        if (
          messageHandledRef.current
        ) {
          return;
        }

        messageHandledRef.current =
          true;

        onMessage(message);
      },
      [onMessage]
    );

  const openPaymentApplication =
    useCallback(
      async (
        requestedUrl: string
      ): Promise<void> => {
        if (
          externalAppOpeningRef.current
        ) {
          return;
        }

        externalAppOpeningRef.current =
          true;

        try {
          let paymentUrl =
            requestedUrl;

          if (
            Platform.OS ===
              "android" &&
            requestedUrl
              .toLowerCase()
              .startsWith(
                "intent://"
              )
          ) {
            const convertedUrl =
              convertAndroidIntentToUpiUrl(
                requestedUrl
              );

            if (convertedUrl) {
              paymentUrl =
                convertedUrl;
            }
          }

          console.log(
            "[PaymentWebView] Opening external payment app:",
            paymentUrl
          );

          const canOpenUrl =
            await Linking.canOpenURL(
              paymentUrl
            );

          if (!canOpenUrl) {
            throw new Error(
              "No supported UPI application was found on this device."
            );
          }

          await Linking.openURL(
            paymentUrl
          );
        } catch (error) {
          console.error(
            "[PaymentWebView] Payment app opening failed:",
            error
          );

          sendMessageOnce({
            type: "failure",

            reason:
              "upi_app_not_found",

            message:
              error instanceof Error
                ? error.message
                : "No supported UPI application was found on this device.",
          });
        } finally {
          setTimeout(() => {
            externalAppOpeningRef.current =
              false;
          }, 1200);
        }
      },
      [sendMessageOnce]
    );

  const handleShouldStartLoad =
    useCallback(
      (
        request: WebViewLoadRequest
      ): boolean => {
        const requestedUrl =
          request.url?.trim();

        if (!requestedUrl) {
          return false;
        }

        console.log(
          "[PaymentWebView] Navigation requested:",
          requestedUrl
        );

        if (
          isPaymentAppUrl(
            requestedUrl
          )
        ) {
          void openPaymentApplication(
            requestedUrl
          );

          return false;
        }

        if (
          isNormalWebUrl(
            requestedUrl
          )
        ) {
          return true;
        }

        if (
          requestedUrl.includes(
            "://"
          )
        ) {
          void openPaymentApplication(
            requestedUrl
          );

          return false;
        }

        return true;
      },
      [openPaymentApplication]
    );

  const handleMessage =
    useCallback(
      (
        event: WebViewMessageEvent
      ) => {
        const rawMessage =
          event.nativeEvent.data;

        console.log(
          "[PaymentWebView] Raw message:",
          rawMessage
        );

        try {
          const parsedMessage =
            JSON.parse(
              rawMessage
            ) as PaymentWebViewMessage;

          if (
            !parsedMessage ||
            typeof parsedMessage !==
              "object" ||
            typeof parsedMessage.type !==
              "string"
          ) {
            throw new Error(
              "Invalid payment gateway response."
            );
          }

          console.log(
            "[PaymentWebView] Parsed message:",
            parsedMessage
          );

          if (
            parsedMessage.type ===
            "success"
          ) {
            console.log(
              "[PaymentWebView] Payment SUCCESS:",
              {
                orderId:
                  (
                    parsedMessage as any
                  )
                    .razorpay_order_id,

                paymentId:
                  (
                    parsedMessage as any
                  )
                    .razorpay_payment_id,
              }
            );
          } else if (
            parsedMessage.type ===
            "failure"
          ) {
            console.log(
              "[PaymentWebView] Payment FAILURE:",
              {
                reason:
                  (
                    parsedMessage as any
                  ).reason,

                code:
                  (
                    parsedMessage as any
                  ).code,

                description:
                  (
                    parsedMessage as any
                  ).description,

                message:
                  (
                    parsedMessage as any
                  ).message,
              }
            );
          }

          sendMessageOnce(
            parsedMessage
          );
        } catch (error) {
          console.error(
            "[PaymentWebView] Invalid response:",
            error
          );

          sendMessageOnce({
            type: "failure",

            reason:
              "invalid_response",

            message:
              "The payment gateway returned an invalid response.",
          });
        }
      },
      [sendMessageOnce]
    );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{
          html,

          baseUrl:
            "https://checkout.razorpay.com",
        }}
        style={styles.webView}
        containerStyle={
          styles.webViewOuter
        }
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={
          true
        }
        mixedContentMode="always"
        setSupportMultipleWindows={
          false
        }
        javaScriptCanOpenWindowsAutomatically={
          true
        }
        startInLoadingState={true}
        allowsBackForwardNavigationGestures={
          false
        }
        onShouldStartLoadWithRequest={
          handleShouldStartLoad
        }
        onMessage={handleMessage}
        onError={(event) => {
          const errorMessage =
            event.nativeEvent
              .description ||
            "Unable to open the payment gateway.";

          console.error(
            "[PaymentWebView] WebView error:",
            event.nativeEvent
          );

          sendMessageOnce({
            type: "failure",

            reason:
              "network_error",

            message: errorMessage,
          });
        }}
        onHttpError={(event) => {
          console.error(
            "[PaymentWebView] HTTP error:",
            event.nativeEvent
              .statusCode,

            event.nativeEvent
              .description,

            event.nativeEvent.url
          );
        }}
        onContentProcessDidTerminate={() => {
          console.error(
            "[PaymentWebView] WebView process terminated."
          );

          sendMessageOnce({
            type: "failure",

            reason:
              "checkout_failed",

            message:
              "The payment gateway stopped unexpectedly. Please try again.",
          });
        }}
        renderLoading={() => (
          <PaymentLoader
            planName={
              order.planName
            }
          />
        )}
      />
    </View>
  );
}

function PaymentLoader({
  planName,
}: {
  planName?: string;
}) {
  return (
    <View style={styles.loader}>
      <View style={styles.loaderCard}>
        <View
          style={
            styles.loaderIconOuter
          }
        >
          <View
            style={
              styles.loaderIconInner
            }
          >
            <ActivityIndicator
              size="large"
              color="#09A84E"
            />
          </View>

          <View
            style={styles.lockBadge}
          >
            <Ionicons
              name="lock-closed"
              size={14}
              color="#FFFFFF"
            />
          </View>
        </View>

        <Text
          style={styles.loaderTitle}
        >
          Opening secure checkout
        </Text>

        <Text
          style={styles.loaderText}
        >
          Preparing Razorpay for your{" "}
          {planName ||
            "subscription plan"}.
        </Text>

        <View
          style={
            styles.loadingStatus
          }
        >
          <View
            style={styles.statusDot}
          />

          <Text
            style={
              styles.loadingStatusText
            }
          >
            Connecting securely
          </Text>
        </View>

        <View
          style={
            styles.securityMessage
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color="#09A84E"
          />

          <Text
            style={
              styles.securityMessageText
            }
          >
            Your payment information is
            protected and processed by
            Razorpay.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },

  webViewOuter: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  webView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  loader: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,

    paddingHorizontal: 22,

    backgroundColor: "#F7F9F8",

    alignItems: "center",
    justifyContent: "center",
  },

  loaderCard: {
    width: "100%",
    maxWidth: 380,

    paddingHorizontal: 24,
    paddingVertical: 30,

    borderRadius: 25,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#E4EAE6",

    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  loaderIconOuter: {
    position: "relative",

    width: 96,
    height: 96,

    borderRadius: 31,

    backgroundColor: "#EAF8F0",

    alignItems: "center",
    justifyContent: "center",
  },

  loaderIconInner: {
    width: 72,
    height: 72,

    borderRadius: 24,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#DDEFE4",

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.11,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  lockBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,

    width: 34,
    height: 34,

    borderRadius: 12,

    backgroundColor: "#09A84E",

    borderWidth: 4,
    borderColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",
  },

  loaderTitle: {
    marginTop: 23,

    color: "#222824",

    fontSize: 20,
    fontWeight: "900",

    textAlign: "center",
  },

  loaderText: {
    maxWidth: 300,

    marginTop: 8,

    color: "#79837D",

    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",

    textAlign: "center",
  },

  loadingStatus: {
    minHeight: 37,

    marginTop: 20,
    paddingHorizontal: 13,

    borderRadius: 12,

    backgroundColor: "#EAF8F0",

    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    backgroundColor: "#09A84E",
  },

  loadingStatusText: {
    marginLeft: 7,

    color: "#078E42",

    fontSize: 10.5,
    fontWeight: "800",
  },

  securityMessage: {
    width: "100%",

    minHeight: 52,

    marginTop: 20,
    paddingHorizontal: 13,

    borderRadius: 15,

    backgroundColor: "#F7FAF8",

    borderWidth: 1,
    borderColor: "#E4EAE6",

    flexDirection: "row",
    alignItems: "center",
  },

  securityMessageText: {
    flex: 1,

    marginLeft: 9,

    color: "#737E77",

    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600",
  },
});