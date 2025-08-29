import React, { useState } from 'react';
import { 
  BarChart3, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Car, 
  Bike, 
  Wrench, 
  Hash,
  Calendar,
  Users,
  Activity,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import BookingCard from '../components/Booking/BookingCard';
import BookingInfoModal from '../components/Booking/BookingInfoModal';
import Button from '../components/Common/Button';
import { useAnalytics } from '../hooks/useAnalytics';
import { formatCurrency } from '../utils/calculations';

const Analytics = () => {
  const [filters, setFilters] = useState({
    dateRange: 'today',
    vehicleType: 'all',
    status: 'all',
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const analytics = useAnalytics(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: 'all',
      vehicleType: 'all',
      status: 'all',
    });
  };

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedBooking(null);
  };

  // Responsive Stats Card
  const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'purple', trend }) => {
    const colorClasses = {
      purple: 'bg-purple-50 text-purple-600 border-purple-100',
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      green: 'bg-green-50 text-green-600 border-green-100',
      orange: 'bg-orange-50 text-orange-600 border-orange-100',
      red: 'bg-red-50 text-red-600 border-red-100',
    };

    const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                <Icon size={18} />
              </div>
              {trend && (
                <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${
                  trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  <TrendIcon size={10} />
                  <span>{Math.abs(trend)}%</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Mobile Filter Component
  const MobileFilters = () => (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
      showFilters ? 'max-h-96' : 'max-h-0'
    }`}>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar size={14} className="inline mr-1" />
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Car size={14} className="inline mr-1" />
            Vehicle Type
          </label>
          <select
            value={filters.vehicleType}
            onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Vehicles</option>
            <option value="two-wheeler">Two Wheelers</option>
            <option value="four-wheeler">Four Wheelers</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Activity size={14} className="inline mr-1" />
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="flex-1">
            Clear
          </Button>
          <Button size="sm" onClick={() => setShowFilters(false)} className="flex-1">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );

  // Tab Navigation
  const TabNavigation = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1">
      <div className="flex space-x-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'bookings', label: 'Bookings', icon: Users },
          { id: 'machines', label: 'Machines', icon: Wrench }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Overview Tab Content
  const OverviewContent = () => (
    <div className="space-y-4">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="Total Bookings"
          value={analytics.totalBookings}
          subtitle={`${analytics.activeBookings} active`}
          icon={BarChart3}
          color="purple"
        />
        <StatsCard
          title="Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          subtitle={`Avg: ${formatCurrency(Math.round(analytics.averageRevenue))}`}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Two Wheelers"
          value={analytics.twoWheelerBookings}
          subtitle={`${Math.round((analytics.twoWheelerBookings / analytics.totalBookings) * 100 || 0)}%`}
          icon={Bike}
          color="blue"
        />
        <StatsCard
          title="Four Wheelers"
          value={analytics.fourWheelerBookings}
          subtitle={`${Math.round((analytics.fourWheelerBookings / analytics.totalBookings) * 100 || 0)}%`}
          icon={Car}
          color="orange"
        />
      </div>

      {/* Quick Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Activity className="text-gray-600" size={16} />
          <h3 className="font-semibold text-gray-900">Quick Insights</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Peak Hour</span>
            <span className="font-medium text-gray-900">
              {analytics.peakHour ? `${analytics.peakHour}:00` : 'No data'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Avg Duration</span>
            <span className="font-medium text-gray-900">
              {analytics.averageDuration || 'No data'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Occupancy Rate</span>
            <span className="font-medium text-green-600">
              {analytics.occupancyRate ? `${Math.round(analytics.occupancyRate)}%` : 'No data'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Machines Tab Content
  const MachinesContent = () => {
    const topMachines = Object.entries(analytics.machineUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4);

    const topPallets = Object.entries(analytics.palletUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4);

    return (
      <div className="space-y-4">
        {/* Machine Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Wrench className="text-gray-600" size={16} />
            <h3 className="font-semibold text-gray-900">Machine Performance</h3>
          </div>
          <div className="space-y-2">
            {topMachines.length > 0 ? (
              topMachines.map(([machine, count], index) => (
                <div key={machine} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{machine}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500 ml-1">bookings</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Pallet Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Hash className="text-gray-600" size={16} />
            <h3 className="font-semibold text-gray-900">Pallet Utilization</h3>
          </div>
          <div className="space-y-2">
            {topPallets.length > 0 ? (
              topPallets.map(([pallet, count], index) => (
                <div key={pallet} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">Pallet {pallet}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500 ml-1">uses</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Bookings Tab Content
  const BookingsContent = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="text-gray-600" size={16} />
            <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
          </div>
          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
            {analytics.filteredBookings.length}
          </span>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {analytics.filteredBookings.length > 0 ? (
            analytics.filteredBookings
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 10)
              .map((booking) => (
                <BookingCard
                  key={booking._id || booking.id}
                  booking={booking}
                  onClick={handleBookingClick}
                />
              ))
          ) : (
            <div className="text-center py-8">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500">No bookings found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header with Filter Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-600 flex items-center space-x-1">
            <Calendar size={12} />
            <span>
              {filters.dateRange === 'today' ? 'Today' : 
               filters.dateRange === 'week' ? 'This Week' :
               filters.dateRange === 'month' ? 'This Month' : 'All Time'}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? <X size={16} /> : <Filter size={16} />}
          <span className="ml-1 hidden sm:inline">Filter</span>
        </Button>
      </div>

      {/* Mobile Filters */}
      <MobileFilters />

      {/* Loading State */}
      {analytics.loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {analytics.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="text-red-600" size={16} />
            <h3 className="font-medium text-red-800">Error Loading Analytics</h3>
          </div>
          <p className="text-sm text-red-600 mb-3">{analytics.error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <RefreshCw size={14} className="mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      {!analytics.loading && !analytics.error && <TabNavigation />}

      {/* Tab Content */}
      {!analytics.loading && !analytics.error && (
        <>
          {activeTab === 'overview' && <OverviewContent />}
          {activeTab === 'machines' && <MachinesContent />}
          {activeTab === 'bookings' && <BookingsContent />}
        </>
      )}

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