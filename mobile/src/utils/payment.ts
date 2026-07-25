/**
 * Razorpay Checkout utilities
 *
 * Test mode:
 * - No real money is deducted.
 * - UPI test success: success@razorpay
 * - UPI test failure: failure@razorpay
 *
 * Live mode:
 * - Installed UPI applications can be opened using UPI Intent.
 * - Razorpay decides whether to show UPI apps or QR based on device/platform.
 */

export const IS_RAZORPAY_TEST_MODE = true;

export type RazorpayPaymentMethod =
  | "auto"
  | "upi"
  | "card"
  | "netbanking"
  | "wallet";

export interface RazorpayCheckoutOrder {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;

  userName?: string;
  userEmail?: string;
  userPhone?: string;

  paymentMethod?: RazorpayPaymentMethod;
}

export interface RazorpayPaymentDetails {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type PaymentWebViewMessage =
  | {
      type: "success";
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  | {
      type: "failure";
      reason: string;
      message: string;
      code?: string;
      description?: string;
    }
  | {
      type: "dismissed";
      reason: string;
      message: string;
    }
  | {
      type: "external_url";
      url: string;
    };

export const getStringParam = (
  value: unknown,
  fallback = ""
): string => {
  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (typeof firstValue === "string") {
      return firstValue.trim() || fallback;
    }

    return fallback;
  }

  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  return fallback;
};

export const getNumberParam = (
  value: unknown,
  fallback = 0
): number => {
  const stringValue = getStringParam(value);
  const parsedValue = Number(stringValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback;
};

/**
 * Escapes values before inserting them inside the generated HTML.
 */
const escapeHtmlValue = (
  value: string | number | undefined | null
): string => {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
};

const getPaymentMethodConfiguration = (
  selectedMethod: RazorpayPaymentMethod
): string => {
  switch (selectedMethod) {
    case "upi":
      return `{
        upi: true,
        card: false,
        netbanking: false,
        wallet: false,
        emi: false,
        paylater: false
      }`;

    case "card":
      return `{
        upi: false,
        card: true,
        netbanking: false,
        wallet: false,
        emi: false,
        paylater: false
      }`;

    case "netbanking":
      return `{
        upi: false,
        card: false,
        netbanking: true,
        wallet: false,
        emi: false,
        paylater: false
      }`;

    case "wallet":
      return `{
        upi: false,
        card: false,
        netbanking: false,
        wallet: true,
        emi: false,
        paylater: false
      }`;

    case "auto":
    default:
      return `{
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
        emi: false,
        paylater: false
      }`;
  }
};

export const buildRazorpayCheckoutHtml = (
  order: RazorpayCheckoutOrder
): string => {
  const key = escapeHtmlValue(order.key);
  const orderId = escapeHtmlValue(order.orderId);
  const amount = Number(order.amount);

  const currency = escapeHtmlValue(
    order.currency || "INR"
  );

  const planId = escapeHtmlValue(order.planId);
  const planName = escapeHtmlValue(order.planName);

  const userName = escapeHtmlValue(
    order.userName || ""
  );

  const userEmail = escapeHtmlValue(
    order.userEmail || ""
  );

  const userPhone = escapeHtmlValue(
    order.userPhone || ""
  );

  const selectedPaymentMethod:
    RazorpayPaymentMethod =
    order.paymentMethod || "auto";

  const paymentMethodConfiguration =
    getPaymentMethodConfiguration(
      selectedPaymentMethod
    );

  console.log(
    "[PaymentUtils] Building Razorpay checkout:",
    {
      mode: IS_RAZORPAY_TEST_MODE
        ? "test"
        : "live",
      selectedPaymentMethod,
      orderId,
      amount,
      currency,
      planId,
    }
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />

  <title>Complete Payment</title>

  <script
    src="https://checkout.razorpay.com/v1/checkout.js"
  ></script>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html,
    body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f5f7ff;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;
    }

    #payment-root {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f7ff;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      text-align: center;
    }

    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #e2e5ff;
      border-top-color: #5b4bff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-title {
      color: #27233f;
      font-size: 16px;
      font-weight: 700;
    }

    .loading-description {
      max-width: 280px;
      color: #69677a;
      font-size: 13px;
      line-height: 19px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  </style>
</head>

<body>
  <div id="payment-root">
    <div class="loading-container">
      <div class="spinner"></div>

      <div class="loading-title">
        Opening secure payment gateway...
      </div>

      <div class="loading-description">
        Please do not close the application while
        Razorpay Checkout is loading.
      </div>
    </div>
  </div>

  <script>
    (function () {
      var checkoutOpened = false;
      var finalMessageSent = false;
      var paymentCompleted = false;
      var checkoutDismissed = false;

      function postMessageToApp(payload, finalMessage) {
        if (finalMessage && finalMessageSent) {
          return;
        }

        if (finalMessage) {
          finalMessageSent = true;
        }

        try {
          var serializedPayload =
            JSON.stringify(payload);

          if (
            window.ReactNativeWebView &&
            typeof window.ReactNativeWebView
              .postMessage === "function"
          ) {
            window.ReactNativeWebView.postMessage(
              serializedPayload
            );

            return;
          }

          console.log(
            "[RazorpayCheckout] React Native bridge unavailable:",
            serializedPayload
          );
        } catch (error) {
          console.error(
            "[RazorpayCheckout] Could not send message:",
            error
          );
        }
      }

      function getErrorMessage(error) {
        if (!error) {
          return "The payment could not be completed.";
        }

        if (
          typeof error.description === "string" &&
          error.description.trim()
        ) {
          return error.description;
        }

        if (
          typeof error.reason === "string" &&
          error.reason.trim()
        ) {
          return error.reason;
        }

        if (
          typeof error.message === "string" &&
          error.message.trim()
        ) {
          return error.message;
        }

        return "The payment could not be completed.";
      }

      function openCheckout() {
        if (checkoutOpened) {
          return;
        }

        checkoutOpened = true;

        if (typeof Razorpay === "undefined") {
          postMessageToApp(
            {
              type: "failure",
              reason: "razorpay_script_failed",
              message:
                "Razorpay Checkout could not load. Check your internet connection."
            },
            true
          );

          return;
        }

        var options = {
          key: \`${key}\`,
          order_id: \`${orderId}\`,
          amount: ${
            Number.isFinite(amount) && amount > 0
              ? amount
              : 0
          },
          currency: \`${currency}\`,

          name: "Card Flow Credits",
          description: \`${planName}\`,

          /*
           * REQUIRED for UPI apps inside Android/iOS WebView.
           * Do not disable this in test mode.
           */
          webview_intent: true,

          /*
           * Shows the selected payment method.
           * "All" enables UPI, cards, wallets and netbanking.
           */
          method: ${paymentMethodConfiguration},

          prefill: {
            name: \`${userName}\`,
            email: \`${userEmail}\`,
            contact: \`${userPhone}\`
          },

          notes: {
            planId: \`${planId}\`,
            planName: \`${planName}\`,
            selectedMethod:
              \`${selectedPaymentMethod}\`
          },

          theme: {
            color: "#09A84E",
            backdrop_color:
              "rgba(13, 16, 36, 0.62)"
          },

          retry: {
            enabled: true,
            max_count: 3
          },

          remember_customer: false,

          handler: function (response) {
            paymentCompleted = true;

            if (
              !response ||
              !response.razorpay_order_id ||
              !response.razorpay_payment_id ||
              !response.razorpay_signature
            ) {
              postMessageToApp(
                {
                  type: "failure",
                  reason:
                    "incomplete_payment_response",
                  message:
                    "Razorpay returned incomplete payment information."
                },
                true
              );

              return;
            }

            console.log(
              "[RazorpayCheckout] Payment successful:",
              {
                orderId:
                  response.razorpay_order_id,
                paymentId:
                  response.razorpay_payment_id
              }
            );

            postMessageToApp(
              {
                type: "success",
                razorpay_order_id:
                  response.razorpay_order_id,
                razorpay_payment_id:
                  response.razorpay_payment_id,
                razorpay_signature:
                  response.razorpay_signature
              },
              true
            );
          },

          modal: {
            confirm_close: true,
            animation: true,
            escape: false,

            ondismiss: function () {
              checkoutDismissed = true;

              /*
               * Do not send "dismissed" after success.
               * Razorpay can call ondismiss while redirecting
               * back from an external UPI application.
               */
              setTimeout(function () {
                if (
                  paymentCompleted ||
                  finalMessageSent
                ) {
                  return;
                }

                postMessageToApp(
                  {
                    type: "dismissed",
                    reason: "checkout_closed",
                    message:
                      "Payment Checkout was closed before completion."
                  },
                  true
                );
              }, 800);
            }
          }
        };

        try {
          var razorpay = new Razorpay(options);

          razorpay.on(
            "payment.failed",
            function (response) {
              var error =
                response && response.error
                  ? response.error
                  : {};

              console.log(
                "[RazorpayCheckout] Payment failed:",
                {
                  reason: error.reason,
                  code: error.code,
                  description:
                    error.description,
                  source: error.source,
                  step: error.step
                }
              );

              postMessageToApp(
                {
                  type: "failure",
                  reason:
                    error.reason ||
                    "payment_failed",
                  code: error.code || "",
                  description:
                    error.description || "",
                  message:
                    getErrorMessage(error)
                },
                true
              );
            }
          );

          razorpay.open();
        } catch (error) {
          console.error(
            "[RazorpayCheckout] Checkout opening failed:",
            error
          );

          postMessageToApp(
            {
              type: "failure",
              reason: "checkout_failed",
              message:
                error &&
                typeof error.message === "string"
                  ? error.message
                  : "Unable to open Razorpay Checkout."
            },
            true
          );
        }
      }

      window.addEventListener(
        "error",
        function (event) {
          console.error(
            "[RazorpayCheckout] Window error:",
            event.message
          );
        }
      );

      window.addEventListener(
        "unhandledrejection",
        function (event) {
          console.error(
            "[RazorpayCheckout] Unhandled promise rejection:",
            event.reason
          );
        }
      );

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            setTimeout(openCheckout, 400);
          }
        );
      } else {
        setTimeout(openCheckout, 400);
      }
    })();
  </script>
</body>
</html>
`;
};