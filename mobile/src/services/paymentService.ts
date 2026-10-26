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