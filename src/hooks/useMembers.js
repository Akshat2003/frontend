import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  // Fetch active members
  const getActiveMembers = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getActiveMembers(filters);
      
      if (response.success) {
        setMembers(response.data.members || []);
        setPagination(response.data.pagination || null);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch active members');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching active members:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get member details
  const getMemberDetails = useCallback(async (memberId) => {
    try {
      const response = await api.getCustomerById(memberId);
      
      if (response.success) {
        return response.data.customer;
      } else {
        throw new Error(response.message || 'Failed to fetch member details');
      }
    } catch (err) {
      console.error('Error fetching member details:', err);
      throw err;
    }
  }, []);

  // Get member bookings
  const getMemberBookings = useCallback(async (memberId, filters = {}) => {
    try {
      const response = await api.getCustomerBookings(memberId, filters);
      
      if (response.success) {
        return response.data.bookings || [];
      } else {
        throw new Error(response.message || 'Failed to fetch member bookings');
      }
    } catch (err) {
      console.error('Error fetching member bookings:', err);
      throw err;
    }
  }, []);

  // Deactivate membership
  const deactivateMembership = useCallback(async (customerId) => {
    try {
      const response = await api.deactivateMembership(customerId);
      
      if (response.success) {
        // Refresh the members list
        await getActiveMembers();
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to deactivate membership');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deactivating membership:', err);
      throw err;
    }
  }, [getActiveMembers]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Format helper functions
  const formatMembershipType = useCallback((type) => {
    const types = {
      'daily': 'Daily Pass',
      'weekly': 'Weekly Pass',  
      'monthly': 'Monthly Pass',
      'yearly': 'Yearly Pass'
    };
    return types[type] || type;
  }, []);

  const getMembershipStatusColor = useCallback((expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) return 'text-red-600 bg-red-50';
    if (daysUntilExpiry <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  return {
    members,
    loading,
    error,
    pagination,
    getActiveMembers,
    getMemberDetails,
    getMemberBookings,
    deactivateMembership,
    clearError,
    formatMembershipType,
    getMembershipStatusColor,
    formatDate,
  };
};