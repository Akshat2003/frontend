import React from 'react';

const Select = ({ 
  label, 
  error, 
  options = [], 
  className = '', 
  required = false,
  placeholder = 'Select an option',
  loading = false,
  disabled = false,
  ...props 
}) => {
  const isDisabled = disabled || loading;
  
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {loading && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 ${
            error 
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
              : isDisabled
                ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 text-gray-900'
          }`}
          disabled={isDisabled}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;