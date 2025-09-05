import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Edit, Trash2, Users, Building, Search, Filter } from 'lucide-react';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import Select from '../components/Common/Select';
import apiService from '../services/api';

const SiteManagement = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({
    siteId: '',
    siteName: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    coordinates: {
      latitude: '',
      longitude: ''
    },
    landmark: '',
    zone: '',
    contactInfo: {
      phone: '',
      email: ''
    },
    capacity: {
      total: '',
      twoWheeler: '',
      fourWheeler: ''
    },
    operatingHours: {
      openTime: '06:00',
      closeTime: '22:00'
    },
    status: 'active'
  });
  const [errors, setErrors] = useState({});

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'maintenance', label: 'Maintenance' }
  ];

  const stateOptions = [
    { value: 'Maharashtra', label: 'Maharashtra' },
    { value: 'Delhi', label: 'Delhi' },
    { value: 'Karnataka', label: 'Karnataka' },
    { value: 'Tamil Nadu', label: 'Tamil Nadu' },
    { value: 'Gujarat', label: 'Gujarat' },
    { value: 'Rajasthan', label: 'Rajasthan' },
    { value: 'West Bengal', label: 'West Bengal' },
    { value: 'Uttar Pradesh', label: 'Uttar Pradesh' }
  ];

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSites({
        search: searchTerm,
        status: statusFilter,
        limit: 50
      });
      setSites(response.data.sites || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSites();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  const handleCreateSite = () => {
    setEditingSite(null);
    setFormData({
      siteId: '',
      siteName: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      coordinates: {
        latitude: '',
        longitude: ''
      },
      landmark: '',
      zone: '',
      contactInfo: {
        phone: '',
        email: ''
      },
      capacity: {
        total: '',
        twoWheeler: '',
        fourWheeler: ''
      },
      operatingHours: {
        openTime: '06:00',
        closeTime: '22:00'
      },
      status: 'active'
    });
    setErrors({});
    setShowCreateForm(true);
  };

  const handleEditSite = (site) => {
    setEditingSite(site);
    setFormData({
      siteId: site.siteId || '',
      siteName: site.siteName || '',
      address: {
        street: site.location?.address?.street || '',
        city: site.location?.address?.city || '',
        state: site.location?.address?.state || '',
        pincode: site.location?.address?.pincode || '',
        country: site.location?.address?.country || 'India'
      },
      coordinates: {
        latitude: site.location?.coordinates?.latitude || '',
        longitude: site.location?.coordinates?.longitude || ''
      },
      landmark: site.location?.landmark || '',
      zone: site.location?.zone || '',
      contactInfo: {
        phone: site.contactInfo?.phone || '',
        email: site.contactInfo?.email || ''
      },
      capacity: {
        total: site.capacity?.total || '',
        twoWheeler: site.capacity?.twoWheeler || '',
        fourWheeler: site.capacity?.fourWheeler || ''
      },
      operatingHours: {
        openTime: site.operatingHours?.openTime || '06:00',
        closeTime: site.operatingHours?.closeTime || '22:00'
      },
      status: site.status || 'active'
    });
    setErrors({});
    setShowCreateForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form data:', formData); // Debug log
    try {
      const payload = {
        siteId: formData.siteId,
        siteName: formData.siteName,
        status: formData.status || 'active',
        location: {
          address: formData.address,
          coordinates: {
            latitude: parseFloat(formData.coordinates.latitude) || 0,
            longitude: parseFloat(formData.coordinates.longitude) || 0
          },
          landmark: formData.landmark,
          zone: formData.zone
        },
        siteManager: {
          name: formData.contactInfo?.name || 'Site Manager',
          phoneNumber: formData.contactInfo?.phone || '9999999999',
          email: formData.contactInfo?.email || 'manager@sparkee.com'
        },
        configuration: {
          totalMachines: 2,
          totalCapacity: parseInt(formData.capacity?.total) || 16,
          supportedVehicleTypes: ['two-wheeler', 'four-wheeler'],
          operatingHours: {
            monday: { isOpen: true, openTime: formData.operatingHours?.openTime || '06:00', closeTime: formData.operatingHours?.closeTime || '22:00' },
            tuesday: { isOpen: true, openTime: formData.operatingHours?.openTime || '06:00', closeTime: formData.operatingHours?.closeTime || '22:00' },
            wednesday: { isOpen: true, openTime: formData.operatingHours?.openTime || '06:00', closeTime: formData.operatingHours?.closeTime || '22:00' },
            thursday: { isOpen: true, openTime: formData.operatingHours?.openTime || '06:00', closeTime: formData.operatingHours?.closeTime || '22:00' },
            friday: { isOpen: true, openTime: formData.operatingHours?.openTime || '06:00', closeTime: formData.operatingHours?.closeTime || '22:00' },
            saturday: { isOpen: true, openTime: formData.operatingHours?.openTime || '06:00', closeTime: formData.operatingHours?.closeTime || '22:00' },
            sunday: { isOpen: true, openTime: formData.operatingHours?.openTime || '07:00', closeTime: formData.operatingHours?.closeTime || '21:00' }
          }
        },
        pricing: {
          twoWheeler: { baseRate: 20, minimumCharge: 20 },
          fourWheeler: { baseRate: 40, minimumCharge: 40 },
          peakHourMultiplier: 1.5,
          peakHours: { start: '08:00', end: '20:00' }
        }
      };

      console.log('Payload being sent:', payload); // Debug log

      if (editingSite) {
        await apiService.updateSite(editingSite._id, payload);
      } else {
        await apiService.createSite(payload);
      }

      setShowCreateForm(false);
      fetchSites();
    } catch (error) {
      console.error('Error saving site:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.statusCode,
        validationErrors: error.validationErrors,
        fullError: error
      });
      
      if (error.validationErrors) {
        const newErrors = {};
        error.validationErrors.forEach(err => {
          newErrors[err.field] = err.message;
        });
        setErrors(newErrors);
      } else {
        // Show general error message
        alert(`Error creating site: ${error.message || 'Unknown error occurred'}`);
      }
    }
  };

  const handleDeactivate = async (site) => {
    if (window.confirm(`Are you sure you want to deactivate ${site.siteName}?`)) {
      try {
        await apiService.deactivateSite(site._id, 'Deactivated by admin');
        fetchSites();
      } catch (error) {
        console.error('Error deactivating site:', error);
      }
    }
  };

  const handleDeletePermanently = async (site) => {
    const confirmMessage = `⚠️ PERMANENT DELETE WARNING ⚠️\n\nThis will permanently delete "${site.siteName}" and ALL associated data including:\n- All booking records\n- All machines\n- All user assignments\n\nThis action CANNOT be undone.\n\nType "DELETE" to confirm:`;
    
    const userInput = window.prompt(confirmMessage);
    
    if (userInput === 'DELETE') {
      const reason = window.prompt('Please provide a reason for permanent deletion:');
      
      try {
        await apiService.deleteSitePermanently(site._id, reason || 'Permanent deletion by admin', true);
        alert(`Site "${site.siteName}" has been permanently deleted.`);
        fetchSites();
      } catch (error) {
        console.error('Error permanently deleting site:', error);
        alert(`Error: ${error.message || 'Failed to delete site permanently'}`);
      }
    } else if (userInput !== null) {
      alert('Deletion cancelled. You must type "DELETE" exactly to confirm.');
    }
  };

  const filteredSites = sites.filter(site =>
    site.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.siteId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.location?.address?.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showCreateForm) {
    return (
      <div className="p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 space-y-3 sm:space-y-0">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {editingSite ? 'Edit Site' : 'Create New Site'}
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              {/* Basic Information */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Site ID"
                    value={formData.siteId}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                    error={errors.siteId}
                    required
                    placeholder="e.g., SITE001"
                  />
                  <Input
                    label="Site Name"
                    value={formData.siteName}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                    error={errors.siteName}
                    required
                    placeholder="e.g., Mumbai Central Mall"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Phone"
                    value={formData.contactInfo.phone}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      contactInfo: { ...prev.contactInfo, phone: e.target.value }
                    }))}
                    error={errors['contactInfo.phone']}
                    placeholder="Contact phone number"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.contactInfo.email}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      contactInfo: { ...prev.contactInfo, email: e.target.value }
                    }))}
                    error={errors['contactInfo.email']}
                    placeholder="Contact email"
                  />
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Address Information</h3>
                
                <Input
                  label="Street Address"
                  value={formData.address.street}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, street: e.target.value }
                  }))}
                  error={errors['address.street']}
                  required
                  placeholder="Street address"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <Input
                    label="City"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    error={errors['address.city']}
                    required
                    placeholder="City"
                  />
                  <Select
                    label="State"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    options={stateOptions}
                    error={errors['address.state']}
                    required
                  />
                  <Input
                    label="Pincode"
                    value={formData.address.pincode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, pincode: e.target.value }
                    }))}
                    error={errors['address.pincode']}
                    required
                    placeholder="Pincode"
                    className="sm:col-span-2 lg:col-span-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Landmark"
                    value={formData.landmark}
                    onChange={(e) => setFormData(prev => ({ ...prev, landmark: e.target.value }))}
                    error={errors.landmark}
                    placeholder="Nearby landmark"
                  />
                  <Input
                    label="Zone"
                    value={formData.zone}
                    onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                    error={errors.zone}
                    placeholder="Zone or area type"
                  />
                </div>
              </div>

              {/* Capacity & Operations */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Capacity & Operations</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <Input
                    label="Total Capacity"
                    type="number"
                    value={formData.capacity.total}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      capacity: { ...prev.capacity, total: e.target.value }
                    }))}
                    error={errors['capacity.total']}
                    placeholder="Total parking spots"
                  />
                  <Input
                    label="Two-Wheeler Spots"
                    type="number"
                    value={formData.capacity.twoWheeler}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      capacity: { ...prev.capacity, twoWheeler: e.target.value }
                    }))}
                    error={errors['capacity.twoWheeler']}
                    placeholder="Two-wheeler capacity"
                  />
                  <Input
                    label="Four-Wheeler Spots"
                    type="number"
                    value={formData.capacity.fourWheeler}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      capacity: { ...prev.capacity, fourWheeler: e.target.value }
                    }))}
                    error={errors['capacity.fourWheeler']}
                    placeholder="Four-wheeler capacity"
                    className="sm:col-span-2 lg:col-span-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <Input
                    label="Opening Time"
                    type="time"
                    value={formData.operatingHours.openTime}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      operatingHours: { ...prev.operatingHours, openTime: e.target.value }
                    }))}
                    error={errors['operatingHours.openTime']}
                  />
                  <Input
                    label="Closing Time"
                    type="time"
                    value={formData.operatingHours.closeTime}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      operatingHours: { ...prev.operatingHours, closeTime: e.target.value }
                    }))}
                    error={errors['operatingHours.closeTime']}
                  />
                  <Select
                    label="Status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    options={statusOptions.slice(1)} // Remove "All Statuses" option
                    error={errors.status}
                    required
                    className="sm:col-span-2 lg:col-span-1"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2">
                  {editingSite ? 'Update Site' : 'Create Site'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 space-y-3 sm:space-y-0">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Site Management</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage parking sites and locations</p>
          </div>
          <Button
            onClick={handleCreateSite}
            className="w-full sm:w-auto"
          >
            <Plus size={16} className="mr-2" />
            Add New Site
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
                placeholder="Filter by status"
              />
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded-lg sm:bg-transparent sm:px-0 sm:py-0">
              <Filter size={16} />
              <span>Total Sites: {filteredSites.length}</span>
            </div>
          </div>
        </div>

        {/* Sites Grid */}
        {loading ? (
          <div className="text-center py-8 md:py-12">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading sites...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredSites.map((site) => (
              <div key={site._id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-6">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="min-w-0 flex-1 mr-3">
                    <h3 className="font-semibold text-gray-900 truncate">{site.siteName}</h3>
                    <p className="text-sm text-gray-600">{site.siteId}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    site.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : site.status === 'maintenance'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {site.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{site.location?.address?.city}, {site.location?.address?.state}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building size={14} className="mr-2 flex-shrink-0" />
                    <span>Capacity: {site.capacity?.total || 0} spots</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users size={14} className="mr-2 flex-shrink-0" />
                    <span>Occupancy: {Math.round(site.currentOccupancyRate || 0)}%</span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="block sm:hidden space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSite(site)}
                    className="w-full"
                  >
                    <Edit size={14} className="mr-1" />
                    Edit Site
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    {site.status !== 'inactive' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(site)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Deactivate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePermanently(site)}
                      className="text-red-800 border-red-300 hover:bg-red-100 bg-red-25"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden sm:flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSite(site)}
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  {site.status !== 'inactive' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(site)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Deactivate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePermanently(site)}
                    className="text-red-800 border-red-300 hover:bg-red-100 bg-red-25"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete Forever
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredSites.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <Building size={40} className="md:w-12 md:h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sites found</h3>
            <p className="text-gray-600 mb-4 text-sm md:text-base">
              {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first site'}
            </p>
            {!searchTerm && !statusFilter && (
              <Button onClick={handleCreateSite} className="w-full sm:w-auto">
                <Plus size={16} className="mr-2" />
                Add New Site
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteManagement;