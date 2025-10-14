const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-yrbl.onrender.com/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || 'An error occurred',
          response.status,
          data.error || null,
          data.errors || null
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        'Network error. Please check your connection.',
        0,
        error.message
      );
    }
  }

  // Auth endpoints
  async login(operatorId, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ operatorId, password }),
    });
    
    // Store tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('parkingOperator', JSON.stringify(response.data.user));
    
    return response;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // Store tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('parkingOperator', JSON.stringify(response.data.user));
    
    return response;
  }

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('parkingOperator');
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new ApiError('No refresh token available', 401);
    }

    const response = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    localStorage.setItem('accessToken', response.data.accessToken);
    return response;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(currentPassword, newPassword, confirmPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
  }

  async forgotPassword(operatorId, email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ operatorId, email }),
    });
  }

  async verifyResetOTP(resetToken, otp) {
    return this.request('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ resetToken, otp }),
    });
  }

  async resetPassword(resetToken, otp, newPassword, confirmPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        resetToken,
        otp,
        newPassword,
        confirmPassword,
      }),
    });
  }

  async validateToken() {
    return this.request('/auth/validate');
  }

  // Health check
  async healthCheck() {
    return this.request('/auth/health');
  }

  // Booking endpoints
  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBookings(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.machineNumber) queryParams.append('machineNumber', filters.machineNumber);
    if (filters.vehicleNumber) queryParams.append('vehicleNumber', filters.vehicleNumber);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/bookings?${queryString}` : '/bookings';
    
    return this.request(endpoint);
  }

  async getBookingById(bookingId) {
    return this.request(`/bookings/${bookingId}`);
  }

  async updateBooking(bookingId, updateData) {
    return this.request(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async completeBooking(bookingId, paymentData = {}) {
    return this.request(`/bookings/${bookingId}/complete`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async cancelBooking(bookingId, reason) {
    return this.request(`/bookings/${bookingId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async verifyOTP(otpCode) {
    return this.request('/bookings/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otpCode }),
    });
  }

  async generateNewOTP(bookingId) {
    return this.request(`/bookings/${bookingId}/generate-otp`, {
      method: 'POST',
    });
  }

  async getActiveBookings() {
    return this.request('/bookings/active');
  }

  async searchBookings(query, filterType = 'all') {
    return this.request('/bookings/search', {
      method: 'POST',
      body: JSON.stringify({ query, filterType }),
    });
  }

  async getBookingsByMachine(machineNumber, status = 'active') {
    return this.request(`/bookings/machine/${machineNumber}?status=${status}`);
  }

  async getBookingsByVehicle(vehicleNumber) {
    return this.request(`/bookings/vehicle/${vehicleNumber}`);
  }

  async extendBooking(bookingId, extensionData) {
    return this.request(`/bookings/${bookingId}/extend`, {
      method: 'POST',
      body: JSON.stringify(extensionData),
    });
  }

  async getBookingStats(startDate, endDate) {
    const queryParams = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    return this.request(`/bookings/stats?${queryParams.toString()}`);
  }

  // Customer endpoints
  async getCustomerHealth() {
    return this.request('/customers/health');
  }

  async searchCustomers(query, type = 'all') {
    const queryParams = new URLSearchParams({ q: query, type });
    return this.request(`/customers/search?${queryParams.toString()}`);
  }

  async getCustomers(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/customers?${queryString}` : '/customers';
    
    return this.request(endpoint);
  }

  async getCustomerById(customerId) {
    return this.request(`/customers/${customerId}`);
  }

  async createCustomer(customerData) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(customerId, updateData) {
    return this.request(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteCustomer(customerId, reason) {
    return this.request(`/customers/${customerId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async getCustomerBookings(customerId, filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.status) queryParams.append('status', filters.status);

    const queryString = queryParams.toString();
    const endpoint = queryString ? 
      `/customers/${customerId}/bookings?${queryString}` : 
      `/customers/${customerId}/bookings`;
    
    return this.request(endpoint);
  }

  async getCustomerVehicles(customerId) {
    return this.request(`/customers/${customerId}/vehicles`);
  }

  async addCustomerVehicle(customerId, vehicleData) {
    return this.request(`/customers/${customerId}/vehicles`, {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  }

  async updateCustomerVehicle(customerId, vehicleId, updateData) {
    return this.request(`/customers/${customerId}/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async removeCustomerVehicle(customerId, vehicleId) {
    return this.request(`/customers/${customerId}/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
  }

  // Membership endpoints
  async createMembership(customerId, membershipData) {
    return this.request(`/customers/${customerId}/membership`, {
      method: 'POST',
      body: JSON.stringify(membershipData),
    });
  }

  async validateMembership(membershipNumber, pin, vehicleType) {
    return this.request('/customers/validate-membership', {
      method: 'POST',
      body: JSON.stringify({ membershipNumber, pin, vehicleType }),
    });
  }

  async deactivateMembership(customerId) {
    return this.request(`/customers/${customerId}/membership`, {
      method: 'DELETE',
    });
  }


  // Membership Payment endpoints
  async getMembershipRevenue(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    const endpoint = queryString ? `/membership-payments/revenue?${queryString}` : '/membership-payments/revenue';
    return this.request(endpoint);
  }

  async checkMembershipByPhone(phoneNumber) {
    return this.request(`/membership-payments/check-membership/${phoneNumber}`);
  }

  // Site endpoints
  async getSites(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.city) queryParams.append('city', filters.city);
    if (filters.state) queryParams.append('state', filters.state);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/sites?${queryString}` : '/sites';
    
    return this.request(endpoint);
  }

  async getMySites() {
    return this.request('/sites/my-sites');
  }

  async getSiteById(siteId) {
    return this.request(`/sites/${siteId}`);
  }

  async createSite(siteData) {
    return this.request('/sites', {
      method: 'POST',
      body: JSON.stringify(siteData),
    });
  }

  async updateSite(siteId, updateData) {
    return this.request(`/sites/${siteId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deactivateSite(siteId, reason) {
    return this.request(`/sites/${siteId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async deleteSitePermanently(siteId, reason, force = false) {
    return this.request(`/sites/${siteId}/permanent`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, force }),
    });
  }

  async getSiteStatistics(siteId) {
    return this.request(`/sites/${siteId}/statistics`);
  }

  async getSiteUsers(siteId) {
    return this.request(`/sites/${siteId}/users`);
  }

  async assignUserToSite(siteId, userData) {
    return this.request(`/sites/${siteId}/assign-user`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async removeUserFromSite(siteId, userId) {
    return this.request(`/sites/${siteId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Machine endpoints
  async getAvailableMachines(vehicleType, siteId = null) {
    const queryParams = new URLSearchParams({ vehicleType });
    if (siteId) queryParams.append('siteId', siteId);
    
    return this.request(`/machines/available?${queryParams.toString()}`);
  }

  async getMachines(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);
    if (filters.machineType) queryParams.append('machineType', filters.machineType);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.availability) queryParams.append('availability', filters.availability);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/machines?${queryString}` : '/machines';
    
    return this.request(endpoint);
  }

  async getMachineById(machineId) {
    return this.request(`/machines/${machineId}`);
  }

  async getMachinePallets(machineId) {
    return this.request(`/machines/${machineId}/pallets`);
  }

  async occupyPallet(machineId, palletNumber, bookingId, vehicleNumber, position = null) {
    const body = { bookingId, vehicleNumber };
    if (position) body.position = position;
    
    return this.request(`/machines/${machineId}/pallets/${palletNumber}/occupy`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async releasePallet(machineId, palletNumber, bookingId) {
    return this.request(`/machines/${machineId}/pallets/${palletNumber}/release`, {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  }

  async releaseVehicle(machineId, palletNumber, vehicleNumber) {
    return this.request(`/machines/${machineId}/pallets/${palletNumber}/release-vehicle`, {
      method: 'POST',
      body: JSON.stringify({ vehicleNumber }),
    });
  }

  async getMachineStatistics(machineId) {
    return this.request(`/machines/${machineId}/statistics`);
  }

  async createMachine(machineData) {
    return this.request('/machines', {
      method: 'POST',
      body: JSON.stringify(machineData),
    });
  }

  async updateMachine(machineId, updateData) {
    return this.request(`/machines/${machineId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deactivateMachine(machineId, reason) {
    return this.request(`/machines/${machineId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  // Analytics endpoints (Admin only)
  async getAnalyticsHealth() {
    return this.request('/analytics/health');
  }

  async getDashboardAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/dashboard?${queryString}` : '/analytics/dashboard';
    
    return this.request(endpoint);
  }

  async getRevenueAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/revenue?${queryString}` : '/analytics/revenue';
    
    return this.request(endpoint);
  }

  async getBookingAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);
    if (filters.machineId) queryParams.append('machineId', filters.machineId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/bookings?${queryString}` : '/analytics/bookings';
    
    return this.request(endpoint);
  }

  async getCustomerAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/customers?${queryString}` : '/analytics/customers';
    
    return this.request(endpoint);
  }

  async getMachineAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);
    if (filters.machineType) queryParams.append('machineType', filters.machineType);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/machines?${queryString}` : '/analytics/machines';
    
    return this.request(endpoint);
  }

  async getSiteAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/sites?${queryString}` : '/analytics/sites';
    
    return this.request(endpoint);
  }

  async getMembershipAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.siteId) queryParams.append('siteId', filters.siteId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/membership?${queryString}` : '/analytics/membership';
    
    return this.request(endpoint);
  }

  async getPerformanceAnalytics(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.metric) queryParams.append('metric', filters.metric);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/performance?${queryString}` : '/analytics/performance';
    
    return this.request(endpoint);
  }
}

class ApiError extends Error {
  constructor(message, statusCode = 0, error = null, validationErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.validationErrors = validationErrors;
  }

  isValidationError() {
    return this.validationErrors && this.validationErrors.length > 0;
  }

  getValidationErrors() {
    return this.validationErrors || [];
  }
}

export { ApiService, ApiError };
export default new ApiService();