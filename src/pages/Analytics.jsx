import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  DollarSign, 
  BarChart3,
  Activity,
  AlertCircle,
  RefreshCw,
  Eye,
  Search,
  CheckCircle,
  Download,
  Shield,
  CreditCard
} from 'lucide-react';
import BookingInfoModal from '../components/Booking/BookingInfoModal';
import Button from '../components/Common/Button';
import { formatCurrency } from '../utils/calculations';
import { exportBookingsToPDF } from '../utils/pdfExport';
import apiService from '../services/api';
import { useSite } from '../contexts/SiteContext';

// Helper function to migrate existing localStorage data to include isActive flag
const migrateLocalStorageData = () => {
  try {
    const localPurchases = JSON.parse(localStorage.getItem('membershipPurchases') || '[]');
    let hasChanges = false;
    
    const migratedPurchases = localPurchases.map(purchase => {
      if (purchase.isActive === undefined) {
        hasChanges = true;
        return { ...purchase, isActive: true }; // Default existing purchases to active
      }
      return purchase;
    });
    
    if (hasChanges) {
      localStorage.setItem('membershipPurchases', JSON.stringify(migratedPurchases));
      console.log('Migrated localStorage data to include isActive flag');
    }
    
    return migratedPurchases;
  } catch (error) {
    console.error('Error migrating localStorage data:', error);
    return [];
  }
};

// Helper function to calculate membership analytics from localStorage
const calculateLocalMembershipAnalytics = (siteId, startDateTime, endDateTime, currentUser = null) => {
  try {
    const localPurchases = migrateLocalStorageData(); // Migrate data first
    console.log('calculateLocalMembershipAnalytics - All purchases in storage:', localPurchases);
    
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    
    console.log('calculateLocalMembershipAnalytics - Filtering by:', {
      siteId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      operatorId: currentUser?.operatorId,
      userRole: currentUser?.role
    });
    
    // Filter all purchases that match date, site, and operator criteria
    const allFilteredPurchases = localPurchases.filter(purchase => {
      const purchaseDate = new Date(purchase.purchaseDate);
      
      // More lenient site matching - include customer_management purchases for all sites
      const matchesSite = !siteId || 
                         purchase.siteId === siteId || 
                         purchase.siteId === 'unknown' || 
                         purchase.siteId === 'customer_management';
      
      const matchesDate = purchaseDate >= startDate && purchaseDate <= endDate;
      
      // Operator filtering - only for non-admin users
      let matchesOperator = true;
      if (currentUser && currentUser.role !== 'admin') {
        // For operators, only show their own membership sales
        matchesOperator = purchase.operatorId === currentUser.operatorId;
        console.log(`Operator filter: purchase.operatorId=${purchase.operatorId}, currentUser.operatorId=${currentUser.operatorId}, matches=${matchesOperator}`);
      }
      
      return matchesSite && matchesDate && matchesOperator;
    });
    
    // Separate active and all purchases for different calculations
    const activePurchases = allFilteredPurchases.filter(purchase => purchase.isActive !== false);
    
    console.log('calculateLocalMembershipAnalytics - Purchase analysis:', {
      allPurchases: allFilteredPurchases.length,
      activePurchases: activePurchases.length,
      deactivatedPurchases: allFilteredPurchases.length - activePurchases.length
    });
    
    // Count only active memberships
    const count = activePurchases.length;
    
    // Revenue includes ALL purchases (active and deactivated) - money was already received
    const revenue = allFilteredPurchases.reduce((total, purchase) => total + (purchase.amount || 0), 0);
    
    console.log('calculateLocalMembershipAnalytics - Final result:', { 
      activeMembershipCount: count, 
      totalRevenue: revenue, 
      activePurchases: activePurchases.length,
      allPurchases: allFilteredPurchases.length
    });
    
    return { count, revenue, purchases: activePurchases };
  } catch (error) {
    console.error('Error calculating local membership analytics:', error);
    return { count: 0, revenue: 0, purchases: [] };
  }
};

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0]     // Today
  });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeBookings: 0,
    completedBookings: 0,
    membershipSales: 0,
    membershipRevenue: 0
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const { currentSite } = useSite();
  
  // Get current user for operator-specific filtering
  const getCurrentUser = () => {
    try {
      const userData = localStorage.getItem('parkingOperator');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const currentUser = getCurrentUser();

  // Fetch analytics data when date range or site changes
  useEffect(() => {
    if (currentSite?._id || currentSite?.siteId) {
      fetchAnalyticsData();
    }
  }, [dateRange, paymentMethodFilter, currentSite]);

  // Listen for membership purchases and deactivations to refresh analytics
  useEffect(() => {
    const handleMembershipPurchase = (event) => {
      console.log('=== Analytics - Membership purchased event received ===');
      console.log('Analytics - Event detail:', event.detail);
      console.log('Analytics - Current analytics before update:', analytics);
      
      // Immediately update analytics with the new purchase
      if (event.detail.purchase) {
        const purchase = event.detail.purchase;
        console.log('Analytics - Purchase object:', purchase);
        console.log('Analytics - Updating analytics with:', {
          newActiveMemberships: analytics.membershipSales + 1,
          newRevenue: analytics.membershipRevenue + purchase.amount
        });
        
        setAnalytics(prev => {
          const updated = {
            ...prev,
            membershipSales: prev.membershipSales + 1,
            membershipRevenue: prev.membershipRevenue + purchase.amount
          };
          console.log('Analytics - Updated analytics:', updated);
          return updated;
        });
      } else {
        console.log('Analytics - No purchase object in event detail');
      }
      
      // Also refresh from API after delay
      console.log('Analytics - Setting timeout to refresh analytics data in 1 second');
      setTimeout(() => {
        if (currentSite?._id || currentSite?.siteId) {
          console.log('Analytics - Refreshing analytics data from API after event');
          fetchAnalyticsData();
        }
      }, 1000);
    };

    const handleMembershipDeactivation = (event) => {
      console.log('=== Analytics - Membership deactivated event received ===');
      console.log('Analytics - Deactivation event detail:', event.detail);
      console.log('Analytics - Note: Revenue will NOT be reduced as payment was already processed');
      
      // Refresh analytics data to reflect the deactivation (count will decrease but revenue stays)
      setTimeout(() => {
        if (currentSite?._id || currentSite?.siteId) {
          console.log('Analytics - Refreshing analytics data after deactivation (count only, revenue preserved)');
          fetchAnalyticsData();
        }
      }, 500);
    };

    window.addEventListener('membershipPurchased', handleMembershipPurchase);
    window.addEventListener('membershipDeactivated', handleMembershipDeactivation);
    
    return () => {
      window.removeEventListener('membershipPurchased', handleMembershipPurchase);
      window.removeEventListener('membershipDeactivated', handleMembershipDeactivation);
    };
  }, [currentSite]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const siteId = currentSite?._id || currentSite?.siteId;
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();

      let bookingsResponse = null;
      let dashboardResponse = null;

      // For operators, handle API permission errors gracefully
      if (currentUser && currentUser.role !== 'admin') {
        console.log('Operator detected - using fallback data sources');
        
        try {
          // Try to fetch bookings (operators might have access to this)
          bookingsResponse = await apiService.getBookings({
            siteId,
            dateFrom: startDateTime,
            dateTo: endDateTime,
            limit: 1000
          });
        } catch (bookingError) {
          console.log('Booking API not accessible for operator, using fallback');
          bookingsResponse = { data: { bookings: [] } };
        }

        // Skip dashboard analytics for operators (use local calculation)
        dashboardResponse = { data: { summary: {}, insights: {} } };
      } else {
        // Admin users - fetch normally
        [bookingsResponse, dashboardResponse] = await Promise.all([
          apiService.getBookings({
            siteId,
            dateFrom: startDateTime,
            dateTo: endDateTime,
            limit: 1000
          }),
          apiService.getDashboardAnalytics({
            siteId,
            dateFrom: startDateTime,
            dateTo: endDateTime
          })
        ]);
      }

      // Fetch membership analytics separately with error handling
      let membershipResponse = null;
      try {
        membershipResponse = await apiService.getMembershipAnalytics({
          siteId,
          dateFrom: startDateTime,
          dateTo: endDateTime
        });
      } catch (membershipError) {
        console.error('Failed to fetch membership analytics:', membershipError);
        // Continue without membership data rather than failing completely
      }

      const fetchedBookings = bookingsResponse.data?.bookings || [];
      
      // Filter bookings by operator if not admin
      let operatorFilteredBookings = fetchedBookings;
      if (currentUser && currentUser.role !== 'admin') {
        operatorFilteredBookings = fetchedBookings.filter(booking => 
          booking.operatorId === currentUser.operatorId
        );
        console.log(`Operator ${currentUser.operatorId} - Filtered ${operatorFilteredBookings.length} bookings from ${fetchedBookings.length} total`);
      }
      
      setBookings(operatorFilteredBookings);
      
      const dashboardData = dashboardResponse.data?.summary || {};
      const membershipData = membershipResponse?.data || {};
      
      // Debug: Log membership analytics response
      console.log('Membership Analytics Response:', membershipResponse);
      console.log('Membership Data:', membershipData);
      
      // Debug: Check localStorage membership purchases
      const localStoragePurchases = JSON.parse(localStorage.getItem('membershipPurchases') || '[]');
      console.log('Analytics - Local Storage Purchases:', localStoragePurchases);
      
      // Filter bookings based on payment method filter for analytics calculation
      const filteredBookingsForAnalytics = operatorFilteredBookings.filter(booking => {
        if (paymentMethodFilter === 'all') return true;
        return (booking.payment?.method === paymentMethodFilter || booking.paymentMethod === paymentMethodFilter);
      });
      
      // Calculate parking revenue from filtered bookings
      const calculatedParkingRevenue = filteredBookingsForAnalytics.reduce((total, booking) => {
        // Skip membership payments as they are free (no revenue)
        if (booking.payment?.method === 'membership' || booking.paymentMethod === 'membership') {
          return total;
        }
        const amount = booking.payment?.amount || booking.totalAmount || 0;
        return total + amount;
      }, 0);

      // Get membership analytics data from API - try different possible response formats
      let membershipSales = membershipData.totalMemberships || 
                           membershipData.membershipCount || 
                           membershipData.count || 
                           membershipData.total || 0;
      
      let membershipRevenue = membershipData.totalRevenue || 
                             membershipData.revenue || 
                             membershipData.totalAmount || 
                             membershipData.amount || 0;

      // Fallback: Calculate from local storage if API doesn't return data
      if (membershipSales === 0 && membershipRevenue === 0) {
        const localMemberships = calculateLocalMembershipAnalytics(
          currentSite?._id || currentSite?.siteId,
          startDateTime,
          endDateTime,
          currentUser
        );
        membershipSales = localMemberships.count;
        membershipRevenue = localMemberships.revenue;
        console.log('API returned no membership data, using localStorage fallback:', localMemberships);
      } else {
        console.log('Using API membership data:', { membershipSales, membershipRevenue });
      }
      
      setAnalytics({
        totalBookings: filteredBookingsForAnalytics.length,
        totalRevenue: calculatedParkingRevenue, // Parking revenue only
        activeBookings: filteredBookingsForAnalytics.filter(b => b.status === 'active').length,
        completedBookings: filteredBookingsForAnalytics.filter(b => b.status === 'completed').length,
        membershipSales: membershipSales,
        membershipRevenue: membershipRevenue
      });

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedBooking(null);
  };

  const handleExport = async () => {
    if (!currentSite?._id && !currentSite?.siteId) {
      setError('No site selected for export');
      return;
    }

    setExportLoading(true);
    setError(null);

    try {
      const siteId = currentSite?._id || currentSite?.siteId;
      
      // Fetch all bookings for the site (no date or payment filter)
      const response = await apiService.getBookings({
        siteId,
        limit: 10000, // Get all bookings
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      const allBookings = response.data?.bookings || [];
      
      if (allBookings.length === 0) {
        setError('No bookings found for this site');
        return;
      }

      // Export to PDF
      exportBookingsToPDF(
        allBookings, 
        currentSite?.siteName || 'Unknown Site',
        currentSite?.siteId || currentSite?._id || 'Unknown'
      );

    } catch (error) {
      console.error('Export failed:', error);
      setError(error.message || 'Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  // Filter bookings based on search term and payment method
  const filteredBookings = bookings.filter(booking => {
    // Search filter
    const matchesSearch = !searchTerm || (
      booking.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phoneNumber?.includes(searchTerm) ||
      booking.machineNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Payment method filter
    const matchesPaymentMethod = paymentMethodFilter === 'all' || 
      booking.payment?.method === paymentMethodFilter || 
      booking.paymentMethod === paymentMethodFilter;
    
    return matchesSearch && matchesPaymentMethod;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <div className="flex items-center space-x-4">
            <p className="text-gray-600">
              Site: {currentSite?.siteName || 'No site selected'}
            </p>
            {currentUser && currentUser.role !== 'admin' && (
              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                Operator: {currentUser.operatorId}
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <Button
            onClick={handleExport}
            disabled={exportLoading || !currentSite}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {exportLoading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            <span className="ml-2">
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </span>
          </Button>
        </div>
      </div>

      {/* Date Range Picker & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
        <div className="space-y-3 md:space-y-0">
          {/* Mobile: Stacked layout, Desktop: Flex layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-500" size={18} />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-gray-500 px-2">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Payment Method:</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI/Online</option>
                <option value="membership">Membership Card</option>
              </select>
              <Button
                onClick={fetchAnalyticsData}
                disabled={loading}
                size="sm"
                className="whitespace-nowrap"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                <span className="ml-1 hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights - 2x3 Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
              <BarChart3 className="text-purple-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Total Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{analytics.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
              <DollarSign className="text-green-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Total Revenue</p>
              <p className="text-sm md:text-lg font-bold text-gray-900 break-words">
                {formatCurrency(analytics.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
              <Activity className="text-blue-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Active Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{analytics.activeBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0">
              <CheckCircle className="text-orange-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Completed Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{analytics.completedBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
              <Shield className="text-purple-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Total Active Memberships</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{analytics.membershipSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg flex-shrink-0">
              <CreditCard className="text-indigo-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Membership Revenue</p>
              <p className="text-sm md:text-lg font-bold text-gray-900 break-words">
                {formatCurrency(analytics.membershipRevenue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="text-red-600" size={16} />
            <h3 className="font-medium text-red-800">Error Loading Data</h3>
          </div>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalyticsData}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <RefreshCw size={14} className="mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-3 md:p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <h2 className="text-lg font-semibold text-gray-900">Bookings</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full text-center sm:text-left">
                {filteredBookings.length}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 md:p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Machine/Pallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id || booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{booking.vehicleNumber}</div>
                          <div className="text-sm text-gray-500 capitalize">{booking.vehicleType?.replace('-', ' ')}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{booking.customerName}</div>
                          <div className="text-sm text-gray-500">{booking.phoneNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{booking.machineNumber || 'N/A'}</div>
                          <div className="text-sm text-gray-500">
                            {booking.palletName || `Pallet ${booking.palletNumber}` || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {booking.payment?.method || booking.paymentMethod || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.payment?.amount ? formatCurrency(booking.payment.amount) : 
                         booking.totalAmount ? formatCurrency(booking.totalAmount) : formatCurrency(0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(booking.createdAt).toLocaleDateString()}<br />
                        <span className="text-xs">{new Date(booking.createdAt).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBookingClick(booking)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <div key={booking._id || booking.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 truncate">{booking.vehicleNumber}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 capitalize mt-1">{booking.vehicleType?.replace('-', ' ')}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBookingClick(booking)}
                        className="ml-2 flex-shrink-0"
                      >
                        <Eye size={14} />
                      </Button>
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-gray-500 font-medium">Customer</dt>
                        <dd className="text-gray-900 mt-1">
                          <div>{booking.customerName}</div>
                          <div className="text-gray-500">{booking.phoneNumber}</div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Machine/Pallet</dt>
                        <dd className="text-gray-900 mt-1">
                          <div>{booking.machineNumber || 'N/A'}</div>
                          <div className="text-gray-500">{booking.palletName || `Pallet ${booking.palletNumber}` || 'N/A'}</div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Payment</dt>
                        <dd className="text-gray-900 mt-1 capitalize">{booking.payment?.method || booking.paymentMethod || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Amount</dt>
                        <dd className="text-gray-900 mt-1 font-medium">
                          {booking.payment?.amount ? formatCurrency(booking.payment.amount) : 
                           booking.totalAmount ? formatCurrency(booking.totalAmount) : formatCurrency(0)}
                        </dd>
                      </div>
                    </div>
                    
                    {/* Date/Time */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
                        <span>{new Date(booking.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-6 md:p-8 text-center">
            <div className="bg-gray-100 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="text-gray-400" size={20} />
            </div>
            <p className="text-gray-500 mb-2">No bookings found</p>
            <p className="text-sm text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'No bookings for the selected date range'}
            </p>
          </div>
        )}
      </div>

      {/* Booking Information Modal */}
      <BookingInfoModal
        booking={selectedBooking}
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
      />
    </div>
  );
};

export default Analytics;