import React, { useState, useEffect } from 'react';
import { Crown, Users, Phone, Mail, Car } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Members = () => {
  const { customers, loading, error, getCustomers } = useCustomers();
  const [activeMembers, setActiveMembers] = useState([]);

  useEffect(() => {
    getCustomers({ 
      limit: 1000, // Get all customers
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }, []);

  useEffect(() => {
    if (customers && customers.length > 0) {
      // Filter customers with active memberships
      const membersWithActiveMembership = customers.filter(customer => 
        customer.hasMembership && 
        customer.membership && 
        customer.membership.isActive &&
        customer.membership.expiresAt &&
        new Date(customer.membership.expiresAt) > new Date()
      );
      setActiveMembers(membersWithActiveMembership);
    }
  }, [customers]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMembershipType = (type) => {
    const types = {
      'daily': 'Daily Pass',
      'weekly': 'Weekly Pass', 
      'monthly': 'Monthly Pass',
      'yearly': 'Yearly Pass'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Crown className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Members</h1>
            <p className="text-gray-600">{activeMembers.length} customers with active memberships</p>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeMembers.length === 0 ? (
          <div className="p-6 md:p-8 text-center text-gray-500">
            <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-gray-300" />
            <p>No active members found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activeMembers.map((member) => (
              <div key={member._id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                {/* Mobile Layout */}
                <div className="block sm:hidden">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Crown className="text-purple-600 w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">
                        {member.fullName}
                      </h3>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span>{member.phoneNumber}</span>
                        </div>
                        {member.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center text-xs text-gray-500">
                            <Car className="h-3 w-3 mr-1" />
                            <span>{member.vehicles?.length || 0}</span>
                          </div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {formatMembershipType(member.membership?.type)}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          Expires: {formatDate(member.membership?.expiresAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Desktop Layout */}
                <div className="hidden sm:block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Crown className="text-purple-600 w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900">
                          {member.fullName}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1.5" />
                            <span>{member.phoneNumber}</span>
                          </div>
                          {member.email && (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-1.5" />
                              <span className="truncate max-w-40">{member.email}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Car className="h-4 w-4 mr-1.5" />
                            <span>{member.vehicles?.length || 0} vehicle{member.vehicles?.length !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {formatMembershipType(member.membership?.type)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Member since {formatDate(member.createdAt)} • Expires: {formatDate(member.membership?.expiresAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Members;