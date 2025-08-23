import React from 'react';
import Header from './Header';
import Navigation from './Navigation';

const Layout = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'bookings':
        return 'Parking Bookings';
      case 'listings':
        return 'Active Listings';
      case 'customers':
        return 'Customer Management';
      case 'sites':
        return 'Site Management';
      case 'machines':
        return 'Machine Management';
      case 'analytics':
        return 'Analytics Dashboard';
      case 'settings':
        return 'Settings';
      default:
        return 'Parking Management';
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        title={getTitle()} 
        user={user}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
    </div>
  );
};

export default Layout;