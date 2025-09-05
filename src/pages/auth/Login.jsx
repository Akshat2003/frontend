import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Smartphone } from 'lucide-react';
import Button from '../../components/Common/Button';
import Input from '../../components/Common/Input';
import apiService, { ApiError } from '../../services/api';

const Login = ({ onLogin, onForgotPassword }) => {
  const [formData, setFormData] = useState({
    operatorId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.operatorId.trim()) {
      newErrors.operatorId = 'Operator ID is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiService.login(formData.operatorId, formData.password);
      
      if (response.success) {
        onLogin(response.data.user);
      } else {
        setErrors({ general: response.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof ApiError) {
        if (error.isValidationError()) {
          const validationErrors = {};
          error.getValidationErrors().forEach(err => {
            validationErrors[err.field] = err.message;
          });
          setErrors(validationErrors);
        } else {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'Login failed. Please check your connection and try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Parking Operator</h1>
          <p className="text-gray-600 mt-2">Sign in to manage parking operations</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Operator ID Field */}
            <div className="relative">
              <User className="absolute left-3 top-9 text-gray-400" size={18} />
              <Input
                label="Operator ID"
                name="operatorId"
                value={formData.operatorId}
                onChange={handleInputChange}
                error={errors.operatorId}
                placeholder="Enter your operator ID"
                className="pl-11"
                required
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Lock className="absolute left-3 top-9 text-gray-400" size={18} />
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                placeholder="Enter your password"
                className="pl-11 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} className="mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help? Contact{' '}
            <a href="mailto:support@parkingapp.com" className="text-purple-600 hover:text-purple-700">
              support@parkingapp.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;