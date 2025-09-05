import React, { useState } from 'react';
import Layout from './components/Layout/Layout';
import OnSpotBookings from './pages/OnSpotBookings';
import ActiveListings from './pages/ActiveListings';
import CustomerManagement from './pages/CustomerManagement';
import SiteManagement from './pages/SiteManagement';
import MachineManagement from './pages/MachineManagement';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AuthWrapper from './pages/auth/AuthWrapper';

function App() {
  const [activeTab, setActiveTab] = useState('bookings');

  const renderContent = (user) => {
    switch (activeTab) {
      case 'bookings':
        return <OnSpotBookings />;
      case 'listings':
        return <ActiveListings />;
      case 'customers':
        // Only render CustomerManagement for admin users
        return user?.role === 'admin' ? <CustomerManagement /> : <OnSpotBookings />;
      case 'sites':
        // Only render SiteManagement for admin users
        return user?.role === 'admin' ? <SiteManagement /> : <OnSpotBookings />;
      case 'machines':
        // Only render MachineManagement for admin users
        return user?.role === 'admin' ? <MachineManagement /> : <OnSpotBookings />;
      case 'analytics':
        // Only render Analytics for admin users
        return user?.role === 'admin' ? <Analytics /> : <OnSpotBookings />;
      case 'settings':
        return user?.role === 'admin' ? <Settings /> : <OnSpotBookings />;
      default:
        return <OnSpotBookings />;
    }
  };

  return (
    <AuthWrapper>
      {({ user, onLogout }) => (
        <div className="min-h-screen bg-gray-50">
          <Layout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            user={user}
            onLogout={onLogout}
          >
            {renderContent(user)}
          </Layout>
        </div>
      )}
    </AuthWrapper>
  );
}

export default App;