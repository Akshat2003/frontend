import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  BarChart3, 
  Car, 
  Bike, 
  Users, 
  Activity,
  RefreshCw
} from 'lucide-react';
import BookingCard from '../components/Booking/BookingCard';
import BookingModal from '../components/Booking/BookingModal';
import Input from '../components/Common/Input';
import Button from '../components/Common/Button';
import { useBookings } from '../hooks/useBookings';
import { useSite } from '../contexts/SiteContext';

const ActiveListings = () => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const { bookings, loading, error, fetchBookings, updateBooking, completeBooking } = useBookings();
  const { currentSite } = useSite();

  // Fetch bookings filtered by current site when site changes
  useEffect(() => {
    if (currentSite) {
      fetchBookings({ 
        siteId: currentSite._id || currentSite.siteId,
        status: 'active' // Only fetch active bookings for this page
      });
    }
  }, [currentSite, fetchBookings]);

  // Listen for site changes from header dropdown
  useEffect(() => {
    const handleSiteChange = (event) => {
      const { site } = event.detail;
      if (site) {
        fetchBookings({ 
          siteId: site._id || site.siteId,
          status: 'active'
        });
      }
    };

    window.addEventListener('siteChanged', handleSiteChange);
    return () => window.removeEventListener('siteChanged', handleSiteChange);
  }, [fetchBookings]);

  const getActiveBookings = () => {
    return bookings.filter(booking => booking.status === 'active');
  };

  const filterBookings = () => {
    let activeBookings = getActiveBookings();

    // Filter by vehicle type
    if (vehicleFilter !== 'all') {
      activeBookings = activeBookings.filter(booking => booking.vehicleType === vehicleFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      activeBookings = activeBookings.filter(booking =>
        booking.vehicleNumber.toLowerCase().includes(query) ||
        booking.customerName.toLowerCase().includes(query) ||
        booking.phoneNumber.includes(query) ||
        booking.machineNumber.toLowerCase().includes(query) ||
        booking.palletNumber.toString().includes(query) ||
        (booking.otp?.code || '').includes(query)
      );
    }

    return activeBookings;
  };

  const filteredBookings = filterBookings();
  const twoWheelerCount = getActiveBookings().filter(b => b.vehicleType === 'two-wheeler').length;
  const fourWheelerCount = getActiveBookings().filter(b => b.vehicleType === 'four-wheeler').length;

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const handleRefresh = () => {
    if (currentSite) {
      fetchBookings({ 
        siteId: currentSite._id || currentSite.siteId,
        status: 'active'
      });
    } else {
      fetchBookings({ status: 'active' });
    }
    setRefreshKey(prev => prev + 1);
  };

  const handleBookingComplete = async (completedBooking) => {
    try {
      await completeBooking(completedBooking._id, {
        amount: completedBooking.totalAmount,
        method: completedBooking.paymentMethod,
        transactionId: completedBooking.transactionId
      });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to complete booking:', error);
    }
  };

  const StatsCard = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorClasses = {
      purple: 'bg-purple-50 text-purple-600',
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center">
        <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Site Selection Status */}
      {currentSite ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Showing bookings for:</strong> {currentSite.siteName || currentSite.siteId}
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-700">
            <strong>No site selected.</strong> Please select a parking site from the header to view bookings.
          </p>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatsCard
          title="Total Active"
          value={getActiveBookings().length}
          icon={Activity}
          color="purple"
        />
        <StatsCard
          title="Two Wheelers"
          value={twoWheelerCount}
          icon={Bike}
          color="blue"
        />
        <StatsCard
          title="Four Wheelers"
          value={fourWheelerCount}
          icon={Car}
          color="green"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="text-gray-600" size={16} />
          <h2 className="font-semibold text-gray-900">Filter Active Listings</h2>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <Input
              placeholder="Search by vehicle, customer, phone, machine, pallet, or OTP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <Button
              variant={vehicleFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setVehicleFilter('all')}
              className="whitespace-nowrap"
            >
              <Users size={14} className="mr-1" />
              All Vehicles
            </Button>
            <Button
              variant={vehicleFilter === 'two-wheeler' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setVehicleFilter('two-wheeler')}
              className="whitespace-nowrap"
            >
              <Bike size={14} className="mr-1" />
              Two Wheelers
            </Button>
            <Button
              variant={vehicleFilter === 'four-wheeler' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setVehicleFilter('four-wheeler')}
              className="whitespace-nowrap"
            >
              <Car size={14} className="mr-1" />
              Four Wheelers
            </Button>
          </div>
        </div>
      </div>

      {/* Active Listings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="text-gray-600" size={16} />
            <h2 className="font-semibold text-gray-900">
              Active Listings
              {vehicleFilter !== 'all' && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({vehicleFilter.replace('-', ' ')})
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
              {filteredBookings.length} Found
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {loading && filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-gray-500">Loading bookings...</p>
            </div>
          ) : filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <BookingCard
                key={`${booking._id}-${refreshKey}`}
                booking={booking}
                onClick={handleBookingClick}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                {vehicleFilter === 'two-wheeler' ? (
                  <Bike className="text-gray-400" size={24} />
                ) : vehicleFilter === 'four-wheeler' ? (
                  <Car className="text-gray-400" size={24} />
                ) : (
                  <BarChart3 className="text-gray-400" size={24} />
                )}
              </div>
              <p className="text-gray-500 mb-3">
                {searchQuery || vehicleFilter !== 'all' 
                  ? 'No bookings found matching your filters.' 
                  : 'No active bookings at the moment.'
                }
              </p>
              {(searchQuery || vehicleFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setVehicleFilter('all');
                  }}
                >
                  <X size={14} className="mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      <BookingModal
        booking={selectedBooking}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onComplete={handleBookingComplete}
      />
    </div>
  );
};

export default ActiveListings;