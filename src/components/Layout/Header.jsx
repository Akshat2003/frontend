import React, { useState } from 'react';
import { User, LogOut, ChevronDown, MapPin, Building2 } from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';

const Header = ({ title, user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const { currentSite, availableSites, changeSite, canChangeSite } = useSite();

  const handleLogout = () => {
    setShowDropdown(false); 
    onLogout();
  };

  const handleSiteChange = (site) => {
    changeSite(site);
    setShowSiteDropdown(false);
  };

  return (
    <header className="bg-purple-600 shadow-lg">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-lg font-medium text-white">{title}</h1>
              <p className="text-xs text-purple-100">Mechanical Parking System</p>
            </div>
            
            {/* Site Information */}
            {currentSite && (
              <div className="flex items-center space-x-2">
                <div className="w-px h-6 bg-purple-400"></div>
                {canChangeSite ? (
                  // Admin: Site dropdown
                  <div className="relative">
                    <button
                      onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                      className="flex items-center space-x-1.5 text-white hover:text-purple-100 transition-colors bg-purple-500 px-2 py-1 rounded-md"
                    >
                      <Building2 size={12} />
                      <span className="text-xs font-medium">{currentSite.siteName || currentSite.siteId}</span>
                      <ChevronDown 
                        size={12} 
                        className={`transition-transform ${showSiteDropdown ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    {/* Site Dropdown Menu */}
                    {showSiteDropdown && (
                      <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                        <div className="px-2 py-1.5 border-b border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select Site</p>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {availableSites.map((site) => (
                            <button
                              key={site._id || site.siteId}
                              onClick={() => handleSiteChange(site)}
                              className={`w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center space-x-2 ${
                                currentSite?.siteId === site.siteId ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                              }`}
                            >
                              <Building2 size={12} />
                              <div className="flex-1">
                                <p className="font-medium text-xs">{site.siteName}</p>
                                <p className="text-xs text-gray-500">{site.siteId}</p>
                                {site.location?.address?.city && (
                                  <p className="text-xs text-gray-400 flex items-center">
                                    <MapPin size={8} className="mr-1" />
                                    {site.location.address.city}
                                  </p>
                                )}
                              </div>
                              {currentSite?.siteId === site.siteId && (
                                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Operator: Site display only
                  <div className="flex items-center space-x-1.5 text-purple-100">
                    <Building2 size={12} />
                    <div className="text-xs">
                      <p className="font-medium text-white">{currentSite.siteName || currentSite.siteId}</p>
                      {currentSite.location?.address?.city && (
                        <p className="text-xs flex items-center">
                          <MapPin size={8} className="mr-1" />
                          {currentSite.location.address.city}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-1.5 text-white hover:text-purple-100 transition-colors"
            >
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <User size={12} />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium">{user?.name || 'Operator'}</p>
                <p className="text-xs text-purple-200">{user?.operatorId || 'OP001'}</p>
              </div>
              <ChevronDown 
                size={12} 
                className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                <div className="px-3 py-1.5 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-900">{user?.name || 'Operator'}</p>
                  <p className="text-xs text-gray-500">{user?.operatorId || 'OP001'}</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5"
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop to close dropdowns */}
      {(showDropdown || showSiteDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowDropdown(false);
            setShowSiteDropdown(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;