export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const generateSMSMessage = (bookingDetails) => {
  const { customerName, vehicleNumber, machineNumber, palletNumber, otp, vehicleType } = bookingDetails;
  
  const message = `Hello ${customerName},

Your parking has been confirmed!

Vehicle: ${vehicleNumber} (${vehicleType})
Machine: ${machineNumber}
Pallet: ${palletNumber}
OTP: ${otp}

Please keep your OTP safe for vehicle retrieval.

Thank you for using our parking service!`;

  return message;
};

export const openSMSApp = (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const smsUrl = `sms:${phoneNumber}?body=${encodedMessage}`;
  
  // In a real mobile app environment, this would open the SMS app
  // For demo purposes, we'll show an alert
  if (window.confirm(`SMS will be sent to ${phoneNumber}. Click OK to simulate sending.`)) {
    console.log('SMS sent to:', phoneNumber);
    console.log('Message:', message);
    return true;
  }
  return false;
};