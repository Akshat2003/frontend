import React, { useState, useEffect } from 'react';
import { User, Car, Bike, Wrench, Hash, Smartphone, CheckCircle, Plus } from 'lucide-react';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button';
import SMSStatusModal from '../Common/SMSStatusModal';
import { useBookings } from '../../hooks/useBookings';
import { useMachines } from '../../hooks/useMachines';
import { useSite } from '../../contexts/SiteContext';
import { generateOTP, generateSMSMessage, openSMSAppSimple } from '../../utils/smsUtils';

const BookingForm = ({ onBookingComplete }) => {
  const [customerData, setCustomerData] = useState({
    phoneNumber: '',
    customerName: '',
    vehicleNumber: '',
  });
  const [bookingData, setBookingData] = useState({
    vehicleType: '',
    machineNumber: '',
    palletNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);
  const [smsMessage, setSMSMessage] = useState('');

  const { createBooking, loading } = useBookings();
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

  // Find selected machine data to check parking type
  const selectedMachine = availableMachines.find(machine => machine._id === bookingData.machineNumber);
  
  // Generate pallet options from selected machine pallets
  const palletOptions = selectedMachinePallets
    .filter(pallet => pallet.status === 'available' && pallet.currentOccupancy < pallet.vehicleCapacity)
    .map(pallet => {
      // Use custom name for puzzle parking, default name for rotary
      const palletName = selectedMachine?.parkingType === 'puzzle' && pallet.customName 
        ? pallet.customName 
        : `Pallet ${pallet.number}`;
      
      return {
        value: pallet.number.toString(),
        label: `${palletName} (${pallet.vehicleCapacity - pallet.currentOccupancy} spaces available)`,
        palletData: pallet
      };
    });

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


  const validateForm = () => {
    const newErrors = {};

    if (!currentSite) {
      newErrors.siteId = 'Please select a parking site from the header dropdown';
    }
    
    // Validate phone number (10 digits)
    if (!customerData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else {
      const cleanPhone = customerData.phoneNumber.replace(/\s|-/g, '');
      if (!/^\d{10}$/.test(cleanPhone)) {
        newErrors.phoneNumber = 'Phone number must be 10 digits';
      }
    }
    
    // Validate customer name (letters and spaces only)
    if (!customerData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(customerData.customerName.trim())) {
      newErrors.customerName = 'Customer name can only contain letters and spaces';
    }
    
    // Validate vehicle number format (Indian vehicle number format)
    if (!customerData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    } else {
      const vehicleNum = customerData.vehicleNumber.trim().toUpperCase();
      if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/.test(vehicleNum)) {
        newErrors.vehicleNumber = 'Invalid vehicle number format (e.g., MH01AB1234)';
      }
    }
    
    if (!bookingData.vehicleType) {
      newErrors.vehicleType = 'Vehicle type is required';
    }
    if (!bookingData.machineNumber) {
      newErrors.machineNumber = 'Machine selection is required';
    }
    if (!bookingData.palletNumber) {
      newErrors.palletNumber = 'Pallet selection is required';
    } else {
      const palletNum = parseInt(bookingData.palletNumber);
      if (isNaN(palletNum) || palletNum < 1 || palletNum > 8) {
        newErrors.palletNumber = 'Invalid pallet number. Must be between 1 and 8';
      }
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

      // Find selected pallet to get custom name
      const selectedPallet = selectedMachinePallets.find(pallet => pallet.number === parseInt(bookingData.palletNumber));
      
      // Validate pallet number range before sending
      const palletNum = parseInt(bookingData.palletNumber);
      if (palletNum < 1 || palletNum > 8) {
        throw new Error(`Pallet number ${palletNum} is invalid. Must be between 1 and 8.`);
      }

      // Prepare booking data for API
      const bookingPayload = {
        customerName: customerData.customerName.trim(),
        phoneNumber: customerData.phoneNumber.replace(/\s|-/g, ''), // Clean phone number
        vehicleNumber: customerData.vehicleNumber.trim().toUpperCase(), // Ensure uppercase
        vehicleType: bookingData.vehicleType,
        machineNumber: selectedMachine.machineNumber, // Use actual machine number from selected machine
        palletNumber: palletNum, // Use validated integer
        siteId: currentSite?._id || currentSite?.siteId // Include selected site ID
        // Omit optional fields that are empty to avoid validation errors
      };
      
      console.log('Booking payload:', bookingPayload); // Debug log
      console.log('Selected machine:', selectedMachine); // Debug log
      console.log('Selected pallet:', selectedPallet); // Debug log

      // Add pallet custom name for puzzle parking machines
      if (selectedMachine.parkingType === 'puzzle' && selectedPallet?.customName) {
        bookingPayload.palletName = selectedPallet.customName;
        console.log('Added palletName:', selectedPallet.customName); // Debug log
      }


      // Create booking via API
      const booking = await createBooking(bookingPayload);

      // Generate SMS message with the actual OTP from the booking response
      const generatedSMSMessage = generateSMSMessage({
        customerName: customerData.customerName,
        vehicleNumber: customerData.vehicleNumber,
        machineNumber: selectedMachine.machineNumber,
        palletNumber: parseInt(bookingData.palletNumber),
        palletName: selectedMachine.parkingType === 'puzzle' && selectedPallet?.customName 
          ? selectedPallet.customName 
          : null,
        otp: booking.otp.code,
        vehicleType: bookingData.vehicleType,
        bookingNumber: booking.bookingNumber
      });

      // Set booking and SMS data for modal
      setCompletedBooking(booking);
      setSMSMessage(generatedSMSMessage);
      
      // Show SMS modal
      setShowSMSModal(true);

      // Reset form immediately after successful booking creation
      setCustomerData({
        phoneNumber: '',
        customerName: '',
        vehicleNumber: '',
      });
      setBookingData({
        vehicleType: '',
        machineNumber: '',
        palletNumber: '',
      });
      setErrors({});
      resetMachineStates(); // Reset machine states when form is cleared
      
      // Call onBookingComplete callback
      onBookingComplete(booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      
      // Handle different types of errors
      if (error.statusCode === 422 && error.validationErrors && error.validationErrors.length > 0) {
        // Handle validation errors from backend
        const validationErrors = {};
        error.validationErrors.forEach(err => {
          validationErrors[err.field] = err.message;
        });
        setErrors(validationErrors);
      } else {
        // Set form-level error
        setErrors({ submit: error.message || 'Failed to create booking. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-100">
        <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center">
          <Plus className="text-purple-600" size={16} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Create New Booking</h2>
          <p className="text-xs text-gray-500">Register a new parking session</p>
        </div>
        
        {/* Site Selection Status - Compact */}
        {currentSite ? (
          <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
            <p className="text-xs text-green-700">
              <strong>{currentSite.siteName || currentSite.siteId}</strong>
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded px-2 py-1">
            <p className="text-xs text-red-700">
              <strong>No site selected</strong>
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

      {/* SMS Status Modal */}
      {showSMSModal && completedBooking && (
        <SMSStatusModal
          isOpen={showSMSModal}
          onClose={() => setShowSMSModal(false)}
          phoneNumber={completedBooking.customerPhoneNumber || completedBooking.phoneNumber}
          message={smsMessage}
          bookingDetails={{
            customerName: completedBooking.customerName,
            vehicleNumber: completedBooking.vehicleNumber,
            machineNumber: completedBooking.machineNumber,
            otp: completedBooking.otp.code
          }}
          autoClose={true}
        />
      )}
    </div>
  );
};

export default BookingForm;