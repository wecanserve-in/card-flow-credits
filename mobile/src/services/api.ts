import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { auth } from "./firebase";

const FALLBACK_API_URL =
  "https://scanmycard-126413727192.asia-south1.run.app";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  FALLBACK_API_URL
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetried?: boolean;
};

api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    const user = auth.currentUser;

    if (user) {
      try {
        /*
         * Firebase returns the cached ID token and refreshes it
         * automatically when it is about to expire. A forced refresh
         * is only done when the backend answers 401 (see below).
         */
        const token = await user.getIdToken();

        config.headers.set(
          "Authorization",
          `Bearer ${token}`
        );
      } catch {
        console.error(
          "[API] Failed to retrieve Firebase token."
        );
      }
    } else {
      console.warn(
        "[API] No authenticated Firebase user found."
      );
    }

    return config;
  },
  (error: unknown) => {
    console.error("[API] Request interceptor error.");

    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const config = error.config as
      | RetriableRequestConfig
      | undefined;
    const user = auth.currentUser;

    /*
     * The cached token may have been revoked or expired early:
     * force-refresh it once and retry the request.
     */
    if (
      error.response?.status === 401 &&
      config &&
      !config._authRetried &&
      user
    ) {
      config._authRetried = true;

      try {
        const token = await user.getIdToken(true);

        config.headers.set(
          "Authorization",
          `Bearer ${token}`
        );

        return api.request(config);
      } catch {
        // Fall through and reject with the original error.
      }
    }

    if (!error.response) {
      console.error("[API] Network error:", {
        url: config?.url,
        code: error.code,
      });
    } else {
      console.error("[API] Backend error:", {
        url: config?.url,
        status: error.response.status,
      });
    }

    return Promise.reject(error);
  }
);
