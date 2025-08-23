import React, { useState } from 'react';
import { ArrowLeft, Mail, Send, CheckCircle, Smartphone } from 'lucide-react';
import Button from '../../components/Common/Button';
import Input from '../../components/Common/Input';
import apiService, { ApiError } from '../../services/api';

const ForgotPassword = ({ onBackToLogin }) => {
  const [step, setStep] = useState('email'); // 'email', 'sent', 'reset'
  const [formData, setFormData] = useState({
    operatorId: '',
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [resetToken, setResetToken] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEmailStep = () => {
    const newErrors = {};

    if (!formData.operatorId.trim()) {
      newErrors.operatorId = 'Operator ID is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResetStep = () => {
    const newErrors = {};

    if (!formData.otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (formData.otp.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!validateEmailStep()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiService.forgotPassword(formData.operatorId, formData.email);
      
      if (response.success) {
        // Store reset token for later use
        if (response.data.resetToken) {
          setResetToken(response.data.resetToken);
        }
        setStep('sent');
      } else {
        setErrors({ general: response.message || 'Failed to send OTP' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      
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
        setErrors({ general: 'Failed to send OTP. Please check your connection and try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!validateResetStep()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiService.resetPassword(
        resetToken,
        formData.otp,
        formData.newPassword,
        formData.confirmPassword
      );
      
      if (response.success) {
        setStep('success');
      } else {
        setErrors({ general: response.message || 'Failed to reset password' });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      
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
        setErrors({ general: 'Failed to reset password. Please check your connection and try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendOTP} className="space-y-6">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{errors.general}</p>
        </div>
      )}

      <Input
        label="Operator ID"
        name="operatorId"
        value={formData.operatorId}
        onChange={handleInputChange}
        error={errors.operatorId}
        placeholder="Enter your operator ID"
        required
      />

      <div className="relative">
        <Mail className="absolute left-3 top-9 text-gray-400" size={18} />
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          placeholder="Enter your email address"
          className="pl-11"
          required
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Sending OTP...
          </>
        ) : (
          <>
            <Send size={18} className="mr-2" />
            Send Reset Code
          </>
        )}
      </Button>
    </form>
  );

  const renderSentStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg">
        <Mail className="text-blue-600 mx-auto mb-3" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
        <p className="text-gray-600 text-sm">
          We've sent a 6-digit verification code to
        </p>
        <p className="font-medium text-gray-900">{formData.email}</p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{errors.general}</p>
          </div>
        )}

        <Input
          label="Enter 6-digit OTP"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
          error={errors.otp}
          placeholder="000000"
          maxLength={6}
          className="text-center text-lg tracking-widest font-mono"
          required
        />

        <Input
          label="New Password"
          name="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={handleInputChange}
          error={errors.newPassword}
          placeholder="Enter new password"
          required
        />

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          error={errors.confirmPassword}
          placeholder="Confirm new password"
          required
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>

      <button
        onClick={() => setStep('email')}
        className="text-sm text-purple-600 hover:text-purple-700"
      >
        Didn't receive the code? Try again
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-green-50 p-6 rounded-lg">
        <CheckCircle className="text-green-600 mx-auto mb-3" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Reset Successful</h3>
        <p className="text-gray-600 text-sm">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
      </div>

      <Button onClick={onBackToLogin} className="w-full">
        Back to Sign In
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            {step === 'email' && 'Enter your details to receive a reset code'}
            {step === 'sent' && 'Enter the code and your new password'}
            {step === 'success' && 'Your password has been reset'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {step === 'email' && renderEmailStep()}
          {step === 'sent' && renderSentStep()}
          {step === 'success' && renderSuccessStep()}
        </div>

        {/* Back to Login */}
        {step !== 'success' && (
          <div className="text-center mt-6">
            <button
              onClick={onBackToLogin}
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;