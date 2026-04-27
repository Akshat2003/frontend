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

export const exportBookingsToExcel = async (bookings, siteName, siteId, filters = {}) => {
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
    { header: 'Payment Amount', key: 'paymentAmount', width: 15 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Base Rate', key: 'baseRate', width: 12 },
    { header: 'Additional Charges', key: 'additionalCharges', width: 18 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'Tax', key: 'tax', width: 10 },
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
      paymentAmount: booking.payment?.amount ?? booking.totalAmount ?? 0,
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

    [9, 10, 21, 22].forEach((colNum) => {
      const cell = row.getCell(colNum);
      if (cell.value) cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
    });

    [14, 17, 18, 19, 20].forEach((colNum) => {
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
  const cancelledBookings = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'deleted'
  ).length;

  const amountOf = (b) => b.payment?.amount ?? b.totalAmount ?? 0;
  const totalRevenue = bookings.reduce((sum, b) => sum + amountOf(b), 0);
  const completedRevenue = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + amountOf(b), 0);

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

  summarySheet.addRow(['BOOKING STATISTICS']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Bookings', totalBookings]);
  summarySheet.addRow(['Completed Bookings', completedBookings]);
  summarySheet.addRow(['Active Bookings', activeBookings]);
  summarySheet.addRow(['Cancelled/Deleted Bookings', cancelledBookings]);
  summarySheet.addRow([]);

  summarySheet.addRow(['REVENUE STATISTICS']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Revenue', totalRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow(['Revenue from Completed Bookings', completedRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow(['Average Revenue per Booking', avgRevenue]).getCell(2).numFmt = '₹#,##0.00';
  summarySheet.addRow([]);

  summarySheet.addRow(['DURATION STATISTICS']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Average Duration (Hours)', Number(avgDuration.toFixed(2))]);

  // Sheet 3: Status Breakdown
  const statusSheet = workbook.addWorksheet('Status Breakdown');
  statusSheet.columns = [
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Count', key: 'count', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Total Revenue', key: 'revenue', width: 20 }
  ];
  styleHeaderRow(statusSheet);

  const statusCounts = {};
  bookings.forEach((b) => {
    const s = b.status || 'unknown';
    if (!statusCounts[s]) statusCounts[s] = { count: 0, revenue: 0 };
    statusCounts[s].count += 1;
    statusCounts[s].revenue += amountOf(b);
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

  // Sheet 4: Vehicle Type Analysis
  const vehicleSheet = workbook.addWorksheet('Vehicle Type Analysis');
  vehicleSheet.columns = [
    { header: 'Vehicle Type', key: 'vehicleType', width: 20 },
    { header: 'Count', key: 'count', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Total Revenue', key: 'revenue', width: 20 },
    { header: 'Avg Duration (Hrs)', key: 'avgDuration', width: 20 }
  ];
  styleHeaderRow(vehicleSheet);

  const vehicleCounts = {};
  bookings.forEach((b) => {
    const t = b.vehicleType || 'unknown';
    if (!vehicleCounts[t]) vehicleCounts[t] = { count: 0, revenue: 0, totalDuration: 0 };
    vehicleCounts[t].count += 1;
    vehicleCounts[t].revenue += amountOf(b);
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

  // Sheet 5: Machine Usage Analysis
  const machineSheet = workbook.addWorksheet('Machine Usage Analysis');
  machineSheet.columns = [
    { header: 'Machine Number', key: 'machineNumber', width: 20 },
    { header: 'Usage Count', key: 'count', width: 15 },
    { header: 'Total Revenue', key: 'revenue', width: 20 },
    { header: 'Total Hours Used', key: 'totalHours', width: 20 }
  ];
  styleHeaderRow(machineSheet);

  const machineCounts = {};
  bookings.forEach((b) => {
    const m = b.machineNumber || 'unknown';
    if (!machineCounts[m]) machineCounts[m] = { count: 0, revenue: 0, totalHours: 0 };
    machineCounts[m].count += 1;
    machineCounts[m].revenue += amountOf(b);
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

  // Sheet 6: Payment Method Analysis
  const paymentSheet = workbook.addWorksheet('Payment Method Analysis');
  paymentSheet.columns = [
    { header: 'Payment Method', key: 'method', width: 20 },
    { header: 'Count', key: 'count', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Total Amount', key: 'amount', width: 20 }
  ];
  styleHeaderRow(paymentSheet);

  const paymentMethods = {};
  bookings.forEach((b) => {
    const m = b.payment?.method || b.paymentMethod || 'unknown';
    if (!paymentMethods[m]) paymentMethods[m] = { count: 0, amount: 0 };
    paymentMethods[m].count += 1;
    paymentMethods[m].amount += amountOf(b);
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

  // Sheet 7: Monthly Trend
  const monthlySheet = workbook.addWorksheet('Monthly Trend');
  monthlySheet.columns = [
    { header: 'Month', key: 'month', width: 20 },
    { header: 'Bookings', key: 'count', width: 15 },
    { header: 'Revenue', key: 'revenue', width: 20 },
    { header: 'Avg Revenue', key: 'avgRevenue', width: 20 }
  ];
  styleHeaderRow(monthlySheet);

  const monthlyData = {};
  bookings.forEach((b) => {
    if (!b.createdAt) return;
    const date = new Date(b.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { count: 0, revenue: 0 };
    monthlyData[monthKey].count += 1;
    monthlyData[monthKey].revenue += amountOf(b);
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
