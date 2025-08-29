import React, { useState } from 'react';
import { 
  Car, 
  Bike, 
  User, 
  Smartphone, 
  Wrench, 
  Hash, 
  Calendar, 
  Clock, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  Circle,
  Info,
  KeyRound,
  Badge,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { formatCurrency, formatDuration } from '../../utils/calculations';
import { useBookings } from '../../hooks/useBookings';

const BookingInfoModal = ({ booking, isOpen, onClose }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteBooking } = useBookings();

  if (!booking) return null;

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      alert('Please provide a reason for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteBooking(booking._id, deleteReason);
      setShowDeleteConfirm(false);
      onClose();
      alert('Booking deleted successfully');
    } catch (error) {
      alert('Failed to delete booking: ' + (error.message || 'Unknown error occurred'));
    } finally {
      setIsDeleting(false);
    }
  };

  const VehicleIcon = booking.vehicleType === 'two-wheeler' ? Bike : Car;
  const StatusIcon = booking.status === 'active' ? Circle : CheckCircle2;
  const statusColor = booking.status === 'active' ? 'text-green-600' : 'text-gray-600';
  const statusBg = booking.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  const duration = booking.endTime 
    ? formatDuration(booking.startTime, booking.endTime)
    : booking.startTime 
    ? formatDuration(booking.startTime)
    : 'N/A';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Information"
      size="medium"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Vehicle and Status */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm flex-shrink-0">
                <VehicleIcon className="text-purple-600" size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{booking.vehicleNumber}</h3>
                <div className="flex items-center space-x-2 text-gray-600">
                  <User size={14} className="flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base break-words">{booking.customerName}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between sm:block sm:text-right">
              <div className={`inline-flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 rounded-full font-medium text-sm ${statusBg}`}>
                <StatusIcon size={14} />
                <span className="capitalize">{booking.status}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 sm:mt-2 flex items-center space-x-1">
                <Badge size={10} />
                <span className="break-all">ID: {(booking._id || booking.id || '').slice(-8) || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg">
              <User className="text-blue-600" size={16} />
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Customer Details</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="text-gray-500" size={14} />
                <span className="text-xs sm:text-sm text-gray-600">Customer Name</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{booking.customerName}</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Smartphone className="text-gray-500" size={14} />
                <span className="text-xs sm:text-sm text-gray-600">Phone Number</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">{booking.phoneNumber}</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Car className="text-gray-500" size={14} />
                <span className="text-xs sm:text-sm text-gray-600">Vehicle Number</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">{booking.vehicleNumber}</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                {booking.vehicleType === 'two-wheeler' ? <Bike className="text-gray-500" size={14} /> : <Car className="text-gray-500" size={14} />}
                <span className="text-xs sm:text-sm text-gray-600">Vehicle Type</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base capitalize">{booking.vehicleType?.replace('-', ' ') || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Parking Details */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <div className="bg-purple-100 p-1.5 sm:p-2 rounded-lg">
              <Wrench className="text-purple-600" size={16} />
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Parking Details</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Wrench className="text-gray-500" size={14} />
                <span className="text-xs sm:text-sm text-gray-600">Machine Number</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">{booking.machineNumber || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Hash className="text-gray-500" size={14} />
                <span className="text-xs sm:text-sm text-gray-600">Pallet</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                {booking.palletName ? booking.palletName : `Pallet ${booking.palletNumber}`}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <KeyRound className="text-gray-500" size={14} />
                <span className="text-xs sm:text-sm text-gray-600">OTP</span>
              </div>
              <p className="font-mono font-bold text-purple-600 text-lg sm:text-xl">{booking.otp?.code || booking.otp || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="text-gray-500" size={14} />
                <span className="text-xs sm:text-sm text-gray-600">Booking ID</span>
              </div>
              <p className="font-mono text-gray-900 text-xs sm:text-sm break-all">{booking._id || booking.id || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Timing Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <div className="bg-green-100 p-1.5 sm:p-2 rounded-lg">
              <Clock className="text-green-600" size={16} />
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Timing Information</h4>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg p-3 sm:p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-gray-500" size={14} />
                  <span className="text-xs sm:text-sm text-gray-600">Booking Created</span>
                </div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{new Date(booking.createdAt).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 sm:p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="text-gray-500" size={14} />
                  <span className="text-xs sm:text-sm text-gray-600">Parking Started</span>
                </div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{new Date(booking.startTime).toLocaleString()}</p>
              </div>
            </div>
            
            {booking.endTime && (
              <div className="bg-white rounded-lg p-3 sm:p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="text-gray-500" size={14} />
                  <span className="text-xs sm:text-sm text-gray-600">Parking Ended</span>
                </div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{new Date(booking.endTime).toLocaleString()}</p>
              </div>
            )}
            
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 sm:p-4 border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Clock className="text-green-700" size={14} />
                  <span className="text-green-700 font-medium text-sm sm:text-base">Total Duration</span>
                </div>
                <span className="font-bold text-green-800 text-base sm:text-lg">{duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {booking.status === 'completed' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl p-3 sm:p-6">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <div className="bg-yellow-100 p-1.5 sm:p-2 rounded-lg">
                <DollarSign className="text-yellow-600" size={16} />
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">Payment Information</h4>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {booking.totalAmount && (
                  <div className="bg-white rounded-lg p-3 sm:p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="text-gray-500" size={14} />
                      <span className="text-xs sm:text-sm text-gray-600">Amount Collected</span>
                    </div>
                    <p className="font-bold text-green-600 text-lg sm:text-xl">{formatCurrency(booking.totalAmount)}</p>
                  </div>
                )}
                
                {booking.paymentMethod && (
                  <div className="bg-white rounded-lg p-3 sm:p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="text-gray-500" size={14} />
                      <span className="text-xs sm:text-sm text-gray-600">Payment Method</span>
                    </div>
                    <p className="font-semibold text-gray-900 capitalize text-sm sm:text-base">{booking.paymentMethod}</p>
                  </div>
                )}
              </div>
              
              {booking.paymentTime && (
                <div className="bg-white rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="text-gray-500" size={14} />
                    <span className="text-xs sm:text-sm text-gray-600">Payment Time</span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{new Date(booking.paymentTime).toLocaleString()}</p>
                </div>
              )}
              
              {booking.membershipNumber && (
                <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 sm:p-4">
                  <h5 className="font-semibold text-purple-900 mb-2 sm:mb-3 text-sm sm:text-base">Membership Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <span className="text-xs sm:text-sm text-purple-700">Membership Number:</span>
                      <p className="font-semibold text-purple-900 text-sm sm:text-base">{booking.membershipNumber}</p>
                    </div>
                    {booking.membershipDiscount && (
                      <div>
                        <span className="text-xs sm:text-sm text-purple-700">Discount Applied:</span>
                        <p className="font-semibold text-green-600 text-sm sm:text-base">-{formatCurrency(booking.membershipDiscount)}</p>
                      </div>
                    )}
                  </div>
                  {booking.finalAmount && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 font-medium text-sm sm:text-base">Final Amount Paid:</span>
                        <span className="font-bold text-purple-900 text-base sm:text-lg">{formatCurrency(booking.finalAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 sm:pt-4 space-y-2 sm:space-y-3">
          <Button 
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-sm py-2.5"
            size="sm"
          >
            <Trash2 size={14} className="mr-2" />
            Delete Booking
          </Button>
          <Button onClick={onClose} className="w-full text-sm py-2.5" size="sm">
            <CheckCircle2 size={14} className="mr-2" />
            Close Information
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        title="Delete Booking"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <h4 className="font-medium text-red-800">Confirm Deletion</h4>
              <p className="text-sm text-red-600 mt-1">
                This action will permanently delete the booking for vehicle {booking.vehicleNumber}. This cannot be undone.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="deleteReason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for deletion *
            </label>
            <textarea
              id="deleteReason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Please provide a reason for deleting this booking..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
              disabled={isDeleting}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              variant="outline"
              className="flex-1"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting || !deleteReason.trim()}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete Booking
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

export default BookingInfoModal;