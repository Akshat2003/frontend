import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { computeReportStats } from './excelExport';

// Color palette — matches the Excel Summary sheet so the two reports
// feel like a set.
const C = {
  titleBg: [26, 54, 93], // dark navy
  bandBg: [45, 91, 140], // medium blue
  subBandBg: [227, 235, 245], // pale blue
  text: [33, 37, 41],
  noteText: [107, 114, 128],
  currencyText: [27, 110, 63], // dark green
  totalBg: [254, 245, 220], // light cream
  totalText: [146, 64, 14],
  border: [209, 213, 219]
};

const inrFormat = (n) =>
  '₹ ' +
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const intFormat = (n) => Number(n || 0).toLocaleString('en-IN');

export const exportBookingsToPDF = (
  bookings,
  siteName,
  siteId,
  filters = {},
  memberships = []
) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setProperties({
    title: `Parking Analytics Report — ${siteName}`,
    subject: 'Parking Analytics',
    author: 'Spark Machineries Operator',
    creator: 'Spark Machineries Operator'
  });

  const stats = computeReportStats(bookings, memberships);

  // ---------- Title bar ----------
  doc.setFillColor(...C.titleBg);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Parking Analytics Report', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const subtitleParts = [siteName || 'All Sites'];
  if (siteId) subtitleParts.push(siteId);
  doc.text(subtitleParts.join('  ·  '), margin, 22);

  // ---------- Subtitle ----------
  doc.setTextColor(...C.noteText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const periodLabel = filters.dateRange
    ? `${filters.dateRange.startDate} to ${filters.dateRange.endDate}`
    : 'All Time';
  doc.text(
    `Period: ${periodLabel}    ·    Generated ${new Date().toLocaleString()}`,
    margin,
    36
  );

  // Filter chips line (if any)
  let yCursor = 42;
  const filterChips = [];
  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    filterChips.push(`Payment: ${filters.paymentMethod}`);
  }
  if (filters.searchTerm) filterChips.push(`Search: "${filters.searchTerm}"`);
  if (filters.operatorId) filterChips.push(`Operator: ${filters.operatorId}`);
  if (filterChips.length) {
    doc.text(`Filters · ${filterChips.join('  ·  ')}`, margin, yCursor);
    yCursor += 6;
  }
  yCursor += 2;

  // ---------- Section helpers ----------
  const drawSectionBand = (title) => {
    if (yCursor + 12 > pageHeight - 16) {
      doc.addPage();
      yCursor = margin;
    }
    doc.setFillColor(...C.bandBg);
    doc.rect(margin, yCursor, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin + 3, yCursor + 5.7);
    yCursor += 8;
  };

  // Render a metrics block as an autoTable for clean alignment
  const renderMetricsTable = (rows, opts = {}) => {
    const { highlightFirst = false } = opts;
    autoTable(doc, {
      startY: yCursor,
      margin: { left: margin, right: margin },
      head: [],
      body: rows.map((r) => [r.label, r.value, r.note || '']),
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2.4, right: 3, bottom: 2.4, left: 3 },
        textColor: C.text,
        lineColor: C.border,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'normal' },
        1: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
        2: {
          cellWidth: 'auto',
          fontStyle: 'italic',
          textColor: C.noteText,
          fontSize: 8
        }
      },
      didParseCell: (data) => {
        const row = rows[data.row.index];
        if (data.column.index === 1 && row?.isCurrency) {
          data.cell.styles.textColor = C.currencyText;
        }
        if (highlightFirst && data.row.index === 0) {
          data.cell.styles.fillColor = C.totalBg;
          data.cell.styles.textColor = C.totalText;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 1 && row?.isCurrency) {
            data.cell.styles.textColor = C.totalText;
          }
        }
      },
      didDrawPage: () => {
        // No-op; we handle page breaks via yCursor below
      }
    });
    yCursor = doc.lastAutoTable.finalY + 4;
  };

  // Optional sub-band before a sub-grouping
  const drawSubBand = (title) => {
    if (yCursor + 8 > pageHeight - 16) {
      doc.addPage();
      yCursor = margin;
    }
    doc.setFillColor(...C.subBandBg);
    doc.rect(margin, yCursor, pageWidth - margin * 2, 6, 'F');
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, margin + 3, yCursor + 4.2);
    yCursor += 6;
  };

  // ============ BOOKING COUNTS ============
  drawSectionBand('BOOKING COUNTS');
  renderMetricsTable(
    [
      { label: 'Total bookings', value: intFormat(stats.counts.total) },
      { label: 'Completed', value: intFormat(stats.counts.completed) },
      {
        label: 'Active',
        value: intFormat(stats.counts.active),
        note: 'Vehicle still parked — payment not yet collected'
      },
      { label: 'Cancelled', value: intFormat(stats.counts.cancelled) },
      { label: 'Deleted', value: intFormat(stats.counts.deleted) },
      {
        label: 'Paid via membership',
        value: intFormat(stats.counts.membershipPaid),
        note: 'Member parked free'
      }
    ],
    { highlightFirst: true }
  );

  // ============ HOURLY REVENUE COLLECTED ============
  drawSectionBand('HOURLY REVENUE COLLECTED  ·  Completed bookings only');
  renderMetricsTable(
    [
      {
        label: 'Total hourly revenue collected',
        value: inrFormat(stats.revenue.collected),
        isCurrency: true,
        note: 'Real money taken in from completed bookings'
      },
      {
        label: 'Average revenue per booking',
        value: inrFormat(stats.revenue.avgPerBooking),
        isCurrency: true
      }
    ],
    { highlightFirst: true }
  );

  drawSubBand('By payment method');
  renderMetricsTable([
    { label: 'Cash bookings', value: intFormat(stats.byMethod.cash.count) },
    {
      label: 'Cash revenue',
      value: inrFormat(stats.byMethod.cash.amount),
      isCurrency: true
    },
    {
      label: 'Online bookings',
      value: intFormat(stats.byMethod.online.count),
      note: 'UPI / card / online / other'
    },
    {
      label: 'Online revenue',
      value: inrFormat(stats.byMethod.online.amount),
      isCurrency: true
    }
  ]);

  drawSubBand('By vehicle type');
  renderMetricsTable([
    { label: 'Two-wheeler bookings', value: intFormat(stats.byVehicle.twoWheeler.count) },
    {
      label: 'Two-wheeler revenue',
      value: inrFormat(stats.byVehicle.twoWheeler.amount),
      isCurrency: true
    },
    { label: 'Four-wheeler bookings', value: intFormat(stats.byVehicle.fourWheeler.count) },
    {
      label: 'Four-wheeler revenue',
      value: inrFormat(stats.byVehicle.fourWheeler.amount),
      isCurrency: true
    }
  ]);

  // ============ CANCELLED & DELETED ============
  drawSectionBand('CANCELLED & DELETED REVENUE  ·  Reported separately');
  renderMetricsTable([
    {
      label: 'Cancelled booking revenue',
      value: inrFormat(stats.revenue.cancelled),
      isCurrency: true,
      note: 'NOT included in the collected total above'
    },
    {
      label: 'Deleted booking revenue',
      value: inrFormat(stats.revenue.deleted),
      isCurrency: true,
      note: 'NOT included in the collected total above'
    }
  ]);

  // ============ MEMBERSHIPS ============
  drawSectionBand('MEMBERSHIP PURCHASES  ·  Global (across all sites)');
  renderMetricsTable(
    [
      { label: 'Total purchases', value: intFormat(stats.memberships.total) },
      { label: 'Completed purchases', value: intFormat(stats.memberships.completed) },
      {
        label: 'Total membership revenue',
        value: inrFormat(stats.memberships.totalRevenue),
        isCurrency: true
      },
      {
        label: 'Membership revenue (completed only)',
        value: inrFormat(stats.memberships.completedRevenue),
        isCurrency: true
      }
    ],
    { highlightFirst: true }
  );

  drawSubBand('By payment method');
  renderMetricsTable([
    { label: 'Cash purchases', value: intFormat(stats.memberships.cash.count) },
    {
      label: 'Cash revenue',
      value: inrFormat(stats.memberships.cash.amount),
      isCurrency: true
    },
    {
      label: 'Online purchases',
      value: intFormat(stats.memberships.online.count),
      note: 'card / UPI / online / other'
    },
    {
      label: 'Online revenue',
      value: inrFormat(stats.memberships.online.amount),
      isCurrency: true
    }
  ]);

  // ============ COMBINED REVENUE ============
  drawSectionBand('COMBINED REVENUE  ·  Completed bookings + Membership purchases');
  renderMetricsTable(
    [
      {
        label: 'Combined total revenue',
        value: inrFormat(stats.combined.totalRevenue),
        isCurrency: true
      },
      {
        label: 'Combined revenue (completed only)',
        value: inrFormat(stats.combined.completedRevenue),
        isCurrency: true,
        note: 'Real money collected — does not include foregone discounts'
      }
    ],
    { highlightFirst: true }
  );

  // ---------- Footer (every page) ----------
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.noteText);
    doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 7);
    doc.text('Spark Machineries Operator', pageWidth - margin, pageHeight - 7, {
      align: 'right'
    });
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const safeSite = (siteId || siteName || 'site').replace(/\s+/g, '_');
  const dateRangeStr = filters.dateRange
    ? `_${filters.dateRange.startDate}_to_${filters.dateRange.endDate}`
    : '';
  doc.save(`Analytics_Report_${safeSite}${dateRangeStr}_${timestamp}.pdf`);
};
