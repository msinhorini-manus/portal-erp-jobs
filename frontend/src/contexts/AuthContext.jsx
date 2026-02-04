/**
 * Authentication Context Provider
 * Suporta login por email/senha, login social (Google/LinkedIn), e recuperação de senha
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  // Inicializar estado a partir do localStorage de forma síncrona
  const [user, setUser] = useState(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
      }
      const token = localStorage.getItem('authToken');
      const userType = localStorage.getItem('userType');
      const userData = localStorage.getItem(`${userType}Data`);
      
      if (token && userData) {
        return JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error initializing user from localStorage:', error);
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }
      return !!localStorage.getItem('authToken');
    } catch (error) {
      return false;
    }
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }

      const token = localStorage.getItem('authToken');
      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      const userData = localStorage.getItem(`${userType}Data`);

      if (token && userId && userData) {
        try {
          const parsedData = JSON.parse(userData);
          setUser(parsedData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const clearAuthData = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const userType = localStorage.getItem('userType');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userType');
        localStorage.removeItem('userId');
        if (userType) {
          localStorage.removeItem(`${userType}Data`);
        }
      }
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const saveAuthData = (response, type) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('authToken', response.access_token);
        if (response.refresh_token) {
          localStorage.setItem('refreshToken', response.refresh_token);
        }
        localStorage.setItem('userType', type);
        localStorage.setItem('userId', response.user?.id || response.user_id);
        localStorage.setItem(`${type}Data`, JSON.stringify(response.user || response));
      }
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  // Login genérico
  const login = async (credentialsOrUser, type = 'company') => {
    try {
      setError(null);
      setLoading(true);

      // Se for login de admin (tipo 'admin'), apenas atualizar o estado
      if (type === 'admin') {
        setUser(credentialsOrUser);
        setIsAuthenticated(true);
        return { success: true, user: credentialsOrUser };
      }

      // Login normal via API para company e candidate
      const response = type === 'company' 
        ? await authAPI.loginCompany(credentialsOrUser)
        : await authAPI.loginCandidate(credentialsOrUser);

      saveAuthData(response, type);
      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao fazer login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login de admin
  const loginAdmin = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.loginAdmin({ email, password });
      
      saveAuthData(response, 'admin');
      const userData = { ...response, user_type: 'admin' };
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Admin login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao fazer login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login de candidato
  const loginCandidate = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.loginCandidate({ email, password });
      
      saveAuthData(response, 'candidate');
      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Candidate login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao fazer login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login de empresa
  const loginCompany = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.loginCompany({ email, password });
      
      saveAuthData(response, 'company');
      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Company login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao fazer login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login com Google
  const loginWithGoogle = async (googleToken) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.socialGoogle(googleToken);
      
      saveAuthData(response, 'candidate');
      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao fazer login com Google';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login com LinkedIn
  const loginWithLinkedIn = async (code, redirectUri) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.socialLinkedIn(code, redirectUri);
      
      saveAuthData(response, 'candidate');
      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
    } catch (error) {
      console.error('LinkedIn login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao fazer login com LinkedIn';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Registro
  const register = async (data, type = 'company') => {
    try {
      setError(null);
      setLoading(true);

      const response = type === 'company'
        ? await authAPI.registerCompany(data)
        : await authAPI.registerCandidate(data);

      // Auto-login after registration
      if (response.access_token) {
        saveAuthData(response, type);
        setUser(response.user);
        setIsAuthenticated(true);
      }

      return { success: true, user: response.user, message: response.message };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao criar conta';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Registro de candidato
  const registerCandidate = async (data) => {
    return register(data, 'candidate');
  };

  // Registro de empresa
  const registerCompany = async (data) => {
    return register(data, 'company');
  };

  // Recuperação de senha
  const forgotPassword = async (email) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.forgotPassword(email);
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao solicitar recuperação de senha';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Redefinir senha
  const resetPassword = async (email, token, newPassword) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.resetPassword(email, token, newPassword);
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao redefinir senha';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Alterar senha
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authAPI.changePassword(currentPassword, newPassword);
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Change password error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao alterar senha';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  // Verificar tipo de usuário
  const isAdmin = () => user?.user_type === 'admin';
  const isCandidate = () => user?.user_type === 'candidate';
  const isCompany = () => user?.user_type === 'company';

  // Obter tipo de usuário
  const getUserType = () => {
    try {
      return localStorage.getItem('userType') || user?.user_type;
    } catch {
      return user?.user_type;
    }
  };

  // Obter userType do localStorage ou do user
  const userType = getUserType();

  // Obter token do localStorage
  const getToken = () => {
    try {
      return localStorage.getItem('authToken');
    } catch {
      return null;
    }
  };

  const token = getToken();

  const value = {
    user,
    userType,
    loading,
    error,
    isAuthenticated,
    login,
    loginAdmin,
    loginCandidate,
    loginCompany,
    loginWithGoogle,
    loginWithLinkedIn,
    register,
    registerCandidate,
    registerCompany,
    forgotPassword,
    resetPassword,
    changePassword,
    logout,
    isAdmin,
    isCandidate,
    isCompany,
    getUserType,
    token,
    setError
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
