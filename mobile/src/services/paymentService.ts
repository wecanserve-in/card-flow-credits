import { doc, updateDoc } from "firebase/firestore";

import { PLANS } from "../constants/plans";
import { auth, db } from "./firebase";
import { api } from "./api";

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  amount: number;
  currency: string;
  key: string;
  plan: string;
  message?: string;
}

export interface RazorpayPaymentSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

export interface ActivatedSubscription {
  planId: string;
  planName: string;
  scanLimit: number;
  subscriptionExpiry: number;
}

export const createOrder = async (plan: string): Promise<CreateOrderResponse> => {
  const response = await api.post<CreateOrderResponse>("/payments/create-order", {
    plan,
  });

  return response.data;
};

export const verifyPayment = async (
  payload: RazorpayPaymentSuccess
): Promise<VerifyPaymentResponse> => {
  const response = await api.post<VerifyPaymentResponse>("/payments/verify", payload);

  return response.data;
};

export const activateSubscription = async (
  planId: string,
  payment: RazorpayPaymentSuccess
): Promise<ActivatedSubscription> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in again to activate your subscription.");
  }

  const plan = PLANS.find((item) => item.id === planId);

  if (!plan || plan.id === "free") {
    throw new Error("Invalid paid plan selected.");
  }

  const now = Date.now();
  const isYearlyPlan = plan.interval === "Year";
  const subscriptionExpiry = now + (isYearlyPlan ? 365 : 30) * 24 * 60 * 60 * 1000;
  const planName = `${plan.name} ${isYearlyPlan ? "Yearly" : "Monthly"} Plan`;

  await updateDoc(doc(db, "users", user.uid), {
    planId: plan.id,
    planName,
    freeScanLimit: plan.scans,
    subscriptionActive: true,
    subscriptionExpiry,
    lastPaymentId: payment.razorpay_payment_id,
    lastOrderId: payment.razorpay_order_id,
    updatedAt: now,
  });

  return {
    planId: plan.id,
    planName,
    scanLimit: plan.scans,
    subscriptionExpiry,
  };
};
