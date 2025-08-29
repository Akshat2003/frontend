import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './calculations';

export const exportBookingsToPDF = (bookings, siteName, siteId) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Variable to track table end position
  let tableEndY = 58;
  
  // Set document properties
  doc.setProperties({
    title: `Booking Report - ${siteName}`,
    subject: 'Parking Booking Analytics',
    author: 'Parking Operator System',
    creator: 'Parking Operator System'
  });

  // Title and header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Parking Booking Report', 14, 22);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Site: ${siteName} (${siteId})`, 14, 32);
  doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 40);
  doc.text(`Total Records: ${bookings.length}`, 14, 48);

  // Prepare table data
  const tableData = bookings.map((booking, index) => [
    index + 1,
    booking.vehicleNumber || 'N/A',
    booking.customerName || 'N/A',
    booking.phoneNumber || 'N/A',
    (booking.vehicleType || '').replace('-', ' '),
    booking.machineNumber || 'N/A',
    booking.palletName || `Pallet ${booking.palletNumber}` || 'N/A',
    (booking.status || '').charAt(0).toUpperCase() + (booking.status || '').slice(1),
    (booking.payment?.method || booking.paymentMethod || 'N/A').charAt(0).toUpperCase() + (booking.payment?.method || booking.paymentMethod || 'N/A').slice(1),
    formatCurrency(booking.payment?.amount || booking.totalAmount || 0),
    new Date(booking.createdAt).toLocaleDateString(),
    new Date(booking.createdAt).toLocaleTimeString()
  ]);

  // Table headers
  const headers = [
    ['#', 'Vehicle No.', 'Customer', 'Phone', 'Vehicle Type', 'Machine', 'Pallet', 'Status', 'Payment', 'Amount', 'Date', 'Time']
  ];

  // Generate table
  autoTable(doc, {
    head: headers,
    body: tableData,
    startY: 58,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [147, 51, 234], // Purple color
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // Light gray
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 }, // #
      1: { cellWidth: 20 }, // Vehicle No.
      2: { cellWidth: 25 }, // Customer
      3: { cellWidth: 20 }, // Phone
      4: { cellWidth: 18 }, // Vehicle Type
      5: { cellWidth: 15 }, // Machine
      6: { cellWidth: 15 }, // Pallet
      7: { halign: 'center', cellWidth: 15 }, // Status
      8: { cellWidth: 15 }, // Payment
      9: { halign: 'right', cellWidth: 18 }, // Amount
      10: { cellWidth: 20 }, // Date
      11: { cellWidth: 20 } // Time
    },
    margin: { top: 58, left: 14, right: 14 },
    pageBreak: 'auto',
    showHead: 'everyPage',
    didDrawPage: function (data) {
      tableEndY = data.cursor.y;
    }
  });

  // Calculate summary statistics
  const totalRevenue = bookings.reduce((sum, booking) => {
    // Skip membership payments as they are free
    if (booking.payment?.method === 'membership' || booking.paymentMethod === 'membership') {
      return sum;
    }
    return sum + (booking.payment?.amount || booking.totalAmount || 0);
  }, 0);

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'active').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'deleted').length;

  // Payment method breakdown
  const paymentBreakdown = bookings.reduce((acc, booking) => {
    const method = booking.payment?.method || booking.paymentMethod || 'unknown';
    if (!acc[method]) acc[method] = { count: 0, amount: 0 };
    acc[method].count++;
    if (method !== 'membership') {
      acc[method].amount += (booking.payment?.amount || booking.totalAmount || 0);
    }
    return acc;
  }, {});

  // Vehicle type breakdown
  const vehicleBreakdown = bookings.reduce((acc, booking) => {
    const type = booking.vehicleType || 'unknown';
    if (!acc[type]) acc[type] = 0;
    acc[type]++;
    return acc;
  }, {});

  // Add summary section
  const finalY = tableEndY;
  
  // Summary title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary & Insights', 14, finalY + 20);
  
  // Financial summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary:', 14, finalY + 35);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 20, finalY + 45);
  doc.text(`Average Revenue per Booking: ${formatCurrency(totalBookings > 0 ? totalRevenue / totalBookings : 0)}`, 20, finalY + 53);

  // Booking statistics
  doc.setFont('helvetica', 'bold');
  doc.text('Booking Statistics:', 14, finalY + 68);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Bookings: ${totalBookings}`, 20, finalY + 78);
  doc.text(`Active Bookings: ${activeBookings}`, 20, finalY + 86);
  doc.text(`Completed Bookings: ${completedBookings}`, 20, finalY + 94);
  doc.text(`Cancelled/Deleted Bookings: ${cancelledBookings}`, 20, finalY + 102);

  // Payment method breakdown
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method Breakdown:', 14, finalY + 117);
  
  doc.setFont('helvetica', 'normal');
  let yOffset = 127;
  Object.entries(paymentBreakdown).forEach(([method, data]) => {
    const methodName = method.charAt(0).toUpperCase() + method.slice(1);
    doc.text(`${methodName}: ${data.count} bookings (${formatCurrency(data.amount)})`, 20, finalY + yOffset);
    yOffset += 8;
  });

  // Vehicle type breakdown
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Type Breakdown:', 14, finalY + yOffset + 10);
  
  doc.setFont('helvetica', 'normal');
  yOffset += 20;
  Object.entries(vehicleBreakdown).forEach(([type, count]) => {
    const typeName = type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    doc.text(`${typeName}: ${count} bookings`, 20, finalY + yOffset);
    yOffset += 8;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    doc.text('Generated by Parking Operator System', doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Booking_Report_${siteId}_${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
};