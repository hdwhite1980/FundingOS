'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Building2, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Eye,
  Heart,
  MessageCircle,
  Filter,
  Search,
  Calendar,
  MapPin,
  Target,
  BarChart3,
  PieChart,
  Activity,
  ChevronRight,
  Plus,
  RefreshCw,
  Star,
  Clock,
  CheckCircle,
  Loader2,
  AlertTriangle,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { angelInvestorServices } from '../lib/supabase';
import toast from 'react-hot-toast';
import CompanyManager from './CompanyManager';
import Logo from './Logo';
import { StatCard } from './ui/StatCard';
import { ModalShell } from './ui/ModalShell';

const AngelInvestorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [investorData, setInvestorData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);
  
  const { user, signOut } = useAuth();

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Load initial data - wrapped in useCallback to prevent infinite loops
  const loadDashboardData = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    
    setLoading(true)
    setError(null)
    try {
      const investorProfile = await angelInvestorServices.getOrCreateAngelInvestor(user.id, user.email)
      setInvestorData(investorProfile)
    } catch (e) {
      console.error('Investor profile load failed', e)
      setError('Investor profile load failed')
    }
    try {
      const dashboardStats = await angelInvestorServices.getAngelInvestorStats(user.id)
      setStats(dashboardStats)
    } catch (e) { console.warn('Stats load failed', e) }
    try {
      const investmentOpportunities = await angelInvestorServices.getInvestmentOpportunities({ featured: true })
      setOpportunities(investmentOpportunities)
    } catch (e) { console.warn('Opportunities load failed', e) }
    try {
      const investorPortfolio = await angelInvestorServices.getInvestorPortfolio(user.id)
      setPortfolio(investorPortfolio)
    } catch (e) { console.warn('Portfolio load failed', e) }
    setLoading(false)
  }, [user?.id, user?.email]);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleInvestment = useCallback(async (projectId, investmentAmount, investmentType = 'equity') => {
    try {
      setLoading(true);
      
      const investmentData = {
        project_id: projectId,
        investment_amount: parseFloat(investmentAmount),
        investment_type: investmentType,
        investment_date: new Date().toISOString()
      };

      await angelInvestorServices.createInvestment(user.id, investmentData);
      
      toast.success('Investment completed successfully!');
      
      // Reload dashboard data to reflect changes
      await loadDashboardData();
    } catch (error) {
      console.error('Investment error:', error);
      toast.error('Failed to complete investment: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadDashboardData]);

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
            onClick={loadDashboardData}
            disabled={loading}
            className="bg-brand-600 text-white px-6 py-3 rounded-xl hover:bg-brand-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg"
          >
            {loading ? 'Loading...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  // Default data structure for new investors
  const defaultInvestorData = {
    investor: {
      name: user?.user_metadata?.full_name || "Angel Investor",
      email: user?.email || "",
      total_invested: 0,
      active_investments: 0,
      portfolio_value: 0,
      roi: 0,
      accredited_status: false,
      created_at: new Date().toISOString().split('T')[0]
    },
    portfolio: [],
    opportunities: []
  };

  const currentInvestorData = investorData || defaultInvestorData;

  // Filter opportunities based on search and filters
  const filteredOpportunities = opportunities.filter(opp => {
    const name = (opp.name || opp.project_name || '').toLowerCase();
    const industry = (opp.industry || '').toLowerCase();
    const stage = (opp.funding_stage || opp.stage || '').toLowerCase();
    const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || industry.includes(searchTerm.toLowerCase());
    const matchesIndustry = filterIndustry === 'all' || industry === filterIndustry.toLowerCase();
    const matchesStage = filterStage === 'all' || stage === filterStage.toLowerCase();
    return matchesSearch && matchesIndustry && matchesStage;
  });

  if (loading && !currentInvestorData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={DollarSign}
          label="Total Invested"
          value={`$${(currentInvestorData.investor?.total_invested || 0).toLocaleString()}`}
          sub="+12% this quarter"
        />

        <StatCard 
          icon={TrendingUp}
          label="Portfolio Value"
          value={`$${(currentInvestorData.investor?.portfolio_value || 0).toLocaleString()}`}
          sub={`+${((currentInvestorData.investor?.portfolio_value / Math.max(currentInvestorData.investor?.total_invested, 1) - 1) * 100).toFixed(1)}% ROI`}
        />

        <StatCard 
          icon={Building2}
          label="Active Investments"
          value={`${currentInvestorData.investor?.active_investments || 0}`}
          sub="+3 this month"
        />

        <StatCard 
          icon={Target}
          label="New Opportunities"
          value={`${opportunities.length}`}
          sub="Updated today"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveTab('opportunities')}
            className="flex items-center justify-between p-6 bg-brand-25 rounded-xl hover:bg-brand-50 transition-all duration-200 border border-transparent hover:border-brand-200 shadow-sm hover:shadow-md"
          >
            <div>
              <p className="font-medium text-blue-900">Browse Opportunities</p>
              <p className="text-sm text-blue-600">{opportunities.length} companies seeking funding</p>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-600" />
          </button>
          
          <button 
            onClick={() => setActiveTab('portfolio')}
            className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div>
              <p className="font-medium text-green-900">Portfolio Performance</p>
              <p className="text-sm text-green-600">Track your investments</p>
            </div>
            <ChevronRight className="w-5 h-5 text-green-600" />
          </button>
          
          <button 
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            <div>
              <p className="font-medium text-purple-900">Refresh Data</p>
              <p className="text-sm text-purple-600">Update dashboard</p>
            </div>
            {loading ? (
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            ) : (
              <ChevronRight className="w-5 h-5 text-purple-600" />
            )}
          </button>
        </div>
      </div>

      {/* Recent Portfolio Performance */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Recent Portfolio Performance</h3>
        <div className="space-y-4">
          {currentInvestorData.portfolio && currentInvestorData.portfolio.length > 0 ? (
            currentInvestorData.portfolio.map(investment => (
              <div key={investment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{investment.companies?.name || investment.companyName}</p>
                  <p className="text-sm text-gray-600">
                    {investment.companies?.industry || investment.industry} • {investment.companies?.funding_stage || investment.stage}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(investment.current_value || investment.currentValue || 0).toLocaleString()}</p>
                  <p className={`text-sm ${(investment.roi_percentage || investment.roi || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(investment.roi_percentage || investment.roi || 0) > 0 ? '+' : ''}{(investment.roi_percentage || investment.roi || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No investments yet</p>
              <p className="text-sm">Start investing in companies to see your portfolio here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const OpportunitiesTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Industries</option>
              <option value="AgriTech">AgriTech</option>
              <option value="CyberSecurity">CyberSecurity</option>
              <option value="EdTech">EdTech</option>
              <option value="HealthTech">HealthTech</option>
              <option value="CleanTech">CleanTech</option>
              <option value="FinTech">FinTech</option>
              <option value="AI/ML">AI/ML</option>
            </select>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stages</option>
              <option value="Pre-Seed">Pre-Seed</option>
              <option value="Seed">Seed</option>
              <option value="Series A">Series A</option>
              <option value="Series B">Series B</option>
            </select>
          </div>
        </div>
      </div>

      {/* Investment Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOpportunities.length > 0 ? filteredOpportunities.map(opportunity => (
          <div key={opportunity.id} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
            {opportunity.featured && (
              <div className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full mb-4">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{opportunity.name || opportunity.companyName}</h3>
                <p className="text-sm text-gray-600">{opportunity.industry} • {opportunity.funding_stage || opportunity.stage}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Goal</p>
                <p className="font-semibold">${(opportunity.funding_goal || opportunity.fundingGoal || 0).toLocaleString()}</p>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{opportunity.description}</p>

            {/* Funding Progress */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Funding Progress</span>
                <span className="text-sm font-medium">
                  ${(opportunity.amount_raised || opportunity.raised || 0).toLocaleString()} / ${(opportunity.funding_goal || opportunity.fundingGoal || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-brand-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(((opportunity.amount_raised || opportunity.raised || 0) / (opportunity.funding_goal || opportunity.fundingGoal || 1)) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>{opportunity.investor_count || opportunity.investorCount || 0} investors</span>
                <span>{opportunity.days_left || opportunity.daysLeft || 'N/A'} days left</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Monthly Revenue</p>
                <p className="font-semibold">${(opportunity.monthly_revenue || opportunity.monthlyRevenue || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Growth Rate</p>
                <p className="font-semibold">{opportunity.growth_rate || opportunity.growthRate || 0}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Team Size</p>
                <p className="font-semibold">{opportunity.employee_count || opportunity.teamSize || 0}</p>
              </div>
            </div>

            {/* Highlights */}
            {(opportunity.highlights && opportunity.highlights.length > 0) && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Key Highlights:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {opportunity.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedInvestment(opportunity)}
                disabled={loading}
                className="flex-1 bg-brand-600 text-white py-3 px-6 rounded-xl hover:bg-brand-700 transition-all duration-200 font-semibold disabled:bg-neutral-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Invest Now
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-2 text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No opportunities found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );

  const PortfolioTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Portfolio Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentInvestorData.portfolio && currentInvestorData.portfolio.length > 0 ? (
            currentInvestorData.portfolio.map(investment => (
              <div key={investment.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{investment.companies?.name || investment.companyName}</h4>
                    <p className="text-sm text-gray-600">{investment.companies?.industry || investment.industry} • {investment.companies?.funding_stage || investment.stage}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (investment.status || 'active') === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {investment.status || 'active'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Invested</p>
                    <p className="font-semibold">${(investment.investment_amount || investment.invested || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Value</p>
                    <p className="font-semibold">${(investment.current_value || investment.currentValue || 0).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">ROI</p>
                    <p className={`font-semibold ${(investment.roi_percentage || investment.roi || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(investment.roi_percentage || investment.roi || 0) > 0 ? '+' : ''}{(investment.roi_percentage || investment.roi || 0).toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Invested: {new Date(investment.investment_date || investment.investmentDate || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12">
              <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No investments yet</h3>
              <p className="text-gray-600 mb-4">Start building your portfolio by investing in promising companies</p>
              <button 
                onClick={() => setActiveTab('opportunities')}
                className="bg-brand-600 text-white px-8 py-3 rounded-xl hover:bg-brand-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
              >
                Browse Opportunities
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Investment Modal
  const InvestmentModal = ({ opportunity, onClose }) => {
    const [investmentAmount, setInvestmentAmount] = useState(opportunity?.minimum_investment || opportunity?.minimumInvestment || 0);

    if (!opportunity) return null;

    const minInvestment = opportunity.minimum_investment || opportunity.minimumInvestment || 0;
    const companyName = opportunity.name || opportunity.companyName || 'Company';

    const submitInvestment = async () => {
      await handleInvestment(opportunity.id || opportunity.project_id, investmentAmount, 'equity');
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h3 className="text-xl font-semibold mb-4">Invest in {companyName}</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Investment Amount</p>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                min={minInvestment}
                className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum investment: ${minInvestment.toLocaleString()}
            </p>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Investment Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Company:</span>
                  <span>{companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stage:</span>
                  <span>{opportunity.funding_stage || opportunity.stage || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your Investment:</span>
                  <span className="font-semibold">${investmentAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>
            <button onClick={submitInvestment} className="px-6 py-3 rounded-xl bg-brand-600 text-white hover:bg-brand-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200">Confirm Investment</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 border-b border-green-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-8 gap-6">
            <div className="flex items-center space-x-6">
              <Logo variant="light" size="lg" showText={false} />
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Angel Investor Dashboard</h1>
                <p className="text-green-100 text-lg">Welcome back, {currentInvestorData.investor?.name || user?.user_metadata?.full_name || 'Angel Investor'}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="text-right">
                <p className="text-sm text-green-100 font-semibold mb-2">Portfolio Value</p>
                <p className="text-3xl font-bold text-white">
                  ${(currentInvestorData.investor?.portfolio_value || 0).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm border border-white border-opacity-30">
                  <span className="text-white font-semibold text-lg">
                    {(currentInvestorData.investor?.name || user?.user_metadata?.full_name || 'AI').split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm text-white hover:text-red-200 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 border border-white border-opacity-30 hover:border-red-200"
                  title="Logout"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <nav className="flex space-x-2 overflow-x-auto py-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'opportunities', label: 'Investment Opportunities', icon: Target },
              { id: 'portfolio', label: 'My Portfolio', icon: PieChart },
              { id: 'companies', label: 'Companies', icon: Building2 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-green-100 border-2 border-green-300 text-green-800 shadow-sm'
                      : 'text-neutral-600 hover:text-green-700 hover:bg-green-50 border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'opportunities' && <OpportunitiesTab />}
        {activeTab === 'portfolio' && <PortfolioTab />}
        {activeTab === 'companies' && <CompanyManager onSelectCompany={()=>{}} />}
      </div>

      {/* Investment Modal */}
      {selectedInvestment && (
        <InvestmentModal
          opportunity={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
        />
      )}
    </div>
  );
};

export default AngelInvestorDashboard;