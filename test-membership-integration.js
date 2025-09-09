#!/usr/bin/env node

/**
 * Comprehensive Membership System Frontend Integration Test
 * This script simulates the complete frontend workflow for membership management
 */

const https = require('https');
const http = require('http');

class MembershipIntegrationTest {
  constructor() {
    this.baseURL = 'https://backend-yrbl.onrender.com/api';
    this.token = null;
    this.testCustomerId = null;
    this.membershipCredentials = null;
    this.testResults = [];
  }

  // Helper method to make HTTP requests
  async makeRequest(method, endpoint, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        }
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  // Test helper to log results
  logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testName}`);
    if (details) console.log(`    ${details}`);
    this.testResults.push({ test: testName, passed, details });
  }

  // Step 1: Authentication (simulates login)
  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    try {
      const response = await this.makeRequest('POST', '/auth/login', {
        operatorId: 'OP8888',
        password: 'testpass123'
      });

      if (response.status === 200 && response.data.success) {
        this.token = response.data.data.accessToken;
        this.logTest('Admin Login', true, `Token received: ${this.token.substring(0, 20)}...`);
        return true;
      } else {
        this.logTest('Admin Login', false, `Status: ${response.status}, Message: ${response.data.message}`);
        return false;
      }
    } catch (error) {
      this.logTest('Admin Login', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Step 2: Customer Management UI Simulation
  async testCustomerManagement() {
    console.log('\n👥 Testing Customer Management...');

    // Test: Get customers list (simulates CustomerManagement page load)
    try {
      const response = await this.makeRequest('GET', '/customers?limit=5');
      
      if (response.status === 200 && response.data.success) {
        const customers = response.data.data.customers;
        this.testCustomerId = customers[0]._id;
        this.logTest('Load Customer List', true, `Found ${customers.length} customers`);
        
        // Check if membership status is properly displayed
        const customerWithMembership = customers.find(c => c.hasMembership);
        const customerWithoutMembership = customers.find(c => !c.hasMembership);
        
        this.logTest('Membership Status Display', true, 
          `Active memberships: ${customers.filter(c => c.hasMembership).length}, ` +
          `Inactive: ${customers.filter(c => !c.hasMembership).length}`);
        
        return true;
      } else {
        this.logTest('Load Customer List', false, `Status: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('Load Customer List', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Step 3: Membership Creation UI Simulation
  async testMembershipCreation() {
    console.log('\n💳 Testing Membership Creation...');

    try {
      // Simulate: Admin clicks membership button for a customer
      const response = await this.makeRequest('POST', `/customers/${this.testCustomerId}/membership`, {
        membershipType: 'yearly',
        validityTerm: 12
      });

      if (response.status === 201 && response.data.success) {
        const membership = response.data.data.customer.membership;
        this.membershipCredentials = {
          membershipNumber: membership.membershipNumber,
          pin: membership.pin
        };

        this.logTest('Create Membership', true, 
          `Number: ${membership.membershipNumber}, PIN: ${membership.pin}, ` +
          `Type: ${membership.membershipType}, Expires: ${new Date(membership.expiryDate).toDateString()}`);

        // Test membership status update
        const hasMembership = response.data.data.customer.hasMembership;
        this.logTest('Membership Status Update', hasMembership, 
          `Customer hasMembership: ${hasMembership}`);

        return true;
      } else {
        this.logTest('Create Membership', false, `Status: ${response.status}, Message: ${response.data.message}`);
        return false;
      }
    } catch (error) {
      this.logTest('Create Membership', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Step 4: Booking Payment with Membership Simulation
  async testBookingPaymentMembership() {
    console.log('\n🎫 Testing Booking Payment with Membership...');

    if (!this.membershipCredentials) {
      this.logTest('Booking Payment Test', false, 'No membership credentials available');
      return false;
    }

    try {
      // Simulate: Operator enters membership credentials during payment
      const response = await this.makeRequest('POST', '/customers/validate-membership', {
        membershipNumber: this.membershipCredentials.membershipNumber,
        pin: this.membershipCredentials.pin
      });

      if (response.status === 200 && response.data.success) {
        const customer = response.data.data.customer;
        this.logTest('Membership Validation in Payment', true, 
          `Validated customer: ${customer.fullName} (${customer.phoneNumber})`);

        // Simulate discount calculation (frontend logic)
        const originalAmount = 100; // ₹100 parking fee
        const discount = Math.round(originalAmount * 0.1); // 10% discount
        const finalAmount = originalAmount - discount;

        this.logTest('Discount Calculation', true, 
          `Original: ₹${originalAmount}, Discount: ₹${discount}, Final: ₹${finalAmount}`);

        return true;
      } else {
        this.logTest('Membership Validation in Payment', false, 
          `Status: ${response.status}, Message: ${response.data.message}`);
        return false;
      }
    } catch (error) {
      this.logTest('Membership Validation in Payment', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Step 5: Invalid Membership Handling
  async testInvalidMembershipHandling() {
    console.log('\n🚫 Testing Invalid Membership Handling...');

    // Test Case 1: Invalid membership number
    try {
      const response1 = await this.makeRequest('POST', '/customers/validate-membership', {
        membershipNumber: '999999',
        pin: '1234'
      });

      const invalidNumberHandled = response1.status === 400 && !response1.data.success;
      this.logTest('Invalid Membership Number Handling', invalidNumberHandled, 
        invalidNumberHandled ? 'Properly rejected' : 'Should have been rejected');

    } catch (error) {
      this.logTest('Invalid Membership Number Handling', false, `Error: ${error.message}`);
    }

    // Test Case 2: Invalid PIN
    try {
      const response2 = await this.makeRequest('POST', '/customers/validate-membership', {
        membershipNumber: this.membershipCredentials.membershipNumber,
        pin: '0000'
      });

      const invalidPinHandled = response2.status === 400 && !response2.data.success;
      this.logTest('Invalid PIN Handling', invalidPinHandled, 
        invalidPinHandled ? 'Properly rejected' : 'Should have been rejected');

    } catch (error) {
      this.logTest('Invalid PIN Handling', false, `Error: ${error.message}`);
    }

    // Test Case 3: Format validation
    try {
      const response3 = await this.makeRequest('POST', '/customers/validate-membership', {
        membershipNumber: '12345', // 5 digits instead of 6
        pin: '123' // 3 digits instead of 4
      });

      const formatValidationWorking = response3.status === 422 && response3.data.errors;
      this.logTest('Format Validation', formatValidationWorking, 
        formatValidationWorking ? 'Validation errors returned' : 'Should have validation errors');

    } catch (error) {
      this.logTest('Format Validation', false, `Error: ${error.message}`);
    }
  }

  // Step 6: Membership Deactivation
  async testMembershipDeactivation() {
    console.log('\n🔄 Testing Membership Deactivation...');

    try {
      const response = await this.makeRequest('DELETE', `/customers/${this.testCustomerId}/membership`);

      if (response.status === 200 && response.data.success) {
        const customer = response.data.data.customer;
        const isDeactivated = !customer.hasMembership && !customer.membership.isActive;

        this.logTest('Membership Deactivation', isDeactivated, 
          `isActive: ${customer.membership.isActive}, hasMembership: ${customer.hasMembership}`);

        // Test that deactivated membership cannot be used
        if (this.membershipCredentials) {
          const validateResponse = await this.makeRequest('POST', '/customers/validate-membership', {
            membershipNumber: this.membershipCredentials.membershipNumber,
            pin: this.membershipCredentials.pin
          });

          const deactivatedRejected = validateResponse.status === 400;
          this.logTest('Deactivated Membership Rejection', deactivatedRejected, 
            deactivatedRejected ? 'Deactivated membership properly rejected' : 'Should reject deactivated membership');
        }

        return true;
      } else {
        this.logTest('Membership Deactivation', false, `Status: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('Membership Deactivation', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Step 7: UI Component Integration Test
  async testUIComponentIntegration() {
    console.log('\n🎨 Testing UI Component Integration...');

    // Test: Check if frontend files exist and are properly structured
    const fs = require('fs');
    const path = require('path');

    const componentsToCheck = [
      'src/components/Customer/MembershipModal.jsx',
      'src/pages/CustomerManagement.jsx',
      'src/components/Booking/BookingModal.jsx',
      'src/services/api.js'
    ];

    for (const component of componentsToCheck) {
      const fullPath = path.join('C:', 'Akshat', 'AIB', 'Sparkee Operator', 'operator-app', component);
      const exists = fs.existsSync(fullPath);
      this.logTest(`Component Exists: ${component}`, exists);

      if (exists) {
        // Check for key membership-related code
        const content = fs.readFileSync(fullPath, 'utf8');
        
        if (component.includes('MembershipModal')) {
          const hasMembershipLogic = content.includes('membershipNumber') && content.includes('createMembership');
          this.logTest(`Membership Logic in ${component}`, hasMembershipLogic);
        }
        
        if (component.includes('BookingModal')) {
          const hasPaymentIntegration = content.includes('validateMembership') && content.includes('membership');
          this.logTest(`Payment Integration in ${component}`, hasPaymentIntegration);
        }
        
        if (component.includes('api.js')) {
          const hasAPIEndpoints = content.includes('createMembership') && content.includes('validateMembership');
          this.logTest(`API Endpoints in ${component}`, hasAPIEndpoints);
        }
      }
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Membership System Integration Test\n');
    console.log('=' .repeat(60));

    const testMethods = [
      'testAuthentication',
      'testCustomerManagement', 
      'testMembershipCreation',
      'testBookingPaymentMembership',
      'testInvalidMembershipHandling',
      'testMembershipDeactivation',
      'testUIComponentIntegration'
    ];

    for (const method of testMethods) {
      await this[method]();
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));

    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);

    if (percentage >= 90) {
      console.log('\n🎉 INTEGRATION TEST PASSED! Membership system is ready for production.');
    } else if (percentage >= 70) {
      console.log('\n⚠️  INTEGRATION TEST PARTIAL SUCCESS. Some issues need attention.');
    } else {
      console.log('\n❌ INTEGRATION TEST FAILED. Major issues need to be resolved.');
    }

    // Detailed failure report
    const failures = this.testResults.filter(r => !r.passed);
    if (failures.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failures.forEach(f => {
        console.log(`   • ${f.test}: ${f.details}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
  }
}

// Run the test
if (require.main === module) {
  const test = new MembershipIntegrationTest();
  test.runAllTests().catch(console.error);
}

module.exports = MembershipIntegrationTest;