// src/context/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, notificacionesAPI } from '../utils/api';
import { registerForPushNotifications } from '../utils/notifications';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  TOKEN: 'sdoorbell_token',
  USER: 'sdoorbell_user',
};

const initialState = {
  usuario: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        usuario: action.payload.usuario,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, usuario: { ...state.usuario, ...action.payload } };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ─── Restore session on mount ────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [token, userStr] = await AsyncStorage.multiGet([
          STORAGE_KEYS.TOKEN,
          STORAGE_KEYS.USER,
        ]);

        const savedToken = token[1];
        const savedUser = userStr[1] ? JSON.parse(userStr[1]) : null;

        if (savedToken && savedUser) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: { token: savedToken, usuario: savedUser } });

          // Verify token is still valid
          try {
            const { data } = await authAPI.me();
            dispatch({ type: 'UPDATE_USER', payload: data.usuario });
          } catch {
            // Token expired
            await clearStorage();
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    restoreSession();
  }, []);

  const clearStorage = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
  };

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login(email, password);

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TOKEN, data.token],
      [STORAGE_KEYS.USER, JSON.stringify(data.usuario)],
    ]);

    dispatch({ type: 'LOGIN_SUCCESS', payload: data });

    // Register for push notifications after login
    try {
      const pushToken = await registerForPushNotifications();
      if (pushToken) {
        await notificacionesAPI.guardarToken(pushToken);
        dispatch({ type: 'UPDATE_USER', payload: { pushToken } });
      }
    } catch (err) {
      console.warn('Push token registration failed:', err);
    }

    return data;
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await clearStorage();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ─── Update User ──────────────────────────────────────────────────────────
  const updateUser = useCallback(async (updates) => {
    const updatedUser = { ...state.usuario, ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, [state.usuario]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
