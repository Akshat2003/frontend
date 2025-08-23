import React from 'react';
import Select from '../Common/Select';
import Button from '../Common/Button';

const FilterBar = ({ 
  dateRange, 
  setDateRange, 
  vehicleType, 
  setVehicleType, 
  status, 
  setStatus,
  onClearFilters 
}) => {
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  const vehicleTypeOptions = [
    { value: 'all', label: 'All Vehicles' },
    { value: 'two-wheeler', label: 'Two Wheelers' },
    { value: 'four-wheeler', label: 'Four Wheelers' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
        >
          Clear All
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Date Range"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          options={dateRangeOptions}
        />
        
        <Select
          label="Vehicle Type"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          options={vehicleTypeOptions}
        />
        
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={statusOptions}
        />
      </div>
    </div>
  );
};

export default FilterBar;