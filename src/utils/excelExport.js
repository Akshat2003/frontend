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

const bookingPaymentMethod = (b) =>
  (b.payment?.method || b.paymentMethod || '').toLowerCase();
const isMembershipPaid = (b) => bookingPaymentMethod(b) === 'membership';
const grossAmount = (b) => b.payment?.amount ?? b.totalAmount ?? 0;
const collectedAmount = (b) =>
  b.status === 'completed' && !isMembershipPaid(b) ? grossAmount(b) : 0;
const revenueIfStatus = (b, status) =>
  b.status === status && !isMembershipPaid(b) ? grossAmount(b) : 0;
// Bucket a completed booking's payment method into Cash vs Online (anything
// non-cash, non-membership). Mirrors the membership bucket convention.
const bookingBucket = (b) => (bookingPaymentMethod(b) === 'cash' ? 'Cash' : 'Online');

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

// ---------- Stats helper (shared between Summary sheet and PDF) ----------
export function computeReportStats(bookings, memberships) {
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const activeBookings = bookings.filter((b) => b.status === 'active').length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
  const deletedBookings = bookings.filter((b) => b.status === 'deleted').length;
  const membershipPaidCount = bookings.filter(isMembershipPaid).length;

  const collected = bookings.reduce((s, b) => s + collectedAmount(b), 0);
  const cancelledRevenue = bookings.reduce((s, b) => s + revenueIfStatus(b, 'cancelled'), 0);
  const deletedRevenue = bookings.reduce((s, b) => s + revenueIfStatus(b, 'deleted'), 0);
  const avgRevenue = bookings.length ? collected / bookings.length : 0;

  const completedRevenueBookings = bookings.filter(
    (b) => b.status === 'completed' && !isMembershipPaid(b)
  );
  const cashBookings = completedRevenueBookings.filter((b) => bookingBucket(b) === 'Cash');
  const onlineBookings = completedRevenueBookings.filter((b) => bookingBucket(b) === 'Online');
  const twoWheelerBookings = completedRevenueBookings.filter(
    (b) => (b.vehicleType || '').toLowerCase() === 'two-wheeler'
  );
  const fourWheelerBookings = completedRevenueBookings.filter(
    (b) => (b.vehicleType || '').toLowerCase() === 'four-wheeler'
  );
  const sumGross = (arr) => arr.reduce((s, b) => s + grossAmount(b), 0);

  const cashMembers = memberships.filter((m) => membershipBucket(m) === 'Cash');
  const onlineMembers = memberships.filter((m) => membershipBucket(m) === 'Online');
  const sumAmount = (arr) => arr.reduce((s, m) => s + (m.amount || 0), 0);
  const totalMembershipRevenue = sumAmount(memberships);
  const completedMembershipRevenue = sumAmount(memberships.filter((m) => m.status === 'completed'));

  return {
    counts: {
      total: bookings.length,
      completed: completedBookings,
      active: activeBookings,
      cancelled: cancelledBookings,
      deleted: deletedBookings,
      membershipPaid: membershipPaidCount
    },
    revenue: {
      collected,
      avgPerBooking: avgRevenue,
      cancelled: cancelledRevenue,
      deleted: deletedRevenue
    },
    byMethod: {
      cash: { count: cashBookings.length, amount: sumGross(cashBookings) },
      online: { count: onlineBookings.length, amount: sumGross(onlineBookings) }
    },
    byVehicle: {
      twoWheeler: { count: twoWheelerBookings.length, amount: sumGross(twoWheelerBookings) },
      fourWheeler: { count: fourWheelerBookings.length, amount: sumGross(fourWheelerBookings) }
    },
    memberships: {
      total: memberships.length,
      completed: memberships.filter((m) => m.status === 'completed').length,
      totalRevenue: totalMembershipRevenue,
      completedRevenue: completedMembershipRevenue,
      cash: { count: cashMembers.length, amount: sumAmount(cashMembers) },
      online: { count: onlineMembers.length, amount: sumAmount(onlineMembers) }
    },
    combined: {
      totalRevenue: collected + totalMembershipRevenue,
      completedRevenue: collected + completedMembershipRevenue
    }
  };
}

// ---------- Summary sheet (visually polished, single sheet) ----------
const COLOR = {
  titleBg: 'FF1A365D', // dark navy
  titleText: 'FFFFFFFF',
  bandBg: 'FF2D5B8C', // medium blue
  bandText: 'FFFFFFFF',
  subBandBg: 'FFE3EBF5', // pale blue
  metricLabel: 'FF1F2937',
  metricValue: 'FF111827',
  currencyText: 'FF1B6E3F',
  noteText: 'FF6B7280',
  rowAltBg: 'FFF7FAFC',
  totalBg: 'FFFEF5DC',
  totalText: 'FF92400E',
  border: 'FFD1D5DB'
};

const thinBorder = {
  top: { style: 'thin', color: { argb: COLOR.border } },
  left: { style: 'thin', color: { argb: COLOR.border } },
  bottom: { style: 'thin', color: { argb: COLOR.border } },
  right: { style: 'thin', color: { argb: COLOR.border } }
};

function buildSummarySheet(workbook, bookings, memberships, siteName, siteId, filters) {
  const sheet = workbook.addWorksheet('Summary');

  // 3-column layout: Label | Value | Note
  sheet.getColumn(1).width = 42;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 56;

  const stats = computeReportStats(bookings, memberships);

  let currentRow = 1;

  // ---- Title block (merged across all 3 cols, 2 rows tall) ----
  sheet.mergeCells(currentRow, 1, currentRow + 1, 3);
  const titleCell = sheet.getCell(currentRow, 1);
  titleCell.value = {
    richText: [
      {
        text: 'Parking Analytics Report\n',
        font: { bold: true, size: 20, color: { argb: COLOR.titleText }, name: 'Calibri' }
      },
      {
        text: `${siteName || 'All Sites'}${siteId ? `  ·  ${siteId}` : ''}`,
        font: { size: 11, color: { argb: COLOR.titleText }, name: 'Calibri' }
      }
    ]
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.titleBg } };
  sheet.getRow(currentRow).height = 30;
  sheet.getRow(currentRow + 1).height = 24;
  currentRow += 2;

  // ---- Subtitle: period + generated ----
  sheet.mergeCells(currentRow, 1, currentRow, 3);
  const subtitleCell = sheet.getCell(currentRow, 1);
  const periodLabel = filters.dateRange
    ? `${filters.dateRange.startDate} to ${filters.dateRange.endDate}`
    : 'All Time';
  subtitleCell.value = `Period: ${periodLabel}    ·    Generated ${new Date().toLocaleString()}`;
  subtitleCell.font = { size: 10, italic: true, color: { argb: COLOR.noteText } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 18;
  currentRow += 1;

  // Filter chips (only render if any were applied)
  const filterChips = [];
  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    filterChips.push(`Payment: ${filters.paymentMethod}`);
  }
  if (filters.searchTerm) filterChips.push(`Search: "${filters.searchTerm}"`);
  if (filters.operatorId) filterChips.push(`Operator: ${filters.operatorId}`);
  if (filterChips.length) {
    sheet.mergeCells(currentRow, 1, currentRow, 3);
    const chipCell = sheet.getCell(currentRow, 1);
    chipCell.value = `Filters · ${filterChips.join('  ·  ')}`;
    chipCell.font = { size: 10, color: { argb: COLOR.noteText } };
    chipCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    currentRow += 1;
  }

  // Spacer
  currentRow += 1;

  // Helper: section band header
  const addSectionBand = (title) => {
    sheet.mergeCells(currentRow, 1, currentRow, 3);
    const cell = sheet.getCell(currentRow, 1);
    cell.value = title;
    cell.font = { bold: true, size: 12, color: { argb: COLOR.bandText } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.bandBg } };
    sheet.getRow(currentRow).height = 22;
    currentRow += 1;
  };

  // Helper: subsection mini-band
  const addSubBand = (title) => {
    sheet.mergeCells(currentRow, 1, currentRow, 3);
    const cell = sheet.getCell(currentRow, 1);
    cell.value = title;
    cell.font = { bold: true, size: 10, color: { argb: COLOR.metricLabel } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.subBandBg } };
    sheet.getRow(currentRow).height = 18;
    currentRow += 1;
  };

  // Helper: a metric row (Label / Value / optional note)
  // isCurrency formats col 2 as ₹ and tints text.
  // emphasis=true applies a bolder, highlighted treatment.
  const addMetric = (label, value, opts = {}) => {
    const { isCurrency = false, note = '', emphasis = false } = opts;
    const row = sheet.getRow(currentRow);
    row.getCell(1).value = label;
    row.getCell(1).font = {
      bold: emphasis,
      size: emphasis ? 11 : 10,
      color: { argb: COLOR.metricLabel }
    };
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    row.getCell(2).value = value;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    row.getCell(2).font = {
      bold: emphasis,
      size: emphasis ? 11 : 10,
      color: { argb: isCurrency ? COLOR.currencyText : COLOR.metricValue }
    };
    if (isCurrency) row.getCell(2).numFmt = CURRENCY_FMT;
    else if (typeof value === 'number') row.getCell(2).numFmt = '#,##0';

    if (note) {
      row.getCell(3).value = note;
      row.getCell(3).font = { italic: true, size: 9, color: { argb: COLOR.noteText } };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }

    if (emphasis) {
      [1, 2, 3].forEach((c) => {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.totalBg } };
      });
    }

    [1, 2, 3].forEach((c) => (row.getCell(c).border = thinBorder));
    row.height = 18;
    currentRow += 1;
  };

  const addSpacer = () => {
    currentRow += 1;
  };

  // ============ BOOKING COUNTS ============
  addSectionBand('BOOKING COUNTS');
  addMetric('Total bookings', stats.counts.total, { emphasis: true });
  addMetric('Completed', stats.counts.completed);
  addMetric('Active', stats.counts.active, { note: 'Vehicle still parked — payment not yet collected' });
  addMetric('Cancelled', stats.counts.cancelled);
  addMetric('Deleted', stats.counts.deleted);
  addMetric('Paid via membership', stats.counts.membershipPaid, { note: 'Member parked free' });
  addSpacer();

  // ============ HOURLY REVENUE COLLECTED ============
  addSectionBand('HOURLY REVENUE COLLECTED  ·  Completed bookings only');
  addMetric('Total hourly revenue collected', stats.revenue.collected, {
    isCurrency: true,
    emphasis: true,
    note: 'Real money taken in from completed bookings'
  });
  addMetric('Average revenue per booking', stats.revenue.avgPerBooking, { isCurrency: true });
  addSpacer();

  addSubBand('By payment method');
  addMetric('Cash bookings', stats.byMethod.cash.count);
  addMetric('Cash revenue', stats.byMethod.cash.amount, { isCurrency: true });
  addMetric('Online bookings', stats.byMethod.online.count, {
    note: 'UPI / card / online / other'
  });
  addMetric('Online revenue', stats.byMethod.online.amount, { isCurrency: true });
  addSpacer();

  addSubBand('By vehicle type');
  addMetric('Two-wheeler bookings', stats.byVehicle.twoWheeler.count);
  addMetric('Two-wheeler revenue', stats.byVehicle.twoWheeler.amount, { isCurrency: true });
  addMetric('Four-wheeler bookings', stats.byVehicle.fourWheeler.count);
  addMetric('Four-wheeler revenue', stats.byVehicle.fourWheeler.amount, { isCurrency: true });
  addSpacer();

  // ============ CANCELLED & DELETED ============
  addSectionBand('CANCELLED & DELETED REVENUE  ·  Reported separately');
  addMetric('Cancelled booking revenue', stats.revenue.cancelled, {
    isCurrency: true,
    note: 'NOT included in the collected total above'
  });
  addMetric('Deleted booking revenue', stats.revenue.deleted, {
    isCurrency: true,
    note: 'NOT included in the collected total above'
  });
  addSpacer();

  // ============ MEMBERSHIPS ============
  addSectionBand('MEMBERSHIP PURCHASES  ·  Global (across all sites)');
  addMetric('Total purchases', stats.memberships.total, { emphasis: true });
  addMetric('Completed purchases', stats.memberships.completed);
  addMetric('Total membership revenue', stats.memberships.totalRevenue, { isCurrency: true });
  addMetric('Membership revenue (completed only)', stats.memberships.completedRevenue, {
    isCurrency: true
  });
  addSpacer();

  addSubBand('By payment method');
  addMetric('Cash purchases', stats.memberships.cash.count);
  addMetric('Cash revenue', stats.memberships.cash.amount, { isCurrency: true });
  addMetric('Online purchases', stats.memberships.online.count, {
    note: 'card / UPI / online / other'
  });
  addMetric('Online revenue', stats.memberships.online.amount, { isCurrency: true });
  addSpacer();

  // ============ COMBINED REVENUE ============
  addSectionBand('COMBINED REVENUE  ·  Completed bookings + Membership purchases');
  addMetric('Combined total revenue', stats.combined.totalRevenue, {
    isCurrency: true,
    emphasis: true
  });
  addMetric('Combined revenue (completed only)', stats.combined.completedRevenue, {
    isCurrency: true,
    note: 'Real money collected — does not include foregone discounts'
  });
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
