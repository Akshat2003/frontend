import React, { useState } from 'react';
import { CheckCircle, User, Car, Wrench, Hash, Smartphone, X } from 'lucide-react';
import BookingForm from '../components/Booking/BookingForm';

const OnSpotBookings = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [lastCreatedBooking, setLastCreatedBooking] = useState(null);

  const handleNewBookingComplete = (newBooking) => {
    setLastCreatedBooking(newBooking);
    setShowSuccessMessage(true);
    
    setTimeout(() => {
      setShowSuccessMessage(false);
      setLastCreatedBooking(null);
    }, 5000);

    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Success Message */}
      {showSuccessMessage && lastCreatedBooking && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircle className="text-green-500 mt-0.5" size={20} />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                Booking Created Successfully!
              </h3>
              <div className="space-y-2 text-sm text-green-700">
                <div className="flex items-center space-x-2">
                  <Car size={14} />
                  <span><strong>Vehicle:</strong> {lastCreatedBooking.vehicleNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User size={14} />
                  <span><strong>Customer:</strong> {lastCreatedBooking.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wrench size={14} />
                  <span><strong>Machine:</strong> {lastCreatedBooking.machineNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Hash size={14} />
                  <span><strong>Pallet:</strong> {lastCreatedBooking.palletNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Hash size={14} />
                  <span><strong>OTP:</strong> <span className="font-mono font-bold">{lastCreatedBooking.otp?.code || lastCreatedBooking.otp || 'N/A'}</span></span>
                </div>
                <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-green-200">
                  <Smartphone size={14} />
                  <span className="text-xs">SMS sent to {lastCreatedBooking.phoneNumber}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="ml-3 flex-shrink-0 text-green-500 hover:text-green-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* New Booking Form */}
      <BookingForm onBookingComplete={handleNewBookingComplete} />
    </div>
  );
};

export default OnSpotBookings;