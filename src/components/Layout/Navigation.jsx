import React, { useState, useRef, useEffect } from 'react';
import { Plus, Activity, BarChart3, Settings, Users, Building, Cog, MoreHorizontal, CreditCard, Crown } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab, user }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef(null);

  // Base navigation items for all users
  const baseNavItems = [
    { id: 'bookings', label: 'Bookings', icon: Plus },
    { id: 'listings', label: 'Active', icon: Activity },
    { id: 'membership', label: 'Membership', icon: CreditCard },
    // { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Admin-only items (shown in More menu)
  const adminNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'members', label: 'Members', icon: Crown },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'sites', label: 'Sites', icon: Building },
    { id: 'machines', label: 'Machines', icon: Cog }, 
  ];

  // Determine which items to show
  const visibleNavItems = user?.role === 'admin' 
    ? [
        ...baseNavItems.slice(0, 3), // bookings, listings, membership
        { id: 'more', label: 'More', icon: MoreHorizontal }
      ]
    : baseNavItems;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMoreClick = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  const handleMenuItemClick = (tabId) => {
    setActiveTab(tabId);
    setShowMoreMenu(false);
  };

  const isActiveInMoreMenu = adminNavItems.some(item => item.id === activeTab);

  return (
    <nav className="bg-white border-t border-gray-200 px-2 py-2 safe-area-pb relative">
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div 
          ref={menuRef}
          className="absolute bottom-full right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-50"
        >
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.id)}
                className={`flex items-center px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors ${
                  activeTab === item.id
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-700'
                }`}
              >
                <Icon size={18} className="mr-3" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => handleMenuItemClick('settings')}
            className={`flex items-center px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors ${
              activeTab === 'settings'
                ? 'text-purple-600 bg-purple-50'
                : 'text-gray-700'
            }`}
          >
            <Settings size={18} className="mr-3" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <div className="flex justify-around items-center max-w-screen-sm mx-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'more' 
            ? isActiveInMoreMenu || activeTab === 'settings'
            : activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={item.id === 'more' ? handleMoreClick : () => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 flex-1 ${
                isActive
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;