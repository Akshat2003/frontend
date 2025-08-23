import { useState, useCallback } from 'react';
import apiService from '../services/api';

export const useCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });

  const handleError = (error) => {
    console.error('Customer operation failed:', error);
    setError(error.message || 'An error occurred');
  };

  const clearError = () => setError(null);

  const getCustomers = useCallback(async (filters = {}) => {
    setLoading(true);
    clearError();
    
    try {
      const response = await apiService.getCustomers(filters);
      setCustomers(response.data.customers || []);
      setPagination(response.data.pagination || {});
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCustomers = useCallback(async (query, type = 'all') => {
    if (!query || query.length < 2) {
      setCustomers([]);
      return { data: { customers: [] } };
    }

    setLoading(true);
    clearError();
    
    try {
      const response = await apiService.searchCustomers(query, type);
      setCustomers(response.data.customers || []);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCustomerById = useCallback(async (customerId) => {
    clearError();
    
    try {
      const response = await apiService.getCustomerById(customerId);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, []);

  const createCustomer = useCallback(async (customerData) => {
    setLoading(true);
    clearError();
    
    try {
      const response = await apiService.createCustomer(customerData);
      // Refresh the customer list
      await getCustomers();
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getCustomers]);

  const updateCustomer = useCallback(async (customerId, updateData) => {
    setLoading(true);
    clearError();
    
    try {
      const response = await apiService.updateCustomer(customerId, updateData);
      // Update the customer in the local state
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer._id === customerId 
            ? { ...customer, ...response.data.customer }
            : customer
        )
      );
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCustomer = useCallback(async (customerId, reason) => {
    setLoading(true);
    clearError();
    
    try {
      const response = await apiService.deleteCustomer(customerId, reason);
      // Remove the customer from local state
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => customer._id !== customerId)
      );
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCustomerBookings = useCallback(async (customerId, filters = {}) => {
    clearError();
    
    try {
      const response = await apiService.getCustomerBookings(customerId, filters);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, []);

  const getCustomerVehicles = useCallback(async (customerId) => {
    clearError();
    
    try {
      const response = await apiService.getCustomerVehicles(customerId);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, []);

  const addCustomerVehicle = useCallback(async (customerId, vehicleData) => {
    clearError();
    
    try {
      const response = await apiService.addCustomerVehicle(customerId, vehicleData);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, []);

  const updateCustomerVehicle = useCallback(async (customerId, vehicleId, updateData) => {
    clearError();
    
    try {
      const response = await apiService.updateCustomerVehicle(customerId, vehicleId, updateData);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, []);

  const removeCustomerVehicle = useCallback(async (customerId, vehicleId) => {
    clearError();
    
    try {
      const response = await apiService.removeCustomerVehicle(customerId, vehicleId);
      return response;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, []);

  const findCustomerByPhone = useCallback((phoneNumber) => {
    return customers.find(customer => customer.phoneNumber === phoneNumber);
  }, [customers]);

  return {
    customers,
    loading,
    error,
    pagination,
    clearError,
    getCustomers,
    searchCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerBookings,
    getCustomerVehicles,
    addCustomerVehicle,
    updateCustomerVehicle,
    removeCustomerVehicle,
    findCustomerByPhone,
  };
};