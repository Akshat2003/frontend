export const calculateParkingFee = (startTime, endTime, vehicleType) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffInMs = end - start;
  const totalHours = Math.ceil(diffInMs / (1000 * 60 * 60)); // Round up to next hour

  const baseRates = {
    'two-wheeler': 20,  // ₹20 per 4-hour block
    'four-wheeler': 40, // ₹40 per 4-hour block
  };

  const rate = baseRates[vehicleType] || baseRates['two-wheeler'];
  
  // Calculate number of 4-hour blocks needed
  const fourHourBlocks = Math.ceil(totalHours / 4);
  
  return fourHourBlocks * rate;
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