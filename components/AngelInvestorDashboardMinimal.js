'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { angelInvestorServices } from '../lib/supabase';

const AngelInvestorDashboardMinimal = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [investorData, setInvestorData] = useState(null);
  
  const { user } = useAuth();

  // Simplified data loading with useCallback
  const loadData = useCallback(async () => {
    if (!user?.id || !user?.email) {
      setLoading(false);
      return;
    }
    
    console.log('Loading dashboard data for user:', user.id);
    setLoading(true);
    setError(null);
    
    try {
      const investorProfile = await angelInvestorServices.getOrCreateAngelInvestor(user.id, user.email);
      console.log('Investor profile loaded:', investorProfile);
      setInvestorData(investorProfile);
    } catch (e) {
      console.error('Dashboard load error:', e);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  // Load data effect
  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !investorData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading angel investor dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Angel Investor Dashboard - Minimal</h1>
              <p className="text-gray-600">Welcome back, {investorData?.name || user?.user_metadata?.full_name || 'Angel Investor'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Dashboard Test - Checking for Infinite Loops</h3>
          {investorData ? (
            <div className="space-y-4">
              <p><strong>Name:</strong> {investorData.name}</p>
              <p><strong>Email:</strong> {investorData.email}</p>
              <p><strong>Total Invested:</strong> ${(investorData.total_invested || 0).toLocaleString()}</p>
              <p><strong>Portfolio Value:</strong> ${(investorData.portfolio_value || 0).toLocaleString()}</p>
              <p><strong>Active Investments:</strong> {investorData.active_investments || 0}</p>
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✅ Success!</h4>
                <p className="text-green-700 text-sm">
                  If you see this message without React errors, the basic dashboard structure works. 
                  The issue was likely in the complex UI components or additional useEffect hooks.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No investor data loaded.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AngelInvestorDashboardMinimal;
