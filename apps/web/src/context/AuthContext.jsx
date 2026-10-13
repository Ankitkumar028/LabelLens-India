import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  saveUserAiKeys,
  getAuthToken,
  setAuthToken,
  getAiSettings,
  saveAiSettings,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and load current user from active session
  useEffect(() => {
    async function initAuth() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await fetchCurrentUser(storedToken);
        if (profile) {
          setUser(profile);
          // If user has saved AI keys in DB and local storage is empty, populate local
          if (profile.ai_keys && Object.keys(profile.ai_keys).length > 0) {
            const currentLocal = getAiSettings();
            if (!currentLocal.apiKey && profile.ai_keys.apiKey) {
              saveAiSettings(profile.ai_keys);
            }
          }
        } else {
          setToken(null);
          setAuthToken(null);
        }
      } catch (err) {
        console.warn('Failed to verify stored session:', err);
        setToken(null);
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);

    // If user has saved AI keys in their profile, hydrate localStorage
    if (data.user?.ai_keys && typeof data.user.ai_keys === 'object') {
      const keys = data.user.ai_keys;
      if (keys.apiKey || keys.provider) {
        saveAiSettings(keys);
      }
    }
    return data.user;
  };

  const register = async (email, password, username = null) => {
    const data = await registerUser(email, password, username);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
  };

  const updateUserAiKeys = async (aiSettings) => {
    // Save to local storage first
    saveAiSettings(aiSettings);

    // If user is logged in, sync with database
    if (token) {
      try {
        const res = await saveUserAiKeys(aiSettings);
        if (res.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.warn('Could not sync keys to user account:', err);
      }
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUserAiKeys,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => null,
      register: async () => null,
      logout: async () => {},
      updateUserAiKeys: async () => {},
    };
  }
  return context;
}
