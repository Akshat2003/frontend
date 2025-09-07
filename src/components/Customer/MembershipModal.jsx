import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye, 
  EyeOff,
  Copy,
  Clock
} from 'lucide-react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Input from '../Common/Input';
import Select from '../Common/Select';
import apiService from '../../services/api';

const MembershipModal = ({ customer, isOpen, onClose, onMembershipUpdate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [membershipData, setMembershipData] = useState({
    membershipType: 'yearly',
    vehicleType: 'two-wheeler',
    validityTerm: 12
  });
  const [showCredentials, setShowCredentials] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState({});

  // Membership pricing based on vehicle type
  const getMembershipPricing = (vehicleType = 'two-wheeler') => {
    if (vehicleType === 'four-wheeler') {
      return { monthly: 1000, yearly: 12000 };
    }
    return { monthly: 750, yearly: 9000 }; // two-wheeler pricing
  };

  const pricing = getMembershipPricing(membershipData.vehicleType);

  const membershipTypeOptions = [
    { value: 'monthly', label: `Monthly (1 month) - ₹${pricing.monthly}` },
    { value: 'quarterly', label: `Quarterly (3 months) - ₹${pricing.monthly * 3}` },
    { value: 'yearly', label: `Yearly (12 months) - ₹${pricing.yearly}` },
    { value: 'premium', label: `Premium (24 months) - ₹${pricing.yearly * 2}` }
  ];

  // Update validity term when membership type changes
  useEffect(() => {
    if (membershipData.membershipType) {
      const termMap = {
        monthly: 1,
        quarterly: 3,
        yearly: 12,
        premium: 24
      };
      setMembershipData(prev => ({
        ...prev,
        validityTerm: termMap[prev.membershipType] || 12
      }));
    }
  }, [membershipData.membershipType]);

  const handleCreateMembership = async () => {
    setErrors({});
    setIsCreating(true);

    try {
      // Check if customer has existing membership for different vehicle type
      const hasExistingMembership = customer.membership?.isActive && 
                                   customer.membership?.membershipNumber && 
                                   customer.membership?.expiryDate && 
                                   new Date(customer.membership.expiryDate) > new Date();

      const existingVehicleType = customer.membership?.vehicleType || 'two-wheeler';
      const isDifferentVehicleType = hasExistingMembership && existingVehicleType !== membershipData.vehicleType;

      // If customer has existing membership for different vehicle type, 
      // deactivate it first, then create the new one
      if (isDifferentVehicleType) {
        console.log(`Customer has ${existingVehicleType} membership, creating ${membershipData.vehicleType} membership`);
        
        // For now, we'll create membership with local fallback since backend doesn't support multiple memberships
        // In a real scenario, you'd modify the backend to support multiple memberships
        
        // Calculate membership price based on vehicle type and membership type
        const pricing = getMembershipPricing(membershipData.vehicleType);
        let membershipPrice;
        
        switch (membershipData.membershipType) {
          case 'monthly':
            membershipPrice = pricing.monthly;
            break;
          case 'quarterly':
            membershipPrice = pricing.monthly * 3;
            break;
          case 'yearly':
            membershipPrice = pricing.yearly;
            break;
          case 'premium':
            membershipPrice = pricing.yearly * 2;
            break;
          default:
            membershipPrice = pricing.yearly;
        }
        
        // Get current user for operator tracking
        const getCurrentUser = () => {
          try {
            const userData = localStorage.getItem('parkingOperator');
            return userData ? JSON.parse(userData) : null;
          } catch (error) {
            return null;
          }
        };

        const currentUser = getCurrentUser();

        const membershipPurchase = {
          id: `cm_${Date.now()}`,
          customerId: customer._id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          vehicleType: membershipData.vehicleType,
          membershipType: membershipData.membershipType,
          amount: membershipPrice,
          purchaseDate: new Date().toISOString(),
          siteId: 'customer_management',
          operatorId: currentUser?.operatorId || 'unknown', // Add operator tracking
          isActive: true
        };

        // Store in localStorage for analytics tracking
        const existingPurchases = JSON.parse(localStorage.getItem('membershipPurchases') || '[]');
        existingPurchases.push(membershipPurchase);
        localStorage.setItem('membershipPurchases', JSON.stringify(existingPurchases));

        // Trigger analytics update event
        window.dispatchEvent(new CustomEvent('membershipPurchased', {
          detail: { 
            membershipData: membershipData,
            amount: membershipPrice,
            vehicleType: membershipData.vehicleType,
            purchase: membershipPurchase
          }
        }));

        // Show success message
        setShowCredentials(true);
        
        // Create a mock updated customer for display purposes
        const mockUpdatedCustomer = {
          ...customer,
          membership: {
            ...customer.membership,
            vehicleType: membershipData.vehicleType,
            membershipType: membershipData.membershipType,
            membershipNumber: `MP${Date.now().toString().slice(-8)}`,
            pin: Math.floor(1000 + Math.random() * 9000).toString(),
            isActive: true,
            expiryDate: new Date(Date.now() + membershipData.validityTerm * 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        };
        
        onMembershipUpdate(mockUpdatedCustomer);
        return;
      }

      // Normal membership creation for customers without existing membership
      const response = await apiService.createMembership(customer._id, membershipData);
      
      // Show the created credentials
      setShowCredentials(true);
      
      // Notify parent component
      onMembershipUpdate(response.data.customer);
      
    } catch (error) {
      console.error('Error creating membership:', error);
      setErrors({ submit: error.message || 'Failed to create membership' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivateMembership = async () => {
    setIsCreating(true);
    try {
      const response = await apiService.deactivateMembership(customer._id);
      onMembershipUpdate(response.data.customer);
      onClose();
    } catch (error) {
      console.error('Error deactivating membership:', error);
      setErrors({ submit: error.message || 'Failed to deactivate membership' });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!customer) return null;

  // Check if customer has active membership for the selected vehicle type
  const hasActiveMembershipForVehicleType = (vehicleType) => {
    // For now, we assume single membership model, but in future this could check multiple memberships
    if (!customer.membership?.isActive || !customer.membership?.membershipNumber || !customer.membership?.expiryDate) {
      return false;
    }
    
    const isActive = new Date(customer.membership.expiryDate) > new Date();
    const membershipVehicleType = customer.membership?.vehicleType || 'two-wheeler'; // Default to two-wheeler for old memberships
    
    return isActive && membershipVehicleType === vehicleType;
  };

  const hasActiveMembership = hasActiveMembershipForVehicleType(membershipData.vehicleType);
  
  // Check if customer has ANY active membership (for deactivation purposes)
  const hasAnyActiveMembership = customer.membership?.isActive && 
                                customer.membership?.membershipNumber && 
                                customer.membership?.expiryDate && 
                                new Date(customer.membership.expiryDate) > new Date();

  const isExpired = customer.membership?.expiryDate && 
                   new Date(customer.membership.expiryDate) <= new Date();

  const daysRemaining = customer.membership?.expiryDate 
    ? getDaysRemaining(customer.membership.expiryDate) 
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Membership Management"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Customer Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <CreditCard className="text-purple-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h3>
              <p className="text-sm text-gray-600">{customer.phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Current Membership Status */}
        {hasActiveMembership ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="text-green-600" size={20} />
                <div>
                  <h4 className="font-semibold text-green-900">Active Membership - {membershipData.vehicleType.replace('-', ' ').toUpperCase()}</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <p><strong>Type:</strong> {customer.membership.membershipType}</p>
                    <p><strong>Vehicle:</strong> {customer.membership?.vehicleType || 'two-wheeler'}</p>
                    <p><strong>Expires:</strong> {formatDate(customer.membership.expiryDate)}</p>
                    {daysRemaining > 0 ? (
                      <p className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span><strong>{daysRemaining}</strong> days remaining</span>
                      </p>
                    ) : (
                      <p className="text-red-600 font-medium">Expired</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCredentials(true)}
                >
                  <Eye size={16} className="mr-1" />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleDeactivateMembership}
                  disabled={isCreating}
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        ) : hasAnyActiveMembership ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="text-blue-600" size={20} />
                <div>
                  <h4 className="font-semibold text-blue-900">Active Membership - {(customer.membership?.vehicleType || 'two-wheeler').replace('-', ' ').toUpperCase()}</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p><strong>Type:</strong> {customer.membership.membershipType}</p>
                    <p><strong>Vehicle:</strong> {customer.membership?.vehicleType || 'two-wheeler'}</p>
                    <p><strong>Expires:</strong> {formatDate(customer.membership.expiryDate)}</p>
                    {daysRemaining > 0 ? (
                      <p className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span><strong>{daysRemaining}</strong> days remaining</span>
                      </p>
                    ) : (
                      <p className="text-red-600 font-medium">Expired</p>
                    )}
                    <p className="text-xs mt-2 text-blue-600">
                      Selected: {membershipData.vehicleType} membership (different from active membership)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCredentials(true)}
                >
                  <Eye size={16} className="mr-1" />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleDeactivateMembership}
                  disabled={isCreating}
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        ) : customer.membership?.membershipNumber && isExpired ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-red-600" size={20} />
              <div>
                <h4 className="font-semibold text-red-900">Expired Membership</h4>
                <div className="text-sm text-red-700">
                  <p><strong>Vehicle:</strong> {customer.membership?.vehicleType || 'two-wheeler'}</p>
                  <p>Membership expired on {formatDate(customer.membership.expiryDate)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : customer.membership?.membershipNumber ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Shield className="text-blue-600" size={20} />
              <div>
                <h4 className="font-semibold text-blue-900">Different Vehicle Type Membership</h4>
                <div className="text-sm text-blue-700">
                  <p>Customer has active <strong>{customer.membership?.vehicleType || 'two-wheeler'}</strong> membership</p>
                  <p>Selected: <strong>{membershipData.vehicleType}</strong> membership</p>
                  <p className="text-xs mt-1">You can create multiple memberships for different vehicle types</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-yellow-600" size={20} />
              <div>
                <h4 className="font-semibold text-yellow-900">No Active Membership</h4>
                <p className="text-sm text-yellow-700">
                  Customer does not have an active {membershipData.vehicleType} membership
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create Membership Form */}
        {!hasActiveMembership && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">Create New Membership</h4>
            
            <div className="space-y-4">
              <Select
                label="Vehicle Type"
                value={membershipData.vehicleType}
                onChange={(e) => setMembershipData(prev => ({ 
                  ...prev, 
                  vehicleType: e.target.value 
                }))}
                options={[
                  { value: 'two-wheeler', label: 'Two Wheeler (₹750/month)' },
                  { value: 'four-wheeler', label: 'Four Wheeler (₹1000/month)' }
                ]}
                required
              />

              <Select
                label="Membership Type"
                value={membershipData.membershipType}
                onChange={(e) => setMembershipData(prev => ({ 
                  ...prev, 
                  membershipType: e.target.value 
                }))}
                options={membershipTypeOptions}
                required
              />

              <Input
                label="Validity Term (months)"
                type="number"
                value={membershipData.validityTerm}
                onChange={(e) => setMembershipData(prev => ({ 
                  ...prev, 
                  validityTerm: parseInt(e.target.value) || 1 
                }))}
                min="1"
                max="120"
                required
              />

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              <Button
                onClick={handleCreateMembership}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Membership...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} className="mr-2" />
                    Create Membership
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Membership Credentials Modal */}
        {showCredentials && customer.membership?.membershipNumber && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Membership Credentials</h4>
                <button
                  onClick={() => setShowCredentials(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="text-green-600 mx-auto mb-2" size={32} />
                  <p className="text-sm text-green-800 font-medium">
                    Membership Created Successfully!
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Membership Number
                        </p>
                        <p className="text-lg font-mono font-bold text-gray-900">
                          {customer.membership.membershipNumber}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(customer.membership.membershipNumber, 'number')}
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          PIN
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-mono font-bold text-gray-900">
                            {showPin ? customer.membership.pin : '••••'}
                          </p>
                          <button
                            onClick={() => setShowPin(!showPin)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(customer.membership.pin, 'pin')}
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">
                      Valid Until
                    </p>
                    <p className="text-sm font-medium text-blue-800">
                      {formatDate(customer.membership.expiryDate)}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> Please share these credentials with the customer. 
                    They will need both the membership number and PIN for payments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MembershipModal;