/**
 * Test script to demonstrate site assignment functionality
 * 
 * This script shows how to:
 * 1. Get all sites
 * 2. Assign a user to a site
 * 3. Get user's assigned sites
 * 4. Remove user from site
 */

const API_BASE_URL = 'https://operator-backend-f5ie.onrender.com/api';

// Test credentials - you'll need to replace these with actual values
const ADMIN_CREDENTIALS = {
  operatorId: 'ADMIN001', // Replace with actual admin operator ID
  password: 'Admin@123'   // Replace with actual admin password
};

const TEST_USER_ID = 'user_id_here';  // Replace with actual user ID
const TEST_SITE_ID = 'site_id_here';  // Replace with actual site ID

class SiteAssignmentTester {
  constructor() {
    this.accessToken = null;
  }

  async login() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ADMIN_CREDENTIALS)
      });

      const data = await response.json();
      
      if (data.success) {
        this.accessToken = data.data.accessToken;
        console.log('✅ Admin login successful');
        return true;
      } else {
        console.error('❌ Login failed:', data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error.message);
      return false;
    }
  }

  async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers
      }
    });

    return response.json();
  }

  async getAllSites() {
    try {
      console.log('\n📋 Getting all sites...');
      const result = await this.makeRequest('/sites');
      
      if (result.success) {
        console.log(`✅ Found ${result.data.sites.length} sites`);
        result.data.sites.forEach(site => {
          console.log(`   - ${site.siteName} (${site.siteId})`);
        });
        return result.data.sites;
      } else {
        console.error('❌ Failed to get sites:', result.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting sites:', error.message);
      return [];
    }
  }

  async assignUserToSite(siteId, userId, role = 'operator', permissions = ['create_booking', 'update_booking']) {
    try {
      console.log(`\n👤 Assigning user ${userId} to site ${siteId} as ${role}...`);
      
      const result = await this.makeRequest(`/sites/${siteId}/assign-user`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          role,
          permissions
        })
      });

      if (result.success) {
        console.log('✅ User assigned to site successfully');
        return true;
      } else {
        console.error('❌ Failed to assign user:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error assigning user:', error.message);
      return false;
    }
  }

  async getUserSites() {
    try {
      console.log('\n🏢 Getting current user\'s assigned sites...');
      
      const result = await this.makeRequest('/sites/my-sites');

      if (result.success) {
        console.log(`✅ User has access to ${result.data.sites.length} sites`);
        result.data.sites.forEach(site => {
          console.log(`   - ${site.siteName} (${site.siteId})`);
        });
        return result.data.sites;
      } else {
        console.error('❌ Failed to get user sites:', result.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting user sites:', error.message);
      return [];
    }
  }

  async getSiteUsers(siteId) {
    try {
      console.log(`\n👥 Getting users assigned to site ${siteId}...`);
      
      const result = await this.makeRequest(`/sites/${siteId}/users`);

      if (result.success) {
        console.log(`✅ Site has ${result.data.users.length} assigned users`);
        result.data.users.forEach(user => {
          const assignments = user.assignedSites.filter(a => a.site.siteId === siteId);
          const assignment = assignments[0];
          console.log(`   - ${user.firstName} ${user.lastName} (${user.operatorId}) - Role: ${assignment?.role || 'N/A'}`);
        });
        return result.data.users;
      } else {
        console.error('❌ Failed to get site users:', result.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting site users:', error.message);
      return [];
    }
  }

  async removeUserFromSite(siteId, userId) {
    try {
      console.log(`\n🗑️ Removing user ${userId} from site ${siteId}...`);
      
      const result = await this.makeRequest(`/sites/${siteId}/users/${userId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        console.log('✅ User removed from site successfully');
        return true;
      } else {
        console.error('❌ Failed to remove user:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error removing user:', error.message);
      return false;
    }
  }

  async runTests() {
    console.log('🚀 Starting Site Assignment API Tests\n');

    // Step 1: Login as admin
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without admin login');
      return;
    }

    // Step 2: Get all sites
    const sites = await this.getAllSites();
    if (sites.length === 0) {
      console.log('❌ No sites found. Create some sites first.');
      return;
    }

    // Step 3: Get user's current sites
    await this.getUserSites();

    // Step 4: Test assignment (uncomment and modify with real IDs)
    /*
    if (TEST_SITE_ID && TEST_USER_ID) {
      const siteId = TEST_SITE_ID;
      const userId = TEST_USER_ID;

      // Assign user to site
      await this.assignUserToSite(siteId, userId, 'operator', ['create_booking', 'update_booking']);

      // Get site users
      await this.getSiteUsers(siteId);

      // Remove user from site
      await this.removeUserFromSite(siteId, userId);
    } else {
      console.log('\n⚠️ To test assignment, update TEST_SITE_ID and TEST_USER_ID in the script');
    }
    */

    console.log('\n✅ Site Assignment API tests completed!');
    console.log('\n📖 Available endpoints:');
    console.log('   POST /api/sites/:siteId/assign-user - Assign user to site');
    console.log('   GET  /api/sites/my-sites - Get current user\'s sites');
    console.log('   GET  /api/sites/:siteId/users - Get site users');
    console.log('   DELETE /api/sites/:siteId/users/:userId - Remove user from site');
  }
}

// Run the tests
const tester = new SiteAssignmentTester();
tester.runTests().catch(console.error);