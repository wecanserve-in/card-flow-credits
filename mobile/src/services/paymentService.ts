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




const getAuthenticatedUserToken =
async (): Promise<string> => {


  const user = auth.currentUser;


  if (!user) {

    throw new Error(
      "Please sign in again before payment."
    );

  }



  const idToken =
    await user.getIdToken(true);



  if (!idToken) {

    throw new Error(
      "Invalid authentication token."
    );

  }



  console.log(
    "[PaymentService] UID:",
    user.uid
  );



  return idToken;

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


    const idToken =
      await getAuthenticatedUserToken();



    const response =
      await api.post<CreateOrderResponse>(
        "/payments/create-order",
        {
          plan: packId
        },
        {
          headers:{
            Authorization:
              `Bearer ${idToken}`,
          },
        }
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
      error
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


    const idToken =
      await getAuthenticatedUserToken();



    const response =
      await api.post<VerifyPaymentResponse>(

        "/payments/verify",

        payload,

        {
          headers:{
            Authorization:
              `Bearer ${idToken}`,
          },
        }

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
      error
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
        "Free Pack",



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



      remainingScans:
        typeof data.remainingScans === "number"
        ?
        data.remainingScans
        :
        5,



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
      error
    );


    return null;

  }

};