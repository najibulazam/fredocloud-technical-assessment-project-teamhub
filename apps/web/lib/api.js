import axios from "axios";

let logoutHandler;
let refreshPromise;

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true
});

export const setAuthLogoutHandler = (handler) => {
  logoutHandler = handler;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (!error.response || error.response.status !== 401 || original?.skipAuthRefresh) {
      return Promise.reject(error);
    }

    if (original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api.post("/auth/refresh", null, { skipAuthRefresh: true });
      }

      await refreshPromise;
      refreshPromise = null;
      return api(original);
    } catch (refreshError) {
      refreshPromise = null;

      if (typeof logoutHandler === "function") {
        await logoutHandler();
      }

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    }
  }
);
