'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Building2, Folder, Loader2, Filter, X, Search, Edit3, Trash2, Check, Target, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function CompanyManager({ onSelectCompany }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeCompany, setActiveCompany] = useState(null);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', industry: '', stage: '', seeking_investment: false });
  const [search, setSearch] = useState('');

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterSeeking, setFilterSeeking] = useState(''); // 'yes' | 'no' | ''

  // Overview state
  const [useOverview, setUseOverview] = useState(true);
  const [overviews, setOverviews] = useState([]);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name:'', industry:'', stage:'', seeking_investment:false });

  // Project management states
  const [unassignedProjects, setUnassignedProjects] = useState([]);
  const [newProject, setNewProject] = useState({ name:'', funding_goal:'', seeking_investment:false });
  const [creatingProject, setCreatingProject] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [projectEditingId, setProjectEditingId] = useState(null);
  const [projectEditForm, setProjectEditForm] = useState({ name:'', funding_goal:'', seeking_investment:false });
  const [projectPending, setProjectPending] = useState({});

  const [pending, setPending] = useState({}); // { [companyId]: 'saving' | 'deleting' }

  // Pagination states
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const [total, setTotal] = useState(0);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data
    const mockCompanies = [
      {
        id: 1,
        name: 'TechFlow Solutions',
        industry: 'Technology',
        stage: 'Series A',
        seeking_investment: true,
        description: 'AI-powered workflow automation platform for enterprises.',
        amount_raised: 250000,
        funding_goal: 2000000,
        project_count: 3,
        active_investment_projects: 2,
        total_invested: 180000,
        distinct_investor_count: 5
      },
      {
        id: 2,
        name: 'GreenEnergy Innovations',
        industry: 'Clean Energy',
        stage: 'Seed',
        seeking_investment: true,
        description: 'Solar panel efficiency optimization using machine learning.',
        amount_raised: 150000,
        funding_goal: 1000000,
        project_count: 2,
        active_investment_projects: 1,
        total_invested: 95000,
        distinct_investor_count: 3
      },
      {
        id: 3,
        name: 'HealthTech Dynamics',
        industry: 'Healthcare',
        stage: 'Prototype',
        seeking_investment: false,
        description: 'Wearable health monitoring devices for chronic disease management.',
        amount_raised: 50000,
        funding_goal: 500000,
        project_count: 1,
        active_investment_projects: 0,
        total_invested: 25000,
        distinct_investor_count: 2
      }
    ];

    setCompanies(mockCompanies);
    setOverviews(mockCompanies.map(c => ({ ...c, isOverview: true })));
    setTotal(mockCompanies.length);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, search, filterIndustry, filterStage, filterSeeking, page, useOverview]);

  useEffect(() => { setPage(0); }, [search, filterIndustry, filterStage, filterSeeking, useOverview]);

  const createCompany = async () => {
    if (!form.name) return alert('Name required');
    try {
      setCreating(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newCompany = {
        id: Date.now(),
        ...form,
        amount_raised: 0,
        project_count: 0,
        active_investment_projects: 0,
        total_invested: 0,
        distinct_investor_count: 0
      };
      setCompanies([newCompany, ...companies]);
      setForm({ name: '', industry: '', stage: '', seeking_investment: false });
      alert('Company created successfully!');
    } catch (e) { 
      alert('Error: ' + e.message); 
    } finally { 
      setCreating(false); 
    }
  };

  const loadUnassigned = async () => {
    if (!user) return;
    const mockUnassigned = [
      { id: 10, name: 'Research Project Alpha' },
      { id: 11, name: 'Market Analysis Beta' }
    ];
    setUnassignedProjects(mockUnassigned);
  };

  const openCompany = async (c) => {
    setActiveCompany(c);
    onSelectCompany?.(c);
    
    // Mock project data
    const mockProjects = [
      { id: 1, name: 'AI Workflow Engine', funding_goal: 500000, amount_raised: 125000, seeking_investment: true, description: 'Core automation platform development' },
      { id: 2, name: 'Enterprise Dashboard', funding_goal: 300000, amount_raised: 75000, seeking_investment: false, description: 'User interface and analytics dashboard' }
    ];
    
    setProjects(mockProjects);
    loadUnassigned();
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({ name: c.name||'', industry: c.industry||'', stage: c.stage||'', seeking_investment: !!c.seeking_investment });
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (e, c) => {
    e.stopPropagation();
    try {
      setPending(p=>({...p,[c.id]:'saving'}));
      await new Promise(resolve => setTimeout(resolve, 500));
      setCompanies(list => list.map(x=>x.id===c.id? {...x, ...editForm}: x));
      alert('Company updated successfully!');
      setEditingId(null);
    } catch (e) { 
      alert('Error: ' + e.message); 
    } finally { 
      setPending(p=>{ const { [c.id]:_, ...rest}=p; return rest; }); 
    }
  };

  const removeCompany = async (e, c) => {
    e.stopPropagation();
    if (!confirm('Delete company and unlink its projects?')) return;
    try {
      setPending(p=>({...p,[c.id]:'deleting'}));
      setCompanies(prev => prev.filter(x=>x.id!==c.id));
      setOverviews(prev => prev.filter(x=>x.id!==c.id));
      if (activeCompany?.id===c.id) { setActiveCompany(null); setProjects([]); }
      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Company deleted successfully!');
    } catch (e) { 
      alert('Error: ' + e.message); 
      load(); 
    } finally { 
      setPending(p=>{ const { [c.id]:_, ...rest}=p; return rest; }); 
    }
  };

  const createProjectInline = async () => {
    if (!newProject.name) return alert('Project name required');
    try {
      setCreatingProject(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const newProj = {
        id: Date.now(),
        ...newProject,
        funding_goal: newProject.funding_goal ? Number(newProject.funding_goal) : 0,
        amount_raised: 0
      };
      setProjects(prev => [newProj, ...prev]);
      alert('Project created successfully!');
      setNewProject({ name:'', funding_goal:'', seeking_investment:false });
    } catch (e) { 
      alert('Error: ' + e.message); 
    } finally { 
      setCreatingProject(false); 
    }
  };

  const attachProject = async (projectId) => {
    try {
      setAttaching(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Project linked successfully!');
      loadUnassigned();
    } catch (e) { 
      alert('Error: ' + e.message); 
    } finally { 
      setAttaching(false); 
    }
  };

  // Derived filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (filterIndustry && c.industry !== filterIndustry) return false;
      if (filterStage && c.stage !== filterStage) return false;
      if (filterSeeking) {
        const seeking = c.seeking_investment ? 'yes' : 'no';
        if (seeking !== filterSeeking) return false;
      }
      return true;
    });
  }, [companies, filterIndustry, filterStage, filterSeeking]);

  const displayCompanies = useMemo(() => {
    if (useOverview && overviews.length) {
      return overviews.map(o => ({ ...o, isOverview: true }));
    }
    return filteredCompanies;
  }, [useOverview, overviews, filteredCompanies]);

  const clearFilters = () => {
    setFilterIndustry('');
    setFilterStage('');
    setFilterSeeking('');
  };

  // Quick sets for dropdown options derived from companies list
  const industryOptions = useMemo(() => Array.from(new Set(companies.map(c=>c.industry).filter(Boolean))), [companies]);
  const stageOptions = useMemo(() => Array.from(new Set(companies.map(c=>c.stage).filter(Boolean))), [companies]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Company Management</h1>
          <p className="text-lg text-slate-600">Manage your companies and their projects</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center">
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <Building2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-slate-900">{companies.length}</p>
                <p className="text-sm text-slate-500">Total Companies</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center">
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-slate-900">{companies.filter(c => c.seeking_investment).length}</p>
                <p className="text-sm text-slate-500">Seeking Investment</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-slate-900">
                  ${companies.reduce((sum, c) => sum + (c.amount_raised || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">Total Raised</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center">
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-slate-900">
                  {companies.reduce((sum, c) => sum + (c.distinct_investor_count || 0), 0)}
                </p>
                <p className="text-sm text-slate-500">Total Investors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              />
            </div>
            <button
              type="button"
              onClick={()=>setShowFilters(s=>!s)}
              className="px-4 py-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors duration-200 flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {(filterIndustry||filterStage||filterSeeking) && (
                <div className="w-2 h-2 bg-emerald-500 rounded-full ml-2"></div>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Industry</label>
                <select
                  value={filterIndustry}
                  onChange={e=>setFilterIndustry(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                >
                  <option value="">All Industries</option>
                  {industryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Stage</label>
                <select
                  value={filterStage}
                  onChange={e=>setFilterStage(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                >
                  <option value="">All Stages</option>
                  {stageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Investment Status</label>
                <select
                  value={filterSeeking}
                  onChange={e=>setFilterSeeking(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                >
                  <option value="">Any Status</option>
                  <option value="yes">Seeking Investment</option>
                  <option value="no">Not Seeking</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  type="button"
                  className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors duration-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Company Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Company</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              placeholder="Company Name"
              value={form.name}
              onChange={e=>setForm({...form,name:e.target.value})}
            />
            <input
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              placeholder="Industry"
              value={form.industry}
              onChange={e=>setForm({...form,industry:e.target.value})}
            />
            <input
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              placeholder="Stage"
              value={form.stage}
              onChange={e=>setForm({...form,stage:e.target.value})}
            />
            <label className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.seeking_investment}
                onChange={e=>setForm({...form,seeking_investment:e.target.checked})}
                className="mr-2 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Seeking Investment
            </label>
            <button
              disabled={creating}
              onClick={createCompany}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center disabled:opacity-50 hover:bg-emerald-700 transition-colors duration-200"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Company
            </button>
          </div>
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading companies...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayCompanies.map(c => (
              <div
                key={c.id}
                className={`bg-white rounded-xl border hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${
                  activeCompany?.id===c.id
                    ? 'border-emerald-300 ring-2 ring-emerald-100'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
                onClick={()=>openCompany(c)}
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    {editingId===c.id ? (
                      <input
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium flex-1 mr-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        value={editForm.name}
                        onClick={e=>e.stopPropagation()}
                        onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}
                      />
                    ) : (
                      <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      {c.seeking_investment && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium border border-emerald-200">
                          Seeking Investment
                        </span>
                      )}
                      
                      {editingId===c.id ? (
                        <div className="flex space-x-1">
                          <button
                            disabled={pending[c.id]==='saving'}
                            onClick={e=>saveEdit(e,c)}
                            className="p-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 disabled:opacity-50"
                          >
                            {pending[c.id]==='saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button
                            disabled={pending[c.id]==='saving'}
                            onClick={e=>{e.stopPropagation();cancelEdit();}}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors duration-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            disabled={pending[c.id]}
                            onClick={e=>{e.stopPropagation();startEdit(c);}}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors duration-200"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            disabled={pending[c.id]}
                            onClick={e=>removeCompany(e,c)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors duration-200"
                          >
                            {pending[c.id]==='deleting' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-4">{c.description || 'No description provided.'}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs font-medium text-slate-500 mb-1">Industry</span>
                      {editingId===c.id ? (
                        <input
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          value={editForm.industry}
                          onClick={e=>e.stopPropagation()}
                          onChange={e=>setEditForm(f=>({...f,industry:e.target.value}))}
                        />
                      ) : (
                        <span className="font-medium text-slate-900">{c.industry || '—'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-500 mb-1">Stage</span>
                      {editingId===c.id ? (
                        <input
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          value={editForm.stage}
                          onClick={e=>e.stopPropagation()}
                          onChange={e=>setEditForm(f=>({...f,stage:e.target.value}))}
                        />
                      ) : (
                        <span className="font-medium text-slate-900">{c.stage || '—'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="block text-xs font-medium text-slate-500 mb-1">Amount Raised</span>
                      <span className="text-lg font-bold text-slate-900">${(c.amount_raised||0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-500 mb-1">Funding Goal</span>
                      <span className="text-lg font-bold text-slate-900">${(c.funding_goal||0).toLocaleString()}</span>
                    </div>
                  </div>

                  {c.isOverview && (
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="block text-xs font-medium text-slate-500 mb-1">Projects</span>
                        <span className="font-bold text-slate-900">{c.project_count||0}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-slate-500 mb-1">Investors</span>
                        <span className="font-bold text-slate-900">{c.distinct_investor_count||0}</span>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {c.funding_goal && Number(c.funding_goal) > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Funding Progress</span>
                        <span className="font-medium text-slate-900">
                          {Math.min(100, Math.round((Number(c.amount_raised||0)/Number(c.funding_goal))*100))}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-lg h-2 overflow-hidden">
                        <div
                          style={{width:`${Math.min(100, Math.round((Number(c.amount_raised||0)/Number(c.funding_goal))*100))}%`}}
                          className="h-2 bg-emerald-500 rounded-lg transition-all duration-700 ease-out"
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {displayCompanies.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No companies found</h3>
                <p className="text-slate-600">No companies match your current filters.</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {displayCompanies.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Page {page+1} of {Math.max(1, Math.ceil(total / pageSize))} • {total} total
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page===0}
                onClick={()=>setPage(p=>Math.max(0,p-1))}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors duration-200"
              >
                Previous
              </button>
              <button
                disabled={(page+1)*pageSize>=total}
                onClick={()=>setPage(p=>p+1)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Project Management Section */}
        {activeCompany && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <Folder className="w-5 h-5 mr-3 text-slate-600" />
                Projects for {activeCompany.name}
              </h3>
            </div>

            {/* Create Project Form */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={newProject.name}
                  onChange={e=>setNewProject(p=>({...p,name:e.target.value}))}
                  placeholder="Project name"
                  className="flex-1 min-w-48 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                />
                <input
                  value={newProject.funding_goal}
                  onChange={e=>setNewProject(p=>({...p,funding_goal:e.target.value}))}
                  placeholder="Funding goal ($)"
                  className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                />
                <label className="flex items-center text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newProject.seeking_investment}
                    onChange={e=>setNewProject(p=>({...p,seeking_investment:e.target.checked}))}
                    className="mr-2 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Seeking Investment
                </label>
                <button
                  disabled={creatingProject}
                  onClick={createProjectInline}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {creatingProject ? 'Creating...' : 'Add Project'}
                </button>
              </div>
            </div>

            {/* Projects List */}
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(p => (
                  <div key={p.id} className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-slate-900">{p.name}</h4>
                      {p.seeking_investment && (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                          Seeking Funding
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{p.description || 'No description provided.'}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Goal:</span>
                        <span className="font-medium text-slate-900">${(p.funding_goal||0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Raised:</span>
                        <span className="font-medium text-slate-900">${(p.amount_raised||0).toLocaleString()}</span>
                      </div>
                      {p.funding_goal && Number(p.funding_goal) > 0 && (
                        <div className="w-full bg-slate-100 rounded-lg h-2 overflow-hidden">
                          <div
                            style={{width:`${Math.min(100, Math.round((Number(p.amount_raised||0)/Number(p.funding_goal))*100))}%`}}
                            className="h-2 bg-emerald-500 rounded-lg transition-all duration-700 ease-out"
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">No projects linked to this company yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}