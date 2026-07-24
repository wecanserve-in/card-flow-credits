import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { auth } from "./firebase";

const FALLBACK_API_URL = "http://192.168.1.75:8000";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  FALLBACK_API_URL
).replace(/\/+$/, "");

console.log("[API] Using backend URL:", API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    const user = auth.currentUser;

    if (user) {
      try {
        /*
         * Use a fresh Firebase ID token for protected
         * payment requests.
         */
        const token = await user.getIdToken(true);

        config.headers.set(
          "Authorization",
          `Bearer ${token}`
        );

        console.log("[API] Firebase token attached:", {
          uid: user.uid,
          url: config.url,
        });
      } catch (error) {
        console.error(
          "[API] Failed to retrieve Firebase token:",
          error
        );
      }
    } else {
      console.warn(
        "[API] No authenticated Firebase user found."
      );
    }

    const requestUrl = `${config.baseURL || ""}${
      config.url || ""
    }`;

    console.log("[API] Request:", {
      method: config.method?.toUpperCase(),
      url: requestUrl,
      hasAuthorization: Boolean(
        config.headers.get("Authorization")
      ),
    });

    return config;
  },
  (error: unknown) => {
    console.error(
      "[API] Request interceptor error:",
      error
    );

    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log("[API] Response received:", {
      status: response.status,
      url: `${response.config.baseURL || ""}${
        response.config.url || ""
      }`,
    });

    return response;
  },

  (error: AxiosError) => {
    const requestUrl = `${error.config?.baseURL || ""}${
      error.config?.url || ""
    }`;

    if (!error.response) {
      console.error("[API] Network Error:", {
        url: requestUrl,
        message: error.message,
        code: error.code,
      });

      console.error(
        [
          "Backend could not be reached.",
          "Check the following:",
          "1. FastAPI is running with --host 0.0.0.0",
          "2. Phone and computer are on the same Wi-Fi",
          "3. EXPO_PUBLIC_API_URL contains the correct computer IPv4 address",
          "4. Windows Firewall allows Python/Uvicorn",
        ].join("\n")
      );
    } else {
      console.error("[API] Backend Error:", {
        url: requestUrl,
        status: error.response.status,
        data: error.response.data,
      });
    }

    return Promise.reject(error);
  }
);