import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useBookings = () => {
  const [bookings, setBookings] = useState([]);
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

  // Fetch bookings from API
  const fetchBookings = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getBookings(filters);
      setBookings(response.data.bookings || []);
      setPagination(response.data.pagination || pagination);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load bookings on component mount with optional initial filters
  const initializeBookings = useCallback(async (initialFilters = {}) => {
    await fetchBookings(initialFilters);
  }, [fetchBookings]);

  // Default load on component mount
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Create new booking
  const createBooking = async (bookingData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.createBooking(bookingData);
      
      // Add new booking to the list
      const newBooking = response.data.booking;
      setBookings(prevBookings => [newBooking, ...prevBookings]);
      
      return newBooking;
    } catch (err) {
      setError(err.message);
      throw err; // Re-throw to handle in components
    } finally {
      setLoading(false);
    }
  };

  // Update booking
  const updateBooking = async (bookingId, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.updateBooking(bookingId, updateData);
      const updatedBooking = response.data.booking;
      
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId ? updatedBooking : booking
        )
      );
      
      return updatedBooking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Complete booking
  const completeBooking = async (bookingId, paymentData = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.completeBooking(bookingId, paymentData);
      const completedBooking = response.data.booking;
      
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId ? completedBooking : booking
        )
      );
      
      return completedBooking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete booking
  const deleteBooking = async (bookingId, reason) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.cancelBooking(bookingId, reason);
      
      // Remove the booking from the list
      setBookings(prevBookings =>
        prevBookings.filter(booking => booking._id !== bookingId)
      );
      
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (otpCode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.verifyOTP(otpCode);
      const booking = response.data.booking;
      
      // Update booking in list
      setBookings(prevBookings =>
        prevBookings.map(b =>
          b._id === booking._id ? booking : b
        )
      );
      
      return booking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate new OTP
  const generateNewOTP = async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.generateNewOTP(bookingId);
      const updatedBooking = response.data.booking;
      
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId ? updatedBooking : booking
        )
      );
      
      return updatedBooking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get active bookings
  const getActiveBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getActiveBookings();
      return response.data.bookings || [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Search bookings
  const searchBookings = async (query, filterType = 'all') => {
    if (!query.trim()) {
      return bookings.filter(booking => booking.status === 'active');
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.searchBookings(query, filterType);
      return response.data.bookings || [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get booking by ID
  const getBookingById = async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getBookingById(bookingId);
      return response.data.booking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Extend booking
  const extendBooking = async (bookingId, extensionData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.extendBooking(bookingId, extensionData);
      const extendedBooking = response.data.booking;
      
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId ? extendedBooking : booking
        )
      );
      
      return extendedBooking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    bookings,
    loading,
    error,
    pagination,
    
    // Actions
    fetchBookings,
    initializeBookings,
    createBooking,
    updateBooking,
    completeBooking,
    deleteBooking,
    verifyOTP,
    generateNewOTP,
    getActiveBookings,
    searchBookings,
    getBookingById,
    extendBooking,
    
    // Utils
    setError: (error) => setError(error),
    clearError: () => setError(null),
  };
};