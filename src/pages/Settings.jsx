import React, { useState } from 'react';
import { 
  DollarSign, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Bike, 
  Car, 
  Save, 
  Smartphone, 
  Calendar, 
  User, 
  Wifi, 
  WifiOff,
  Wrench,
  Trash2,
  AlertTriangle,
  Phone,
  Mail,
  MessageCircle,
  Star,
  FileText,
  CheckCircle,
  X
} from 'lucide-react';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import { clearStorage } from '../utils/storage';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('rates');
  const [rates, setRates] = useState({
    twoWheelerFirst: 10,
    twoWheelerAdditional: 10,
    fourWheelerFirst: 20,
    fourWheelerAdditional: 20,
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const handleRateChange = (key, value) => {
    setRates(prev => ({
      ...prev,
      [key]: Math.max(0, parseInt(value) || 0)
    }));
  };

  const handleSaveRates = () => {
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleClearData = () => {
    if (showClearConfirm) {
      clearStorage();
      setShowClearConfirm(false);
      alert('All data cleared successfully!');
      window.location.reload();
    } else {
      setShowClearConfirm(true);
    }
  };

  // Tab Navigation Component
  const TabNavigation = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1 mb-4">
      <div className="flex space-x-1">
        {[
          { id: 'rates', label: 'Rates', icon: DollarSign },
          { id: 'system', label: 'System', icon: SettingsIcon },
          { id: 'support', label: 'Support', icon: HelpCircle }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Rates Tab Content
  const RatesContent = () => (
    <div className="space-y-4">
      {/* Success Message */}
      {showSaveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-3" size={20} />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success!</h3>
              <p className="text-sm text-green-700">Parking rates updated successfully.</p>
            </div>
            <button 
              onClick={() => setShowSaveSuccess(false)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Two Wheeler Rates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Bike className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Two Wheeler Rates</h3>
            <p className="text-sm text-gray-600">Set pricing for motorcycles and scooters</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Input
            label="First Hour Rate (₹)"
            type="number"
            min="0"
            value={rates.twoWheelerFirst}
            onChange={(e) => handleRateChange('twoWheelerFirst', e.target.value)}
            placeholder="10"
          />
          <Input
            label="Additional Hours (₹/hour)"
            type="number"
            min="0"
            value={rates.twoWheelerAdditional}
            onChange={(e) => handleRateChange('twoWheelerAdditional', e.target.value)}
            placeholder="10"
          />
        </div>
      </div>

      {/* Four Wheeler Rates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Car className="text-orange-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Four Wheeler Rates</h3>
            <p className="text-sm text-gray-600">Set pricing for cars and other vehicles</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Input
            label="First Hour Rate (₹)"
            type="number"
            min="0"
            value={rates.fourWheelerFirst}
            onChange={(e) => handleRateChange('fourWheelerFirst', e.target.value)}
            placeholder="20"
          />
          <Input
            label="Additional Hours (₹/hour)"
            type="number"
            min="0"
            value={rates.fourWheelerAdditional}
            onChange={(e) => handleRateChange('fourWheelerAdditional', e.target.value)}
            placeholder="20"
          />
        </div>
      </div>

      {/* Rate Preview */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <DollarSign className="text-purple-600" size={16} />
          <h4 className="font-medium text-purple-900">Rate Preview (3 hours)</h4>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Bike size={14} className="text-purple-700" />
              <span className="text-purple-700">Two Wheeler:</span>
            </div>
            <span className="font-medium text-purple-900">
              ₹{rates.twoWheelerFirst + (rates.twoWheelerAdditional * 2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Car size={14} className="text-purple-700" />
              <span className="text-purple-700">Four Wheeler:</span>
            </div>
            <span className="font-medium text-purple-900">
              ₹{rates.fourWheelerFirst + (rates.fourWheelerAdditional * 2)}
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSaveRates} className="w-full">
        <Save size={16} className="mr-2" />
        Save Rate Changes
      </Button>
    </div>
  );

  // System Tab Content
  const SystemContent = () => (
    <div className="space-y-4">
      {/* System Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Smartphone className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">App Information</h3>
            <p className="text-sm text-gray-600">Current system details</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Version</span>
            <span className="font-medium text-gray-900">v1.0.0</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-gray-500" />
              <span className="text-sm text-gray-600">Last Updated</span>
            </div>
            <span className="font-medium text-gray-900">August 2025</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <User size={14} className="text-gray-500" />
              <span className="text-sm text-gray-600">Operator ID</span>
            </div>
            <span className="font-medium text-gray-900">OP001</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600">Device Status</span>
            <div className="flex items-center space-x-2">
              <Wifi size={14} className="text-green-500" />
              <span className="font-medium text-green-600">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Wrench className="text-purple-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Machine Status</h3>
            <p className="text-sm text-gray-600">Current machine configuration</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {['M001', 'M002', 'M003', 'M004'].map((machine) => (
            <div key={machine} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{machine}</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Active</span>
                </div>
              </div>
              <p className="text-xs text-gray-600">8 pallets available</p>
            </div>
          ))}
        </div>
        
        <div className="mt-4 bg-blue-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Total Capacity</span>
            <span className="text-lg font-bold text-blue-600">32 Vehicles</span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-red-100 p-2 rounded-lg">
            <Trash2 className="text-red-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Data Management</h3>
            <p className="text-sm text-gray-600">Manage application data</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="text-yellow-500 mt-0.5" size={16} />
            <div>
              <h4 className="font-medium text-yellow-800">Warning</h4>
              <p className="text-sm text-yellow-700">
                This will permanently delete all bookings, customers, and analytics data.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant={showClearConfirm ? "danger" : "outline"}
          onClick={handleClearData}
          className="w-full"
        >
          <Trash2 size={16} className="mr-2" />
          {showClearConfirm ? "Confirm Clear All Data" : "Clear All Data"}
        </Button>

        {showClearConfirm && (
          <Button
            variant="secondary"
            onClick={() => setShowClearConfirm(false)}
            className="w-full mt-2"
          >
            <X size={16} className="mr-2" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );

  // Support Tab Content
  const SupportContent = () => (
    <div className="space-y-4">
      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-green-100 p-2 rounded-lg">
            <Phone className="text-green-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Contact Support</h3>
            <p className="text-sm text-gray-600">Get help when you need it</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <Phone size={18} className="text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Phone Support</p>
                <p className="text-sm text-gray-600">24/7 Available</p>
              </div>
            </div>
            <a 
              href="tel:+919876543210" 
              className="text-purple-600 font-medium hover:text-purple-700"
            >
              Call Now
            </a>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <Mail size={18} className="text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Email Support</p>
                <p className="text-sm text-gray-600">Response within 2 hours</p>
              </div>
            </div>
            <a 
              href="mailto:support@parkingapp.com" 
              className="text-purple-600 font-medium hover:text-purple-700"
            >
              Email
            </a>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <MessageCircle size={18} className="text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Live Chat</p>
                <p className="text-sm text-gray-600">Instant assistance</p>
              </div>
            </div>
            <Button size="sm" variant="outline">
              <MessageCircle size={14} className="mr-1" />
              Chat
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <HelpCircle className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Quick Help</h3>
            <p className="text-sm text-gray-600">Common questions and answers</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {[
            {
              question: "How to cancel a booking?",
              answer: "Go to Active Listings and click on the booking to cancel."
            },
            {
              question: "Payment not working?",
              answer: "Check network connection and try again. Contact support if issue persists."
            },
            {
              question: "How to change rates?",
              answer: "Use the Rates tab in Settings to update parking charges."
            }
          ].map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-1">{faq.question}</h4>
              <p className="text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* App Feedback */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Star className="text-orange-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">App Feedback</h3>
            <p className="text-sm text-gray-600">Help us improve the app</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1">
            <FileText size={14} className="mr-2" />
            Feedback
          </Button>
          <Button variant="outline" className="flex-1">
            <Star size={14} className="mr-2" />
            Rate App
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600">Manage your parking system preferences</p>
      </div>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Tab Content */}
      {activeTab === 'rates' && <RatesContent />}
      {activeTab === 'system' && <SystemContent />}
      {activeTab === 'support' && <SupportContent />}
    </div>
  );
};

export default Settings;