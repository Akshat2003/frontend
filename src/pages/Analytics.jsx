import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  DollarSign,
  BarChart3,
  Activity,
  AlertCircle,
  RefreshCw,
  Eye,
  Search,
  CheckCircle,
  Download,
  Shield,
  CreditCard,
  Trash2,
  X,
  User,
  Phone,
  Clock,
  Tag,
  Copy,
  CheckCheck
} from 'lucide-react';
import BookingInfoModal from '../components/Booking/BookingInfoModal';
import Button from '../components/Common/Button';
import { formatCurrency } from '../utils/calculations';
import { exportBookingsToPDF } from '../utils/pdfExport';
import { exportBookingsToExcel } from '../utils/excelExport';
import { exportMonthlyAnalytics } from '../utils/monthlyExport';
import apiService from '../services/api';
import { useSite } from '../contexts/SiteContext';
import { useCustomers } from '../hooks/useCustomers';

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0]     // Today
  });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    cancelledRevenue: 0,
    deletedBookings: 0,
    deletedRevenue: 0,
    membershipSales: 0,
    membershipRevenue: 0
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingsTablePagination, setBookingsTablePagination] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [excelExportLoading, setExcelExportLoading] = useState(false);
  const [monthlyExportLoading, setMonthlyExportLoading] = useState(false);
  // null when no export is running; otherwise { kind, pct, label } where
  // kind ∈ 'PDF' | 'Excel' | 'Monthly Analytics'
  const [exportProgress, setExportProgress] = useState(null);
  const [showDeletedBookings, setShowDeletedBookings] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [membershipPayments, setMembershipPayments] = useState([]);
  const [membershipPaymentsLoading, setMembershipPaymentsLoading] = useState(false);
  const [copiedPaymentId, setCopiedPaymentId] = useState(null);

  const { currentSite } = useSite();
  const { customers, getCustomers } = useCustomers();
  // Bumped on every fetchAnalyticsData call. Stale invocations check this
  // before touching state so a slower in-flight fetch can't overwrite the
  // result of a newer one (e.g. when SiteContext upgrades currentSite from
  // a partial object to the full site object during initial load).
  const fetchIdRef = useRef(0);
  
  // Get current user for operator-specific filtering
  const getCurrentUser = () => {
    try {
      const userData = localStorage.getItem('parkingOperator');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const currentUser = getCurrentUser();

  // Refetch summary + table whenever any of the inputs change. Each call
  // is cheap: a single Mongo aggregation for the summary and one capped
  // getBookings request for the table. The deleted toggle is pushed to
  // the server now, so flipping it must trigger a refetch (the table
  // shows EITHER non-deleted bookings OR deleted-only depending on the
  // toggle, never a mix).
  useEffect(() => {
    if (currentSite?._id || currentSite?.siteId) {
      fetchAnalyticsData();
    }
  }, [dateRange, currentSite, paymentMethodFilter, showDeletedBookings]);

  // Fetch customers data for membership analytics
  useEffect(() => {
    getCustomers({ 
      limit: 1000, // Get all customers
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }, []);

  const calculateMembershipAnalytics = async () => {
    // Get active membership count from customers
    let count = 0;
    if (customers && customers.length > 0) {
      const activeMembers = customers.filter(customer => 
        customer.hasMembership && 
        customer.membership && 
        customer.membership.isActive &&
        customer.membership.expiryDate &&
        new Date(customer.membership.expiryDate) > new Date()
      );
      count = activeMembers.length;
    }

    // Get actual revenue from MembershipPayment collection.
    // Membership data is intentionally global (never site-scoped) per
    // product decision — same memberships count on every site.
    let revenue = 0;
    try {
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();

      const revenueResponse = await apiService.getMembershipRevenue(startDateTime, endDateTime);
      if (revenueResponse.success) {
        revenue = revenueResponse.data.totalRevenue || 0;
      }
    } catch (error) {
      console.error('Failed to fetch membership revenue:', error);
      // Fallback to estimated revenue if API fails
      if (customers && customers.length > 0) {
        const activeMembers = customers.filter(customer => 
          customer.hasMembership && 
          customer.membership && 
          customer.membership.isActive &&
          customer.membership.expiryDate &&
          new Date(customer.membership.expiryDate) > new Date()
        );
        revenue = activeMembers.reduce((total, member) => {
          const membershipType = member.membership?.membershipType || 'monthly';
          const amounts = {
            monthly: 500,
            quarterly: 1200,
            yearly: 4000,
            premium: 6000
          };
          return total + (amounts[membershipType] || 500);
        }, 0);
      }
    }

    return { count, revenue };
  };

  // Bookings table uses server-side pagination so the user can scroll
  // through every booking. 100 rows per page keeps the DOM light.
  const TABLE_PAGE_SIZE = 100;

  // Fetch one page of bookings for the on-screen table. Used both by
  // fetchAnalyticsData (initial / filter change) and the Prev/Next
  // pagination buttons. Sets tableLoading so the table can show its
  // own spinner without dimming the cards above.
  const fetchBookingsTablePage = async (page) => {
    if (!currentSite?._id && !currentSite?.siteId) return;
    setTableLoading(true);
    try {
      const siteId = currentSite?._id || currentSite?.siteId;
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();
      // Push the "Show Deleted" toggle to the server so pagination
      // counts/pages match the dataset the user expects to see.
      const statusFilter = showDeletedBookings
        ? { status: 'deleted' }
        : { statusNot: 'deleted' };
      const resp = await apiService.getBookings({
        siteId,
        dateFrom: startDateTime,
        dateTo: endDateTime,
        page,
        limit: TABLE_PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...statusFilter
      });
      const fetched = resp.data?.bookings || [];
      const isOperator = currentUser && currentUser.role !== 'admin';
      const scoped = isOperator
        ? fetched.filter((b) => b.operatorId === currentUser.operatorId)
        : fetched;
      setBookings(scoped);
      setBookingsTablePagination(resp.data?.pagination || null);
    } catch (err) {
      console.error('Failed to fetch bookings page:', err);
    } finally {
      setTableLoading(false);
    }
  };

  const handleTablePageChange = (newPage) => {
    setTablePage(newPage);
    fetchBookingsTablePage(newPage);
  };

  const fetchAnalyticsData = async () => {
    const fetchId = ++fetchIdRef.current;
    const isCurrent = () => fetchId === fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const siteId = currentSite?._id || currentSite?.siteId;
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();

      // Three cheap calls in parallel:
      //   1. Aggregate summary endpoint — fixed-size response, drives cards.
      //   2. Page 1 of the bookings table (server-paginated).
      //   3. Membership analytics for the membership cards.
      const [summaryResp, bookingsResp, membershipAnalytics] = await Promise.all([
        apiService.getBookingSummary({
          siteId,
          dateFrom: startDateTime,
          dateTo: endDateTime,
          paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined
        }),
        apiService.getBookings({
          siteId,
          dateFrom: startDateTime,
          dateTo: endDateTime,
          page: 1,
          limit: TABLE_PAGE_SIZE,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          ...(showDeletedBookings ? { status: 'deleted' } : { statusNot: 'deleted' })
        }),
        calculateMembershipAnalytics()
      ]);

      if (!isCurrent()) return;

      const fetchedBookings = bookingsResp?.data?.bookings || [];
      let operatorFilteredBookings = fetchedBookings;
      if (currentUser && currentUser.role !== 'admin') {
        operatorFilteredBookings = fetchedBookings.filter((booking) =>
          booking.operatorId === currentUser.operatorId
        );
      }
      setBookings(operatorFilteredBookings);
      setBookingsTablePagination(bookingsResp?.data?.pagination || null);
      setTablePage(1);

      const summary = summaryResp?.data || {};
      setAnalytics({
        totalBookings: summary.totalBookings || 0,
        totalRevenue: summary.collectedRevenue || 0,
        activeBookings: summary.activeBookings || 0,
        completedBookings: summary.completedBookings || 0,
        cancelledBookings: summary.cancelledBookings || 0,
        cancelledRevenue: summary.cancelledRevenue || 0,
        deletedBookings: summary.deletedBookings || 0,
        deletedRevenue: summary.deletedRevenue || 0,
        membershipSales: membershipAnalytics.count,
        membershipRevenue: membershipAnalytics.revenue
      });
    } catch (error) {
      if (isCurrent()) {
        console.error('Failed to fetch analytics:', error);
        setError(error.message || 'Failed to load analytics data');
      }
    } finally {
      // Only the most recent fetch is allowed to clear loading state. A
      // stale fetch finishing here would otherwise hide the spinner while
      // the active fetch is still running.
      if (isCurrent()) {
        setLoading(false);
      }
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // List of months from Sept 2025 → current month (most-recent first).
  // Picking one sets the date range to that whole month.
  const monthOptions = (() => {
    const opts = [];
    const start = new Date(2025, 8, 1); // September 2025
    const now = new Date();
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= now) {
      const value = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      const label = cur.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ value, label });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return opts.reverse();
  })();

  // Derive which month option (if any) is currently selected based on dateRange
  const selectedMonth = (() => {
    if (!dateRange.startDate || !dateRange.endDate) return '';
    const s = new Date(dateRange.startDate);
    const e = new Date(dateRange.endDate);
    const firstOfMonth = new Date(s.getFullYear(), s.getMonth(), 1);
    const lastOfMonth = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    if (
      s.getDate() === firstOfMonth.getDate() &&
      s.getMonth() === firstOfMonth.getMonth() &&
      s.getFullYear() === firstOfMonth.getFullYear() &&
      e.getDate() === lastOfMonth.getDate() &&
      e.getMonth() === lastOfMonth.getMonth() &&
      e.getFullYear() === lastOfMonth.getFullYear()
    ) {
      return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`;
    }
    return '';
  })();

  const handleMonthChange = (e) => {
    const v = e.target.value;
    if (!v) return;
    const [year, month] = v.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of selected month
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDateRange({ startDate: fmt(start), endDate: fmt(end) });
  };

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedBooking(null);
  };

  const handleMembershipRevenueClick = async () => {
    setShowMembershipModal(true);
    setMembershipPaymentsLoading(true);
    try {
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();
      // Memberships are global, never site-scoped.
      const response = await apiService.getMembershipPayments({
        startDate: startDateTime,
        endDate: endDateTime,
        limit: 100
      });
      setMembershipPayments(response.data?.payments || []);
    } catch (err) {
      console.error('Failed to fetch membership payments:', err);
      setMembershipPayments([]);
    } finally {
      setMembershipPaymentsLoading(false);
    }
  };

  const formatPaymentForWhatsApp = (payment) => {
    const lines = [
      `*Membership Payment*`,
      ``,
      `*Membership #:* ${payment.membershipNumber}`,
      `*Type:* ${payment.membershipType}`,
      `*Status:* ${payment.status}`,
      `*Amount:* ${formatCurrency(payment.amount)}`,
      ``,
      `*Customer:* ${payment.customerName}`,
      `*Phone:* ${payment.customerPhone}`,
      `*Vehicle:* ${payment.vehicleTypes?.map(v => v.replace('-', ' ')).join(', ') || 'N/A'}`,
      ``,
      `*Payment Method:* ${payment.paymentMethod}`,
      `*Validity:* ${payment.validityTerm} month${payment.validityTerm > 1 ? 's' : ''}`,
      `*Start:* ${new Date(payment.startDate).toLocaleDateString()}`,
      `*Expiry:* ${new Date(payment.expiryDate).toLocaleDateString()}`,
      ``,
      `*Created By:* ${payment.createdBy?.name || payment.createdBy?.operatorId || 'N/A'}`,
      `*Created At:* ${new Date(payment.createdAt).toLocaleString()}`,
    ];
    if (payment.transactionId) lines.push(`*Txn ID:* ${payment.transactionId}`);
    if (payment.paymentReference) lines.push(`*Ref:* ${payment.paymentReference}`);
    if (payment.notes) lines.push(`*Notes:* ${payment.notes}`);
    return lines.join('\n');
  };

  const copyPaymentToClipboard = async (payment) => {
    const text = formatPaymentForWhatsApp(payment);
    await navigator.clipboard.writeText(text);
    setCopiedPaymentId(payment._id);
    setTimeout(() => setCopiedPaymentId(null), 2000);
  };

  const copyAllPaymentsToClipboard = async () => {
    const header = [
      `*Membership Revenue Report*`,
      `*Site:* ${currentSite?.siteName || 'N/A'}`,
      `*Period:* ${dateRange.startDate} to ${dateRange.endDate}`,
      `*Total Revenue:* ${formatCurrency(analytics.membershipRevenue)}`,
      `*Total Payments:* ${membershipPayments.length}`,
      ``,
      `${'—'.repeat(20)}`,
    ].join('\n');

    const entries = membershipPayments.map((p, i) =>
      `\n*${i + 1}.* ${p.customerName} | ${p.membershipNumber}\n` +
      `    Type: ${p.membershipType} | ${formatCurrency(p.amount)}\n` +
      `    Phone: ${p.customerPhone}\n` +
      `    Vehicle: ${(p.vehicleTypes?.map(v => v.replace('-', ' ')).join(', ')) || 'N/A'}\n` +
      `    Valid: ${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.expiryDate).toLocaleDateString()}\n` +
      `    Payment: ${p.paymentMethod} | Status: ${p.status}\n` +
      `    Created By: ${p.createdBy?.name || p.createdBy?.operatorId || 'N/A'}\n` +
      `    Date: ${new Date(p.createdAt).toLocaleString()}`
    ).join('\n');

    await navigator.clipboard.writeText(header + '\n' + entries);
    setCopiedPaymentId('all');
    setTimeout(() => setCopiedPaymentId(null), 2000);
  };

  const handleExport = async () => {
    if (!currentSite?._id && !currentSite?.siteId) {
      setError('No site selected for export');
      return;
    }

    setExportLoading(true);
    setError(null);
    const KIND = 'PDF';
    setProgress(KIND, phasePct.connecting, 'Preparing PDF…');

    try {
      const siteId = currentSite?._id || currentSite?.siteId;
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();

      const allBookings = await paginatedFetch(
        async (page, limit) => {
          const resp = await apiService.getBookings({
            siteId,
            dateFrom: startDateTime,
            dateTo: endDateTime,
            page,
            limit,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          });
          return {
            items: resp.data?.bookings || [],
            totalPages: resp.data?.pagination?.totalPages,
            totalItems: resp.data?.pagination?.totalItems
          };
        },
        {
          kind: KIND,
          label: 'Loading bookings',
          pctFrom: phasePct.bookingsStart,
          pctTo: phasePct.bookingsEnd
        }
      );

      // Don't filter on the deleted toggle — the PDF summary needs cancelled
      // and deleted rows to report their revenue separately.
      const isOperator = currentUser && currentUser.role !== 'admin';
      const term = searchTerm.toLowerCase();
      const exportBookings = allBookings.filter((booking) => {
        if (isOperator && booking.operatorId !== currentUser.operatorId) return false;
        const matchesSearch = !searchTerm || (
          booking.vehicleNumber?.toLowerCase().includes(term) ||
          booking.customerName?.toLowerCase().includes(term) ||
          booking.phoneNumber?.includes(searchTerm) ||
          booking.machineNumber?.toLowerCase().includes(term)
        );
        const matchesPaymentMethod = paymentMethodFilter === 'all' ||
          booking.payment?.method === paymentMethodFilter ||
          booking.paymentMethod === paymentMethodFilter;
        return matchesSearch && matchesPaymentMethod;
      });

      if (exportBookings.length === 0) {
        setError('No bookings match the current filters');
        return;
      }

      const membershipPaymentsForPdf = await paginatedFetch(
        async (page, limit) => {
          const resp = await apiService.getMembershipPayments({
            startDate: startDateTime,
            endDate: endDateTime,
            page,
            limit
          });
          return {
            items: resp.data?.payments || [],
            totalPages: resp.data?.pagination?.totalPages,
            totalItems: resp.data?.pagination?.totalItems
          };
        },
        {
          kind: KIND,
          label: 'Loading memberships',
          pctFrom: phasePct.membershipsStart,
          pctTo: phasePct.membershipsEnd
        }
      );

      setProgress(KIND, phasePct.generating, 'Generating PDF…');
      exportBookingsToPDF(
        exportBookings,
        currentSite?.siteName || 'Unknown Site',
        currentSite?.siteId || currentSite?._id || 'Unknown',
        {
          dateRange,
          paymentMethod: paymentMethodFilter,
          searchTerm: searchTerm || undefined,
          operatorId: isOperator ? currentUser.operatorId : undefined
        },
        membershipPaymentsForPdf
      );

    } catch (error) {
      console.error('Export failed:', error);
      setError(error.message || 'Failed to export data');
    } finally {
      setExportLoading(false);
      clearProgress();
    }
  };

  // Shared progress helpers for the three export handlers. Each export
  // moves through these phases:
  //   1. connecting   (start, before first response)        →   5%
  //   2. bookings     (paginating bookings)                 → 10..70%
  //   3. memberships  (paginating membership payments)      → 70..90%
  //   4. generating   (building the file in the browser)    → 90..99%
  //   5. done                                               → null
  const phasePct = {
    connecting: 5,
    bookingsStart: 10,
    bookingsEnd: 70,
    membershipsStart: 70,
    membershipsEnd: 90,
    generating: 95
  };
  const setProgress = (kind, pct, label) => setExportProgress({ kind, pct, label });
  const clearProgress = () => setExportProgress(null);

  // Paginates a fetcher; updates progress in a scaled range. fetcher(page)
  // must return { items, totalPages, totalItems }.
  const paginatedFetch = async (fetcher, { kind, label, pctFrom, pctTo, pageSize = 500 }) => {
    const all = [];
    let page = 1;
    let totalPages = 1;
    let totalItems = null;
    do {
      const { items, totalPages: tp, totalItems: ti } = await fetcher(page, pageSize);
      all.push(...items);
      totalPages = tp || 1;
      if (totalItems === null) totalItems = ti ?? all.length;
      const pct = totalItems > 0
        ? pctFrom + ((all.length / totalItems) * (pctTo - pctFrom))
        : pctTo;
      setProgress(
        kind,
        Math.min(pctTo, pct),
        totalItems > 0
          ? `${label}: ${all.length.toLocaleString()} of ${totalItems.toLocaleString()}`
          : label
      );
      page += 1;
      if (items.length === 0) break;
    } while (page <= totalPages);
    return all;
  };

  const handleMonthlyExport = async () => {
    if (!currentSite?._id && !currentSite?.siteId) {
      setError('No site selected for export');
      return;
    }

    setMonthlyExportLoading(true);
    setError(null);
    const KIND = 'Monthly Analytics';
    setProgress(KIND, phasePct.connecting, 'Preparing export…');

    try {
      const siteId = currentSite?._id || currentSite?.siteId;
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();

      const allBookings = await paginatedFetch(
        async (page, limit) => {
          const resp = await apiService.getBookings({
            siteId,
            dateFrom: startDateTime,
            dateTo: endDateTime,
            page,
            limit,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          });
          return {
            items: resp.data?.bookings || [],
            totalPages: resp.data?.pagination?.totalPages,
            totalItems: resp.data?.pagination?.totalItems
          };
        },
        {
          kind: KIND,
          label: 'Loading bookings',
          pctFrom: phasePct.bookingsStart,
          pctTo: phasePct.bookingsEnd
        }
      );

      const isOperator = currentUser && currentUser.role !== 'admin';
      const bookingsForReport = isOperator
        ? allBookings.filter((b) => b.operatorId === currentUser.operatorId)
        : allBookings;

      const memberships = await paginatedFetch(
        async (page, limit) => {
          const resp = await apiService.getMembershipPayments({
            startDate: startDateTime,
            endDate: endDateTime,
            page,
            limit
          });
          return {
            items: resp.data?.payments || [],
            totalPages: resp.data?.pagination?.totalPages,
            totalItems: resp.data?.pagination?.totalItems
          };
        },
        {
          kind: KIND,
          label: 'Loading memberships',
          pctFrom: phasePct.membershipsStart,
          pctTo: phasePct.membershipsEnd
        }
      );

      if (bookingsForReport.length === 0 && memberships.length === 0) {
        setError('No data in the selected window');
        return;
      }

      setProgress(KIND, phasePct.generating, 'Generating workbook…');
      await exportMonthlyAnalytics({
        bookings: bookingsForReport,
        memberships,
        siteName: currentSite?.siteName || 'Unknown Site',
        siteId: currentSite?.siteId || currentSite?._id || '',
        dateRange
      });
    } catch (error) {
      console.error('Monthly export failed:', error);
      setError(error.message || 'Failed to export monthly analytics');
    } finally {
      setMonthlyExportLoading(false);
      clearProgress();
    }
  };

  const handleExcelExport = async () => {
    if (!currentSite?._id && !currentSite?.siteId) {
      setError('No site selected for export');
      return;
    }

    setExcelExportLoading(true);
    setError(null);
    const KIND = 'Excel';
    setProgress(KIND, phasePct.connecting, 'Preparing Excel…');

    try {
      const siteId = currentSite?._id || currentSite?.siteId;
      const startDateTime = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(dateRange.endDate + 'T23:59:59').toISOString();

      const allBookings = await paginatedFetch(
        async (page, limit) => {
          const resp = await apiService.getBookings({
            siteId,
            dateFrom: startDateTime,
            dateTo: endDateTime,
            page,
            limit,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          });
          return {
            items: resp.data?.bookings || [],
            totalPages: resp.data?.pagination?.totalPages,
            totalItems: resp.data?.pagination?.totalItems
          };
        },
        {
          kind: KIND,
          label: 'Loading bookings',
          pctFrom: phasePct.bookingsStart,
          pctTo: phasePct.bookingsEnd
        }
      );

      // Don't filter on the deleted toggle — the summary needs cancelled and
      // deleted rows to report their revenue separately. Bookings sheet still
      // carries the status column so they're easy to identify.
      const isOperator = currentUser && currentUser.role !== 'admin';
      const term = searchTerm.toLowerCase();
      const exportBookings = allBookings.filter((booking) => {
        if (isOperator && booking.operatorId !== currentUser.operatorId) return false;
        const matchesSearch = !searchTerm || (
          booking.vehicleNumber?.toLowerCase().includes(term) ||
          booking.customerName?.toLowerCase().includes(term) ||
          booking.phoneNumber?.includes(searchTerm) ||
          booking.machineNumber?.toLowerCase().includes(term)
        );
        const matchesPaymentMethod = paymentMethodFilter === 'all' ||
          booking.payment?.method === paymentMethodFilter ||
          booking.paymentMethod === paymentMethodFilter;
        return matchesSearch && matchesPaymentMethod;
      });

      // Memberships are global, never site-scoped.
      const membershipPayments = await paginatedFetch(
        async (page, limit) => {
          const resp = await apiService.getMembershipPayments({
            startDate: startDateTime,
            endDate: endDateTime,
            page,
            limit
          });
          return {
            items: resp.data?.payments || [],
            totalPages: resp.data?.pagination?.totalPages,
            totalItems: resp.data?.pagination?.totalItems
          };
        },
        {
          kind: KIND,
          label: 'Loading memberships',
          pctFrom: phasePct.membershipsStart,
          pctTo: phasePct.membershipsEnd
        }
      );

      if (exportBookings.length === 0 && membershipPayments.length === 0) {
        setError('No bookings or membership payments match the current filters');
        return;
      }

      setProgress(KIND, phasePct.generating, 'Generating workbook…');
      await exportBookingsToExcel(
        exportBookings,
        currentSite?.siteName || 'Unknown Site',
        currentSite?.siteId || currentSite?._id || 'Unknown',
        {
          dateRange,
          paymentMethod: paymentMethodFilter,
          searchTerm: searchTerm || undefined,
          operatorId: isOperator ? currentUser.operatorId : undefined
        },
        membershipPayments
      );
    } catch (error) {
      console.error('Excel export failed:', error);
      setError(error.message || 'Failed to export Excel file');
    } finally {
      setExcelExportLoading(false);
      clearProgress();
    }
  };

  // Filter bookings based on search term, payment method, and deleted status
  // Server already applies the deleted toggle (status / statusNot). Search
  // and payment method remain client-side and only narrow the current page.
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchTerm || (
      booking.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phoneNumber?.includes(searchTerm) ||
      booking.machineNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesPaymentMethod = paymentMethodFilter === 'all' ||
      booking.payment?.method === paymentMethodFilter ||
      booking.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesPaymentMethod;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <div className="flex items-center space-x-4">
            <p className="text-gray-600">
              Site: {currentSite?.siteName || 'No site selected'}
            </p>
            {currentUser && currentUser.role !== 'admin' && (
              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                Operator: {currentUser.operatorId}
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex space-x-2">
          <Button
            onClick={handleExport}
            disabled={exportLoading || !currentSite}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {exportLoading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            <span className="ml-2">
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </span>
          </Button>
          
          <Button
            onClick={handleExcelExport}
            disabled={excelExportLoading || !currentSite}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {excelExportLoading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            <span className="ml-2">
              {excelExportLoading ? 'Exporting...' : 'Export Excel'}
            </span>
          </Button>

          <Button
            onClick={handleMonthlyExport}
            disabled={monthlyExportLoading || !currentSite}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {monthlyExportLoading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            <span className="ml-2">
              {monthlyExportLoading ? 'Exporting...' : 'Monthly Analytics'}
            </span>
          </Button>
        </div>
      </div>

      {/* Export progress bar — shows while any of the three exports is running */}
      {exportProgress && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <RefreshCw className="text-purple-600 animate-spin" size={16} />
              <span className="text-sm font-medium text-gray-700">
                Exporting {exportProgress.kind}…
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(exportProgress.pct)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${exportProgress.pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{exportProgress.label}</p>
        </div>
      )}

      {/* Date Range Picker & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
        <div className="space-y-3 md:space-y-0">
          {/* Mobile: Stacked layout, Desktop: Flex layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-500" size={18} />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-gray-500 px-2">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2 sm:ml-2">
              <span className="text-sm font-medium text-gray-700">Month:</span>
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Custom range</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Payment Method:</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI/Online</option>
                <option value="membership">Membership Card</option>
              </select>
              <Button
                onClick={fetchAnalyticsData}
                disabled={loading}
                size="sm"
                className="whitespace-nowrap"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                <span className="ml-1 hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loader while summary + table + memberships fetch in parallel. */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 mb-2">
            <RefreshCw className="text-purple-600 animate-spin" size={16} />
            <span className="text-sm font-medium text-gray-700">Loading analytics...</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-purple-600 animate-[loaderSlide_1.4s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Computing totals from the server and pulling the latest bookings…
          </p>
          <style>{`
            @keyframes loaderSlide {
              0% { left: -33%; }
              100% { left: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* Quick Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
              <BarChart3 className="text-purple-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Total Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : analytics.totalBookings}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
              <DollarSign className="text-green-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Total Revenue</p>
              <p className="text-sm md:text-lg font-bold text-gray-900 break-words">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : formatCurrency(analytics.totalRevenue)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Completed bookings only</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
              <Activity className="text-blue-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Active Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : analytics.activeBookings}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0">
              <CheckCircle className="text-orange-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Completed Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : analytics.completedBookings}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-yellow-100 p-2 rounded-lg flex-shrink-0">
              <X className="text-yellow-700" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Cancelled Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : analytics.cancelledBookings}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 break-words">
                {loading ? '' : `Revenue: ${formatCurrency(analytics.cancelledRevenue)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
              <Trash2 className="text-red-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Deleted Bookings</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : analytics.deletedBookings}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 break-words">
                {loading ? '' : `Revenue: ${formatCurrency(analytics.deletedRevenue)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
              <Shield className="text-purple-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Total Active Memberships</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : analytics.membershipSales}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-lg shadow-sm border border-gray-100 p-3 md:p-4 transition-all ${
            loading ? '' : 'cursor-pointer hover:shadow-md hover:border-indigo-200'
          }`}
          onClick={loading ? undefined : handleMembershipRevenueClick}
        >
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg flex-shrink-0">
              <CreditCard className="text-indigo-600" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600">Membership Revenue</p>
              <p className="text-sm md:text-lg font-bold text-gray-900 break-words">
                {loading ? <RefreshCw className="animate-spin text-gray-400" size={18} /> : formatCurrency(analytics.membershipRevenue)}
              </p>
              {!loading && <p className="text-xs text-indigo-500 mt-1">Click for details</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="text-red-600" size={16} />
            <h3 className="font-medium text-red-800">Error Loading Data</h3>
          </div>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalyticsData}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <RefreshCw size={14} className="mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-3 md:p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <h2 className="text-lg font-semibold text-gray-900">Bookings</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <Button
                onClick={() => setShowDeletedBookings(!showDeletedBookings)}
                variant={showDeletedBookings ? "primary" : "outline"}
                size="sm"
                className={showDeletedBookings ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              >
                <Trash2 size={14} />
                <span className="ml-1">{showDeletedBookings ? 'Show All' : 'Show Deleted'}</span>
              </Button>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full text-center sm:text-left">
                {filteredBookings.length}
              </span>
            </div>
          </div>
          {bookingsTablePagination && bookingsTablePagination.totalItems > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Showing{' '}
              {(((bookingsTablePagination.currentPage || 1) - 1) * (bookingsTablePagination.itemsPerPage || TABLE_PAGE_SIZE) + 1).toLocaleString()}
              –
              {Math.min(
                (bookingsTablePagination.currentPage || 1) * (bookingsTablePagination.itemsPerPage || TABLE_PAGE_SIZE),
                bookingsTablePagination.totalItems
              ).toLocaleString()}{' '}
              of {bookingsTablePagination.totalItems.toLocaleString()} bookings.
            </p>
          )}
        </div>

        {/* Pagination controls — placed at the top of the table for quick access */}
        {bookingsTablePagination && bookingsTablePagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 md:p-4 border-b border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              Page {bookingsTablePagination.currentPage} of {bookingsTablePagination.totalPages}
              {tableLoading && (
                <span className="ml-2 inline-flex items-center">
                  <RefreshCw className="animate-spin" size={12} />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleTablePageChange(1)}
                disabled={tableLoading || !bookingsTablePagination.hasPrevPage}
                variant="outline"
                size="sm"
              >
                First
              </Button>
              <Button
                onClick={() => handleTablePageChange(Math.max(1, tablePage - 1))}
                disabled={tableLoading || !bookingsTablePagination.hasPrevPage}
                variant="outline"
                size="sm"
              >
                Prev
              </Button>
              <Button
                onClick={() =>
                  handleTablePageChange(
                    Math.min(bookingsTablePagination.totalPages, tablePage + 1)
                  )
                }
                disabled={tableLoading || !bookingsTablePagination.hasNextPage}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
              <Button
                onClick={() => handleTablePageChange(bookingsTablePagination.totalPages)}
                disabled={tableLoading || !bookingsTablePagination.hasNextPage}
                variant="outline"
                size="sm"
              >
                Last
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-6 md:p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Machine/Pallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id || booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{booking.vehicleNumber}</div>
                          <div className="text-sm text-gray-500 capitalize">{booking.vehicleType?.replace('-', ' ')}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{booking.customerName}</div>
                          <div className="text-sm text-gray-500">{booking.phoneNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{booking.machineNumber || 'N/A'}</div>
                          <div className="text-sm text-gray-500">
                            {booking.palletName || `Pallet ${booking.palletNumber}` || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {booking.payment?.method || booking.paymentMethod || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.payment?.amount ? formatCurrency(booking.payment.amount) : 
                         booking.totalAmount ? formatCurrency(booking.totalAmount) : formatCurrency(0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(booking.createdAt).toLocaleDateString()}<br />
                        <span className="text-xs">{new Date(booking.createdAt).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBookingClick(booking)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <div key={booking._id || booking.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 truncate">{booking.vehicleNumber}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 capitalize mt-1">{booking.vehicleType?.replace('-', ' ')}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBookingClick(booking)}
                        className="ml-2 flex-shrink-0"
                      >
                        <Eye size={14} />
                      </Button>
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-gray-500 font-medium">Customer</dt>
                        <dd className="text-gray-900 mt-1">
                          <div>{booking.customerName}</div>
                          <div className="text-gray-500">{booking.phoneNumber}</div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Machine/Pallet</dt>
                        <dd className="text-gray-900 mt-1">
                          <div>{booking.machineNumber || 'N/A'}</div>
                          <div className="text-gray-500">{booking.palletName || `Pallet ${booking.palletNumber}` || 'N/A'}</div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Payment</dt>
                        <dd className="text-gray-900 mt-1 capitalize">{booking.payment?.method || booking.paymentMethod || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Amount</dt>
                        <dd className="text-gray-900 mt-1 font-medium">
                          {booking.payment?.amount ? formatCurrency(booking.payment.amount) : 
                           booking.totalAmount ? formatCurrency(booking.totalAmount) : formatCurrency(0)}
                        </dd>
                      </div>
                    </div>
                    
                    {/* Date/Time */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
                        <span>{new Date(booking.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-6 md:p-8 text-center">
            <div className="bg-gray-100 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="text-gray-400" size={20} />
            </div>
            <p className="text-gray-500 mb-2">No bookings found</p>
            <p className="text-sm text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'No bookings for the selected date range'}
            </p>
          </div>
        )}

      </div>

      {/* Booking Information Modal */}
      <BookingInfoModal
        booking={selectedBooking}
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
      />

      {/* Membership Revenue Details Modal */}
      {showMembershipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Membership Revenue Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {dateRange.startDate} to {dateRange.endDate} — Total: {formatCurrency(analytics.membershipRevenue)}
                </p>
              </div>
              <button
                onClick={() => setShowMembershipModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {membershipPaymentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-500">Loading membership payments...</p>
                </div>
              ) : membershipPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CreditCard size={48} className="text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No membership payments found</p>
                  <p className="text-gray-400 text-sm mt-1">for the selected date range</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {membershipPayments.map((payment) => (
                    <div
                      key={payment._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
                    >
                      {/* Payment Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-indigo-100 p-2 rounded-lg">
                            <CreditCard className="text-indigo-600" size={18} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{payment.membershipNumber}</h3>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                              payment.membershipType === 'premium' ? 'bg-amber-100 text-amber-800' :
                              payment.membershipType === 'yearly' ? 'bg-purple-100 text-purple-800' :
                              payment.membershipType === 'quarterly' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {payment.membershipType}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-lg font-bold text-indigo-600">{formatCurrency(payment.amount)}</p>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              payment.status === 'refunded' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                          <button
                            onClick={() => copyPaymentToClipboard(payment)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              copiedPaymentId === payment._id
                                ? 'bg-green-100 text-green-600'
                                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                            }`}
                            title="Copy for WhatsApp"
                          >
                            {copiedPaymentId === payment._id ? <CheckCheck size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Payment Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="flex items-center space-x-1 text-gray-500 mb-1">
                            <User size={14} />
                            <span className="font-medium">Customer</span>
                          </div>
                          <p className="text-gray-900">{payment.customerName}</p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1 text-gray-500 mb-1">
                            <Phone size={14} />
                            <span className="font-medium">Phone</span>
                          </div>
                          <p className="text-gray-900">{payment.customerPhone}</p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1 text-gray-500 mb-1">
                            <Tag size={14} />
                            <span className="font-medium">Payment Method</span>
                          </div>
                          <p className="text-gray-900 capitalize">{payment.paymentMethod}</p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1 text-gray-500 mb-1">
                            <Clock size={14} />
                            <span className="font-medium">Validity</span>
                          </div>
                          <p className="text-gray-900">{payment.validityTerm} month{payment.validityTerm > 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Start Date</div>
                          <p className="text-gray-900">{new Date(payment.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Expiry Date</div>
                          <p className="text-gray-900">{new Date(payment.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Vehicle Types</div>
                          <p className="text-gray-900 capitalize">
                            {payment.vehicleTypes?.map(v => v.replace('-', ' ')).join(', ') || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Created By</div>
                          <p className="text-gray-900">
                            {payment.createdBy?.name || payment.createdBy?.operatorId || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Transaction & Notes */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                        <div className="text-gray-500">
                          {payment.transactionId && (
                            <span className="mr-4">Txn ID: <span className="text-gray-900">{payment.transactionId}</span></span>
                          )}
                          {payment.paymentReference && (
                            <span>Ref: <span className="text-gray-900">{payment.paymentReference}</span></span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs">
                          Created: {new Date(payment.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {payment.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                          <span className="font-medium">Notes:</span> {payment.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {membershipPayments.length} payment{membershipPayments.length !== 1 ? 's' : ''} found
              </p>
              <div className="flex items-center gap-2">
                {membershipPayments.length > 0 && (
                  <button
                    onClick={copyAllPaymentsToClipboard}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copiedPaymentId === 'all'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    {copiedPaymentId === 'all' ? <CheckCheck size={14} /> : <Copy size={14} />}
                    {copiedPaymentId === 'all' ? 'Copied!' : 'Copy All'}
                  </button>
                )}
                <button
                  onClick={() => setShowMembershipModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;