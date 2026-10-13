import { createContext, useContext, useEffect, useState } from "react";
import {
  getMe,
  login as loginApi,
  logout as logoutApi,
  signup as signupApi
} from "../api/authApi";

const AuthContext = createContext(null);

const FEATURES_KEY = "dk_features_config";
const USER_KEY = "dk_user_profile";

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredFeatures() {
  try {
    const raw = localStorage.getItem(FEATURES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enableUdhar: parsed.enableUdhar !== undefined ? Boolean(parsed.enableUdhar) : true,
        enableStaff: parsed.enableStaff !== undefined ? Boolean(parsed.enableStaff) : true,
      };
    }
  } catch {
    // fallback
  }
  return { enableUdhar: true, enableStaff: true };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem("dk_access_token");
    const cachedUser = getStoredUser();
    // Only block with full-page spinner if we have a token but NO cached user profile
    return Boolean(token && !cachedUser);
  });
  const [features, setFeatures] = useState(getStoredFeatures);

  const updateFeatures = (newFeatures) => {
    setFeatures((prev) => {
      const updated = { ...prev, ...newFeatures };
      try {
        localStorage.setItem(FEATURES_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
      return updated;
    });
  };

  const toggleFeature = (key) => {
    setFeatures((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(FEATURES_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
      return updated;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("dk_access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((response) => {
        const userData = response?.data || response?.user || response;
        setUser(userData);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        } catch {
          // ignore storage error
        }
        if (userData?.enableUdhar !== undefined || userData?.enableStaff !== undefined) {
          updateFeatures({
            ...(userData.enableUdhar !== undefined ? { enableUdhar: Boolean(userData.enableUdhar) } : {}),
            ...(userData.enableStaff !== undefined ? { enableStaff: Boolean(userData.enableStaff) } : {}),
          });
        }
      })
      .catch((err) => {
        // Only invalidate if the token is definitely rejected (401 Unauthorized)
        if (err?.response?.status === 401) {
          localStorage.removeItem("dk_access_token");
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(payload) {
    localStorage.removeItem("dk_access_token");

    const response = await loginApi(payload);
    const token =
      response?.data?.accessToken ||
      response?.accessToken ||
      response?.data?.token ||
      response?.token;

    if (token) {
      localStorage.setItem("dk_access_token", token);
    }

    const userData =
      response?.data?.user ||
      response?.user ||
      response?.data ||
      response;

    setUser(userData);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch {
      // ignore storage error
    }
    if (userData?.enableUdhar !== undefined || userData?.enableStaff !== undefined) {
      updateFeatures({
        ...(userData.enableUdhar !== undefined ? { enableUdhar: Boolean(userData.enableUdhar) } : {}),
        ...(userData.enableStaff !== undefined ? { enableStaff: Boolean(userData.enableStaff) } : {}),
      });
    }
    return userData;
  }

  async function signup(payload) {
    localStorage.removeItem("dk_access_token");
    localStorage.removeItem(USER_KEY);

    const response = await signupApi(payload);
    const token =
      response?.data?.accessToken ||
      response?.accessToken ||
      response?.data?.token ||
      response?.token;

    if (token) {
      localStorage.setItem("dk_access_token", token);
    }

    const userData =
      response?.data?.user ||
      response?.user ||
      response?.data ||
      response;

    setUser(userData);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch {
      // ignore storage error
    }
    return userData;
  }

  async function logout() {
    try {
      await logoutApi();
    } catch {
      // Ignore if session already closed on server
    } finally {
      localStorage.removeItem("dk_access_token");
      localStorage.removeItem(USER_KEY);
      sessionStorage.clear();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        features,
        enableUdhar: features.enableUdhar,
        enableStaff: features.enableStaff,
        updateFeatures,
        toggleFeature,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

