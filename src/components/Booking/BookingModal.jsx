import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Bike, 
  User, 
  Smartphone, 
  Wrench, 
  Hash, 
  Clock, 
  DollarSign, 
  CreditCard, 
  ArrowLeft, 
  CheckCircle,
  Loader2,
  AlertCircle,
  QrCode,
  KeyRound,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { calculateParkingFee, formatCurrency, formatDuration } from '../../utils/calculations';
import { useBookings } from '../../hooks/useBookings';
import apiService from '../../services/api';

const BookingModal = ({ booking, isOpen, onClose, onComplete }) => {
  const [currentPage, setCurrentPage] = useState('details');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [customerData, setCustomerData] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteBooking } = useBookings();

  if (!booking) return null;

  const currentTime = new Date();
  const parkingFee = calculateParkingFee(booking.startTime, currentTime, booking.vehicleType);
  const duration = formatDuration(booking.startTime);
  const VehicleIcon = booking.vehicleType === 'two-wheeler' ? Bike : Car;

  // Fetch customer data when payment method page is accessed
  const fetchCustomerData = async () => {
    const customerId = booking?.customer?._id || booking?.customer;
    if (!customerId) {
      console.log('No customer ID found in booking');
      return;
    }

    setLoadingCustomer(true);
    setErrors({});
    
    try {
      const response = await apiService.getCustomerById(customerId);
      setCustomerData(response.data.customer);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setErrors({ customer: 'Failed to load customer data' });
    } finally {
      setLoadingCustomer(false);
    }
  };

  // Check if customer has active membership
  const hasActiveMembership = customerData?.membership?.isActive && 
                              customerData?.membership?.membershipNumber && 
                              customerData?.membership?.expiryDate && 
                              new Date(customerData.membership.expiryDate) > new Date();

  const handleClose = () => {
    setCurrentPage('details');
    setPaymentMethod('');
    setCustomerData(null);
    setLoadingCustomer(false);
    setPaymentStatus('pending');
    setIsProcessing(false);
    setErrors({});
    setShowDeleteConfirm(false);
    setDeleteReason('');
    setIsDeleting(false);
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBooking(booking._id, deleteReason.trim() || null);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      alert('Failed to delete booking: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setErrors({});
  };

  const handlePaymentProcess = async () => {
    // Check if membership payment is selected but no active membership
    if (paymentMethod === 'membership' && !hasActiveMembership) {
      setErrors({ membership: 'No active membership found for this customer' });
      return;
    }

    setCurrentPage('processing');
    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrors({});

    try {
      let finalAmount = parkingFee;
      let membershipDiscount = 0;

      // Apply membership discount if using membership payment
      if (paymentMethod === 'membership' && hasActiveMembership) {
        // Apply 100% membership discount (free parking for members)
        membershipDiscount = parkingFee;
        finalAmount = 0;
      }

      // Simulate payment processing delay for non-membership payments
      if (paymentMethod !== 'membership') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setPaymentStatus('completed');
      
      // Complete the booking after a short delay to show success message
      setTimeout(() => {
        const completedBooking = {
          ...booking,
          endTime: currentTime.toISOString(),
          status: 'completed',
          totalAmount: parkingFee,
          finalAmount: finalAmount,
          paymentMethod: paymentMethod,
          paymentTime: new Date().toISOString(),
          ...(paymentMethod === 'membership' && hasActiveMembership && {
            membershipNumber: customerData.membership.membershipNumber,
            membershipDiscount: membershipDiscount,
            membershipCustomer: {
              _id: customerData._id,
              fullName: customerData.fullName,
              phoneNumber: customerData.phoneNumber
            }
          })
        };
        
        onComplete(completedBooking);
        setIsProcessing(false);
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Payment processing failed:', error);
      setPaymentStatus('failed');
      setErrors({ payment: 'Payment processing failed. Please try again.' });
      setIsProcessing(false);
    }
  };

  const getProcessingMessage = () => {
    switch (paymentMethod) {
      case 'cash':
        return 'Please collect cash payment from customer...';
      case 'upi':
        return 'Waiting for UPI payment confirmation...';
      case 'membership':
        return 'Verifying membership details...';
      default:
        return 'Processing payment...';
    }
  };

  // Booking Details Page
  const renderBookingDetails = () => (
    <div className="space-y-6">
      {/* Vehicle Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <VehicleIcon className="text-purple-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{booking.vehicleNumber}</h3>
            <div className="flex items-center space-x-2 text-gray-600">
              <User size={14} />
              <span>{booking.customerName}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Active
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Smartphone className="text-gray-500" size={16} />
            <span className="text-sm text-gray-600">Phone</span>
          </div>
          <p className="font-semibold text-gray-900">{booking.phoneNumber}</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Wrench className="text-gray-500" size={16} />
            <span className="text-sm text-gray-600">Machine</span>
          </div>
          <p className="font-semibold text-gray-900">{booking.machineNumber}</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Hash className="text-gray-500" size={16} />
            <span className="text-sm text-gray-600">Pallet</span>
          </div>
          <p className="font-semibold text-gray-900">
            {booking.palletName ? booking.palletName : `Pallet ${booking.palletNumber}`}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <KeyRound className="text-gray-500" size={16} />
            <span className="text-sm text-gray-600">OTP</span>
          </div>
          <p className="font-mono font-bold text-purple-600 text-lg">{booking.otp?.code || booking.otp || 'N/A'}</p>
        </div>
      </div>

      {/* Parking Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Clock className="text-blue-600" size={16} />
          <h4 className="font-semibold text-blue-900">Parking Summary</h4>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Start Time:</span>
            <span className="font-medium text-blue-900">{new Date(booking.startTime).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Duration:</span>
            <span className="font-medium text-blue-900">{duration}</span>
          </div>
          <div className="flex justify-between items-center border-t border-blue-200 pt-2">
            <span className="text-lg font-semibold text-blue-900">Amount Due:</span>
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(parkingFee)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={() => setShowDeleteConfirm(true)}
          variant="outline"
          className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
        >
          <Trash2 size={16} className="mr-2" />
          Delete Booking
        </Button>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => {
            setCurrentPage('payment');
            fetchCustomerData();
          }} className="flex-1">
            <DollarSign size={16} className="mr-2" />
            Collect Payment
          </Button>
        </div>
      </div>
    </div>
  );

  // Payment Method Selection Page
  const renderPaymentMethods = () => (
    <div className="space-y-6">
      {/* Amount Display */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 text-center border border-green-200">
        <div className="bg-white p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
          <DollarSign className="text-green-600" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Amount to Collect</h3>
        <p className="text-4xl font-bold text-green-600">{formatCurrency(parkingFee)}</p>
      </div>

      {/* Payment Method Options */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">Select Payment Method:</h4>
        
        {/* Cash Payment */}
        <button
          onClick={() => handlePaymentMethodSelect('cash')}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            paymentMethod === 'cash'
              ? 'border-green-500 bg-green-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${paymentMethod === 'cash' ? 'bg-green-100' : 'bg-gray-100'}`}>
              <DollarSign className={`${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-600'}`} size={20} />
            </div>
            <div>
              <h5 className="font-semibold text-gray-900">Cash Payment</h5>
              <p className="text-sm text-gray-600">Collect cash directly from customer</p>
            </div>
            {paymentMethod === 'cash' && (
              <div className="ml-auto">
                <CheckCircle className="text-green-500" size={20} />
              </div>
            )}
          </div>
        </button>

        {/* UPI Payment */}
        <button
          onClick={() => handlePaymentMethodSelect('upi')}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            paymentMethod === 'upi'
              ? 'border-blue-500 bg-blue-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${paymentMethod === 'upi' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <QrCode className={`${paymentMethod === 'upi' ? 'text-blue-600' : 'text-gray-600'}`} size={20} />
            </div>
            <div>
              <h5 className="font-semibold text-gray-900">UPI/Online Payment</h5>
              <p className="text-sm text-gray-600">Customer pays via UPI QR code or online</p>
            </div>
            {paymentMethod === 'upi' && (
              <div className="ml-auto">
                <CheckCircle className="text-blue-500" size={20} />
              </div>
            )}
          </div>
        </button>

        {/* Membership Payment */}
        <button
          onClick={() => hasActiveMembership && handlePaymentMethodSelect('membership')}
          disabled={!hasActiveMembership}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            !hasActiveMembership
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              : paymentMethod === 'membership'
              ? 'border-purple-500 bg-purple-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${
              !hasActiveMembership 
                ? 'bg-gray-100'
                : paymentMethod === 'membership' 
                ? 'bg-purple-100' 
                : 'bg-gray-100'
            }`}>
              <CreditCard className={`${
                !hasActiveMembership
                  ? 'text-gray-400'
                  : paymentMethod === 'membership' 
                  ? 'text-purple-600' 
                  : 'text-gray-600'
              }`} size={20} />
            </div>
            <div className="flex-1">
              <h5 className={`font-semibold ${!hasActiveMembership ? 'text-gray-500' : 'text-gray-900'}`}>
                Membership Card
              </h5>
              {loadingCustomer ? (
                <p className="text-sm text-gray-500">Loading membership status...</p>
              ) : hasActiveMembership ? (
                <>
                  <p className="text-sm text-green-600 font-medium">✓ Active Membership</p>
                  <p className="text-xs text-gray-500">Free parking (100% discount)</p>
                </>
              ) : (
                <p className="text-sm text-red-600">✗ No Active Membership</p>
              )}
            </div>
            {paymentMethod === 'membership' && hasActiveMembership && (
              <div className="ml-auto">
                <CheckCircle className="text-purple-500" size={20} />
              </div>
            )}
          </div>
        </button>
      </div>

      {/* UPI QR Code */}
      {paymentMethod === 'upi' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h5 className="font-semibold text-blue-900 mb-4">Show QR Code to Customer</h5>
          <div className="bg-white p-4 rounded-lg inline-block border-2 border-solid border-blue-300 shadow-sm">
            <img 
              src="/PaymentQR.jpg" 
              alt="Payment QR Code" 
              className="w-48 h-48 object-contain rounded-lg"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg" style={{display: 'none'}}>
              <QrCode className="text-gray-400" size={48} />
            </div>
          </div>
          <p className="text-sm text-blue-700 mt-3 font-medium">Amount: {formatCurrency(parkingFee)}</p>
          <p className="text-xs text-blue-600 mt-1">Scan this QR code to make payment</p>
        </div>
      )}

      {/* Membership Status */}
      {paymentMethod === 'membership' && hasActiveMembership && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="text-green-600" size={16} />
            <h5 className="font-semibold text-green-900">Active Membership Found</h5>
          </div>
          <div className="space-y-2 text-sm text-green-800">
            <p><strong>Customer:</strong> {customerData?.fullName}</p>
            <p><strong>Membership Number:</strong> {customerData?.membership?.membershipNumber}</p>
            <p><strong>Expires:</strong> {new Date(customerData?.membership?.expiryDate).toLocaleDateString()}</p>
            <div className="bg-green-100 rounded-lg p-3 mt-3">
              <p className="font-semibold">Membership discount: 100% off (FREE)</p>
              <p>Final amount: {formatCurrency(0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {errors.membership && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{errors.membership}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button 
          variant="outline" 
          onClick={() => setCurrentPage('details')} 
          className="flex-1"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={handlePaymentProcess}
          disabled={!paymentMethod || (paymentMethod === 'membership' && !hasActiveMembership)}
          className="flex-1"
        >
          {paymentMethod === 'membership' ? 
            (hasActiveMembership ? 'Process Membership' : 'No Active Membership') : 
           paymentMethod === 'upi' ? 'Confirm UPI Payment' : 
           'Collect Cash'}
        </Button>
      </div>
    </div>
  );

  // Processing Page
  const renderProcessing = () => (
    <div className="space-y-8 text-center py-8">
      <div className="space-y-6">
        {paymentStatus === 'processing' ? (
          <div className="bg-blue-50 p-8 rounded-lg">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment...</h3>
            <p className="text-gray-600">{getProcessingMessage()}</p>
          </div>
        ) : paymentStatus === 'failed' ? (
          <div className="bg-red-50 p-8 rounded-lg">
            <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-red-900 mb-2">Payment Failed!</h3>
            <p className="text-red-700">
              {errors.membership || errors.payment || 'Payment processing failed.'}
            </p>
          </div>
        ) : (
          <div className="bg-green-50 p-8 rounded-lg">
            <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-green-900 mb-2">Payment Completed!</h3>
            <p className="text-green-700">Completing booking and releasing vehicle...</p>
          </div>
        )}

        {paymentStatus === 'completed' && (
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CheckCircle className="text-green-600" size={20} />
              <h4 className="font-semibold text-green-900">Payment Successful!</h4>
            </div>
            <p className="text-sm text-green-700">
              {paymentMethod === 'membership' 
                ? `Membership payment processed. FREE parking for member!`
                : `${paymentMethod.toUpperCase()} payment of ${formatCurrency(parkingFee)} collected successfully.`
              }
            </p>
            {paymentMethod === 'membership' && hasActiveMembership && customerData && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="text-xs text-green-600">
                  Customer: {customerData.fullName} ({customerData.phoneNumber})
                </p>
                <p className="text-xs text-green-600">
                  Discount applied: {formatCurrency(parkingFee)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {paymentStatus === 'failed' && (
        <div className="flex space-x-3 pt-4">
          <Button variant="outline" onClick={() => setCurrentPage('details')} className="flex-1">
            <ArrowLeft size={16} className="mr-2" />
            Back to Details
          </Button>
          <Button onClick={() => {
            setCurrentPage('payment');
            setPaymentStatus('pending');
            setErrors({});
          }} className="flex-1">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );

  const getModalTitle = () => {
    switch (currentPage) {
      case 'payment':
        return 'Select Payment Method';
      case 'processing':
        return 'Processing Payment';
      default:
        return 'Complete Parking Session';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={getModalTitle()}
        maxWidth="max-w-lg"
      >
        {currentPage === 'details' && renderBookingDetails()}
        {currentPage === 'payment' && renderPaymentMethods()}
        {currentPage === 'processing' && renderProcessing()}
      </Modal>

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
                This action will permanently delete the booking for vehicle {booking?.vehicleNumber}. This cannot be undone.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="deleteReason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for deletion (optional)
            </label>
            <textarea
              id="deleteReason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Optionally provide a reason for deleting this booking..."
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
              disabled={isDeleting}
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
    </>
  );
};

export default BookingModal;