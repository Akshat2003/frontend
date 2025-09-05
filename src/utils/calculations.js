export const calculateParkingFee = (startTime, endTime, vehicleType) => {
  // Fixed 4-hour duration pricing - payment made upfront regardless of actual duration
  const baseRates = {
    'two-wheeler': 20,  // ₹20 for 4 hours
    'four-wheeler': 40, // ₹40 for 4 hours
  };

  return baseRates[vehicleType] || baseRates['two-wheeler'];
};

export const formatCurrency = (amount) => {
  return `₹${amount}`;
};

export const formatDuration = (startTime, endTime = null) => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffInMs = end - start;
  
  const hours = Math.floor(diffInMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};