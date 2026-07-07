import type { RazorpayPaymentSuccess } from "../services/paymentService";

export type PaymentFailureReason =
  | "cancelled"
  | "checkout_failed"
  | "network_error"
  | "verification_failed"
  | "activation_failed"
  | "invalid_order";

export interface RazorpayCheckoutOrder {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
}

export type PaymentWebViewMessage =
  | {
      type: "success";
      payload: RazorpayPaymentSuccess;
    }
  | {
      type: "failure";
      reason: PaymentFailureReason;
      message: string;
    }
  | {
      type: "cancelled";
      message: string;
    };

export const getStringParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export const buildRazorpayCheckoutHtml = (order: RazorpayCheckoutOrder): string => {
  const options = {
    key: order.key,
    amount: order.amount,
    currency: order.currency,
    name: "Card Flow Credits",
    description: order.planName,
    order_id: order.orderId,
    theme: {
      color: "#5B4BFF",
    },
  };

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
      html, body {
        margin: 0;
        height: 100%;
        background: #F5F7FF;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .page {
        min-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #111827;
      }
      .loader {
        width: 42px;
        height: 42px;
        border: 4px solid #D8D5FF;
        border-top-color: #5B4BFF;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="loader" aria-label="Opening payment"></div>
    </div>
    <script>
      function sendMessage(message) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }

      function openCheckout() {
        if (!window.Razorpay) {
          sendMessage({
            type: "failure",
            reason: "network_error",
            message: "Unable to load Razorpay Checkout. Please check your connection."
          });
          return;
        }

        var options = ${JSON.stringify(options)};

        options.handler = function(response) {
          sendMessage({
            type: "success",
            payload: {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }
          });
        };

        options.modal = {
          ondismiss: function() {
            sendMessage({
              type: "cancelled",
              message: "Payment was cancelled."
            });
          }
        };

        var checkout = new window.Razorpay(options);

        checkout.on("payment.failed", function(response) {
          var error = response && response.error;
          sendMessage({
            type: "failure",
            reason: "checkout_failed",
            message: (error && (error.description || error.reason)) || "Payment failed. Please try again."
          });
        });

        checkout.open();
      }

      if (document.readyState === "complete") {
        openCheckout();
      } else {
        window.addEventListener("load", openCheckout);
      }
    </script>
  </body>
</html>`;
};
