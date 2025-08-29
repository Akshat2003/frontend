import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'medium', maxWidth }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Size mapping
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-4xl'
  };

  const modalMaxWidth = maxWidth || sizeClasses[size] || sizeClasses.medium;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-lg sm:rounded-xl shadow-2xl w-full ${modalMaxWidth} max-h-screen overflow-y-auto border border-gray-100`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 bg-gray-50 rounded-t-lg sm:rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={18} className="sm:hidden" />
            <X size={20} className="hidden sm:block" />
          </button>
        </div>
        
        {/* Content */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;