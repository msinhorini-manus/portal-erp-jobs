/**
 * Authentication Context Provider
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem(`${userType}Data`);

    if (token && userId && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
      }
    }

    setLoading(false);
  };

  const login = async (credentials, type = 'company') => {
    try {
      const response = type === 'company' 
        ? await authAPI.loginCompany(credentials)
        : await authAPI.loginCandidate(credentials);

      // Save to localStorage
      localStorage.setItem('authToken', response.access_token);
      localStorage.setItem('userType', type);
      localStorage.setItem('userId', response.user.id);
      localStorage.setItem(`${type}Data`, JSON.stringify(response.user));

      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (data, type = 'company') => {
    try {
      const response = type === 'company'
        ? await authAPI.registerCompany(data)
        : await authAPI.registerCandidate(data);

      // Auto-login after registration
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
        localStorage.setItem('userType', type);
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem(`${type}Data`, JSON.stringify(response.user));

        setUser(response.user);
        setIsAuthenticated(true);
      }

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

