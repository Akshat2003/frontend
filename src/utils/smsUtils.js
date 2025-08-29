export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const generateSMSMessage = (bookingDetails) => {
  const { 
    customerName, 
    vehicleNumber, 
    machineNumber, 
    palletNumber, 
    palletName,
    otp, 
    vehicleType, 
    bookingNumber 
  } = bookingDetails;
  
  const palletDisplay = palletName ? palletName : `Pallet ${palletNumber}`;
  const bookingRef = bookingNumber ? `\nBooking: ${bookingNumber}` : '';
  
  const message = `Hello ${customerName},

Your parking has been confirmed!

Vehicle: ${vehicleNumber} (${vehicleType?.replace('-', ' ')})
Machine: ${machineNumber}
Location: ${palletDisplay}
OTP: ${otp}${bookingRef}

Please keep your OTP safe for vehicle retrieval.

Thank you for using Sparkee Parking!`;

  return message;
};

export const openSMSApp = (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  
  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  console.log('Device detection:', { isMobile, isIOS, userAgent: navigator.userAgent });
  
  if (isMobile) {
    // For mobile devices, try to open the SMS app directly
    let smsUrl;
    
    if (isIOS) {
      // iOS uses different URL format
      smsUrl = `sms:${phoneNumber}&body=${encodedMessage}`;
    } else {
      // Android and others
      smsUrl = `sms:${phoneNumber}?body=${encodedMessage}`;
    }
    
    console.log('Opening SMS URL:', smsUrl);
    
    try {
      // Create a temporary link and click it (more reliable than window.location)
      const link = document.createElement('a');
      link.href = smsUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message after a brief delay
      setTimeout(() => {
        console.log('SMS app opened for:', phoneNumber);
        console.log('Message:', message);
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Failed to open SMS app:', error);
      // Fallback to confirmation dialog
      if (window.confirm(`Unable to open SMS app automatically. SMS details:\n\nTo: ${phoneNumber}\nMessage: ${message}\n\nClick OK to copy message to clipboard.`)) {
        // Try to copy to clipboard
        navigator.clipboard?.writeText(message).catch(() => {
          console.log('Failed to copy to clipboard');
        });
        return true;
      }
      return false;
    }
  } else {
    // For desktop/web, show confirmation dialog with copy option
    if (window.confirm(`SMS details for mobile:\n\nTo: ${phoneNumber}\nMessage: ${message}\n\nClick OK to copy message to clipboard.`)) {
      // Try to copy to clipboard
      navigator.clipboard?.writeText(message).then(() => {
        alert('Message copied to clipboard!');
      }).catch(() => {
        console.log('Failed to copy to clipboard');
      });
      console.log('SMS details provided for:', phoneNumber);
      console.log('Message:', message);
      return true;
    }
    return false;
  }
};