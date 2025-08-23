import React, { useState, useEffect } from 'react';
import { Search, User, Car, Bike, Wrench, Hash, Smartphone, Plus, CheckCircle, ChevronDown } from 'lucide-react';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button';
import { useBookings } from '../../hooks/useBookings';
import { useCustomers } from '../../hooks/useCustomers';
import { useMachines } from '../../hooks/useMachines';
import { useSite } from '../../contexts/SiteContext';
import { generateOTP, generateSMSMessage, openSMSApp } from '../../utils/smsUtils';

const BookingForm = ({ onBookingComplete }) => {
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [customerData, setCustomerData] = useState({
    phoneNumber: '',
    customerName: '',
    vehicleNumber: '',
    email: '',
    notes: '',
  });
  const [bookingData, setBookingData] = useState({
    vehicleType: '',
    machineNumber: '',
    palletNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createBooking, loading } = useBookings();
  const { findCustomerByPhone } = useCustomers();
  const { currentSite } = useSite();
  const { 
    availableMachines, 
    selectedMachinePallets, 
    loading: machineLoading, 
    getAvailableMachines, 
    getMachinePallets,
    resetMachineStates 
  } = useMachines();

  const vehicleTypeOptions = [
    { value: 'two-wheeler', label: 'Two Wheeler' },
    { value: 'four-wheeler', label: 'Four Wheeler' },
  ];

  // Generate machine options from available machines
  const machineOptions = availableMachines.map(machine => ({
    value: machine._id,
    label: `${machine.machineNumber} - ${machine.machineName}`,
    machineData: machine
  }));

  // Generate pallet options from selected machine pallets
  const palletOptions = selectedMachinePallets
    .filter(pallet => pallet.status === 'available' && pallet.currentOccupancy < pallet.vehicleCapacity)
    .map(pallet => ({
      value: pallet.number.toString(),
      label: `Pallet ${pallet.number} (${pallet.vehicleCapacity - pallet.currentOccupancy} spaces available)`,
      palletData: pallet
    }));

  // Load available machines when vehicle type or site changes
  useEffect(() => {
    if (bookingData.vehicleType && currentSite) {
      getAvailableMachines(bookingData.vehicleType, currentSite._id || currentSite.siteId)
        .catch(error => {
          console.error('Error loading machines:', error);
          setErrors(prev => ({ ...prev, machineNumber: 'Failed to load available machines' }));
        });
    } else {
      resetMachineStates();
    }
  }, [bookingData.vehicleType, currentSite, getAvailableMachines, resetMachineStates]);

  // Load machine pallets when machine is selected
  useEffect(() => {
    if (bookingData.machineNumber) {
      getMachinePallets(bookingData.machineNumber)
        .catch(error => {
          console.error('Error loading pallets:', error);
          setErrors(prev => ({ ...prev, palletNumber: 'Failed to load available pallets' }));
        });
    }
  }, [bookingData.machineNumber, getMachinePallets]);

  // Reset dependent fields when parent field changes
  const handleVehicleTypeChange = (e) => {
    setBookingData(prev => ({
      ...prev,
      vehicleType: e.target.value,
      machineNumber: '', // Reset machine selection
      palletNumber: ''   // Reset pallet selection
    }));
    // Clear any related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.machineNumber;
      delete newErrors.palletNumber;
      return newErrors;
    });
  };

  const handleMachineChange = (e) => {
    setBookingData(prev => ({
      ...prev,
      machineNumber: e.target.value,
      palletNumber: '' // Reset pallet selection
    }));
    // Clear pallet errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.palletNumber;
      return newErrors;
    });
  };

  const handleSearch = () => {
    if (!phoneNumber.trim()) return;

    setIsSearching(true);
    
    setTimeout(() => {
      const customer = findCustomerByPhone(phoneNumber);
      
      if (customer) {
        setCustomerData({
          phoneNumber: customer.phoneNumber,
          customerName: customer.customerName,
          vehicleNumber: customer.vehicleNumber || '',
          email: customer.email || '',
          notes: '',
        });
        setErrors({});
      } else {
        setCustomerData({
          phoneNumber: phoneNumber,
          customerName: '',
          vehicleNumber: '',
          email: '',
          notes: '',
        });
      }
      
      setShowCustomerSearch(false);
      setIsSearching(false);
    }, 500);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!currentSite) {
      newErrors.siteId = 'Please select a parking site from the header dropdown';
    }
    if (!customerData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }
    if (!customerData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (!customerData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    }
    if (!bookingData.vehicleType) {
      newErrors.vehicleType = 'Vehicle type is required';
    }
    if (!bookingData.machineNumber) {
      newErrors.machineNumber = 'Machine selection is required';
    }
    if (!bookingData.palletNumber) {
      newErrors.palletNumber = 'Pallet selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Find selected machine to get machine number
      const selectedMachine = availableMachines.find(machine => machine._id === bookingData.machineNumber);
      if (!selectedMachine) {
        throw new Error('Selected machine not found');
      }

      // Prepare booking data for API
      const bookingPayload = {
        customerName: customerData.customerName,
        phoneNumber: customerData.phoneNumber,
        vehicleNumber: customerData.vehicleNumber,
        vehicleType: bookingData.vehicleType,
        machineNumber: selectedMachine.machineNumber, // Use actual machine number from selected machine
        palletNumber: parseInt(bookingData.palletNumber),
        siteId: currentSite?._id || currentSite?.siteId // Include selected site ID
        // Omit optional fields that are empty to avoid validation errors
      };

      // Only add optional fields if they have values
      if (customerData.email && customerData.email.trim()) {
        bookingPayload.email = customerData.email.trim();
      }
      if (customerData.notes && customerData.notes.trim()) {
        bookingPayload.notes = customerData.notes.trim();
      }

      // Create booking via API
      const booking = await createBooking(bookingPayload);

      // Generate SMS message with the actual OTP from the booking response
      const smsMessage = generateSMSMessage({
        ...customerData,
        ...bookingData,
        otp: booking.otp.code,
        bookingNumber: booking.bookingNumber
      });

      // Open SMS app
      const smsOpened = openSMSApp(customerData.phoneNumber, smsMessage);

      if (smsOpened || true) { // Always reset form even if SMS fails
        // Reset form
        setCustomerData({
          phoneNumber: '',
          customerName: '',
          vehicleNumber: '',
          email: '',
          notes: '',
        });
        setBookingData({
          vehicleType: '',
          machineNumber: '',
          palletNumber: '',
        });
        setPhoneNumber('');
        setErrors({});
        resetMachineStates(); // Reset machine states when form is cleared
        onBookingComplete(booking);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      
      // Set form-level error
      setErrors({ submit: error.message || 'Failed to create booking. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
          <Plus className="text-purple-600" size={24} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Create New Booking</h2>
        <p className="text-sm text-gray-600 mt-1">Register a new parking session</p>
        
        {/* Site Selection Status */}
        {currentSite ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-green-700">
              <strong>Selected Site:</strong> {currentSite.siteName || currentSite.siteId}
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-red-700">
              <strong>No site selected.</strong> Please select a parking site from the header dropdown.
            </p>
          </div>
        )}
      </div>

      {/* Optional Customer Search */}
      <div className="border border-gray-200 rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowCustomerSearch(!showCustomerSearch)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-2">
            <Search className="text-gray-500" size={16} />
            <span className="font-medium text-gray-700">Search Existing Customer (Optional)</span>
          </div>
          <ChevronDown 
            className={`text-gray-400 transition-transform ${showCustomerSearch ? 'rotate-180' : ''}`} 
            size={16} 
          />
        </button>
        
        {showCustomerSearch && (
          <div className="mt-4 space-y-3">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Smartphone className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!phoneNumber.trim() || isSearching}
                variant="outline"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Search to auto-fill customer details if they exist
            </p>
          </div>
        )}
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Details */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">Customer Details</h3>
          
          <Input
            label="Phone Number"
            type="tel"
            value={customerData.phoneNumber}
            onChange={(e) => setCustomerData(prev => ({ ...prev, phoneNumber: e.target.value }))}
            error={errors.phoneNumber}
            required
            placeholder="Enter phone number"
          />

          <Input
            label="Customer Name"
            value={customerData.customerName}
            onChange={(e) => setCustomerData(prev => ({ ...prev, customerName: e.target.value }))}
            error={errors.customerName}
            required
            placeholder="Enter customer name"
          />

          <Input
            label="Vehicle Number"
            value={customerData.vehicleNumber}
            onChange={(e) => setCustomerData(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
            error={errors.vehicleNumber}
            required
            placeholder="e.g., MH01AB1234"
          />

          <Input
            label="Email (Optional)"
            type="email"
            value={customerData.email}
            onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
            error={errors.email}
            placeholder="customer@example.com"
          />

          <Input
            label="Notes (Optional)"
            value={customerData.notes}
            onChange={(e) => setCustomerData(prev => ({ ...prev, notes: e.target.value }))}
            error={errors.notes}
            placeholder="Any additional notes"
          />
        </div>

        {/* Vehicle & Parking Details */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">Vehicle & Parking Details</h3>
          
          <Select
            label="Vehicle Type"
            value={bookingData.vehicleType}
            onChange={handleVehicleTypeChange}
            options={vehicleTypeOptions}
            error={errors.vehicleType}
            required
          />

          <Select
            label="Machine Number"
            value={bookingData.machineNumber}
            onChange={handleMachineChange}
            options={machineOptions}
            error={errors.machineNumber}
            required
            disabled={!bookingData.vehicleType || machineLoading}
            loading={machineLoading && bookingData.vehicleType}
            placeholder={
              !bookingData.vehicleType 
                ? "Select vehicle type first" 
                : machineLoading 
                  ? "Loading machines..." 
                  : machineOptions.length === 0
                    ? "No available machines"
                    : "Select machine"
            }
          />

          <Select
            label="Pallet Number"
            value={bookingData.palletNumber}
            onChange={(e) => setBookingData(prev => ({ ...prev, palletNumber: e.target.value }))}
            options={palletOptions}
            error={errors.palletNumber}
            required
            disabled={!bookingData.machineNumber || machineLoading}
            loading={machineLoading && bookingData.machineNumber}
            placeholder={
              !bookingData.machineNumber 
                ? "Select machine first" 
                : machineLoading 
                  ? "Loading pallets..." 
                  : palletOptions.length === 0
                    ? "No available pallets"
                    : "Select pallet"
            }
          />
        </div>

        {/* Error Messages */}
        {(errors.siteId || errors.submit) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            {errors.siteId && (
              <p className="text-sm text-red-600 mb-2">{errors.siteId}</p>
            )}
            {errors.submit && (
              <p className="text-sm text-red-600">{errors.submit}</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || loading}
        >
          {isSubmitting || loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Booking...
            </>
          ) : (
            <>
              <CheckCircle size={16} className="mr-2" />
              Book Spot & Send SMS
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default BookingForm;