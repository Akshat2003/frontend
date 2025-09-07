import React, { useState } from 'react';
import { CreditCard, User, Phone, Car, Shield, DollarSign, QrCode, CheckCircle, ArrowLeft } from 'lucide-react';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import Select from '../components/Common/Select';
import { formatCurrency } from '../utils/calculations';

const MembershipPurchase = () => {
  const [currentPage, setCurrentPage] = useState('customer-details');
  const [customerData, setCustomerData] = useState({
    firstName: '',
    phoneNumber: '',
    email: '',
    vehicleNumber: '',
    vehicleType: 'two-wheeler'
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  const vehicleTypeOptions = [
    { value: 'two-wheeler', label: 'Two Wheeler' },
    { value: 'four-wheeler', label: 'Four Wheeler' }
  ];

  const membershipPrice = customerData.vehicleType === 'two-wheeler' ? 750 : 1000;

  const validateForm = () => {
    const newErrors = {};
    
    if (!customerData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!customerData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(customerData.phoneNumber.replace(/\s|-/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
    }
    
    if (!customerData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setCurrentPage('payment');
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
  };

  const handlePaymentProcess = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      try {
        // Here you would integrate with your actual payment processing logic
        // For now, we'll simulate success and update local analytics
        
        const membershipData = {
          customerName: customerData.firstName,
          phoneNumber: customerData.phoneNumber,
          email: customerData.email,
          vehicleNumber: customerData.vehicleNumber,
          vehicleType: customerData.vehicleType,
          amount: membershipPrice,
          paymentMethod: paymentMethod,
          purchaseDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };
        
        // Update localStorage analytics (fallback for API restrictions)
        const existingAnalytics = JSON.parse(localStorage.getItem('membershipAnalytics') || '{"count": 0, "revenue": 0}');
        existingAnalytics.count += 1;
        existingAnalytics.revenue += membershipPrice;
        localStorage.setItem('membershipAnalytics', JSON.stringify(existingAnalytics));
        
        // Trigger analytics update event
        window.dispatchEvent(new CustomEvent('membershipPurchased', { 
          detail: membershipData 
        }));
        
        setPaymentStatus('completed');
        setCurrentPage('success');
        setIsProcessing(false);
        
      } catch (error) {
        console.error('Payment failed:', error);
        setPaymentStatus('failed');
        setIsProcessing(false);
      }
    }, 2000);
  };

  const handleInputChange = (field, value) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const renderCustomerDetails = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <CreditCard className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Monthly Pass</h1>
            <p className="text-gray-600">Enter customer details to purchase membership</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleProceedToPayment} className="space-y-6">
        {/* Customer Details */}
        <div className="space-y-4">
          <Input
            label="Customer Name"
            value={customerData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            error={errors.firstName}
            placeholder="Enter customer name"
            required
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              value={customerData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              error={errors.phoneNumber}
              placeholder="Enter 10-digit phone number"
              required
            />
            
            <Input
              label="Email"
              type="email"
              value={customerData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Car className="h-5 w-5 mr-2 text-gray-600" />
            Vehicle Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Vehicle Number"
              value={customerData.vehicleNumber}
              onChange={(e) => handleInputChange('vehicleNumber', e.target.value.toUpperCase())}
              error={errors.vehicleNumber}
              placeholder="MH01AB1234"
              required
            />
            
            <Select
              label="Vehicle Type"
              value={customerData.vehicleType}
              onChange={(e) => handleInputChange('vehicleType', e.target.value)}
              options={vehicleTypeOptions}
              required
            />
          </div>
        </div>

        {/* Membership Info */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <div className="text-center">
            <Shield className="text-purple-600 mx-auto mb-3" size={32} />
            <h3 className="text-lg font-bold text-purple-900 mb-2">Monthly Pass</h3>
            <div className="text-3xl font-bold text-purple-800 mb-2">
              {formatCurrency(membershipPrice)}
            </div>
            <p className="text-sm text-purple-700">Valid for 30 days from purchase</p>
          </div>
          
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle Type:</span>
              <span className="font-medium capitalize">{customerData.vehicleType?.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Benefits:</span>
              <span className="font-medium text-green-600">Free Parking</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Proceed to Payment
          </Button>
        </div>
      </form>
    </div>
  );

  const renderPaymentMethods = () => (
    <div className="space-y-6">
      {/* Amount Display */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 text-center border border-green-200">
        <div className="bg-white p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
          <DollarSign className="text-green-600" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Amount to Collect</h3>
        <p className="text-4xl font-bold text-green-600">{formatCurrency(membershipPrice)}</p>
        <p className="text-sm text-gray-600 mt-2">
          {customerData.firstName} - {customerData.vehicleNumber}
        </p>
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
      </div>

      {/* UPI QR Code */}
      {paymentMethod === 'upi' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h5 className="font-semibold text-blue-900 mb-4">Show QR Code to Customer</h5>
          <div className="bg-white p-4 rounded-lg inline-block border-2 border-solid border-blue-300 shadow-sm">
            <img 
              src="/PaymentQR.png" 
              alt="Payment QR Code" 
              className="w-48 h-48 object-contain rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg" style={{display: 'none'}}>
              <QrCode className="text-gray-400" size={48} />
            </div>
          </div>
          <p className="text-sm text-blue-700 mt-3 font-medium">Amount: {formatCurrency(membershipPrice)}</p>
          <p className="text-xs text-blue-600 mt-1">Scan this QR code to make payment</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button 
          variant="outline" 
          onClick={() => setCurrentPage('customer-details')} 
          className="flex-1"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={handlePaymentProcess}
          disabled={!paymentMethod || isProcessing}
          className="flex-1"
        >
          {paymentMethod === 'upi' ? 'Confirm UPI Payment' : 'Collect Cash'}
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-8 text-center py-8">
      <div className="space-y-6">
        {paymentStatus === 'processing' ? (
          <div className="bg-blue-50 p-8 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment...</h3>
            <p className="text-gray-600">Creating membership for {customerData.firstName}</p>
          </div>
        ) : (
          <div className="bg-red-50 p-8 rounded-lg">
            <div className="text-red-600 mx-auto mb-4" size={48}>❌</div>
            <h3 className="text-xl font-semibold text-red-900 mb-2">Payment Failed!</h3>
            <p className="text-red-700">Payment processing failed. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSuccess = () => {
    const handleCreateAnother = () => {
      setCurrentPage('customer-details');
      setCustomerData({
        firstName: '',
        phoneNumber: '',
        email: '',
        vehicleNumber: '',
        vehicleType: 'two-wheeler'
      });
      setPaymentMethod('');
      setPaymentStatus('pending');
      setIsProcessing(false);
      setErrors({});
    };

    return (
      <div className="space-y-8 text-center py-8">
        <div className="bg-green-50 p-8 rounded-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h1 className="text-2xl font-bold text-green-900 mb-4">Membership Created Successfully!</h1>
          <p className="text-green-700 mb-6">Monthly parking pass has been activated</p>
          
          <div className="bg-white border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Membership Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{customerData.firstName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Vehicle:</span>
                <span className="font-medium">{customerData.vehicleNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Vehicle Type:</span>
                <span className="font-medium capitalize">{customerData.vehicleType?.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium text-green-600">{formatCurrency(membershipPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Valid Until:</span>
                <span className="font-medium">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium capitalize">{paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleCreateAnother}
          variant="primary"
          size="lg"
          className="w-full"
        >
          Create Another Membership
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {currentPage === 'customer-details' && renderCustomerDetails()}
          {currentPage === 'payment' && renderPaymentMethods()}
          {currentPage === 'processing' && renderProcessing()}
          {currentPage === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
};

export default MembershipPurchase;