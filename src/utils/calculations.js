export const calculateParkingFee = (startTime, endTime, vehicleType) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffInMs = end - start;
  const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60));

  const baseRates = {
    'two-wheeler': { firstHour: 10, additionalHour: 10 },
    'four-wheeler': { firstHour: 20, additionalHour: 20 },
  };

  const rates = baseRates[vehicleType] || baseRates['two-wheeler'];
  
  if (diffInHours <= 1) {
    return rates.firstHour;
  } else {
    return rates.firstHour + (diffInHours - 1) * rates.additionalHour;
  }
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