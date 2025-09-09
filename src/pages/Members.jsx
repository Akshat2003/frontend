import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Users, Crown, Calendar, Phone, Mail, Car, MoreVertical, Eye, Edit2 } from 'lucide-react';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import Select from '../components/Common/Select';
import Modal from '../components/Common/Modal';
import api from '../services/api';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(null);

  const itemsPerPage = 10;

  // Fetch active members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        membershipType: membershipTypeFilter !== 'all' ? membershipTypeFilter : undefined,
        sortBy,
        sortOrder
      };

      const response = await api.getActiveMembers(filters);
      
      if (response.success) {
        setMembers(response.data.members || []);
        setPagination(response.data.pagination || null);
      } else {
        // Handle case where endpoint doesn't exist or returns error
        console.warn('Active members API not available:', response.message);
        setMembers([]);
        setPagination(null);
        // Don't throw error - just show empty state
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchMembers();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, membershipTypeFilter, sortBy, sortOrder]);

  // Fetch members when page changes
  useEffect(() => {
    fetchMembers();
  }, [currentPage]);

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, []);

  const handleViewDetails = async (member) => {
    try {
      // Fetch detailed member information
      const response = await api.getCustomerById(member._id);
      if (response.success) {
        setSelectedMember(response.data.customer);
        setShowDetailsModal(true);
      }
    } catch (err) {
      console.error('Error fetching member details:', err);
    }
    setShowActionsMenu(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMembershipType = (type) => {
    const types = {
      'daily': 'Daily Pass',
      'weekly': 'Weekly Pass',
      'monthly': 'Monthly Pass',
      'yearly': 'Yearly Pass'
    };
    return types[type] || type;
  };

  const getMembershipStatusColor = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) return 'text-red-600 bg-red-50';
    if (daysUntilExpiry <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const totalPages = pagination ? Math.ceil(pagination.total / itemsPerPage) : 0;

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <Crown className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Members</h1>
            <p className="text-sm text-gray-600">
              {pagination ? `${pagination.total} active memberships` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name, phone, or membership..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Membership Type Filter */}
          <Select
            value={membershipTypeFilter}
            onChange={(e) => setMembershipTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'daily', label: 'Daily Pass' },
              { value: 'weekly', label: 'Weekly Pass' },
              { value: 'monthly', label: 'Monthly Pass' },
              { value: 'yearly', label: 'Yearly Pass' }
            ]}
          />

          {/* Sort By */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'createdAt', label: 'Join Date' },
              { value: 'expiresAt', label: 'Expiry Date' },
              { value: 'firstName', label: 'Name' },
              { value: 'totalBookings', label: 'Total Bookings' }
            ]}
          />

          {/* Sort Order */}
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            options={[
              { value: 'desc', label: 'Descending' },
              { value: 'asc', label: 'Ascending' }
            ]}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
          <Button 
            onClick={() => { setError(null); fetchMembers(); }}
            className="mt-2"
            variant="outline"
            size="sm"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Active Members {pagination ? `(${pagination.total})` : ''}
          </h2>
        </div>

        {loading && members.length === 0 ? (
          <div className="p-6 md:p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : members.length === 0 ? (
          <div className="p-6 md:p-8 text-center text-gray-500">
            <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-gray-300" />
            <p>No active members found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-purple-600 hover:text-purple-700 mt-2 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Member Cards */}
            <div className="divide-y divide-gray-200">
              {members.map((member) => (
                <div key={member._id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  {/* Mobile Layout */}
                  <div className="block sm:hidden">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Crown className="text-purple-600 w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {member.firstName} {member.lastName}
                            </h3>
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                                <span className="truncate">{member.phoneNumber}</span>
                              </div>
                              {member.email && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Mobile Actions */}
                          <div className="relative ml-2">
                            <Button
                              onClick={() => handleViewDetails(member)}
                              variant="outline"
                              size="sm"
                              className="p-1.5"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Mobile Bottom Row */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center text-xs text-gray-500">
                              <Car className="h-3 w-3 mr-1" />
                              <span>{member.vehicles?.length || 0}</span>
                            </div>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getMembershipStatusColor(member.membership?.expiresAt)}`}>
                              {formatMembershipType(member.membership?.type)}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-400">
                            Expires: {formatDate(member.membership?.expiresAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop Layout */}
                  <div className="hidden sm:block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Crown className="text-purple-600 w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {member.firstName} {member.lastName}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1.5" />
                              <span>{member.phoneNumber}</span>
                            </div>
                            {member.email && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-1.5" />
                                <span className="truncate max-w-40">{member.email}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <Car className="h-4 w-4 mr-1.5" />
                              <span>{member.vehicles?.length || 0} vehicle{member.vehicles?.length !== 1 ? 's' : ''}</span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMembershipStatusColor(member.membership?.expiresAt)}`}>
                              {formatMembershipType(member.membership?.type)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Member since {formatDate(member.createdAt)} • Expires: {formatDate(member.membership?.expiresAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          onClick={() => handleViewDetails(member)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} members
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMember(null);
          }}
          title="Member Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-sm text-gray-900">{selectedMember.firstName} {selectedMember.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-sm text-gray-900">{selectedMember.phoneNumber}</p>
                </div>
                {selectedMember.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{selectedMember.email}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedMember.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Membership Info */}
            {selectedMember.membership && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Membership Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-sm text-gray-900">{formatMembershipType(selectedMember.membership.type)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Membership Number</label>
                    <p className="text-sm text-gray-900">#{selectedMember.membership.membershipNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedMember.membership.startDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <p className={`text-sm ${getMembershipStatusColor(selectedMember.membership.expiresAt).includes('red') ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(selectedMember.membership.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicles */}
            {selectedMember.vehicles && selectedMember.vehicles.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Registered Vehicles</h3>
                <div className="space-y-2">
                  {selectedMember.vehicles.map((vehicle, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Car className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{vehicle.vehicleNumber}</p>
                        <p className="text-sm text-gray-500">{vehicle.vehicleType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedMember.bookingStats?.totalBookings || 0}</p>
                  <p className="text-sm text-blue-600">Total Bookings</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectedMember.bookingStats?.totalRevenue || 0}</p>
                  <p className="text-sm text-green-600">Total Revenue</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{selectedMember.bookingStats?.averageDuration || 0}h</p>
                  <p className="text-sm text-purple-600">Avg Duration</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedMember(null);
              }}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Click outside to close actions menu */}
      {showActionsMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowActionsMenu(null)}
        />
      )}
    </div>
  );
};

export default Members;