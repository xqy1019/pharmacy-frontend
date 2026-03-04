import { createContext, useContext, useEffect, useState } from 'react';
import { getProfile, login as loginRequest } from '../api/auth';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [booting, setBooting] = useState(Boolean(getStoredAuth()?.accessToken));

  useEffect(() => {
    let active = true;

    async function hydrate() {
      if (!auth?.accessToken) {
        setBooting(false);
        return;
      }

      try {
        const user = await getProfile();
        if (!active) {
          return;
        }

        const nextAuth = {
          ...auth,
          user
        };
        setAuth(nextAuth);
        setStoredAuth(nextAuth);
      } catch {
        if (!active) {
          return;
        }

        clearStoredAuth();
        setAuth(null);
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  async function login(credentials) {
    const data = await loginRequest(credentials);
    const nextAuth = {
      accessToken: data.accessToken,
      user: data.user
    };
    setStoredAuth(nextAuth);
    setAuth(nextAuth);
    return nextAuth;
  }

  function logout() {
    clearStoredAuth();
    setAuth(null);
  }

  return (
    <AuthContext.Provider
      value={{
        auth,
        user: auth?.user || null,
        isAuthenticated: Boolean(auth?.accessToken),
        booting,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
