import { useState, useEffect, useMemo } from 'react';
import apiService from '../services/api';
import { useSite } from '../contexts/SiteContext';

export const useAnalytics = (filters = {}) => {
  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    twoWheelerBookings: 0,
    fourWheelerBookings: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    machineUsage: {},
    palletUsage: {},
    hourlyDistribution: {},
    filteredBookings: [],
    revenueData: [],
    bookingTrends: [],
    customerStats: {},
    machineStats: [],
    siteStats: [],
    loading: false,
    error: null
  });

  const { currentSite } = useSite();

  // Convert filter dateRange to actual dates
  const dateFilters = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filters.dateRange) {
      case 'today':
        return {
          dateFrom: today.toISOString(),
          dateTo: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          dateFrom: yesterday.toISOString(),
          dateTo: today.toISOString()
        };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          dateFrom: weekAgo.toISOString(),
          dateTo: now.toISOString()
        };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          dateFrom: monthAgo.toISOString(),
          dateTo: now.toISOString()
        };
      case 'all':
      default:
        return {
          dateFrom: null,
          dateTo: null
        };
    }
  }, [filters.dateRange]);

  // Fetch analytics data from APIs
  useEffect(() => {
    const fetchAnalytics = async () => {
      setAnalytics(prev => ({ ...prev, loading: true, error: null }));

      try {
        const apiFilters = {
          ...dateFilters,
          siteId: currentSite?._id || currentSite?.siteId,
          period: 'day' // Default grouping
        };

        // Remove null values
        Object.keys(apiFilters).forEach(key => {
          if (apiFilters[key] === null || apiFilters[key] === undefined) {
            delete apiFilters[key];
          }
        });

        // Fetch all analytics data in parallel
        const [
          dashboardData,
          revenueData,
          bookingData,
          customerData,
          machineData,
          siteData
        ] = await Promise.all([
          apiService.getDashboardAnalytics(apiFilters),
          apiService.getRevenueAnalytics(apiFilters),
          apiService.getBookingAnalytics(apiFilters),
          apiService.getCustomerAnalytics(apiFilters),
          apiService.getMachineAnalytics(apiFilters),
          apiService.getSiteAnalytics(apiFilters)
        ]);

        // Process and combine the data
        const combinedAnalytics = {
          // Dashboard metrics
          totalBookings: dashboardData.data?.totalBookings || 0,
          activeBookings: dashboardData.data?.activeBookings || 0,
          completedBookings: dashboardData.data?.completedBookings || 0,
          totalRevenue: revenueData.data?.totalRevenue || 0,
          averageRevenue: revenueData.data?.averageRevenue || 0,

          // Vehicle type breakdown from booking data
          twoWheelerBookings: bookingData.data?.vehicleTypeBreakdown?.['two-wheeler'] || 0,
          fourWheelerBookings: bookingData.data?.vehicleTypeBreakdown?.['four-wheeler'] || 0,

          // Machine and pallet usage
          machineUsage: machineData.data?.machineUsage || {},
          palletUsage: machineData.data?.palletUsage || {},

          // Time-based data
          hourlyDistribution: bookingData.data?.hourlyDistribution || {},
          revenueData: revenueData.data?.revenueByPeriod || [],
          bookingTrends: bookingData.data?.bookingsByPeriod || [],

          // Additional analytics
          customerStats: customerData.data || {},
          machineStats: machineData.data?.machines || [],
          siteStats: siteData.data?.sites || [],

          // For compatibility with existing BookingCard usage
          filteredBookings: bookingData.data?.recentBookings || [],
          
          loading: false,
          error: null
        };

        setAnalytics(combinedAnalytics);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setAnalytics(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load analytics data'
        }));
      }
    };

    fetchAnalytics();
  }, [filters.dateRange, currentSite, dateFilters]);

  return analytics;
};