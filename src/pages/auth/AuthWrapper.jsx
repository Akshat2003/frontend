import React, { useState, useEffect } from 'react';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import apiService from '../../services/api';
import { SiteProvider, useSite } from '../../contexts/SiteContext';

// Internal component that uses SiteContext
const AuthWrapperInternal = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoading, setIsLoading] = useState(true);
  const { initializeSites, loadAllSites, clearSiteData } = useSite();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('parkingOperator');
        const accessToken = localStorage.getItem('accessToken');
        
        if (savedUser && accessToken) {
          // Validate token with backend
          try {
            const response = await apiService.validateToken();
            if (response.success) {
              const userData = JSON.parse(savedUser);
              setUser(userData);
              setIsAuthenticated(true);
              
              // Fetch the complete user profile to ensure we have populated site data
              try {
                const profileResponse = await apiService.getProfile();
                if (profileResponse.success) {
                  const completeUserData = profileResponse.data.user;
                  setUser(completeUserData);
                  // Update localStorage with complete user data
                  localStorage.setItem('parkingOperator', JSON.stringify(completeUserData));
                  
                  // Initialize sites with complete user data
                  initializeSites(completeUserData);
                } else {
                  // Fallback to saved user data
                  initializeSites(userData);
                }
              } catch (profileError) {
                console.error('Error fetching complete profile on auth check:', profileError);
                // Fallback to saved user data
                initializeSites(userData);
              }
              
              // Load all sites if user is admin
              if (userData.role === 'admin') {
                await loadAllSites();
              }
            } else {
              throw new Error('Token validation failed');
            }
          } catch (error) {
            console.error('Token validation error:', error);
            // Clear invalid tokens
            localStorage.removeItem('parkingOperator');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        localStorage.removeItem('parkingOperator');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (userData) => {
    try {
      // User data and tokens are already stored by the API service
      setUser(userData);
      setIsAuthenticated(true);
      
      // Fetch the complete user profile to ensure we have populated site data
      try {
        const profileResponse = await apiService.getProfile();
        if (profileResponse.success) {
          const completeUserData = profileResponse.data.user;
          setUser(completeUserData);
          // Update localStorage with complete user data
          localStorage.setItem('parkingOperator', JSON.stringify(completeUserData));
          
          // Initialize sites with complete user data
          initializeSites(completeUserData);
        } else {
          // Fallback to original user data
          initializeSites(userData);
        }
      } catch (profileError) {
        console.error('Error fetching complete profile:', profileError);
        // Fallback to original user data
        initializeSites(userData);
      }
      
      // Load all sites if user is admin
      if (userData.role === 'admin') {
        await loadAllSites();
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setCurrentPage('login');
      clearSiteData();
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      setCurrentPage('login');
      clearSiteData();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentPage === 'forgot-password') {
      return (
        <ForgotPassword 
          onBackToLogin={() => setCurrentPage('login')}
        />
      );
    }

    return (
      <Login 
        onLogin={handleLogin}
        onForgotPassword={() => setCurrentPage('forgot-password')}
      />
    );
  }

  // Pass user and onLogout as a function that receives these props
  return children({ user, onLogout: handleLogout });
};

// Main wrapper component that provides SiteContext
const AuthWrapper = ({ children }) => {
  return (
    <SiteProvider>
      <AuthWrapperInternal>
        {children}
      </AuthWrapperInternal>
    </SiteProvider>
  );
};

export default AuthWrapper;