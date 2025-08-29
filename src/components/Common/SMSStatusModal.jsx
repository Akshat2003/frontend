import React, { useState, useEffect } from 'react';
import { X, Smartphone, MessageCircle, Copy, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

const SMSStatusModal = ({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  message, 
  bookingDetails = null,
  autoClose = true 
}) => {
  const [status, setStatus] = useState('idle'); // idle, attempting, success, fallback, error
  const [statusMessage, setStatusMessage] = useState('');
  const [method, setMethod] = useState('');
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-close after successful SMS
  useEffect(() => {
    if (status === 'success' && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, autoClose, onClose]);

  const handleSMSAttempt = async () => {
    setIsProcessing(true);
    setStatus('attempting');
    setStatusMessage('Opening SMS app...');

    try {
      // Import the enhanced SMS utility
      const { openSMSApp } = await import('../../utils/smsUtils');
      
      const result = await openSMSApp(phoneNumber, message, {
        showFallbackModal: false, // We handle UI here
        enableWhatsAppFallback: true,
        enableCopyFallback: true,
        onStatusUpdate: (update) => {
          setStatus(update.status);
          setStatusMessage(update.message);
        }
      });

      if (result.success) {
        setStatus('success');
        setMethod(result.method);
        setStatusMessage(`SMS sent successfully using ${result.method}`);
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS attempt failed:', error);
      setStatus('error');
      setStatusMessage('SMS functionality error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setStatus('success');
      setMethod('clipboard');
      setStatusMessage('Message copied to clipboard successfully!');
    } catch (error) {
      console.error('Copy failed:', error);
      setStatus('error');
      setStatusMessage('Failed to copy message to clipboard');
    }
  };

  const handleWhatsAppFallback = async () => {
    try {
      const encodedMessage = encodeURIComponent(message);
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
      
      // Try to open WhatsApp
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatus('success');
      setMethod('whatsapp');
      setStatusMessage('WhatsApp opened successfully');
    } catch (error) {
      console.error('WhatsApp failed:', error);
      setStatus('error');
      setStatusMessage('Failed to open WhatsApp');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'attempting':
        return <Loader className="animate-spin text-blue-500" size={24} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={24} />;
      default:
        return <Smartphone className="text-gray-500" size={24} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'attempting':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const truncatedMessage = message.length > 150 
    ? `${message.substring(0, 150)}...` 
    : message;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send SMS Notification" size="small">
      <div>
        {/* Booking Details Summary (if provided) */}
        {bookingDetails && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
            <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 text-sm">
              <div className="flex justify-between sm:block">
                <span className="text-gray-500">Customer:</span>
                <span className="ml-2 font-medium break-words">{bookingDetails.customerName}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-gray-500">Vehicle:</span>
                <span className="ml-2 font-medium">{bookingDetails.vehicleNumber}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-gray-500">Machine:</span>
                <span className="ml-2 font-medium">{bookingDetails.machineNumber}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-gray-500">OTP:</span>
                <span className="ml-2 font-mono font-bold text-purple-600 text-lg sm:text-base">
                  {bookingDetails.otp}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SMS Details */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-3">
            <h4 className="font-semibold text-gray-900">SMS Details</h4>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className={`text-xs sm:text-sm font-medium ${getStatusColor()}`}>
                {statusMessage || 'Ready to send'}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-sm text-gray-500 mb-1 sm:mb-0">To:</span>
              <span className="ml-0 sm:ml-2 font-medium break-all">{phoneNumber}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Message:</span>
              <div className="mt-1 p-2 sm:p-3 bg-white rounded border text-xs sm:text-sm leading-relaxed">
                {showFullMessage ? message : truncatedMessage}
                {message.length > 150 && (
                  <button
                    onClick={() => setShowFullMessage(!showFullMessage)}
                    className="block mt-2 text-blue-500 hover:text-blue-700 underline text-xs"
                  >
                    {showFullMessage ? 'Show Less' : 'Show Full Message'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === 'idle' && (
            <Button
              onClick={handleSMSAttempt}
              disabled={isProcessing}
              className="w-full"
              variant="primary"
            >
              <Smartphone className="mr-2" size={16} />
              {isProcessing ? 'Opening SMS App...' : 'Open SMS App'}
            </Button>
          )}

          {(status === 'error' || status === 'fallback') && (
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-gray-600 text-center px-2">
                SMS app could not be opened. Try these alternatives:
              </p>
              
              <div className="space-y-2">
                <Button
                  onClick={handleCopyMessage}
                  variant="outline"
                  className="w-full text-sm py-3"
                  size="sm"
                >
                  <Copy className="mr-2" size={14} />
                  Copy Message
                </Button>
                
                <Button
                  onClick={handleWhatsAppFallback}
                  variant="outline"
                  className="w-full text-sm py-3"
                  size="sm"
                >
                  <MessageCircle className="mr-2" size={14} />
                  Send via WhatsApp
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2 text-green-600 mb-3">
                <CheckCircle size={20} className="flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base text-center">
                  {method === 'clipboard' && 'Message copied successfully!'}
                  {method === 'whatsapp' && 'WhatsApp opened successfully!'}
                  {method && !['clipboard', 'whatsapp'].includes(method) && 'SMS app opened successfully!'}
                </span>
              </div>
              
              {method === 'clipboard' && (
                <p className="text-xs sm:text-sm text-gray-600 px-2">
                  You can now paste the message in any SMS app or messaging platform.
                </p>
              )}
              
              {autoClose && (
                <p className="text-xs text-gray-500 mt-2 px-2">
                  This dialog will close automatically in a few seconds...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full text-sm py-3"
            size="sm"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SMSStatusModal;