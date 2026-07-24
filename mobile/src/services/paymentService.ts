import { AxiosError } from "axios";
import { doc, getDoc } from "firebase/firestore";

import { api } from "./api";
import { auth, db } from "./firebase";

export interface CreateOrderResponse {
  success: boolean;
  order_id?: string;
  amount?: number;
  currency?: string;
  key?: string;
  plan?: string;
  message?: string;
}

export interface RazorpayPaymentSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  subscription?: {
    planId: string;
    planName: string;
    scanLimit: number;
    subscriptionExpiry: number;
  };
}

export interface SubscriptionData {
  planId: string;
  planName: string;
  freeScanLimit: number;
  freeScansUsed: number;
  subscriptionActive: boolean;
  subscriptionExpiry: number | null;
  lastPaymentId?: string;
  lastOrderId?: string;
  updatedAt?: number;
}

const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as
      | {
          detail?: string;
          message?: string;
        }
      | undefined;

    if (responseData?.detail) {
      return responseData.detail;
    }

    if (responseData?.message) {
      return responseData.message;
    }

    if (error.code === "ECONNABORTED") {
      return "The request timed out. Please try again.";
    }

    if (!error.response) {
      return "Unable to connect to the payment server. Check your internet connection.";
    }

    if (error.response.status === 401) {
      return "Your login session could not be verified. Please sign in again.";
    }

    if (error.response.status === 403) {
      return "You are not authorized to perform this payment action.";
    }

    return `Payment server returned error ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

const getAuthenticatedUserToken = async (): Promise<string> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Please sign in again before continuing with the payment."
    );
  }

  try {
    /*
     * Force refresh so the backend receives a fresh Firebase ID token.
     * This is useful if the user logged in a while ago or token claims changed.
     */
    const idToken = await user.getIdToken(true);

    if (!idToken) {
      throw new Error(
        "Firebase did not return a valid authentication token."
      );
    }

    console.log("[PaymentService] Authenticated UID:", user.uid);
    console.log(
      "[PaymentService] Firebase token available:",
      Boolean(idToken)
    );

    return idToken;
  } catch (error) {
    console.error(
      "[PaymentService] Failed to obtain Firebase token:",
      error
    );

    throw new Error(
      "Unable to verify your login session. Please sign in again."
    );
  }
};

export const createOrder = async (
  plan: string
): Promise<CreateOrderResponse> => {
  if (!plan || plan === "free") {
    throw new Error("Please select a valid paid plan.");
  }

  try {
    const idToken = await getAuthenticatedUserToken();

    const response = await api.post<CreateOrderResponse>(
      "/payments/create-order",
      {
        plan,
      },
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = response.data;

    if (!data.success) {
      throw new Error(
        data.message || "Unable to create the payment order."
      );
    }

    if (
      !data.order_id ||
      !data.amount ||
      !data.currency ||
      !data.key
    ) {
      throw new Error(
        "The payment server returned incomplete order details."
      );
    }

    if (
      typeof data.amount !== "number" ||
      !Number.isFinite(data.amount) ||
      data.amount <= 0
    ) {
      throw new Error(
        "The payment server returned an invalid order amount."
      );
    }

    console.log("[PaymentService] Order created:", {
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      plan: data.plan || plan,
    });

    return data;
  } catch (error) {
    console.error("[PaymentService] createOrder failed:", error);

    throw new Error(
      getApiErrorMessage(
        error,
        "Unable to create the payment order."
      )
    );
  }
};

export const verifyPayment = async (
  payload: RazorpayPaymentSuccess
): Promise<VerifyPaymentResponse> => {
  if (
    !payload.razorpay_order_id ||
    !payload.razorpay_payment_id ||
    !payload.razorpay_signature
  ) {
    throw new Error("Incomplete Razorpay payment response.");
  }

  try {
    const idToken = await getAuthenticatedUserToken();

    const response = await api.post<VerifyPaymentResponse>(
      "/payments/verify",
      {
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_signature: payload.razorpay_signature,
      },
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = response.data;

    if (!data.success) {
      throw new Error(
        data.message || "Payment verification failed."
      );
    }

    console.log("[PaymentService] Payment verified:", {
      orderId: payload.razorpay_order_id,
      paymentId: payload.razorpay_payment_id,
      subscription: data.subscription,
    });

    return {
      success: true,
      message:
        data.message || "Payment verified successfully.",
      subscription: data.subscription,
    };
  } catch (error) {
    console.error("[PaymentService] verifyPayment failed:", error);

    throw new Error(
      getApiErrorMessage(
        error,
        "Unable to verify the payment."
      )
    );
  }
};

export const refreshSubscription =
  async (): Promise<SubscriptionData | null> => {
    const user = auth.currentUser;

    if (!user) {
      console.warn(
        "[PaymentService] Cannot refresh subscription without an authenticated user."
      );

      return null;
    }

    try {
      const userDoc = await getDoc(
        doc(db, "users", user.uid)
      );

      if (!userDoc.exists()) {
        console.warn(
          "[PaymentService] User document was not found:",
          user.uid
        );

        return null;
      }

      const data = userDoc.data();

      const subscriptionExpiry =
        typeof data.subscriptionExpiry === "number"
          ? data.subscriptionExpiry
          : null;

      const subscriptionActive =
        data.subscriptionActive === true &&
        (!subscriptionExpiry ||
          subscriptionExpiry > Date.now());

      return {
        planId:
          typeof data.planId === "string"
            ? data.planId
            : "free",

        planName:
          typeof data.planName === "string"
            ? data.planName
            : "Free Plan",

        freeScanLimit:
          typeof data.freeScanLimit === "number"
            ? data.freeScanLimit
            : 5,

        freeScansUsed:
          typeof data.freeScansUsed === "number"
            ? data.freeScansUsed
            : 0,

        subscriptionActive,
        subscriptionExpiry,

        lastPaymentId:
          typeof data.lastPaymentId === "string"
            ? data.lastPaymentId
            : undefined,

        lastOrderId:
          typeof data.lastOrderId === "string"
            ? data.lastOrderId
            : undefined,

        updatedAt:
          typeof data.updatedAt === "number"
            ? data.updatedAt
            : undefined,
      };
    } catch (error) {
      console.error(
        "[PaymentService] refreshSubscription failed:",
        error
      );

      return null;
    }
  };