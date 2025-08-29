import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, Car, CreditCard, ChevronLeft, ChevronRight, Users, UserPlus, Filter } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Modal from '../components/Common/Modal';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import Select from '../components/Common/Select';
import MembershipModal from '../components/Customer/MembershipModal';

const CustomerManagement = () => {
  const {
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
  } = useCustomers();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [newCustomerData, setNewCustomerData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    vehicles: []
  });
  const [newVehicleData, setNewVehicleData] = useState({
    vehicleNumber: '',
    vehicleType: 'two-wheeler',
    make: '',
    model: '',
    color: ''
  });
  const [deleteReason, setDeleteReason] = useState('');

  // Load customers on mount
  useEffect(() => {
    handleLoadCustomers();
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchCustomers(searchQuery, searchType);
      } else if (searchQuery.length === 0) {
        handleLoadCustomers();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  const handleLoadCustomers = async (page = 1) => {
    try {
      await getCustomers({ 
        page, 
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await createCustomer(newCustomerData);
      setShowCreateModal(false);
      setNewCustomerData({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        vehicles: []
      });
      handleLoadCustomers();
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      await updateCustomer(selectedCustomer._id, {
        firstName: selectedCustomer.firstName,
        lastName: selectedCustomer.lastName,
        email: selectedCustomer.email
      });
      setShowEditModal(false);
      setSelectedCustomer(null);
      handleLoadCustomers();
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      await deleteCustomer(selectedCustomer._id, deleteReason);
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      setDeleteReason('');
      handleLoadCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const handleMembershipUpdate = (updatedCustomer) => {
    // Update the customer in the local state
    setSelectedCustomer(updatedCustomer);
    // Refresh the customers list to reflect the change
    handleLoadCustomers();
    setShowMembershipModal(false);
  };

  const handleViewDetails = async (customer) => {
    setSelectedCustomer(customer);
    try {
      // Load customer bookings and vehicles
      const [bookingsResponse, vehiclesResponse] = await Promise.all([
        getCustomerBookings(customer._id, { limit: 5 }),
        getCustomerVehicles(customer._id)
      ]);
      
      setCustomerBookings(bookingsResponse.data.bookings || []);
      setCustomerVehicles(vehiclesResponse.data.vehicles || []);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load customer details:', error);
      setShowDetailsModal(true);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await addCustomerVehicle(selectedCustomer._id, newVehicleData);
      
      // Refresh vehicles list
      const vehiclesResponse = await getCustomerVehicles(selectedCustomer._id);
      setCustomerVehicles(vehiclesResponse.data.vehicles || []);
      
      setShowVehicleModal(false);
      setNewVehicleData({
        vehicleNumber: '',
        vehicleType: 'two-wheeler',
        make: '',
        model: '',
        color: ''
      });
    } catch (error) {
      console.error('Failed to add vehicle:', error);
    }
  };

  const vehicleTypeOptions = [
    { value: 'two-wheeler', label: 'Two Wheeler' },
    { value: 'four-wheeler', label: 'Four Wheeler' }
  ];

  const searchTypeOptions = [
    { value: 'all', label: 'All Fields' },
    { value: 'name', label: 'Name' },
    { value: 'phone', label: 'Phone' },
    { value: 'vehicle', label: 'Vehicle' }
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={clearError} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600">Manage customers and their information</p>
            </div>
          </div>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
            variant="primary"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full sm:w-40">
              <Select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                options={searchTypeOptions}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Customers {pagination.totalItems > 0 && `(${pagination.totalItems})`}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 md:p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-6 md:p-8 text-center text-gray-500">
            <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-gray-300" />
            <p>No customers found</p>
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
            <div className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <div key={customer._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-semibold">
                            {customer.firstName[0]}{customer.lastName[0]}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {customer.fullName}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600">
                            <span>📞 {customer.phoneNumber}</span>
                            {customer.email && <span>✉️ {customer.email}</span>}
                            <span className="flex items-center space-x-1">
                              <Car className="h-4 w-4" />
                              <span>{customer.vehicles?.length || 0} vehicles</span>
                            </span>
                            {customer.hasMembership && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Active Membership
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleViewDetails(customer)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowEditModal(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowMembershipModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        title="Manage Membership"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowDeleteModal(true);
                        }}
                        variant="danger"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems} customers
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleLoadCustomers(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  
                  <Button
                    onClick={() => handleLoadCustomers(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Customer Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="Add New Customer"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={newCustomerData.firstName}
              onChange={(e) => setNewCustomerData({...newCustomerData, firstName: e.target.value})}
              required
            />
            
            <Input
              label="Last Name"
              value={newCustomerData.lastName}
              onChange={(e) => setNewCustomerData({...newCustomerData, lastName: e.target.value})}
              required
            />
          </div>
          
          <Input
            label="Phone Number"
            type="tel"
            value={newCustomerData.phoneNumber}
            onChange={(e) => setNewCustomerData({...newCustomerData, phoneNumber: e.target.value})}
            required
          />
          
          <Input
            label="Email (Optional)"
            type="email"
            value={newCustomerData.email}
            onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowCreateModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="Edit Customer"
      >
        {selectedCustomer && (
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={selectedCustomer.firstName}
                onChange={(e) => setSelectedCustomer({...selectedCustomer, firstName: e.target.value})}
                required
              />
              
              <Input
                label="Last Name"
                value={selectedCustomer.lastName}
                onChange={(e) => setSelectedCustomer({...selectedCustomer, lastName: e.target.value})}
                required
              />
            </div>
            
            <Input
              label="Phone Number"
              value={selectedCustomer.phoneNumber}
              disabled
              className="bg-gray-100"
            />
            
            <Input
              label="Email"
              type="email"
              value={selectedCustomer.email || ''}
              onChange={(e) => setSelectedCustomer({...selectedCustomer, email: e.target.value})}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowEditModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Customer'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Customer Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="Delete Customer"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedCustomer.fullName}</strong>?
              This action cannot be undone.
            </p>
            
            <Input
              label="Reason for deletion (optional)"
              placeholder="Enter reason..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteCustomer}
                variant="danger"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Customer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Details Modal */}
      <Modal 
        isOpen={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)}
        title="Customer Details"
        size="large"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{selectedCustomer.fullName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium">{selectedCustomer.phoneNumber}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium break-words">{selectedCustomer.email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    selectedCustomer.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedCustomer.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Vehicles ({customerVehicles.length})</h3>
                <Button
                  onClick={() => setShowVehicleModal(true)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Vehicle
                </Button>
              </div>
              
              {customerVehicles.length > 0 ? (
                <div className="space-y-2">
                  {customerVehicles.map((vehicle) => (
                    <div key={vehicle._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Car className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{vehicle.vehicleNumber}</p>
                          <p className="text-sm text-gray-600 capitalize">{vehicle.vehicleType?.replace('-', ' ')}</p>
                          {(vehicle.make || vehicle.model) && (
                            <p className="text-xs text-gray-500 truncate">
                              {vehicle.make} {vehicle.model}
                            </p>
                          )}
                        </div>
                      </div>
                      {vehicle.color && (
                        <div className="text-sm text-gray-600 ml-2 flex-shrink-0">
                          {vehicle.color}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No vehicles registered</p>
              )}
            </div>

            {/* Recent Bookings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Bookings ({customerBookings.length})</h3>
              {customerBookings.length > 0 ? (
                <div className="space-y-2">
                  {customerBookings.map((booking) => (
                    <div key={booking._id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{booking.bookingNumber}</p>
                          <p className="text-sm text-gray-600 truncate">{booking.vehicleNumber} - {booking.machineNumber}</p>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end text-sm">
                          <p className={`font-medium ${
                            booking.status === 'active' ? 'text-green-600' :
                            booking.status === 'completed' ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                            {booking.status}
                          </p>
                          <p className="text-gray-500">
                            {new Date(booking.startTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No bookings found</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal 
        isOpen={showVehicleModal} 
        onClose={() => setShowVehicleModal(false)}
        title="Add Vehicle"
      >
        <form onSubmit={handleAddVehicle} className="space-y-4">
          <Input
            label="Vehicle Number"
            placeholder="MH01AB1234"
            value={newVehicleData.vehicleNumber}
            onChange={(e) => setNewVehicleData({...newVehicleData, vehicleNumber: e.target.value.toUpperCase()})}
            required
          />
          
          <Select
            label="Vehicle Type"
            value={newVehicleData.vehicleType}
            onChange={(e) => setNewVehicleData({...newVehicleData, vehicleType: e.target.value})}
            options={vehicleTypeOptions}
            required
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Make (Optional)"
              placeholder="Honda, Toyota, etc."
              value={newVehicleData.make}
              onChange={(e) => setNewVehicleData({...newVehicleData, make: e.target.value})}
            />
            
            <Input
              label="Model (Optional)"
              placeholder="City, Activa, etc."
              value={newVehicleData.model}
              onChange={(e) => setNewVehicleData({...newVehicleData, model: e.target.value})}
            />
          </div>
          
          <Input
            label="Color (Optional)"
            placeholder="Red, Blue, etc."
            value={newVehicleData.color}
            onChange={(e) => setNewVehicleData({...newVehicleData, color: e.target.value})}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowVehicleModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Membership Modal */}
      <MembershipModal
        customer={selectedCustomer}
        isOpen={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
        onMembershipUpdate={handleMembershipUpdate}
      />
    </div>
  );
};

export default CustomerManagement;