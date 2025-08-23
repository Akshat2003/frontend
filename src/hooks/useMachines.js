import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export const useMachines = () => {
  const [machines, setMachines] = useState([]);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [selectedMachinePallets, setSelectedMachinePallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get all machines with filters
  const getMachines = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMachines(filters);
      setMachines(response.data.machines || []);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get available machines by vehicle type
  const getAvailableMachines = useCallback(async (vehicleType, siteId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAvailableMachines(vehicleType, siteId);
      setAvailableMachines(response.data.machines || []);
      return response.data.machines || [];
    } catch (err) {
      setError(err.message);
      setAvailableMachines([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get machine pallets
  const getMachinePallets = useCallback(async (machineId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMachinePallets(machineId);
      setSelectedMachinePallets(response.data.pallets || []);
      return response.data.pallets || [];
    } catch (err) {
      setError(err.message);
      setSelectedMachinePallets([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get machine by ID
  const getMachineById = useCallback(async (machineId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMachineById(machineId);
      return response.data.machine;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get machine statistics
  const getMachineStatistics = useCallback(async (machineId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMachineStatistics(machineId);
      return response.data.statistics;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Occupy pallet
  const occupyPallet = useCallback(async (machineId, palletNumber, bookingId, vehicleNumber, position = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.occupyPallet(machineId, palletNumber, bookingId, vehicleNumber, position);
      return response.data.machine;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Release pallet
  const releasePallet = useCallback(async (machineId, palletNumber, bookingId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.releasePallet(machineId, palletNumber, bookingId);
      return response.data.machine;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Release vehicle
  const releaseVehicle = useCallback(async (machineId, palletNumber, vehicleNumber) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.releaseVehicle(machineId, palletNumber, vehicleNumber);
      return response.data.machine;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset states
  const resetMachineStates = useCallback(() => {
    setAvailableMachines([]);
    setSelectedMachinePallets([]);
    setError(null);
  }, []);

  return {
    machines,
    availableMachines,
    selectedMachinePallets,
    loading,
    error,
    getMachines,
    getAvailableMachines,
    getMachinePallets,
    getMachineById,
    getMachineStatistics,
    occupyPallet,
    releasePallet,
    releaseVehicle,
    resetMachineStates,
  };
};

export default useMachines;