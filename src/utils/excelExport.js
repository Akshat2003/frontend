import * as XLSX from 'xlsx';
import { formatCurrency } from './calculations';

export const exportBookingsToExcel = (bookings, siteName, siteId, dateRange = null) => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Prepare the main data for the bookings sheet
    const bookingData = bookings.map((booking, index) => ({
      'S.No.': index + 1,
      'Vehicle Number': booking.vehicleNumber || 'N/A',
      'Customer Name': booking.customerName || 'N/A',
      'Phone Number': booking.phoneNumber || 'N/A',
      'Vehicle Type': (booking.vehicleType || '').replace('-', ' '),
      'Machine Number': booking.machineNumber || 'N/A',
      'Pallet': booking.palletName || `Pallet ${booking.palletNumber}` || 'N/A',
      'Status': (booking.status || '').charAt(0).toUpperCase() + (booking.status || '').slice(1),
      'Payment Method': (booking.payment?.method || booking.paymentMethod || 'N/A').charAt(0).toUpperCase() + (booking.payment?.method || booking.paymentMethod || 'N/A').slice(1),
      'Amount (₹)': (booking.payment?.amount || booking.totalAmount || 0).toFixed(2),
      'Booking Date': new Date(booking.createdAt).toLocaleDateString(),
      'Booking Time': new Date(booking.createdAt).toLocaleTimeString(),
      'OTP Code': booking.otp?.code || 'N/A',
      'Notes': booking.notes || '',
      'Special Instructions': booking.specialInstructions || ''
    }));

    // Create the bookings worksheet
    const bookingsWorksheet = XLSX.utils.json_to_sheet(bookingData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 8 },  // S.No.
      { wch: 15 }, // Vehicle Number
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Phone Number
      { wch: 12 }, // Vehicle Type
      { wch: 12 }, // Machine Number
      { wch: 12 }, // Pallet
      { wch: 10 }, // Status
      { wch: 12 }, // Payment Method
      { wch: 12 }, // Amount
      { wch: 12 }, // Booking Date
      { wch: 12 }, // Booking Time
      { wch: 10 }, // OTP Code
      { wch: 20 }, // Notes
      { wch: 20 }  // Special Instructions
    ];
    bookingsWorksheet['!cols'] = colWidths;

    // Add the bookings sheet to workbook
    XLSX.utils.book_append_sheet(workbook, bookingsWorksheet, 'Bookings');

    // Calculate summary statistics
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => {
      return sum + (booking.payment?.amount || booking.totalAmount || 0);
    }, 0);

    // Count by status
    const statusCounts = bookings.reduce((counts, booking) => {
      const status = booking.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    // Count by payment method
    const paymentCounts = bookings.reduce((counts, booking) => {
      const method = booking.payment?.method || booking.paymentMethod || 'unknown';
      counts[method] = (counts[method] || 0) + 1;
      return counts;
    }, {});

    // Count by vehicle type
    const vehicleTypeCounts = bookings.reduce((counts, booking) => {
      const type = booking.vehicleType || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});

    // Create summary data
    const summaryData = [
      { 'Metric': 'Total Bookings', 'Value': totalBookings },
      { 'Metric': 'Total Revenue (₹)', 'Value': totalRevenue.toFixed(2) },
      { 'Metric': 'Average Revenue per Booking (₹)', 'Value': totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : '0.00' },
      { 'Metric': '', 'Value': '' }, // Empty row
      { 'Metric': 'STATUS BREAKDOWN', 'Value': '' },
      ...Object.entries(statusCounts).map(([status, count]) => ({
        'Metric': `${status.charAt(0).toUpperCase() + status.slice(1)} Bookings`,
        'Value': count
      })),
      { 'Metric': '', 'Value': '' }, // Empty row
      { 'Metric': 'PAYMENT METHOD BREAKDOWN', 'Value': '' },
      ...Object.entries(paymentCounts).map(([method, count]) => ({
        'Metric': `${method.charAt(0).toUpperCase() + method.slice(1)} Payments`,
        'Value': count
      })),
      { 'Metric': '', 'Value': '' }, // Empty row
      { 'Metric': 'VEHICLE TYPE BREAKDOWN', 'Value': '' },
      ...Object.entries(vehicleTypeCounts).map(([type, count]) => ({
        'Metric': `${type.replace('-', ' ')} Vehicles`,
        'Value': count
      }))
    ];

    // Create summary worksheet
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 30 }, { wch: 15 }];

    // Add the summary sheet to workbook
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Create report info sheet
    const reportInfo = [
      { 'Field': 'Site Name', 'Value': siteName },
      { 'Field': 'Site ID', 'Value': siteId },
      { 'Field': 'Report Generated On', 'Value': new Date().toLocaleDateString() },
      { 'Field': 'Report Generated At', 'Value': new Date().toLocaleTimeString() },
      { 'Field': 'Date Range', 'Value': dateRange ? `${dateRange.startDate} to ${dateRange.endDate}` : 'All Time' },
      { 'Field': 'Total Records', 'Value': totalBookings },
      { 'Field': 'Generated By', 'Value': 'Parking Operator System' }
    ];

    const infoWorksheet = XLSX.utils.json_to_sheet(reportInfo);
    infoWorksheet['!cols'] = [{ wch: 20 }, { wch: 30 }];

    // Add the info sheet to workbook  
    XLSX.utils.book_append_sheet(workbook, infoWorksheet, 'Report Info');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const dateRangeStr = dateRange ? `_${dateRange.startDate}_to_${dateRange.endDate}` : '';
    const filename = `Booking_Report_${siteName.replace(/\s+/g, '_')}_${siteId}${dateRangeStr}_${timestamp}.xlsx`;

    // Write the file
    XLSX.writeFile(workbook, filename);

    return true;
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error(`Failed to export Excel file: ${error.message}`);
  }
};

// Export bookings data for specific date range
export const exportBookingsToExcelWithDateRange = (bookings, siteName, siteId, startDate, endDate) => {
  const dateRange = {
    startDate: new Date(startDate).toLocaleDateString(),
    endDate: new Date(endDate).toLocaleDateString()
  };
  
  return exportBookingsToExcel(bookings, siteName, siteId, dateRange);
};