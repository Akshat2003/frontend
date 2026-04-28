import ExcelJS from 'exceljs';

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0066CC' }
};

const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };

const STATUS_FILLS = {
  completed: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } },
  active: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB3B' } },
  cancelled: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } },
  deleted: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } }
};

const styleHeaderRow = (sheet) => {
  const header = sheet.getRow(1);
  header.font = HEADER_FONT;
  header.fill = HEADER_FILL;
  header.alignment = { vertical: 'middle', horizontal: 'center' };
};

const getDuration = (booking) => {
  if (booking.duration && (booking.duration.hours != null || booking.duration.minutes != null)) {
    return {
      hours: booking.duration.hours || 0,
      minutes: booking.duration.minutes || 0
    };
  }
  if (booking.startTime && booking.endTime) {
    const ms = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
    if (ms > 0) {
      const totalMin = Math.floor(ms / 60000);
      return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
    }
  }
  return { hours: 0, minutes: 0 };
};

const totalDurationHrs = (booking) => {
  const d = getDuration(booking);
  return d.hours + d.minutes / 60;
};

// payment.amount stores the gross parking fee even for membership-paid bookings
// (the membership discount is applied client-side only) and is also written
// at booking-creation time on rows that were never completed. For accurate
// "collected" revenue we count ONLY completed, non-membership-paid bookings.
// Active, cancelled, deleted, and membership-paid all contribute 0; cancelled
// and deleted are reported as their own figures in the summary.
const isMembershipPaid = (booking) =>
  (booking.payment?.method || booking.paymentMethod || '').toLowerCase() === 'membership';

const grossAmount = (booking) => booking.payment?.amount ?? booking.totalAmount ?? 0;

const collectedAmount = (booking) =>
  booking.status === 'completed' && !isMembershipPaid(booking) ? grossAmount(booking) : 0;

const revenueIfStatus = (booking, status) =>
  booking.status === status && !isMembershipPaid(booking) ? grossAmount(booking) : 0;

const membershipDiscountedAmount = (booking) =>
  isMembershipPaid(booking) ? grossAmount(booking) : 0;

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

const membershipPaymentBucket = (method) =>
  (method || '').toLowerCase() === 'cash' ? 'Cash' : 'Online';

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

  // Sheet 1: All Bookings Data
  const bookingsSheet = workbook.addWorksheet('All Bookings', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  bookingsSheet.columns = [
    { header: 'Booking Number', key: 'bookingNumber', width: 18 },
    { header: 'Customer Name', key: 'customerName', width: 20 },
    { header: 'Phone Number', key: 'phoneNumber', width: 15 },
    { header: 'Vehicle Number', key: 'vehicleNumber', width: 15 },
    { header: 'Vehicle Type', key: 'vehicleType', width: 15 },
    { header: 'Machine Number', key: 'machineNumber', width: 15 },
    { header: 'Pallet Number', key: 'palletNumber', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Start Time', key: 'startTime', width: 20 },
    { header: 'End Time', key: 'endTime', width: 20 },
    { header: 'Duration (Hours)', key: 'durationHours', width: 15 },
    { header: 'Duration (Minutes)', key: 'durationMinutes', width: 15 },
    { header: 'Total Duration (Hrs)', key: 'totalDuration', width: 18 },
    { header: 'Hourly Booking Amount (Gross)', key: 'paymentAmount', width: 24 },
    { header: 'Hourly Revenue Collected', key: 'collectedRevenue', width: 22 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Hourly Base Rate', key: 'baseRate', width: 16 },
    { header: 'Additional Charges (Booking)', key: 'additionalCharges', width: 22 },
    { header: 'Discount (Booking)', key: 'discount', width: 16 },
    { header: 'Tax (Booking)', key: 'tax', width: 14 },
    { header: 'Paid At', key: 'paidAt', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Special Instructions', key: 'specialInstructions', width: 30 }
  ];

  styleHeaderRow(bookingsSheet);

  bookings.forEach((booking) => {
    const dur = getDuration(booking);
    const palletNumber = booking.palletNumber != null
      ? booking.palletNumber
      : (booking.palletName || '');

    const row = bookingsSheet.addRow({
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
      durationHours: dur.hours,
      durationMinutes: dur.minutes,
      totalDuration: Number(totalDurationHrs(booking).toFixed(2)),
      paymentAmount: grossAmount(booking),
      collectedRevenue: collectedAmount(booking),
      paymentStatus: booking.payment?.status || '',
      paymentMethod: booking.payment?.method || booking.paymentMethod || '',
      baseRate: booking.payment?.baseRate || 0,
      additionalCharges: booking.payment?.additionalCharges || 0,
      discount: booking.payment?.discount || 0,
      tax: booking.payment?.tax || 0,
      paidAt: booking.payment?.paidAt ? new Date(booking.payment.paidAt) : '',
      createdAt: booking.createdAt ? new Date(booking.createdAt) : '',
      notes: booking.notes || '',
      specialInstructions: booking.specialInstructions || ''
    });

    [9, 10, 22, 23].forEach((colNum) => {
      const cell = row.getCell(colNum);
      if (cell.value) cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
    });

    [14, 15, 18, 19, 20, 21].forEach((colNum) => {
      row.getCell(colNum).numFmt = '₹#,##0.00';
    });

    const statusCell = row.getCell(8);
    const fill = STATUS_FILLS[booking.status];
    if (fill) statusCell.fill = fill;
  });

  bookingsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: bookingsSheet.columns.length }
  };

  // Sheet 2: Summary Analytics
  const summarySheet = workbook.addWorksheet('Summary Analytics');
  summarySheet.getColumn(1).width = 30;
  summarySheet.getColumn(2).width = 24;

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const activeBookings = bookings.filter((b) => b.status === 'active').length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
  const deletedBookings = bookings.filter((b) => b.status === 'deleted').length;

  // collectedAmount() returns 0 unless the booking is completed and not
  // membership-paid, so totalRevenue is the headline "completed money"
  // figure. completedRevenue is kept for the Combined Revenue section.
  const totalRevenue = bookings.reduce((sum, b) => sum + collectedAmount(b), 0);
  const completedRevenue = totalRevenue;
  const cancelledRevenue = bookings.reduce(
    (sum, b) => sum + revenueIfStatus(b, 'cancelled'),
    0
  );
  const deletedRevenue = bookings.reduce(
    (sum, b) => sum + revenueIfStatus(b, 'deleted'),
    0
  );
  const membershipPaidCount = bookings.filter(isMembershipPaid).length;
  const membershipDiscountedTotal = bookings.reduce(
    (sum, b) => sum + membershipDiscountedAmount(b),
    0
  );
  const membershipDiscountedCompleted = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + membershipDiscountedAmount(b), 0);

  const withDuration = bookings.filter(
    (b) => (b.duration && (b.duration.hours || b.duration.minutes)) || (b.startTime && b.endTime)
  );
  const avgDuration = withDuration.length
    ? withDuration.reduce((sum, b) => sum + totalDurationHrs(b), 0) / withDuration.length
    : 0;
  const avgRevenue = totalBookings ? totalRevenue / totalBookings : 0;

  summarySheet.addRow(['REPORT FILTERS']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Site Name', siteName || 'N/A']);
  summarySheet.addRow(['Site ID', siteId || 'N/A']);
  if (filters.dateRange) {
    summarySheet.addRow(['Date Range', `${filters.dateRange.startDate} to ${filters.dateRange.endDate}`]);
  } else {
    summarySheet.addRow(['Date Range', 'All Time']);
  }
  summarySheet.addRow(['Payment Method Filter', filters.paymentMethod || 'all']);
  if (filters.searchTerm) summarySheet.addRow(['Search Term', filters.searchTerm]);
  if (filters.showDeletedBookings) summarySheet.addRow(['View', 'Deleted bookings only']);
  if (filters.operatorId) summarySheet.addRow(['Operator', filters.operatorId]);
  summarySheet.addRow(['Generated At', new Date()]).getCell(2).numFmt = 'yyyy-mm-dd hh:mm:ss';
  summarySheet.addRow([]);

  summarySheet.addRow(['HOURLY BOOKING STATISTICS']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Hourly Bookings', totalBookings]);
  summarySheet.addRow(['Completed Hourly Bookings', completedBookings]);
  summarySheet.addRow(['Active Hourly Bookings', activeBookings]);
  summarySheet.addRow(['Cancelled Hourly Bookings', cancelledBookings]);
  summarySheet.addRow(['Deleted Hourly Bookings', deletedBookings]);
  summarySheet.addRow([]);

  summarySheet.addRow(['HOURLY REVENUE — COLLECTED (Completed bookings only)']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Hourly Revenue Collected', totalRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow(['  (excludes active, cancelled, deleted and membership-paid bookings)']);
  summarySheet.addRow(['Average Collected Revenue per Booking', avgRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow([]);

  summarySheet.addRow(['HOURLY REVENUE — CANCELLED & DELETED (separately)']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Cancelled booking revenue', cancelledRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow(['  (sum of payment.amount across cancelled bookings — NOT included in collected revenue above)']);
  summarySheet.addRow(['Deleted booking revenue', deletedRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow(['  (sum of payment.amount across deleted bookings — NOT included in collected revenue above)']);
  summarySheet.addRow([]);

  summarySheet.addRow(['MEMBERSHIP-DISCOUNTED PARKING (Foregone hourly revenue)']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Bookings paid via membership', membershipPaidCount]);
  summarySheet
    .addRow([
      'Foregone hourly revenue (membership discount value)',
      membershipDiscountedTotal
    ])
    .getCell(2).numFmt = '₹#,##0.00';
  summarySheet
    .addRow([
      'Foregone hourly revenue — completed only',
      membershipDiscountedCompleted
    ])
    .getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow([
    '  (this is what the parking would have cost if the member had paid hourly — no money was actually collected)'
  ]);
  summarySheet.addRow([]);

  summarySheet.addRow(['DURATION STATISTICS (Hourly Bookings)']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Average Booking Duration (Hours)', Number(avgDuration.toFixed(2))]);
  summarySheet.addRow([]);

  // Membership totals
  const membershipCount = membershipPayments.length;
  const membershipCompletedCount = membershipPayments.filter((p) => p.status === 'completed').length;
  const membershipRevenue = membershipPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const membershipCompletedRevenue = membershipPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  summarySheet.addRow(['MEMBERSHIP PURCHASE STATISTICS (Memberships only)']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Membership Purchases', membershipCount]);
  summarySheet.addRow(['Completed Membership Purchases', membershipCompletedCount]);
  summarySheet.addRow(['Total Membership Revenue', membershipRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow(['Membership Revenue (Completed only)', membershipCompletedRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow([]);

  summarySheet.addRow(['COMBINED REVENUE (Collected hourly + Membership purchases)']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Combined Total Revenue', totalRevenue + membershipRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet
    .addRow(['Combined Revenue (Completed only)', completedRevenue + membershipCompletedRevenue])
    .getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow([
    '  (this is real money collected — foregone membership-discount value is NOT added in)'
  ]);

  // Sheet 3: Status Breakdown (hourly bookings only)
  const statusSheet = workbook.addWorksheet('Status Breakdown (Hourly)');
  statusSheet.columns = [
    { header: 'Booking Status', key: 'status', width: 20 },
    { header: 'Booking Count', key: 'count', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Hourly Revenue Collected', key: 'revenue', width: 24 }
  ];
  styleHeaderRow(statusSheet);

  const statusCounts = {};
  bookings.forEach((b) => {
    const s = b.status || 'unknown';
    if (!statusCounts[s]) statusCounts[s] = { count: 0, revenue: 0 };
    statusCounts[s].count += 1;
    statusCounts[s].revenue += collectedAmount(b);
  });
  Object.entries(statusCounts).forEach(([status, data]) => {
    const row = statusSheet.addRow({
      status,
      count: data.count,
      percentage: totalBookings ? ((data.count / totalBookings) * 100).toFixed(2) + '%' : '0.00%',
      revenue: data.revenue
    });
    row.getCell(4).numFmt = '₹#,##0.00';
  });

  // Sheet 4: Vehicle Type Analysis (hourly bookings only)
  const vehicleSheet = workbook.addWorksheet('Vehicle Type Analysis (Hourly)');
  vehicleSheet.columns = [
    { header: 'Vehicle Type', key: 'vehicleType', width: 20 },
    { header: 'Booking Count', key: 'count', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Hourly Revenue Collected', key: 'revenue', width: 24 },
    { header: 'Avg Booking Duration (Hrs)', key: 'avgDuration', width: 24 }
  ];
  styleHeaderRow(vehicleSheet);

  const vehicleCounts = {};
  bookings.forEach((b) => {
    const t = b.vehicleType || 'unknown';
    if (!vehicleCounts[t]) vehicleCounts[t] = { count: 0, revenue: 0, totalDuration: 0 };
    vehicleCounts[t].count += 1;
    vehicleCounts[t].revenue += collectedAmount(b);
    vehicleCounts[t].totalDuration += totalDurationHrs(b);
  });
  Object.entries(vehicleCounts).forEach(([type, data]) => {
    const row = vehicleSheet.addRow({
      vehicleType: type,
      count: data.count,
      percentage: totalBookings ? ((data.count / totalBookings) * 100).toFixed(2) + '%' : '0.00%',
      revenue: data.revenue,
      avgDuration: data.count ? Number((data.totalDuration / data.count).toFixed(2)) : 0
    });
    row.getCell(4).numFmt = '₹#,##0.00';
  });

  // Sheet 5: Machine Usage Analysis (hourly bookings only)
  const machineSheet = workbook.addWorksheet('Machine Usage (Hourly)');
  machineSheet.columns = [
    { header: 'Machine Number', key: 'machineNumber', width: 20 },
    { header: 'Booking Count', key: 'count', width: 15 },
    { header: 'Hourly Revenue Collected', key: 'revenue', width: 24 },
    { header: 'Total Hours Booked', key: 'totalHours', width: 20 }
  ];
  styleHeaderRow(machineSheet);

  const machineCounts = {};
  bookings.forEach((b) => {
    const m = b.machineNumber || 'unknown';
    if (!machineCounts[m]) machineCounts[m] = { count: 0, revenue: 0, totalHours: 0 };
    machineCounts[m].count += 1;
    machineCounts[m].revenue += collectedAmount(b);
    machineCounts[m].totalHours += totalDurationHrs(b);
  });
  Object.entries(machineCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([machine, data]) => {
      const row = machineSheet.addRow({
        machineNumber: machine,
        count: data.count,
        revenue: data.revenue,
        totalHours: Number(data.totalHours.toFixed(2))
      });
      row.getCell(3).numFmt = '₹#,##0.00';
    });

  // Sheet 6: Payment Method Analysis (hourly bookings only)
  // For non-membership rows, "Amount" = revenue actually collected.
  // For the "membership" row, "Amount" = the foregone parking fee (the
  // discount the member received), since no money was actually collected.
  const paymentSheet = workbook.addWorksheet('Payment Method (Hourly)');
  paymentSheet.columns = [
    { header: 'Payment Method', key: 'method', width: 20 },
    { header: 'Booking Count', key: 'count', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Amount (Collected, or Discounted Value for membership)', key: 'amount', width: 50 }
  ];
  styleHeaderRow(paymentSheet);

  const paymentMethods = {};
  bookings.forEach((b) => {
    const m = b.payment?.method || b.paymentMethod || 'unknown';
    if (!paymentMethods[m]) paymentMethods[m] = { count: 0, amount: 0 };
    paymentMethods[m].count += 1;
    paymentMethods[m].amount += grossAmount(b);
  });
  Object.entries(paymentMethods).forEach(([method, data]) => {
    const row = paymentSheet.addRow({
      method,
      count: data.count,
      percentage: totalBookings ? ((data.count / totalBookings) * 100).toFixed(2) + '%' : '0.00%',
      amount: data.amount
    });
    row.getCell(4).numFmt = '₹#,##0.00';
  });

  // Sheet 7: Monthly Trend (hourly bookings only)
  const monthlySheet = workbook.addWorksheet('Monthly Trend (Hourly)');
  monthlySheet.columns = [
    { header: 'Month', key: 'month', width: 20 },
    { header: 'Hourly Bookings', key: 'count', width: 18 },
    { header: 'Hourly Revenue Collected', key: 'revenue', width: 24 },
    { header: 'Avg Collected Revenue per Booking', key: 'avgRevenue', width: 30 }
  ];
  styleHeaderRow(monthlySheet);

  const monthlyData = {};
  bookings.forEach((b) => {
    if (!b.createdAt) return;
    const date = new Date(b.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { count: 0, revenue: 0 };
    monthlyData[monthKey].count += 1;
    monthlyData[monthKey].revenue += collectedAmount(b);
  });
  Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([month, data]) => {
      const row = monthlySheet.addRow({
        month,
        count: data.count,
        revenue: data.revenue,
        avgRevenue: data.count ? data.revenue / data.count : 0
      });
      row.getCell(3).numFmt = '₹#,##0.00';
      row.getCell(4).numFmt = '₹#,##0.00';
    });

  // Sheet 8: Membership Payments (membership purchases only)
  const membershipSheet = workbook.addWorksheet('Membership Payments', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });
  membershipSheet.columns = [
    { header: 'Membership Number', key: 'membershipNumber', width: 18 },
    { header: 'Customer Name', key: 'customerName', width: 22 },
    { header: 'Phone Number', key: 'customerPhone', width: 15 },
    { header: 'Membership Type', key: 'membershipType', width: 16 },
    { header: 'Membership Purchase Amount', key: 'amount', width: 24 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Payment Bucket', key: 'paymentBucket', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Validity (months)', key: 'validityTerm', width: 16 },
    { header: 'Start Date', key: 'startDate', width: 18 },
    { header: 'Expiry Date', key: 'expiryDate', width: 18 },
    { header: 'Vehicle Types', key: 'vehicleTypes', width: 22 },
    { header: 'Transaction ID', key: 'transactionId', width: 20 },
    { header: 'Payment Reference', key: 'paymentReference', width: 20 },
    { header: 'Created By', key: 'createdBy', width: 18 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];
  styleHeaderRow(membershipSheet);

  membershipPayments.forEach((p) => {
    const row = membershipSheet.addRow({
      membershipNumber: p.membershipNumber || '',
      customerName: p.customerName || '',
      customerPhone: p.customerPhone || '',
      membershipType: p.membershipType || '',
      amount: p.amount || 0,
      paymentMethod: p.paymentMethod || '',
      paymentBucket: membershipPaymentBucket(p.paymentMethod),
      status: p.status || '',
      validityTerm: p.validityTerm || 0,
      startDate: p.startDate ? new Date(p.startDate) : '',
      expiryDate: p.expiryDate ? new Date(p.expiryDate) : '',
      vehicleTypes: (p.vehicleTypes || []).map((v) => v.replace('-', ' ')).join(', '),
      transactionId: p.transactionId || '',
      paymentReference: p.paymentReference || '',
      createdBy: p.createdBy?.name || p.createdBy?.operatorId || '',
      createdAt: p.createdAt ? new Date(p.createdAt) : '',
      notes: p.notes || ''
    });
    row.getCell(5).numFmt = '₹#,##0.00';
    [10, 11, 16].forEach((colNum) => {
      const cell = row.getCell(colNum);
      if (cell.value) cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
    });
  });

  if (membershipPayments.length > 0) {
    membershipSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: membershipSheet.columns.length }
    };
  }

  // Sheet 9: Membership Payment Analysis (Cash vs Online — membership purchases only)
  const membershipAnalysisSheet = workbook.addWorksheet('Membership Payment Analysis');
  membershipAnalysisSheet.columns = [
    { header: 'Membership Payment Bucket', key: 'bucket', width: 24 },
    { header: 'Purchase Count', key: 'count', width: 16 },
    { header: 'Percentage', key: 'percentage', width: 14 },
    { header: 'Total Membership Amount', key: 'amount', width: 24 }
  ];
  styleHeaderRow(membershipAnalysisSheet);

  const totalMembershipCount = membershipPayments.length;
  const buckets = { Cash: { count: 0, amount: 0 }, Online: { count: 0, amount: 0 } };
  const methods = {};

  membershipPayments.forEach((p) => {
    const bucket = membershipPaymentBucket(p.paymentMethod);
    buckets[bucket].count += 1;
    buckets[bucket].amount += p.amount || 0;

    const method = p.paymentMethod || 'unknown';
    if (!methods[method]) methods[method] = { count: 0, amount: 0 };
    methods[method].count += 1;
    methods[method].amount += p.amount || 0;
  });

  ['Cash', 'Online'].forEach((bucket) => {
    const data = buckets[bucket];
    const row = membershipAnalysisSheet.addRow({
      bucket,
      count: data.count,
      percentage: totalMembershipCount
        ? ((data.count / totalMembershipCount) * 100).toFixed(2) + '%'
        : '0.00%',
      amount: data.amount
    });
    row.getCell(4).numFmt = '₹#,##0.00';
  });

  const totalRow = membershipAnalysisSheet.addRow({
    bucket: 'Total',
    count: totalMembershipCount,
    percentage: totalMembershipCount ? '100.00%' : '0.00%',
    amount: buckets.Cash.amount + buckets.Online.amount
  });
  totalRow.font = { bold: true };
  totalRow.getCell(4).numFmt = '₹#,##0.00';

  // Per-method breakdown beneath the bucket totals
  membershipAnalysisSheet.addRow([]);
  const breakdownHeader = membershipAnalysisSheet.addRow(['Per-Method Breakdown (Membership Purchases)']);
  breakdownHeader.font = { bold: true, size: 12 };
  membershipAnalysisSheet.addRow(['Payment Method', 'Purchase Count', 'Percentage', 'Total Membership Amount']);
  const subHeaderRow = membershipAnalysisSheet.lastRow;
  subHeaderRow.font = HEADER_FONT;
  subHeaderRow.fill = HEADER_FILL;
  subHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

  Object.entries(methods).forEach(([method, data]) => {
    const row = membershipAnalysisSheet.addRow([
      method,
      data.count,
      totalMembershipCount
        ? ((data.count / totalMembershipCount) * 100).toFixed(2) + '%'
        : '0.00%',
      data.amount
    ]);
    row.getCell(4).numFmt = '₹#,##0.00';
  });

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
