import ExcelJS from 'exceljs';

const COLOR = {
  titleBg: 'FF1A365D',
  titleText: 'FFFFFFFF',
  bandBg: 'FF2D5B8C',
  bandText: 'FFFFFFFF',
  subBandBg: 'FFE3EBF5',
  totalBg: 'FFFEF5DC',
  metricText: 'FF111827',
  currencyText: 'FF1B6E3F',
  noteText: 'FF6B7280',
  border: 'FFD1D5DB'
};

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.bandBg } };
const HEADER_FONT = { bold: true, color: { argb: COLOR.bandText } };
const SUBHEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.subBandBg } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.totalBg } };
const thinBorder = {
  top: { style: 'thin', color: { argb: COLOR.border } },
  left: { style: 'thin', color: { argb: COLOR.border } },
  bottom: { style: 'thin', color: { argb: COLOR.border } },
  right: { style: 'thin', color: { argb: COLOR.border } }
};
const CURRENCY_FMT = '₹#,##0.00';

const isMembershipPaid = (b) =>
  (b.payment?.method || b.paymentMethod || '').toLowerCase() === 'membership';
const grossAmount = (b) => b.payment?.amount ?? b.totalAmount ?? 0;
const round2 = (n) => Math.round((n || 0) * 100) / 100;

const bookingMethodBucket = (b) => {
  const m = (b.payment?.method || b.paymentMethod || '').toLowerCase();
  if (m === 'cash') return 'cash';
  if (m === 'upi') return 'upi';
  if (m === 'membership') return 'membership';
  return 'other';
};

const classifyVehicle = (v) => {
  const t = (v || '').toLowerCase();
  if (t === 'two-wheeler') return 'two-wheeler';
  if (t === 'four-wheeler') return 'four-wheeler';
  return null;
};

const membershipBucket = (m) =>
  (m.paymentMethod || '').toLowerCase() === 'cash' ? 'cash' : 'online';

const monthKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
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

const styleHeaderRow = (sheet, rowNumber) => {
  const row = sheet.getRow(rowNumber);
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 22;
};

// Aggregate bookings by month → vehicle → method → { count, revenue }.
// Revenue here is "collected" (completed + non-membership-paid only).
function buildBookingsAggregate(bookings) {
  const agg = {};
  let excluded = 0;
  bookings.forEach((b) => {
    if (!b.startTime) return;
    const vehicle = classifyVehicle(b.vehicleType);
    if (!vehicle) {
      excluded += 1;
      return;
    }
    const month = monthKey(b.startTime);
    const method = bookingMethodBucket(b);
    agg[month] ||= {};
    agg[month][vehicle] ||= {};
    agg[month][vehicle][method] ||= { count: 0, revenue: 0 };
    agg[month][vehicle][method].count += 1;
    if (b.status === 'completed' && !isMembershipPaid(b)) {
      agg[month][vehicle][method].revenue += grossAmount(b);
    }
  });
  return { agg, excluded };
}

function buildMembershipAggregate(memberships) {
  const agg = {};
  memberships.forEach((m) => {
    if (!m.createdAt) return;
    const key = monthKey(m.createdAt);
    const bucket = membershipBucket(m);
    agg[key] ||= { cash: { count: 0, revenue: 0 }, online: { count: 0, revenue: 0 } };
    agg[key][bucket].count += 1;
    agg[key][bucket].revenue += m.amount || 0;
  });
  return agg;
}

function buildSiteSheet(workbook, siteName, siteId, bookings, periodLabel) {
  const tabName = (siteName || 'Site').slice(0, 28).replace(/[\\/?*[\]:]/g, ' ');
  const sheet = workbook.addWorksheet(tabName);

  sheet.getColumn(1).width = 14;
  for (let i = 2; i <= 12; i++) sheet.getColumn(i).width = 13;

  // Title bar
  sheet.mergeCells('A1:L2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = {
    richText: [
      {
        text: 'Monthly Analytics\n',
        font: { bold: true, size: 18, color: { argb: COLOR.titleText }, name: 'Calibri' }
      },
      {
        text: `${siteName || 'All Sites'}${siteId ? `  ·  ${siteId}` : ''}`,
        font: { size: 11, color: { argb: COLOR.titleText }, name: 'Calibri' }
      }
    ]
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.titleBg } };
  sheet.getRow(1).height = 26;
  sheet.getRow(2).height = 20;

  // Subtitle
  sheet.mergeCells('A3:L3');
  const subtitleCell = sheet.getCell('A3');
  subtitleCell.value = `Period: ${periodLabel}    ·    Generated ${new Date().toLocaleString()}`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: COLOR.noteText } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(3).height = 18;

  sheet.addRow([]);

  const { agg, excluded } = buildBookingsAggregate(bookings);
  if (excluded > 0) {
    sheet.addRow([
      `Note: ${excluded} bookings skipped (vehicle type not two-wheeler or four-wheeler)`
    ]).getCell(1).font = { italic: true, size: 9, color: { argb: COLOR.noteText } };
    sheet.addRow([]);
  }

  const months = Object.keys(agg).sort();

  // ============ TABLE 1: Booking Counts ============
  const t1Title = sheet.addRow(['BOOKING COUNTS BY MONTH']);
  sheet.mergeCells(t1Title.number, 1, t1Title.number, 12);
  t1Title.font = { bold: true, size: 12, color: { argb: COLOR.bandText } };
  t1Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  t1Title.fill = HEADER_FILL;
  t1Title.height = 22;

  const t1H1 = sheet.addRow([
    'Month',
    'TWO-WHEELER', '', '', '', '',
    'FOUR-WHEELER', '', '', '', '',
    'GRAND TOTAL'
  ]);
  const t1H2 = sheet.addRow([
    '',
    'Cash', 'UPI', 'Membership', 'Other', 'Total',
    'Cash', 'UPI', 'Membership', 'Other', 'Total',
    ''
  ]);
  sheet.mergeCells(t1H1.number, 1, t1H2.number, 1);
  sheet.mergeCells(t1H1.number, 2, t1H1.number, 6);
  sheet.mergeCells(t1H1.number, 7, t1H1.number, 11);
  sheet.mergeCells(t1H1.number, 12, t1H2.number, 12);
  styleHeaderRow(sheet, t1H1.number);
  styleHeaderRow(sheet, t1H2.number);

  const totals = {
    tw: { cash: 0, upi: 0, membership: 0, other: 0 },
    fw: { cash: 0, upi: 0, membership: 0, other: 0 }
  };
  months.forEach((m) => {
    const tw = agg[m]?.['two-wheeler'] || {};
    const fw = agg[m]?.['four-wheeler'] || {};
    const c = (g, k) => g[k]?.count || 0;
    const twTotal = c(tw, 'cash') + c(tw, 'upi') + c(tw, 'membership') + c(tw, 'other');
    const fwTotal = c(fw, 'cash') + c(fw, 'upi') + c(fw, 'membership') + c(fw, 'other');
    const row = sheet.addRow([
      monthLabel(m),
      c(tw, 'cash'), c(tw, 'upi'), c(tw, 'membership'), c(tw, 'other'), twTotal,
      c(fw, 'cash'), c(fw, 'upi'), c(fw, 'membership'), c(fw, 'other'), fwTotal,
      twTotal + fwTotal
    ]);
    for (let col = 1; col <= 12; col++) row.getCell(col).border = thinBorder;
    ['cash', 'upi', 'membership', 'other'].forEach((k) => {
      totals.tw[k] += c(tw, k);
      totals.fw[k] += c(fw, k);
    });
  });
  if (months.length > 0) {
    const tw = totals.tw;
    const fw = totals.fw;
    const twT = tw.cash + tw.upi + tw.membership + tw.other;
    const fwT = fw.cash + fw.upi + fw.membership + fw.other;
    const tr = sheet.addRow([
      'TOTAL',
      tw.cash, tw.upi, tw.membership, tw.other, twT,
      fw.cash, fw.upi, fw.membership, fw.other, fwT,
      twT + fwT
    ]);
    tr.font = { bold: true };
    tr.fill = TOTAL_FILL;
    for (let col = 1; col <= 12; col++) tr.getCell(col).border = thinBorder;
  }

  sheet.addRow([]);
  sheet.addRow([]);

  // ============ TABLE 2: Hourly Revenue Collected ============
  const t2Title = sheet.addRow(['HOURLY REVENUE COLLECTED BY MONTH (₹)  ·  Completed bookings only']);
  sheet.mergeCells(t2Title.number, 1, t2Title.number, 10);
  t2Title.font = { bold: true, size: 12, color: { argb: COLOR.bandText } };
  t2Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  t2Title.fill = HEADER_FILL;
  t2Title.height = 22;

  const t2H1 = sheet.addRow([
    'Month',
    'TWO-WHEELER', '', '', '',
    'FOUR-WHEELER', '', '', '',
    'GRAND TOTAL'
  ]);
  const t2H2 = sheet.addRow([
    '',
    'Cash', 'UPI', 'Other', 'Total',
    'Cash', 'UPI', 'Other', 'Total',
    ''
  ]);
  sheet.mergeCells(t2H1.number, 1, t2H2.number, 1);
  sheet.mergeCells(t2H1.number, 2, t2H1.number, 5);
  sheet.mergeCells(t2H1.number, 6, t2H1.number, 9);
  sheet.mergeCells(t2H1.number, 10, t2H2.number, 10);
  styleHeaderRow(sheet, t2H1.number);
  styleHeaderRow(sheet, t2H2.number);

  const rTotals = {
    tw: { cash: 0, upi: 0, other: 0 },
    fw: { cash: 0, upi: 0, other: 0 }
  };
  const currencyCols = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  months.forEach((m) => {
    const tw = agg[m]?.['two-wheeler'] || {};
    const fw = agg[m]?.['four-wheeler'] || {};
    const r = (g, k) => round2(g[k]?.revenue || 0);
    const twTotal = round2(r(tw, 'cash') + r(tw, 'upi') + r(tw, 'other'));
    const fwTotal = round2(r(fw, 'cash') + r(fw, 'upi') + r(fw, 'other'));
    const row = sheet.addRow([
      monthLabel(m),
      r(tw, 'cash'), r(tw, 'upi'), r(tw, 'other'), twTotal,
      r(fw, 'cash'), r(fw, 'upi'), r(fw, 'other'), fwTotal,
      round2(twTotal + fwTotal)
    ]);
    currencyCols.forEach((col) => {
      row.getCell(col).numFmt = CURRENCY_FMT;
      row.getCell(col).font = { color: { argb: COLOR.currencyText } };
    });
    for (let col = 1; col <= 10; col++) row.getCell(col).border = thinBorder;
    ['cash', 'upi', 'other'].forEach((k) => {
      rTotals.tw[k] += r(tw, k);
      rTotals.fw[k] += r(fw, k);
    });
  });
  if (months.length > 0) {
    const tw = rTotals.tw;
    const fw = rTotals.fw;
    const twT = round2(tw.cash + tw.upi + tw.other);
    const fwT = round2(fw.cash + fw.upi + fw.other);
    const tr = sheet.addRow([
      'TOTAL',
      round2(tw.cash), round2(tw.upi), round2(tw.other), twT,
      round2(fw.cash), round2(fw.upi), round2(fw.other), fwT,
      round2(twT + fwT)
    ]);
    tr.font = { bold: true };
    tr.fill = TOTAL_FILL;
    currencyCols.forEach((col) => (tr.getCell(col).numFmt = CURRENCY_FMT));
    for (let col = 1; col <= 10; col++) tr.getCell(col).border = thinBorder;
  }
}

function buildMembershipsSheet(workbook, memberships, periodLabel) {
  const sheet = workbook.addWorksheet('Memberships');
  sheet.getColumn(1).width = 16;
  for (let i = 2; i <= 7; i++) sheet.getColumn(i).width = 16;

  // Title bar
  sheet.mergeCells('A1:G2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = {
    richText: [
      {
        text: 'Memberships — Monthly Analytics\n',
        font: { bold: true, size: 18, color: { argb: COLOR.titleText }, name: 'Calibri' }
      },
      {
        text: 'Global · across all sites',
        font: { size: 11, color: { argb: COLOR.titleText }, name: 'Calibri' }
      }
    ]
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.titleBg } };
  sheet.getRow(1).height = 26;
  sheet.getRow(2).height = 20;

  sheet.mergeCells('A3:G3');
  const subtitleCell = sheet.getCell('A3');
  subtitleCell.value = `Period: ${periodLabel}    ·    Generated ${new Date().toLocaleString()}`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: COLOR.noteText } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(3).height = 18;

  sheet.addRow([]);

  const agg = buildMembershipAggregate(memberships);
  const months = Object.keys(agg).sort();

  const t1Title = sheet.addRow(['MEMBERSHIP PURCHASES BY MONTH']);
  sheet.mergeCells(t1Title.number, 1, t1Title.number, 7);
  t1Title.font = { bold: true, size: 12, color: { argb: COLOR.bandText } };
  t1Title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  t1Title.fill = HEADER_FILL;
  t1Title.height = 22;

  const h1 = sheet.addRow(['Month', 'CASH', '', 'ONLINE', '', 'TOTAL', '']);
  const h2 = sheet.addRow(['', 'Count', 'Revenue', 'Count', 'Revenue', 'Count', 'Revenue']);
  sheet.mergeCells(h1.number, 1, h2.number, 1);
  sheet.mergeCells(h1.number, 2, h1.number, 3);
  sheet.mergeCells(h1.number, 4, h1.number, 5);
  sheet.mergeCells(h1.number, 6, h1.number, 7);
  styleHeaderRow(sheet, h1.number);
  styleHeaderRow(sheet, h2.number);

  const totals = { cash: { count: 0, revenue: 0 }, online: { count: 0, revenue: 0 } };
  months.forEach((m) => {
    const cash = agg[m].cash;
    const online = agg[m].online;
    const totalCount = cash.count + online.count;
    const totalRevenue = round2(cash.revenue + online.revenue);
    const row = sheet.addRow([
      monthLabel(m),
      cash.count, round2(cash.revenue),
      online.count, round2(online.revenue),
      totalCount, totalRevenue
    ]);
    [3, 5, 7].forEach((col) => {
      row.getCell(col).numFmt = CURRENCY_FMT;
      row.getCell(col).font = { color: { argb: COLOR.currencyText } };
    });
    for (let col = 1; col <= 7; col++) row.getCell(col).border = thinBorder;
    totals.cash.count += cash.count;
    totals.cash.revenue += cash.revenue;
    totals.online.count += online.count;
    totals.online.revenue += online.revenue;
  });
  if (months.length > 0) {
    const tr = sheet.addRow([
      'TOTAL',
      totals.cash.count, round2(totals.cash.revenue),
      totals.online.count, round2(totals.online.revenue),
      totals.cash.count + totals.online.count,
      round2(totals.cash.revenue + totals.online.revenue)
    ]);
    tr.font = { bold: true };
    tr.fill = TOTAL_FILL;
    [3, 5, 7].forEach((col) => (tr.getCell(col).numFmt = CURRENCY_FMT));
    for (let col = 1; col <= 7; col++) tr.getCell(col).border = thinBorder;
  }
}

export const exportMonthlyAnalytics = async ({
  bookings,
  memberships,
  siteName,
  siteId,
  dateRange
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Spark Machineries Operator';
  workbook.created = new Date();

  const periodLabel = dateRange
    ? `${dateRange.startDate} to ${dateRange.endDate}`
    : 'All Time';

  buildSiteSheet(workbook, siteName, siteId, bookings, periodLabel);
  buildMembershipsSheet(workbook, memberships, periodLabel);

  const safeSite = (siteName || 'Site').replace(/\s+/g, '_');
  const dateStamp = dateRange ? `_${dateRange.startDate}_to_${dateRange.endDate}` : '';
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Monthly_Analytics_${safeSite}_${siteId || 'site'}${dateStamp}_${timestamp}.xlsx`;

  await triggerDownload(workbook, filename);
  return true;
};
