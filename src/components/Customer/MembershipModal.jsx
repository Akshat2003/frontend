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
    vehicleTypes: ['two-wheeler'], // Array to support multiple vehicle types
    validityTerm: 12
  });
  const [showCredentials, setShowCredentials] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState({});

  // Membership pricing based on vehicle types
  const getMembershipPricing = (vehicleTypes = ['two-wheeler']) => {
    // Calculate combined pricing for selected vehicle types
    let totalMonthly = 0;
    let totalYearly = 0;
    
    vehicleTypes.forEach(vehicleType => {
      if (vehicleType === 'four-wheeler') {
        totalMonthly += 1000;
        totalYearly += 12000;
      } else {
        totalMonthly += 750;
        totalYearly += 9000;
      }
    });
    
    return { monthly: totalMonthly, yearly: totalYearly };
  };

  const pricing = getMembershipPricing(membershipData.vehicleTypes);

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
      // Validate that vehicle types are selected
      if (hasAnyActiveMembership) {
        // When extending membership, check for new vehicle types
        if (!newVehicleTypes || newVehicleTypes.length === 0) {
          setErrors({ submit: 'Please select at least one new vehicle type to add' });
          setIsCreating(false);
          return;
        }
      } else {
        // When creating new membership, check for any vehicle types
        if (!membershipData.vehicleTypes || membershipData.vehicleTypes.length === 0) {
          setErrors({ submit: 'Please select at least one vehicle type' });
          setIsCreating(false);
          return;
        }
      }

      // Create membership using new customer-level API
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

  // Check if customer has active membership that covers the selected vehicle types
  const hasActiveMembershipForVehicleTypes = (selectedVehicleTypes) => {
    if (!customer.membership?.isActive || !customer.membership?.membershipNumber || !customer.membership?.expiryDate) {
      return false;
    }
    
    const isActive = new Date(customer.membership.expiryDate) > new Date();
    if (!isActive) return false;
    
    // Check if existing membership covers all selected vehicle types
    const existingVehicleTypes = customer.membership?.vehicleTypes || [customer.membership?.vehicleType || 'two-wheeler'];
    
    return selectedVehicleTypes.every(selectedType => existingVehicleTypes.includes(selectedType));
  };

  const hasActiveMembership = hasActiveMembershipForVehicleTypes(membershipData.vehicleTypes);
  
  // Check if there are any new vehicle types to add (not already covered)
  const getNewVehicleTypes = () => {
    if (!customer.membership?.isActive || !customer.membership?.expiryDate || new Date(customer.membership.expiryDate) <= new Date()) {
      return membershipData.vehicleTypes; // All types are new if no active membership
    }
    
    const existingVehicleTypes = customer.membership?.vehicleTypes || [customer.membership?.vehicleType || 'two-wheeler'];
    return membershipData.vehicleTypes.filter(vt => !existingVehicleTypes.includes(vt));
  };
  
  const newVehicleTypes = getNewVehicleTypes();
  const hasNewVehicleTypes = newVehicleTypes.length > 0;
  
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
                  <h4 className="font-semibold text-green-900">Active Membership - {membershipData.vehicleTypes.map(vt => vt.replace('-', ' ').toUpperCase()).join(', ')}</h4>
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
                      Selected: {membershipData.vehicleTypes.join(', ')} membership (different from active membership)
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
                  <p>Selected: <strong>{membershipData.vehicleTypes.join(', ')}</strong> membership</p>
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
                  Customer does not have an active membership for {membershipData.vehicleTypes.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create/Extend Membership Form */}
        {!hasActiveMembership && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">
              {hasAnyActiveMembership && hasNewVehicleTypes 
                ? `Extend Membership (Add ${newVehicleTypes.join(', ')})`
                : 'Create New Membership'}
            </h4>
            
            <div className="space-y-4">
              {hasAnyActiveMembership && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Current membership covers:</strong> {(customer.membership?.vehicleTypes || [customer.membership?.vehicleType || 'two-wheeler']).join(', ')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Select additional vehicle types to extend your membership coverage
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Types {hasAnyActiveMembership ? 'to Add' : 'Covered'}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={membershipData.vehicleTypes.includes('two-wheeler')}
                      disabled={hasAnyActiveMembership && (customer.membership?.vehicleTypes || [customer.membership?.vehicleType]).includes('two-wheeler')}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setMembershipData(prev => ({
                          ...prev,
                          vehicleTypes: isChecked
                            ? [...prev.vehicleTypes.filter(vt => vt !== 'two-wheeler'), 'two-wheeler']
                            : prev.vehicleTypes.filter(vt => vt !== 'two-wheeler')
                        }));
                      }}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={`ml-2 text-sm ${
                      hasAnyActiveMembership && (customer.membership?.vehicleTypes || [customer.membership?.vehicleType]).includes('two-wheeler')
                        ? 'text-gray-500'
                        : 'text-gray-900'
                    }`}>
                      Two Wheeler (₹750/month)
                      {hasAnyActiveMembership && (customer.membership?.vehicleTypes || [customer.membership?.vehicleType]).includes('two-wheeler') && (
                        <span className="text-xs text-green-600 ml-1">✓ Already covered</span>
                      )}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={membershipData.vehicleTypes.includes('four-wheeler')}
                      disabled={hasAnyActiveMembership && (customer.membership?.vehicleTypes || [customer.membership?.vehicleType]).includes('four-wheeler')}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setMembershipData(prev => ({
                          ...prev,
                          vehicleTypes: isChecked
                            ? [...prev.vehicleTypes.filter(vt => vt !== 'four-wheeler'), 'four-wheeler']
                            : prev.vehicleTypes.filter(vt => vt !== 'four-wheeler')
                        }));
                      }}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={`ml-2 text-sm ${
                      hasAnyActiveMembership && (customer.membership?.vehicleTypes || [customer.membership?.vehicleType]).includes('four-wheeler')
                        ? 'text-gray-500'
                        : 'text-gray-900'
                    }`}>
                      Four Wheeler (₹1000/month)
                      {hasAnyActiveMembership && (customer.membership?.vehicleTypes || [customer.membership?.vehicleType]).includes('four-wheeler') && (
                        <span className="text-xs text-green-600 ml-1">✓ Already covered</span>
                      )}
                    </span>
                  </label>
                </div>
                {newVehicleTypes.length === 0 && hasAnyActiveMembership && (
                  <p className="text-orange-500 text-sm mt-1">No new vehicle types selected to add</p>
                )}
                {membershipData.vehicleTypes.length === 0 && !hasAnyActiveMembership && (
                  <p className="text-red-500 text-sm mt-1">Please select at least one vehicle type</p>
                )}
              </div>

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
                disabled={isCreating || (!hasAnyActiveMembership && membershipData.vehicleTypes.length === 0) || (hasAnyActiveMembership && newVehicleTypes.length === 0)}
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
                    {hasAnyActiveMembership && hasNewVehicleTypes 
                      ? `Extend Membership`
                      : 'Create Membership'}
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