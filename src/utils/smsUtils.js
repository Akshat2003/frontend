export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

// Enhanced device detection
const detectDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  return {
    isAndroid: /android/i.test(userAgent),
    isIOS: /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream,
    isBlackBerry: /BlackBerry/i.test(userAgent),
    isWindowsMobile: /IEMobile/i.test(userAgent),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    browser: (() => {
      if (/chrome/i.test(userAgent)) return 'chrome';
      if (/firefox/i.test(userAgent)) return 'firefox';
      if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'safari';
      if (/edge/i.test(userAgent)) return 'edge';
      return 'other';
    })(),
    userAgent
  };
};

// Multiple SMS URL formats for different devices
const generateSMSUrls = (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const formattedPhone = phoneNumber.replace(/[^\d+]/g, ''); // Clean phone number
  
  return {
    ios: `sms:${formattedPhone}&body=${encodedMessage}`,
    android: `sms:${formattedPhone}?body=${encodedMessage}`,
    androidAlt: `smsto:${formattedPhone}:${encodedMessage}`,
    generic: `sms:${formattedPhone}?body=${encodedMessage}`,
    whatsapp: `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`,
    telegram: `https://t.me/share/msg?url=&text=${encodedMessage}`,
  };
};

// Try to open SMS with multiple methods
const trySMSMethods = async (phoneNumber, message) => {
  const device = detectDevice();
  const urls = generateSMSUrls(phoneNumber, message);
  
  console.log('Device info:', device);
  console.log('Attempting to open SMS for:', phoneNumber);
  
  const methods = [];
  
  // Method 1: Direct SMS URLs
  if (device.isIOS) {
    methods.push({ name: 'iOS SMS', url: urls.ios });
    methods.push({ name: 'iOS SMS Alt', url: urls.generic });
  } else if (device.isAndroid) {
    methods.push({ name: 'Android SMS', url: urls.android });
    methods.push({ name: 'Android SMS Alt', url: urls.androidAlt });
  } else if (device.isMobile) {
    methods.push({ name: 'Generic Mobile SMS', url: urls.generic });
  }
  
  // Method 2: Try each method with different techniques
  for (const method of methods) {
    try {
      console.log(`Trying ${method.name}:`, method.url);
      
      // Technique A: Create invisible link and click
      const success = await tryLinkMethod(method.url);
      if (success) {
        console.log(`${method.name} successful via link method`);
        return { success: true, method: method.name };
      }
      
      // Technique B: Window.location (fallback)
      const success2 = await tryLocationMethod(method.url);
      if (success2) {
        console.log(`${method.name} successful via location method`);
        return { success: true, method: method.name };
      }
      
      // Technique C: Window.open (fallback)
      const success3 = await tryWindowOpenMethod(method.url);
      if (success3) {
        console.log(`${method.name} successful via window.open method`);
        return { success: true, method: method.name };
      }
      
    } catch (error) {
      console.log(`${method.name} failed:`, error.message);
    }
  }
  
  return { success: false, method: null };
};

// Method 1: Create link and click (most reliable)
const tryLinkMethod = (url) => {
  return new Promise((resolve) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      link.target = '_blank';
      
      document.body.appendChild(link);
      
      // Track if link was successful
      let resolved = false;
      
      // Set timeout to resolve after attempt
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(link);
          resolve(true); // Assume success if no immediate error
        }
      }, 1000);
      
      // Try to click
      link.click();
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(true);
        }
      }, 500);
      
    } catch (error) {
      console.error('Link method failed:', error);
      resolve(false);
    }
  });
};

// Method 2: Window location
const tryLocationMethod = (url) => {
  return new Promise((resolve) => {
    try {
      const currentUrl = window.location.href;
      window.location.href = url;
      
      // Restore URL after brief delay
      setTimeout(() => {
        if (window.location.href === url) {
          window.location.href = currentUrl;
        }
        resolve(true);
      }, 1000);
      
    } catch (error) {
      console.error('Location method failed:', error);
      resolve(false);
    }
  });
};

// Method 3: Window.open
const tryWindowOpenMethod = (url) => {
  return new Promise((resolve) => {
    try {
      const popup = window.open(url, '_blank');
      
      setTimeout(() => {
        if (popup) {
          popup.close();
        }
        resolve(true);
      }, 1000);
      
    } catch (error) {
      console.error('Window open method failed:', error);
      resolve(false);
    }
  });
};

// Enhanced copy to clipboard with fallbacks
const copyToClipboard = async (text) => {
  try {
    // Method 1: Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Method 2: Fallback using document.execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return result;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
};

// Main SMS function with enhanced robustness
export const openSMSApp = async (phoneNumber, message, options = {}) => {
  const { 
    showFallbackModal = true, 
    enableWhatsAppFallback = true,
    enableCopyFallback = true,
    onStatusUpdate = null 
  } = options;
  
  // Clean phone number
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  if (!cleanPhone) {
    console.error('Invalid phone number:', phoneNumber);
    if (onStatusUpdate) onStatusUpdate({ status: 'error', message: 'Invalid phone number' });
    return { success: false, error: 'Invalid phone number' };
  }
  
  const device = detectDevice();
  
  // Update status
  if (onStatusUpdate) onStatusUpdate({ status: 'attempting', message: 'Opening SMS app...' });
  
  // For desktop, show options immediately
  if (device.isDesktop) {
    if (onStatusUpdate) onStatusUpdate({ status: 'desktop', message: 'Desktop detected - showing options' });
    return await handleDesktopSMS(cleanPhone, message, { enableWhatsAppFallback, enableCopyFallback });
  }
  
  // For mobile, try SMS methods
  const smsResult = await trySMSMethods(cleanPhone, message);
  
  if (smsResult.success) {
    if (onStatusUpdate) onStatusUpdate({ 
      status: 'success', 
      message: `SMS app opened successfully using ${smsResult.method}` 
    });
    return { success: true, method: smsResult.method };
  }
  
  // SMS failed, try fallbacks
  if (onStatusUpdate) onStatusUpdate({ status: 'fallback', message: 'SMS app failed - trying alternatives...' });
  
  return await handleSMSFallbacks(cleanPhone, message, { 
    enableWhatsAppFallback, 
    enableCopyFallback, 
    showFallbackModal,
    onStatusUpdate 
  });
};

// Handle desktop SMS options
const handleDesktopSMS = async (phoneNumber, message, options) => {
  const { enableWhatsAppFallback, enableCopyFallback } = options;
  
  const buttons = [];
  if (enableCopyFallback) buttons.push('Copy Message');
  if (enableWhatsAppFallback) buttons.push('Open WhatsApp');
  buttons.push('Cancel');
  
  const choice = prompt(
    `SMS is not available on desktop. Choose an option:\n\n` +
    `To: ${phoneNumber}\n` +
    `Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n\n` +
    `1. Copy message to clipboard\n` +
    `${enableWhatsAppFallback ? '2. Open WhatsApp\n' : ''}` +
    `Enter 1${enableWhatsAppFallback ? ', 2' : ''}, or Cancel:`,
    '1'
  );
  
  if (choice === '1' && enableCopyFallback) {
    const copied = await copyToClipboard(message);
    if (copied) {
      alert('Message copied to clipboard! You can now paste it in your SMS app.');
      return { success: true, method: 'clipboard' };
    } else {
      alert('Failed to copy message to clipboard.');
      return { success: false, error: 'Clipboard copy failed' };
    }
  }
  
  if (choice === '2' && enableWhatsAppFallback) {
    return await tryWhatsAppFallback(phoneNumber, message);
  }
  
  return { success: false, error: 'User cancelled' };
};

// Handle SMS fallbacks
const handleSMSFallbacks = async (phoneNumber, message, options) => {
  const { enableWhatsAppFallback, enableCopyFallback, onStatusUpdate } = options;
  
  // Try WhatsApp first if enabled
  if (enableWhatsAppFallback) {
    if (onStatusUpdate) onStatusUpdate({ status: 'whatsapp', message: 'Trying WhatsApp...' });
    const whatsappResult = await tryWhatsAppFallback(phoneNumber, message);
    if (whatsappResult.success) {
      return whatsappResult;
    }
  }
  
  // Finally, offer copy to clipboard
  if (enableCopyFallback) {
    if (onStatusUpdate) onStatusUpdate({ status: 'clipboard', message: 'Offering clipboard copy...' });
    
    const userWantsCopy = confirm(
      `SMS app could not be opened automatically.\n\n` +
      `Would you like to copy the message to clipboard?\n\n` +
      `To: ${phoneNumber}\n` +
      `Message: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`
    );
    
    if (userWantsCopy) {
      const copied = await copyToClipboard(message);
      if (copied) {
        alert('Message copied to clipboard! You can now paste it in any SMS app.');
        if (onStatusUpdate) onStatusUpdate({ status: 'success', message: 'Message copied to clipboard' });
        return { success: true, method: 'clipboard' };
      } else {
        alert('Failed to copy message to clipboard. Please note down the SMS details.');
        if (onStatusUpdate) onStatusUpdate({ status: 'error', message: 'Clipboard copy failed' });
      }
    }
  }
  
  if (onStatusUpdate) onStatusUpdate({ status: 'failed', message: 'All SMS methods failed' });
  return { success: false, error: 'All methods failed' };
};

// Try WhatsApp as fallback
const tryWhatsAppFallback = async (phoneNumber, message) => {
  try {
    const urls = generateSMSUrls(phoneNumber, message);
    const success = await tryLinkMethod(urls.whatsapp);
    
    if (success) {
      return { success: true, method: 'whatsapp' };
    }
    
    return { success: false, error: 'WhatsApp failed' };
  } catch (error) {
    console.error('WhatsApp fallback failed:', error);
    return { success: false, error: error.message };
  }
};

// Simplified version for backward compatibility
export const openSMSAppSimple = (phoneNumber, message) => {
  return openSMSApp(phoneNumber, message, {
    showFallbackModal: true,
    enableWhatsAppFallback: true,
    enableCopyFallback: true
  }).then(result => result.success);
};