import React from 'react';
import { Car, Bike, User, Wrench, Hash, Smartphone, Clock, Circle, CheckCircle2 } from 'lucide-react';
import { formatDuration } from '../../utils/calculations';

const BookingCard = ({ booking, onClick }) => {
  const VehicleIcon = booking.vehicleType === 'two-wheeler' ? Bike : Car;
  const StatusIcon = booking.status === 'active' ? Circle : CheckCircle2;
  const statusColor = booking.status === 'active' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-gray-100 text-gray-800';

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all duration-200"
      onClick={() => onClick(booking)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <VehicleIcon className="text-purple-600" size={16} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{booking.vehicleNumber}</h3>
              <div className="flex items-center space-x-2">
                <StatusIcon className={booking.status === 'active' ? 'text-green-500' : 'text-gray-500'} size={12} />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                  {booking.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <User size={14} />
              <span className="truncate">{booking.customerName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wrench size={14} />
              <span>{booking.machineNumber}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Hash size={14} />
              <span>Pallet {booking.palletNumber}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Hash size={14} />
              <span className="font-mono font-bold text-purple-600">
                OTP: {booking.otp?.code || booking.otp || 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right ml-4">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <Clock size={14} className="text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-blue-600 font-medium">Duration</div>
            <div className="font-semibold text-blue-700 text-sm">
              {formatDuration(booking.startTime)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <Clock size={12} />
            <span>Started: {new Date(booking.startTime).toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Smartphone size={12} />
            <span>{booking.phoneNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCard;