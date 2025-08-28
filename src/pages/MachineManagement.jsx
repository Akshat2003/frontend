import React, { useState, useEffect } from 'react';
import { Plus, Settings, Edit, Trash2, Activity, Wrench, Search, Filter, Car, Bike } from 'lucide-react';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import Select from '../components/Common/Select';
import { useMachines } from '../hooks/useMachines';
import apiService from '../services/api';

const MachineManagement = () => {
  const [machines, setMachines] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [machineTypeFilter, setMachineTypeFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [showPalletView, setShowPalletView] = useState(false);
  const [formData, setFormData] = useState({
    siteId: '',
    machineNumber: '',
    machineName: '',
    machineType: 'two-wheeler',
    parkingType: 'rotary',
    status: 'online',
    capacity: {
      total: 4
    },
    pallets: [], // For custom pallet names in puzzle parking
    specifications: {
      supportedVehicleTypes: ['two-wheeler'],
      maxVehicleLength: 5000,
      maxVehicleWidth: 2000,
      maxVehicleHeight: 2000,
      maxVehicleWeight: 2000
    },
    location: {
      building: '',
      zone: ''
    },
    vendor: {
      name: 'Sparkee Systems'
    },
    warrantyExpiryDate: ''
  });
  const [errors, setErrors] = useState({});

  const { getMachinePallets, selectedMachinePallets, loading: palletLoading } = useMachines();

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'error', label: 'Error' }
  ];

  const machineTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'two-wheeler', label: 'Two-Wheeler' },
    { value: 'four-wheeler', label: 'Four-Wheeler' }
  ];

  const parkingTypeOptions = [
    { value: 'puzzle', label: 'Puzzle Parking' },
    { value: 'rotary', label: 'Rotary Parking' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machinesResponse, sitesResponse] = await Promise.all([
        apiService.getMachines({
          search: searchTerm,
          status: statusFilter,
          machineType: machineTypeFilter,
          siteId: siteFilter,
          limit: 50
        }),
        apiService.getSites({ limit: 100, status: 'active' })
      ]);
      setMachines(machinesResponse.data.machines || []);
      setSites(sitesResponse.data.sites || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, machineTypeFilter, siteFilter]);

  const siteOptions = [
    { value: '', label: 'All Sites' },
    ...sites
      .filter(site => site.status === 'active')
      .map(site => ({
        value: site._id,
        label: `${site.siteName} (${site.siteId})`
      }))
  ];

  const handleCreateMachine = () => {
    setEditingMachine(null);
    setFormData({
      siteId: '',
      machineNumber: '',
      machineName: '',
      machineType: 'two-wheeler',
      parkingType: 'rotary',
      status: 'online',
      capacity: {
        total: 4
      },
      pallets: [],
      specifications: {
        supportedVehicleTypes: ['two-wheeler'],
        maxVehicleLength: 5000,
        maxVehicleWidth: 2000,
        maxVehicleHeight: 2000,
        maxVehicleWeight: 2000
      },
      location: {
        building: '',
        zone: ''
      },
      vendor: {
        name: 'Sparkee Systems'
      },
      warrantyExpiryDate: ''
    });
    setErrors({});
    setShowCreateForm(true);
  };

  const handleEditMachine = (machine) => {
    setEditingMachine(machine);
    setFormData({
      siteId: machine.siteId?._id || machine.siteId || '',
      machineNumber: machine.machineNumber || '',
      machineName: machine.machineName || '',
      machineType: machine.machineType || 'two-wheeler',
      parkingType: machine.parkingType || 'rotary',
      status: machine.status || 'online',
      capacity: {
        total: machine.capacity?.total || 4
      },
      pallets: machine.pallets?.map(pallet => ({
        number: pallet.number,
        customName: pallet.customName || ''
      })) || [],
      specifications: {
        supportedVehicleTypes: machine.specifications?.supportedVehicleTypes || ['two-wheeler'],
        maxVehicleLength: machine.specifications?.maxVehicleLength || 5000,
        maxVehicleWidth: machine.specifications?.maxVehicleWidth || 2000,
        maxVehicleHeight: machine.specifications?.maxVehicleHeight || 2000,
        maxVehicleWeight: machine.specifications?.maxVehicleWeight || 2000
      },
      location: {
        building: machine.location?.building || '',
        zone: machine.location?.zone || ''
      },
      vendor: {
        name: machine.vendor?.name || 'Sparkee Systems'
      },
      warrantyExpiryDate: machine.warrantyExpiryDate ? 
        new Date(machine.warrantyExpiryDate).toISOString().split('T')[0] : ''
    });
    setErrors({});
    setShowCreateForm(true);
  };

  // Generate pallets based on total count
  const generatePallets = (totalPallets) => {
    const pallets = [];
    for (let i = 1; i <= totalPallets; i++) {
      pallets.push({
        number: i,
        customName: `Pallet ${i}`
      });
    }
    return pallets;
  };

  // Handle total pallets change
  const handleTotalPalletsChange = (e) => {
    const newTotal = parseInt(e.target.value) || 0;
    setFormData(prev => {
      const newPallets = generatePallets(newTotal);
      return {
        ...prev,
        capacity: { ...prev.capacity, total: newTotal },
        pallets: newPallets
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        capacity: {
          total: parseInt(formData.capacity.total) || 4
        },
        specifications: {
          ...formData.specifications,
          supportedVehicleTypes: [formData.machineType]
        }
      };

      // Include custom pallet names for puzzle parking
      if (formData.parkingType === 'puzzle' && formData.pallets.length > 0) {
        payload.pallets = formData.pallets.map(pallet => ({
          number: pallet.number,
          customName: pallet.customName || `Pallet ${pallet.number}`
        }));
      }

      // Only include warrantyExpiryDate if it has a value
      if (formData.warrantyExpiryDate) {
        payload.warrantyExpiryDate = new Date(formData.warrantyExpiryDate);
      }

      if (editingMachine) {
        await apiService.updateMachine(editingMachine._id, payload);
      } else {
        await apiService.createMachine(payload);
      }

      setShowCreateForm(false);
      fetchData();
    } catch (error) {
      console.error('Error saving machine:', error);
      if (error.validationErrors) {
        const newErrors = {};
        error.validationErrors.forEach(err => {
          newErrors[err.field] = err.message;
        });
        setErrors(newErrors);
      }
    }
  };

  const handleViewPallets = async (machine) => {
    setSelectedMachine(machine);
    try {
      await getMachinePallets(machine._id);
      setShowPalletView(true);
    } catch (error) {
      console.error('Error fetching machine pallets:', error);
    }
  };

  const handleDeactivate = async (machine) => {
    if (window.confirm(`Are you sure you want to deactivate ${machine.machineName}?`)) {
      try {
        await apiService.deactivateMachine(machine._id, 'Deactivated by admin');
        fetchData();
      } catch (error) {
        console.error('Error deactivating machine:', error);
      }
    }
  };

  const filteredMachines = machines.filter(machine =>
    machine.machineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.machineNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.location?.building?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showPalletView && selectedMachine) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedMachine.machineName} - Pallet Status
                </h2>
                <p className="text-gray-600">
                  {selectedMachine.machineNumber} • {selectedMachine.machineType}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPalletView(false)}
              >
                Back to Machines
              </Button>
            </div>

            {palletLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading pallets...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedMachinePallets.map((pallet) => (
                  <div key={pallet.number} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">Pallet {pallet.number}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pallet.status === 'available' 
                          ? 'bg-green-100 text-green-800'
                          : pallet.status === 'occupied'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {pallet.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacity:</span>
                        <span className="font-medium">{pallet.vehicleCapacity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Occupied:</span>
                        <span className="font-medium">{pallet.currentOccupancy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-medium text-green-600">
                          {pallet.vehicleCapacity - pallet.currentOccupancy}
                        </span>
                      </div>
                    </div>

                    {pallet.currentBookings && pallet.currentBookings.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-700 mb-2">Current Vehicles:</p>
                        {pallet.currentBookings.map((booking, index) => (
                          <div key={index} className="text-xs text-gray-600 mb-1">
                            <span className="font-mono">{booking.vehicleNumber}</span>
                            {booking.position && (
                              <span className="ml-2 text-gray-500">Pos: {booking.position}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMachine ? 'Edit Machine' : 'Create New Machine'}
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Site"
                    value={formData.siteId}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                    options={siteOptions.slice(1)} // Remove "All Sites" option
                    error={errors.siteId}
                    required
                    placeholder="Select site"
                  />
                  <Input
                    label="Machine Number"
                    value={formData.machineNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, machineNumber: e.target.value }))}
                    error={errors.machineNumber}
                    required
                    placeholder="e.g., M101"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Machine Name"
                    value={formData.machineName}
                    onChange={(e) => setFormData(prev => ({ ...prev, machineName: e.target.value }))}
                    error={errors.machineName}
                    required
                    placeholder="e.g., Two Wheeler Machine 1"
                  />
                  <Select
                    label="Machine Type"
                    value={formData.machineType}
                    onChange={(e) => setFormData(prev => ({ ...prev, machineType: e.target.value }))}
                    options={machineTypeOptions.slice(1)} // Remove "All Types" option
                    error={errors.machineType}
                    required
                  />
                  <Select
                    label="Parking Machine Type"
                    value={formData.parkingType}
                    onChange={(e) => setFormData(prev => ({ ...prev, parkingType: e.target.value }))}
                    options={parkingTypeOptions}
                    error={errors.parkingType}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Total Pallets"
                    type="number"
                    value={formData.capacity.total}
                    onChange={handleTotalPalletsChange}
                    error={errors['capacity.total']}
                    required
                    placeholder="Number of pallets"
                  />
                  <Select
                    label="Status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    options={statusOptions.slice(1)} // Remove "All Statuses" option
                    error={errors.status}
                    required
                  />
                  <Input
                    label="Warranty Expiry"
                    type="date"
                    value={formData.warrantyExpiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, warrantyExpiryDate: e.target.value }))}
                    error={errors.warrantyExpiryDate}
                  />
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Location Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Building"
                    value={formData.location.building}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, building: e.target.value }
                    }))}
                    error={errors['location.building']}
                    placeholder="Building or area"
                  />
                  <Input
                    label="Zone"
                    value={formData.location.zone}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, zone: e.target.value }
                    }))}
                    error={errors['location.zone']}
                    placeholder="Zone or section"
                  />
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Vehicle Specifications</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Max Vehicle Length (mm)"
                    type="number"
                    value={formData.specifications.maxVehicleLength}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, maxVehicleLength: e.target.value }
                    }))}
                    error={errors['specifications.maxVehicleLength']}
                    placeholder="Maximum length"
                  />
                  <Input
                    label="Max Vehicle Width (mm)"
                    type="number"
                    value={formData.specifications.maxVehicleWidth}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, maxVehicleWidth: e.target.value }
                    }))}
                    error={errors['specifications.maxVehicleWidth']}
                    placeholder="Maximum width"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Max Vehicle Height (mm)"
                    type="number"
                    value={formData.specifications.maxVehicleHeight}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, maxVehicleHeight: e.target.value }
                    }))}
                    error={errors['specifications.maxVehicleHeight']}
                    placeholder="Maximum height"
                  />
                  <Input
                    label="Max Vehicle Weight (kg)"
                    type="number"
                    value={formData.specifications.maxVehicleWeight}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, maxVehicleWeight: e.target.value }
                    }))}
                    error={errors['specifications.maxVehicleWeight']}
                    placeholder="Maximum weight"
                  />
                </div>
              </div>

              {/* Pallet Names Section - Only for Puzzle Parking */}
              {formData.parkingType === 'puzzle' && formData.pallets.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">Pallet Names (Puzzle Parking)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.pallets.map((pallet, index) => (
                      <Input
                        key={pallet.number}
                        label={`Pallet ${pallet.number} Name`}
                        value={pallet.customName}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pallets: prev.pallets.map((p, i) => 
                            i === index ? { ...p, customName: e.target.value } : p
                          )
                        }))}
                        placeholder={`e.g., Section A${pallet.number}`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Puzzle Parking Capacity:</strong> 
                      {formData.machineType === 'two-wheeler' ? ' 3 spots per pallet' : ' 1 spot per pallet'}
                    </p>
                  </div>
                </div>
              )}

              {/* Rotary Parking Info */}
              {formData.parkingType === 'rotary' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">Rotary Parking Configuration</h3>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Rotary Parking Capacity:</strong> 
                      {formData.machineType === 'two-wheeler' ? ' 6 spots per pallet' : ' 1 spot per pallet'}
                    </p>
                    <p>Pallets will be automatically numbered (Pallet 1, Pallet 2, etc.)</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMachine ? 'Update Machine' : 'Create Machine'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Machine Management</h1>
            <p className="text-gray-600 mt-1">Manage parking machines and their operations</p>
          </div>
          <Button
            onClick={handleCreateMachine}
            className="mt-4 sm:mt-0"
          >
            <Plus size={16} className="mr-2" />
            Add New Machine
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <Select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              options={siteOptions}
              placeholder="Filter by site"
            />
            <Select
              value={machineTypeFilter}
              onChange={(e) => setMachineTypeFilter(e.target.value)}
              options={machineTypeOptions}
              placeholder="Filter by type"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              placeholder="Filter by status"
            />
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter size={16} />
              <span>Total: {filteredMachines.length}</span>
            </div>
          </div>
        </div>

        {/* Machines Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading machines...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMachines.map((machine) => (
              <div key={machine._id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{machine.machineName}</h3>
                    <p className="text-sm text-gray-600">{machine.machineNumber}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {machine.machineType === 'two-wheeler' ? (
                      <Bike size={16} className="text-purple-600" />
                    ) : (
                      <Car size={16} className="text-blue-600" />
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      machine.status === 'online' 
                        ? 'bg-green-100 text-green-800'
                        : machine.status === 'maintenance'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {machine.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Site:</span>
                    <span className="font-medium">{machine.siteId?.siteName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{machine.location?.building || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Parking Type:</span>
                    <span className="font-medium capitalize">{machine.parkingType || 'Rotary'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{machine.capacity?.available || 0}/{machine.capacity?.total || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Occupancy:</span>
                    <span className="font-medium">{Math.round(machine.occupancyRate || 0)}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPallets(machine)}
                  >
                    <Activity size={14} className="mr-1" />
                    Pallets
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditMachine(machine)}
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  {machine.status !== 'offline' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(machine)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredMachines.length === 0 && (
          <div className="text-center py-12">
            <Settings size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No machines found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter || machineTypeFilter || siteFilter 
                ? 'Try adjusting your filters' 
                : 'Get started by adding your first machine'
              }
            </p>
            {!searchTerm && !statusFilter && !machineTypeFilter && !siteFilter && (
              <Button onClick={handleCreateMachine}>
                <Plus size={16} className="mr-2" />
                Add New Machine
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineManagement;