import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// jsPDF + autoTable starts to choke (memory / call-stack) somewhere past
// a few thousand rows. We cap the per-row table here so the export can
// never crash the browser; the summary stats below still reflect every
// matching booking. Users who need the full row dump should use Excel.
const MAX_TABLE_ROWS = 500;

const isMembershipPaid = (b) =>
  (b.payment?.method || b.paymentMethod || '').toLowerCase() === 'membership';
const grossAmount = (b) => b.payment?.amount ?? b.totalAmount ?? 0;
const collectedAmount = (b) => (isMembershipPaid(b) ? 0 : grossAmount(b));

export const exportBookingsToPDF = (bookings, siteName, siteId, filters = {}) => {
  const doc = new jsPDF();

  doc.setProperties({
    title: `Booking Report - ${siteName}`,
    subject: 'Parking Booking Analytics',
    author: 'Parking Operator System',
    creator: 'Parking Operator System'
  });

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Parking Booking Report', 14, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let headerY = 32;
  doc.text(`Site: ${siteName} (${siteId})`, 14, headerY);
  headerY += 6;
  doc.text(
    `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    14,
    headerY
  );
  headerY += 6;
  if (filters.dateRange) {
    doc.text(
      `Date Range: ${filters.dateRange.startDate} to ${filters.dateRange.endDate}`,
      14,
      headerY
    );
    headerY += 6;
  }
  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    doc.text(`Payment Method Filter: ${filters.paymentMethod}`, 14, headerY);
    headerY += 6;
  }
  if (filters.searchTerm) {
    doc.text(`Search: "${filters.searchTerm}"`, 14, headerY);
    headerY += 6;
  }
  if (filters.showDeletedBookings) {
    doc.text('View: Deleted bookings only', 14, headerY);
    headerY += 6;
  }
  if (filters.operatorId) {
    doc.text(`Operator: ${filters.operatorId}`, 14, headerY);
    headerY += 6;
  }
  doc.text(`Total Records: ${bookings.length}`, 14, headerY);
  headerY += 4;

  // Cap the table — keep summary on the full set
  const tableBookings = bookings.slice(0, MAX_TABLE_ROWS);
  const truncated = bookings.length > MAX_TABLE_ROWS;

  if (truncated) {
    doc.setFontSize(9);
    doc.setTextColor(180, 0, 0);
    doc.text(
      `Showing first ${MAX_TABLE_ROWS} rows in the table below — summary uses all ${bookings.length} records. Use Excel export for the full row dump.`,
      14,
      headerY + 4
    );
    doc.setTextColor(0);
    headerY += 10;
  }

  // Table data
  const tableData = tableBookings.map((booking, index) => [
    String(index + 1),
    booking.vehicleNumber || 'N/A',
    booking.customerName || 'N/A',
    booking.phoneNumber || 'N/A',
    (booking.vehicleType || '').replace('-', ' '),
    booking.machineNumber || 'N/A',
    booking.palletName || `Pallet ${booking.palletNumber}` || 'N/A',
    (booking.status || '').charAt(0).toUpperCase() + (booking.status || '').slice(1),
    (booking.payment?.method || booking.paymentMethod || 'N/A')
      .charAt(0)
      .toUpperCase() + (booking.payment?.method || booking.paymentMethod || 'N/A').slice(1),
    `₹${grossAmount(booking).toFixed(2)}`,
    booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '',
    booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : ''
  ]);

  const headers = [
    ['#', 'Vehicle No.', 'Customer', 'Phone', 'Vehicle Type', 'Machine', 'Pallet', 'Status', 'Payment', 'Amount', 'Date', 'Time']
  ];

  let tableEndY = headerY + 10;
  autoTable(doc, {
    head: headers,
    body: tableData,
    startY: headerY + 6,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { cellWidth: 18 },
      4: { cellWidth: 15 },
      5: { cellWidth: 12 },
      6: { cellWidth: 12 },
      7: { halign: 'center', cellWidth: 12 },
      8: { cellWidth: 12 },
      9: { halign: 'right', cellWidth: 15 },
      10: { cellWidth: 18 },
      11: { cellWidth: 18 }
    },
    margin: { top: 60, left: 10, right: 10 },
    pageBreak: 'auto',
    showHead: 'everyPage',
    didDrawPage: (data) => {
      tableEndY = data.cursor.y;
    }
  });

  // Summary statistics — computed across ALL matching bookings, not the
  // capped table. Membership-paid bookings collect ₹0 (member parks free)
  // so they're excluded from revenue but still counted as bookings.
  const totalRevenue = bookings.reduce((sum, b) => sum + collectedAmount(b), 0);
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) => b.status === 'active').length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const cancelledBookings = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'deleted'
  ).length;

  const paymentBreakdown = bookings.reduce((acc, booking) => {
    const method = booking.payment?.method || booking.paymentMethod || 'unknown';
    if (!acc[method]) acc[method] = { count: 0, amount: 0 };
    acc[method].count += 1;
    acc[method].amount += collectedAmount(booking);
    return acc;
  }, {});

  const vehicleBreakdown = bookings.reduce((acc, booking) => {
    const type = booking.vehicleType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const pageHeight = doc.internal.pageSize.height;
  const ensureSpace = (requiredFromCursor) => {
    if (tableEndY + requiredFromCursor > pageHeight - 20) {
      doc.addPage();
      tableEndY = 20;
    }
  };

  ensureSpace(40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary & Insights', 14, tableEndY + 15);
  tableEndY += 22;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary:', 14, tableEndY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Hourly Revenue Collected: ₹${totalRevenue.toFixed(2)}`, 20, tableEndY + 8);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    '(excludes membership-paid bookings — those parked free, no money collected)',
    20,
    tableEndY + 14
  );
  doc.setTextColor(0);
  doc.setFontSize(12);
  tableEndY += 22;

  doc.setFont('helvetica', 'bold');
  doc.text('Booking Statistics:', 14, tableEndY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Bookings: ${totalBookings}`, 20, tableEndY + 8);
  doc.text(`Active: ${activeBookings}`, 20, tableEndY + 16);
  doc.text(`Completed: ${completedBookings}`, 20, tableEndY + 24);
  doc.text(`Cancelled/Deleted: ${cancelledBookings}`, 20, tableEndY + 32);
  tableEndY += 40;

  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method Breakdown:', 14, tableEndY);
  doc.setFont('helvetica', 'normal');
  let yOffset = 8;
  Object.entries(paymentBreakdown).forEach(([method, data]) => {
    ensureSpace(yOffset + 8);
    const methodName = method.charAt(0).toUpperCase() + method.slice(1);
    doc.text(
      `${methodName}: ${data.count} bookings  (₹${data.amount.toFixed(2)} collected)`,
      20,
      tableEndY + yOffset
    );
    yOffset += 8;
  });
  tableEndY += yOffset + 4;

  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Type Breakdown:', 14, tableEndY);
  doc.setFont('helvetica', 'normal');
  yOffset = 8;
  Object.entries(vehicleBreakdown).forEach(([type, count]) => {
    ensureSpace(yOffset + 8);
    const typeName = type.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    doc.text(`${typeName}: ${count} bookings`, 20, tableEndY + yOffset);
    yOffset += 8;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    doc.text(
      'Generated by Parking Operator System',
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const dateRangeStr = filters.dateRange
    ? `_${filters.dateRange.startDate}_to_${filters.dateRange.endDate}`
    : '';
  const filename = `Booking_Report_${siteId}${dateRangeStr}_${timestamp}.pdf`;

  doc.save(filename);
};
