import React, { useState } from 'react';
import { Search, Smartphone, Loader2 } from 'lucide-react';
import Input from '../Common/Input';
import Button from '../Common/Button';
import { useCustomers } from '../../hooks/useCustomers';

const CustomerSearch = ({ onCustomerFound, onCustomerNotFound }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { findCustomerByPhone } = useCustomers();

  const handleSearch = () => {
    if (!phoneNumber.trim()) return;

    setIsSearching(true);
    
    setTimeout(() => {
      const customer = findCustomerByPhone(phoneNumber);
      
      if (customer) {
        onCustomerFound(customer);
      } else {
        onCustomerNotFound(phoneNumber);
      }
      
      setIsSearching(false);
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Search className="text-blue-600" size={16} />
        <h3 className="font-medium text-blue-900">Customer Lookup</h3>
      </div>
      
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Smartphone className="absolute left-3 top-8 text-gray-400" size={16} />
          <Input
            label="Customer Phone Number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter phone number"
            className="pl-10"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={!phoneNumber.trim() || isSearching}
            className="px-6"
            variant="outline"
          >
            {isSearching ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={14} className="mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-blue-700 mt-2">
        Search for existing customers to auto-fill their details
      </p>
    </div>
  );
};

export default CustomerSearch;