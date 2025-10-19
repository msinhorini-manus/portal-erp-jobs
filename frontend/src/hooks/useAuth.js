/**
 * Custom hook for authentication
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/services/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem('companyData') || localStorage.getItem('candidateData');

    if (token && userId && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }

    setLoading(false);
  }, []);

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
    navigate('/');
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };
}

export default useAuth;

