import AsyncStorage from "@react-native-async-storage/async-storage";
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

  scanPack?: {
    packId: string;
    packName: string;
    totalScans: number;
    remainingScans: number;
  };
}



export interface ScanPackData {

  packId: string;

  packName: string;

  totalScans: number;

  usedScans: number;

  remainingScans: number;


  lastPaymentId?: string;

  lastOrderId?: string;

  updatedAt?: number;

}



const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {


  if (error instanceof AxiosError) {

    const responseData =
      error.response?.data as
      {
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
      return "Unable to connect to payment server.";
    }



    if (error.response.status === 401) {
      return "Please sign in again.";
    }



    if (error.response.status === 403) {
      return "You are not authorized for this payment.";
    }



    return `Payment server returned error ${error.response.status}.`;

  }



  if (error instanceof Error) {
    return error.message;
  }



  return fallbackMessage;

};



export const createOrder =
async (
  packId:string
): Promise<CreateOrderResponse> => {


  if(
    !packId
  ){

    throw new Error(
      "Please select a valid scan pack."
    );

  }



  try {

    const response =
      await api.post<CreateOrderResponse>(
        "/payments/create-order",
        {
          plan: packId
        },
      );



    const data =
      response.data;



    if(!data.success){

      throw new Error(
        data.message ||
        "Unable to create payment."
      );

    }



    if(
      !data.order_id ||
      !data.amount ||
      !data.currency ||
      !data.key
    ){

      throw new Error(
        "Incomplete payment details."
      );

    }



    return data;



  }
  catch(error){


    console.error(
      "[PaymentService] createOrder failed",
      getApiErrorMessage(error, "unknown error")
    );



    throw new Error(
      getApiErrorMessage(
        error,
        "Unable to create payment."
      )
    );


  }


};



export const verifyPayment =
async (
payload:RazorpayPaymentSuccess
):Promise<VerifyPaymentResponse> => {



  try {

    const response =
      await api.post<VerifyPaymentResponse>(

        "/payments/verify",

        payload,

      );



    const data =
      response.data;



    if(!data.success){

      throw new Error(
        data.message ||
        "Payment verification failed."
      );

    }



    return data;



  }
  catch(error){


    console.error(
      "[PaymentService] verifyPayment failed",
      getApiErrorMessage(error, "unknown error")
    );


    throw new Error(
      getApiErrorMessage(
        error,
        "Unable to verify payment."
      )
    );


  }


};



export const refreshScanPack =
async ():Promise<ScanPackData | null> => {


  const user =
    auth.currentUser;



  if(!user){

    return null;

  }




  try {


    const userDoc =
      await getDoc(
        doc(
          db,
          "users",
          user.uid
        )
      );



    if(!userDoc.exists()){

      return null;

    }



    const data =
      userDoc.data();




    return {

      packId:
        typeof data.packId === "string"
        ?
        data.packId
        :
        "free",



      packName:
        typeof data.packName === "string"
        ?
        data.packName
        :
        "Free Plan",



      totalScans:
        typeof data.totalScans === "number"
        ?
        data.totalScans
        :
        5,



      usedScans:
        typeof data.usedScans === "number"
        ?
        data.usedScans
        :
        0,



      // Computed, not read: the stored remainingScans field is not kept up to date.
      remainingScans: Math.max(
        (typeof data.totalScans === "number" ? data.totalScans : 5) -
          (typeof data.usedScans === "number" ? data.usedScans : 0),
        0
      ),



      lastPaymentId:
        typeof data.lastPaymentId === "string"
        ?
        data.lastPaymentId
        :
        undefined,



      lastOrderId:
        typeof data.lastOrderId === "string"
        ?
        data.lastOrderId
        :
        undefined,



      updatedAt:
        typeof data.updatedAt === "number"
        ?
        data.updatedAt
        :
        undefined,

};



  }
  catch(error){


    console.error(
      "[PaymentService] refreshScanPack failed:",
      getApiErrorMessage(error, "unknown error")
    );


    return null;

  }

};

export interface PurchaseRecord {
  paymentId: string;
  packName: string;
  packId: string;
  creditsAdded: number;
  amount: number;
  currency: string;
  processedAt: number;
  totalAfterPurchase: number;
  orderId: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PurchaseRecord[];
}

export const getPaymentHistory =
async (): Promise<PurchaseRecord[]> => {
  try {
    const response =
      await api.get<PaymentHistoryResponse>(
        "/payments/history"
      );

    const data = response.data;

    if (!data.success) {
      throw new Error(
        data.payments
          ? "Failed to load history."
          : "No history found."
      );
    }

    return data.payments || [];

  } catch (error) {
    console.error(
      "[PaymentService] getPaymentHistory failed:",
      getApiErrorMessage(error, "unknown error")
    );

    throw new Error(
      getApiErrorMessage(
        error,
        "Unable to load payment history."
      )
    );
  }
};

export const recoverPayment =
async (
  payload: RazorpayPaymentSuccess
): Promise<VerifyPaymentResponse> => {
  try {
    const response =
      await api.post<VerifyPaymentResponse>(
        "/payments/recover",
        payload,
      );

    const data = response.data;

    if (!data.success) {
      throw new Error(
        data.message || "Payment recovery failed."
      );
    }

    return data;

  } catch (error) {
    console.error(
      "[PaymentService] recoverPayment failed",
      getApiErrorMessage(error, "unknown error")
    );

    throw new Error(
      getApiErrorMessage(
        error,
        "Unable to recover payment."
      )
    );
  }
};

/* =====================================================
   PAYMENTS WAITING FOR CONFIRMATION

   A successful payment is remembered on the phone until the
   server confirms it. If the app is closed or the network drops
   before that, the next visit to Home finishes the job. (The
   server's Razorpay webhook also adds the credits on its own.)
===================================================== */

type PendingPayment = RazorpayPaymentSuccess & { savedAt: number };

const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const pendingKey = () => {
  const uid = auth.currentUser?.uid;
  return uid ? `ScanMyCard_PENDING_PAYMENTS_${uid}` : null;
};

async function readPending(): Promise<PendingPayment[]> {
  const key = pendingKey();
  if (!key) return [];
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writePending(list: PendingPayment[]) {
  const key = pendingKey();
  if (!key) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Best effort; the server webhook is the main safety net.
  }
}

export async function rememberPayment(payment: RazorpayPaymentSuccess) {
  const list = (await readPending()).filter(
    (p) => p.razorpay_payment_id !== payment.razorpay_payment_id
  );
  await writePending([...list, { ...payment, savedAt: Date.now() }]);
}

export async function forgetPayment(paymentId: string) {
  const list = await readPending();
  await writePending(list.filter((p) => p.razorpay_payment_id !== paymentId));
}

/**
 * Confirms payments that were made but never confirmed (app closed, network
 * dropped). Returns how many were confirmed now.
 */
export async function retryPendingPayments(): Promise<number> {
  const list = await readPending();
  if (list.length === 0) return 0;

  let confirmed = 0;
  const keep: PendingPayment[] = [];

  for (const payment of list) {
    try {
      const { savedAt, ...payload } = payment;
      const result = await recoverPayment(payload);
      if (result?.success) confirmed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // Keep trying on network/server trouble; stop on a clear "no" from the server.
      const definite = /not belong|invalid|mismatch|refunded/i.test(message);
      if (!definite && Date.now() - payment.savedAt < PENDING_MAX_AGE_MS) {
        keep.push(payment);
      }
    }
  }

  await writePending(keep);
  return confirmed;
}
