import React from 'react';

const Input = ({
  label,
  error,
  className = '',
  type = 'text',
  required = false,
  membershipStatus = null, // 'active', 'inactive', 'checking', or null
  ...props
}) => {
  // Determine border color based on membership status and error state
  const getBorderClasses = () => {
    if (error) {
      return 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';
    }
    if (membershipStatus === 'active') {
      return 'border-green-500 text-gray-900 placeholder-gray-400 focus:ring-green-500 focus:border-green-500';
    }
    // Default gray border, purple on focus
    return 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500';
  };

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors duration-200 ${getBorderClasses()}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {membershipStatus === 'active' && !error && (
        <p className="mt-1 text-sm text-green-600">✓ Active membership found</p>
      )}
    </div>
  );
};

export default Input;