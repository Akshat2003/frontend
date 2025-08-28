import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const SiteContext = createContext();

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};

export const SiteProvider = ({ children }) => {
  const [currentSite, setCurrentSite] = useState(null);
  const [availableSites, setAvailableSites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize sites from user data
  const initializeSites = (user) => {
    if (!user) {
      setCurrentSite(null);
      setAvailableSites([]);
      return;
    }

    // For admin users, they can access all sites (we'll load this separately)
    // For non-admin users, use their assigned sites
    if (user.role === 'admin') {
      setAvailableSites([]); // Will be loaded via API call
      // Set current site from localStorage or use first available
      const savedSiteId = localStorage.getItem('selectedSiteId');
      if (savedSiteId) {
        // We'll validate this site exists when available sites are loaded
        setCurrentSite({ siteId: savedSiteId });
      }
    } else {
      // For operators/supervisors, use their assigned sites
      const sites = user.assignedSites?.map(assignment => assignment.site) || [];
      setAvailableSites(sites);
      
      // Set primary site as current, or first available site
      const primarySite = user.primarySite || sites[0];
      if (primarySite) {
        setCurrentSite(primarySite);
        localStorage.setItem('selectedSiteId', primarySite.siteId);
      } else if (sites.length > 0) {
        // Fallback: use first assigned site if no primary site
        setCurrentSite(sites[0]);
        localStorage.setItem('selectedSiteId', sites[0].siteId);
      }
    }
  };

  // Load all sites for admin users
  const loadAllSites = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getSites({ status: 'active' });
      setAvailableSites(response.data.sites || []);
      
      // If no current site is set, use the first available
      if (!currentSite && response.data.sites.length > 0) {
        const firstSite = response.data.sites[0];
        setCurrentSite(firstSite);
        localStorage.setItem('selectedSiteId', firstSite.siteId);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Change current site (for admin users)
  const changeSite = (site) => {
    setCurrentSite(site);
    localStorage.setItem('selectedSiteId', site.siteId);
    
    // Emit custom event to notify other components of site change
    window.dispatchEvent(new CustomEvent('siteChanged', { 
      detail: { site } 
    }));
  };

  // Clear site data (on logout)
  const clearSiteData = () => {
    setCurrentSite(null);
    setAvailableSites([]);
    localStorage.removeItem('selectedSiteId');
  };

  const value = {
    currentSite,
    availableSites,
    isLoading,
    initializeSites,
    loadAllSites,
    changeSite,
    clearSiteData,
    canChangeSite: availableSites.length > 1
  };

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
};

export default SiteContext;