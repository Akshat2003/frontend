import ExcelJS from 'exceljs';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const SECTION_FONT = { bold: true, size: 13 };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF3FB' } };
const CURRENCY_FMT = '₹#,##0.00';

const STATUS_FILLS = {
  completed: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } },
  active: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB3B' } },
  cancelled: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } },
  deleted: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } }
};

const styleHeaderRow = (sheet, rowNumber = 1) => {
  const row = sheet.getRow(rowNumber);
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', horizontal: 'center' };
};

const isMembershipPaid = (b) =>
  (b.payment?.method || b.paymentMethod || '').toLowerCase() === 'membership';
const grossAmount = (b) => b.payment?.amount ?? b.totalAmount ?? 0;
const collectedAmount = (b) =>
  b.status === 'completed' && !isMembershipPaid(b) ? grossAmount(b) : 0;
const revenueIfStatus = (b, status) =>
  b.status === status && !isMembershipPaid(b) ? grossAmount(b) : 0;

const totalDurationHrs = (b) => {
  if (b.duration && (b.duration.hours != null || b.duration.minutes != null)) {
    return (b.duration.hours || 0) + (b.duration.minutes || 0) / 60;
  }
  if (b.startTime && b.endTime) {
    const ms = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
    if (ms > 0) return ms / 3_600_000;
  }
  return 0;
};

const membershipBucket = (m) =>
  (m.paymentMethod || '').toLowerCase() === 'cash' ? 'Cash' : 'Online';

const triggerDownload = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ---------- Summary sheet ----------
function buildSummarySheet(workbook, bookings, memberships, siteName, siteId, filters) {
  const sheet = workbook.addWorksheet('Summary');
  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 26;

  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const activeBookings = bookings.filter((b) => b.status === 'active').length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
  const deletedBookings = bookings.filter((b) => b.status === 'deleted').length;
  const membershipPaidCount = bookings.filter(isMembershipPaid).length;

  const collected = bookings.reduce((s, b) => s + collectedAmount(b), 0);
  const cancelledRevenue = bookings.reduce((s, b) => s + revenueIfStatus(b, 'cancelled'), 0);
  const deletedRevenue = bookings.reduce((s, b) => s + revenueIfStatus(b, 'deleted'), 0);
  const avgRevenue = bookings.length ? collected / bookings.length : 0;

  // Membership totals + cash/online split
  const cashMembers = memberships.filter((m) => membershipBucket(m) === 'Cash');
  const onlineMembers = memberships.filter((m) => membershipBucket(m) === 'Online');
  const sumAmount = (arr) => arr.reduce((s, m) => s + (m.amount || 0), 0);
  const totalMembershipRevenue = sumAmount(memberships);
  const completedMembershipRevenue = sumAmount(memberships.filter((m) => m.status === 'completed'));

  const addCurrency = (label, value) => {
    sheet.addRow([label, value]).getCell(2).numFmt = CURRENCY_FMT;
  };

  // Header section
  sheet.addRow(['REPORT']).font = SECTION_FONT;
  sheet.addRow([]);
  sheet.addRow(['Site', `${siteName || 'N/A'} (${siteId || 'N/A'})`]);
  sheet.addRow([
    'Date Range',
    filters.dateRange
      ? `${filters.dateRange.startDate} to ${filters.dateRange.endDate}`
      : 'All Time'
  ]);
  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    sheet.addRow(['Payment Method Filter', filters.paymentMethod]);
  }
  if (filters.searchTerm) sheet.addRow(['Search Term', filters.searchTerm]);
  if (filters.showDeletedBookings) sheet.addRow(['View', 'Deleted bookings only']);
  if (filters.operatorId) sheet.addRow(['Operator', filters.operatorId]);
  sheet.addRow(['Generated At', new Date()]).getCell(2).numFmt = 'yyyy-mm-dd hh:mm:ss';
  sheet.addRow([]);

  // Booking counts
  sheet.addRow(['BOOKING COUNTS']).font = SECTION_FONT;
  sheet.addRow([]);
  sheet.addRow(['Total bookings', bookings.length]);
  sheet.addRow(['Completed', completedBookings]);
  sheet.addRow(['Active', activeBookings]);
  sheet.addRow(['Cancelled', cancelledBookings]);
  sheet.addRow(['Deleted', deletedBookings]);
  sheet.addRow(['Paid via membership (free for member)', membershipPaidCount]);
  sheet.addRow([]);

  // Revenue — collected (completed only)
  sheet.addRow(['REVENUE — COLLECTED (Completed bookings only)']).font = SECTION_FONT;
  sheet.addRow([]);
  addCurrency('Total revenue collected', collected);
  addCurrency('Average revenue per booking', avgRevenue);
  sheet.addRow([]);

  // Revenue — cancelled / deleted
  sheet.addRow(['REVENUE — CANCELLED & DELETED (separately)']).font = SECTION_FONT;
  sheet.addRow([]);
  addCurrency('Cancelled booking revenue', cancelledRevenue);
  addCurrency('Deleted booking revenue', deletedRevenue);
  sheet.addRow(['  (NOT included in the collected total above)']);
  sheet.addRow([]);

  // Memberships — intentionally global, not scoped to the selected site.
  sheet.addRow(['MEMBERSHIP PURCHASES (global — across all sites)']).font = SECTION_FONT;
  sheet.addRow([]);
  sheet.addRow(['Total purchases', memberships.length]);
  sheet.addRow(['Completed purchases', memberships.filter((m) => m.status === 'completed').length]);
  addCurrency('Total membership revenue', totalMembershipRevenue);
  addCurrency('Membership revenue (completed only)', completedMembershipRevenue);
  sheet.addRow([]);
  sheet.addRow(['Cash purchases', cashMembers.length]);
  addCurrency('Cash revenue', sumAmount(cashMembers));
  sheet.addRow(['Online purchases (card/upi/online/other)', onlineMembers.length]);
  addCurrency('Online revenue', sumAmount(onlineMembers));
  sheet.addRow([]);

  // Combined
  sheet.addRow(['COMBINED REVENUE (Completed bookings + Membership purchases)']).font = SECTION_FONT;
  sheet.addRow([]);
  addCurrency('Combined total', collected + totalMembershipRevenue);
  addCurrency('Combined (completed only)', collected + completedMembershipRevenue);
}

// ---------- Bookings sheet ----------
function buildBookingsSheet(workbook, bookings) {
  const sheet = workbook.addWorksheet('Bookings', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Booking Number', key: 'bookingNumber', width: 18 },
    { header: 'Customer Name', key: 'customerName', width: 22 },
    { header: 'Phone Number', key: 'phoneNumber', width: 15 },
    { header: 'Vehicle Number', key: 'vehicleNumber', width: 15 },
    { header: 'Vehicle Type', key: 'vehicleType', width: 14 },
    { header: 'Machine', key: 'machineNumber', width: 12 },
    { header: 'Pallet', key: 'palletNumber', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Start Time', key: 'startTime', width: 20 },
    { header: 'End Time', key: 'endTime', width: 20 },
    { header: 'Duration (Hrs)', key: 'duration', width: 14 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Payment Status', key: 'paymentStatus', width: 14 },
    { header: 'Paid At', key: 'paidAt', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];
  styleHeaderRow(sheet);

  bookings.forEach((booking) => {
    const palletNumber = booking.palletNumber != null
      ? booking.palletNumber
      : (booking.palletName || '');

    const row = sheet.addRow({
      bookingNumber: booking.bookingNumber || '',
      customerName: booking.customerName || '',
      phoneNumber: booking.phoneNumber || '',
      vehicleNumber: booking.vehicleNumber || '',
      vehicleType: booking.vehicleType || '',
      machineNumber: booking.machineNumber || '',
      palletNumber,
      status: booking.status || '',
      startTime: booking.startTime ? new Date(booking.startTime) : '',
      endTime: booking.endTime ? new Date(booking.endTime) : '',
      duration: Number(totalDurationHrs(booking).toFixed(2)),
      amount: grossAmount(booking),
      paymentMethod: booking.payment?.method || booking.paymentMethod || '',
      paymentStatus: booking.payment?.status || '',
      paidAt: booking.payment?.paidAt ? new Date(booking.payment.paidAt) : '',
      createdAt: booking.createdAt ? new Date(booking.createdAt) : '',
      notes: booking.notes || ''
    });

    [9, 10, 15, 16].forEach((col) => {
      const cell = row.getCell(col);
      if (cell.value) cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
    });
    row.getCell(12).numFmt = CURRENCY_FMT;

    const fill = STATUS_FILLS[booking.status];
    if (fill) row.getCell(8).fill = fill;
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length }
  };
}

// ---------- Memberships sheet ----------
function buildMembershipsSheet(workbook, memberships) {
  if (memberships.length === 0) return;

  const sheet = workbook.addWorksheet('Memberships', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Membership Number', key: 'membershipNumber', width: 18 },
    { header: 'Customer Name', key: 'customerName', width: 22 },
    { header: 'Phone Number', key: 'customerPhone', width: 15 },
    { header: 'Membership Type', key: 'membershipType', width: 16 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Bucket', key: 'bucket', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Validity (months)', key: 'validityTerm', width: 16 },
    { header: 'Start Date', key: 'startDate', width: 18 },
    { header: 'Expiry Date', key: 'expiryDate', width: 18 },
    { header: 'Vehicle Types', key: 'vehicleTypes', width: 22 },
    { header: 'Created By', key: 'createdBy', width: 18 },
    { header: 'Created At', key: 'createdAt', width: 20 }
  ];
  styleHeaderRow(sheet);

  memberships.forEach((p) => {
    const row = sheet.addRow({
      membershipNumber: p.membershipNumber || '',
      customerName: p.customerName || '',
      customerPhone: p.customerPhone || '',
      membershipType: p.membershipType || '',
      amount: p.amount || 0,
      paymentMethod: p.paymentMethod || '',
      bucket: membershipBucket(p),
      status: p.status || '',
      validityTerm: p.validityTerm || 0,
      startDate: p.startDate ? new Date(p.startDate) : '',
      expiryDate: p.expiryDate ? new Date(p.expiryDate) : '',
      vehicleTypes: (p.vehicleTypes || []).map((v) => v.replace('-', ' ')).join(', '),
      createdBy: p.createdBy?.name || p.createdBy?.operatorId || '',
      createdAt: p.createdAt ? new Date(p.createdAt) : ''
    });
    row.getCell(5).numFmt = CURRENCY_FMT;
    [10, 11, 14].forEach((col) => {
      const cell = row.getCell(col);
      if (cell.value) cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
    });
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length }
  };
}

export const exportBookingsToExcel = async (
  bookings,
  siteName,
  siteId,
  filters = {},
  membershipPayments = []
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Spark Machineries Operator';
  workbook.created = new Date();

  buildSummarySheet(workbook, bookings, membershipPayments, siteName, siteId, filters);
  buildBookingsSheet(workbook, bookings);
  buildMembershipsSheet(workbook, membershipPayments);

  const safeSiteName = (siteName || 'Site').replace(/\s+/g, '_');
  const dateStamp = filters.dateRange
    ? `_${filters.dateRange.startDate}_to_${filters.dateRange.endDate}`
    : '';
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Bookings_Analytics_${safeSiteName}_${siteId || 'site'}${dateStamp}_${timestamp}.xlsx`;

  await triggerDownload(workbook, filename);
  return true;
};

export const exportBookingsToExcelWithDateRange = (
  bookings,
  siteName,
  siteId,
  startDate,
  endDate,
  extraFilters = {}
) =>
  exportBookingsToExcel(bookings, siteName, siteId, {
    dateRange: {
      startDate: new Date(startDate).toLocaleDateString(),
      endDate: new Date(endDate).toLocaleDateString()
    },
    ...extraFilters
  });
