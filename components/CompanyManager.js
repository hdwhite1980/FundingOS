'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { companiesServices } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Building2, Folder, Loader2, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';

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
    const common = { search, limit: pageSize, offset: page * pageSize };
    const [listRes, ovsRes] = await Promise.all([
      companiesServices.listCompanies(user.id, common),
      companiesServices.listCompanyOverviews(user.id, {
        ...common,
        industry: filterIndustry || undefined,
        stage: filterStage || undefined,
        seeking_investment: filterSeeking ? filterSeeking === 'yes' : undefined
      })
    ]);
    setCompanies(listRes.data);
    setTotal(useOverview ? ovsRes.count : listRes.count);
    setOverviews(ovsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, search, filterIndustry, filterStage, filterSeeking, page, useOverview]);

  useEffect(() => { setPage(0); }, [search, filterIndustry, filterStage, filterSeeking, useOverview]);

  const createCompany = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Name required');
    try {
      setCreating(true);
      const created = await companiesServices.createCompany(user.id, form);
      toast.success('Company created');
      setForm({ name: '', industry: '', stage: '', seeking_investment: false });
      setCompanies([created, ...companies]);
    } catch (e) { toast.error(e.message); } finally { setCreating(false); }
  };

  const loadUnassigned = async () => {
    if (!user) return;
    const list = await companiesServices.listUnassignedProjects(user.id);
    setUnassignedProjects(list);
  };

  const openCompany = async (c) => {
    setActiveCompany(c);
    onSelectCompany?.(c);
    const proj = await companiesServices.getCompanyProjects(user.id, c.id);
    setProjects(proj);
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
      // optimistic update
      const prev = companies;
      setCompanies(list => list.map(x=>x.id===c.id? {...x, ...editForm}: x));
      const updated = await companiesServices.updateCompany(user.id, c.id, editForm);
      setCompanies(prevList => prevList.map(x=>x.id===c.id? updated: x));
      if (overviews.length) setOverviews(prev => prev.map(x=>x.id===c.id? { ...x, ...updated }: x));
      toast.success('Updated');
      setEditingId(null);
    } catch (e) { toast.error(e.message); } finally { setPending(p=>{ const { [c.id]:_, ...rest}=p; return rest; }); }
  };
  const removeCompany = async (e, c) => {
    e.stopPropagation();
    if (!confirm('Delete company and unlink its projects?')) return;
    try {
      setPending(p=>({...p,[c.id]:'deleting'}));
      // optimistic remove
      setCompanies(prev => prev.filter(x=>x.id!==c.id));
      setOverviews(prev => prev.filter(x=>x.id!==c.id));
      if (activeCompany?.id===c.id) { setActiveCompany(null); setProjects([]); }
      await companiesServices.deleteCompany(user.id, c.id);
      toast.success('Deleted');
    } catch (e) { toast.error(e.message); load(); } finally { setPending(p=>{ const { [c.id]:_, ...rest}=p; return rest; }); }
  };

  const createProjectInline = async (e) => {
    e.preventDefault();
    if (!newProject.name) return toast.error('Project name required');
    try {
      setCreatingProject(true);
      const payload = { ...newProject, funding_goal: newProject.funding_goal ? Number(newProject.funding_goal) : null };
      const created = await companiesServices.createProjectForCompany(user.id, activeCompany.id, payload);
      setProjects(prev => [created, ...prev]);
      toast.success('Project created');
      setNewProject({ name:'', funding_goal:'', seeking_investment:false });
    } catch (e) { toast.error(e.message); } finally { setCreatingProject(false); }
  };

  const attachProject = async (projectId) => {
    try {
      setAttaching(true);
      await companiesServices.attachProject(user.id, projectId, activeCompany.id);
      toast.success('Project linked');
      const proj = await companiesServices.getCompanyProjects(user.id, activeCompany.id);
      setProjects(proj);
      loadUnassigned();
    } catch (e) { toast.error(e.message); } finally { setAttaching(false); }
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
      // Map overviews to shape similar to companies but keep aggregate fields
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Building2 className='w-5 h-5'/> Companies</h2>
        <div className='flex gap-2 items-center'>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search companies...' className='border px-3 py-1 rounded text-sm'/>
          <button type='button' onClick={()=>setShowFilters(s=>!s)} className='border px-3 py-1 rounded text-sm flex items-center gap-1'>
            <Filter className='w-4 h-4'/> Filters { (filterIndustry||filterStage||filterSeeking) && <span className='text-blue-600'>•</span> }
          </button>
        </div>
      </div>

      {showFilters && (
        <div className='bg-white border rounded p-4 grid md:grid-cols-4 gap-4 relative'>
          <div>
            <label className='text-xs font-medium text-gray-600'>Industry</label>
            <select value={filterIndustry} onChange={e=>setFilterIndustry(e.target.value)} className='mt-1 w-full border rounded p-2 text-sm'>
              <option value=''>All</option>
              {industryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className='text-xs font-medium text-gray-600'>Stage</label>
            <select value={filterStage} onChange={e=>setFilterStage(e.target.value)} className='mt-1 w-full border rounded p-2 text-sm'>
              <option value=''>All</option>
              {stageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className='text-xs font-medium text-gray-600'>Seeking Investment</label>
            <select value={filterSeeking} onChange={e=>setFilterSeeking(e.target.value)} className='mt-1 w-full border rounded p-2 text-sm'>
              <option value=''>Any</option>
              <option value='yes'>Yes</option>
              <option value='no'>No</option>
            </select>
          </div>
          <div className='flex flex-col justify-end gap-2'>
            <button onClick={clearFilters} type='button' className='text-xs px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-1'>
              <X className='w-3 h-3'/> Clear
            </button>
          </div>
        </div>
      )}

      <form onSubmit={createCompany} className='grid md:grid-cols-5 gap-3 bg-white p-4 rounded border'>
        <input className='border p-2 rounded text-sm' placeholder='Name' value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input className='border p-2 rounded text-sm' placeholder='Industry' value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}/>
        <input className='border p-2 rounded text-sm' placeholder='Stage' value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}/>
        <label className='flex items-center gap-2 text-xs text-gray-600'>
          <input type='checkbox' checked={form.seeking_investment} onChange={e=>setForm({...form,seeking_investment:e.target.checked})}/> Seeking
        </label>
        <button disabled={creating} className='bg-emerald-600 text-white rounded px-4 py-2 flex items-center justify-center gap-1 text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50'>
          {creating ? <Loader2 className='w-4 h-4 animate-spin'/> : <Plus className='w-4 h-4'/>} Create
        </button>
      </form>

      {loading ? <div className='flex items-center gap-2 text-gray-600 text-sm'><Loader2 className='w-4 h-4 animate-spin'/> Loading companies...</div> : (
        <>
        <div className='grid md:grid-cols-3 gap-4'>
          {displayCompanies.map(c => (
            <div key={c.id} className={`border rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer ${activeCompany?.id===c.id?'ring-2 ring-emerald-500 border-emerald-200':''}`} onClick={()=>openCompany(c)}>
              <div className='flex justify-between items-start'>
                {editingId===c.id ? (
                  <input className='border rounded px-2 py-1 text-xs w-40' value={editForm.name} onClick={e=>e.stopPropagation()} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
                ) : (
                  <h3 className='font-medium text-gray-900'>{c.name}</h3>
                )}
                <div className='flex gap-1'>
                  {editingId===c.id ? (
                    <>
                      <button disabled={pending[c.id]==='saving'} onClick={e=>saveEdit(e,c)} className='text-[10px] px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50'>{pending[c.id]==='saving'?'Saving...':'Save'}</button>
                      <button disabled={pending[c.id]==='saving'} onClick={e=>{e.stopPropagation();cancelEdit();}} className='text-[10px] px-2 py-1 border rounded'>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button disabled={pending[c.id]} onClick={e=>{e.stopPropagation();startEdit(c);}} className='text-[10px] px-2 py-1 border rounded'>{pending[c.id]==='saving'?'...':'Edit'}</button>
                      <button disabled={pending[c.id]} onClick={e=>removeCompany(e,c)} className='text-[10px] px-2 py-1 border rounded text-red-600'>{pending[c.id]==='deleting'?'...':'Del'}</button>
                    </>
                  )}
                  {c.seeking_investment && <span className='text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded h-fit'>Seeking</span>}
                </div>
              </div>
              <div className='mt-2 flex flex-wrap gap-2 text-xs text-gray-500'>
                <div>
                  <label className='block uppercase tracking-wide text-[10px] font-medium text-gray-400'>Industry</label>
                  {editingId===c.id ? <input className='border rounded px-2 py-1 text-[11px]' value={editForm.industry} onClick={e=>e.stopPropagation()} onChange={e=>setEditForm(f=>({...f,industry:e.target.value}))}/> : <span>{c.industry||'—'}</span>}
                </div>
                <div>
                  <label className='block uppercase tracking-wide text-[10px] font-medium text-gray-400'>Stage</label>
                  {editingId===c.id ? <input className='border rounded px-2 py-1 text-[11px]' value={editForm.stage} onClick={e=>e.stopPropagation()} onChange={e=>setEditForm(f=>({...f,stage:e.target.value}))}/> : <span>{c.stage||'—'}</span>}
                </div>
                <div className='flex items-center gap-1'>
                  {editingId===c.id ? (
                    <label className='flex items-center gap-1 text-[11px]' onClick={e=>e.stopPropagation()}>
                      <input type='checkbox' checked={editForm.seeking_investment} onChange={e=>setEditForm(f=>({...f,seeking_investment:e.target.checked}))}/> Seeking
                    </label>
                  ) : null}
                </div>
              </div>
              <p className='text-[11px] text-gray-400 mt-2 line-clamp-2'>{c.description || 'No description yet.'}</p>
              <div className='mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-600'>
                <div>
                  <span className='block font-medium'>Raised</span>
                  <span>${Number(c.amount_raised||0).toLocaleString()}</span>
                </div>
                {c.funding_goal && <div>
                  <span className='block font-medium'>Goal</span>
                  <span>${Number(c.funding_goal).toLocaleString()}</span>
                </div>}
                {c.isOverview && <>
                  <div>
                    <span className='block font-medium'>Projects</span>
                    <span>{c.project_count||0}</span>
                  </div>
                  <div>
                    <span className='block font-medium'>Active Invest.</span>
                    <span>{c.active_investment_projects||0}</span>
                  </div>
                  <div>
                    <span className='block font-medium'>Total Inv.</span>
                    <span>${Number(c.total_invested||0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className='block font-medium'>Investors</span>
                    <span>{c.distinct_investor_count||0}</span>
                  </div>
                </>}
              </div>
              {c.funding_goal && Number(c.funding_goal)>0 && (
                <div className='mt-2'>
                  {(() => { const pct=Math.min(100, Math.round((Number(c.amount_raised||0)/Number(c.funding_goal))*100)); return (
                    <div className='w-full bg-gray-100 h-2 rounded'>
                      <div style={{width:`${pct}%`}} className={`h-2 rounded transition-all ${pct>79?'bg-emerald-500':pct>49?'bg-emerald-500':'bg-amber-400'}`}></div>
                    </div>
                  ); })()}
                </div>
              )}
            </div>
          ))}
          {displayCompanies.length===0 && <div className='col-span-full text-sm text-gray-500 border rounded p-6 text-center'>No companies match filters.</div>}
        </div>
        <div className='flex items-center justify-between mt-4 text-xs'>
          <span className='text-gray-500'>Page {page+1} of {Math.max(1, Math.ceil(total / pageSize))} • {total} total</span>
          <div className='flex gap-2'>
            <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className='px-3 py-1 border rounded disabled:opacity-40'>Prev</button>
            <button disabled={(page+1)*pageSize>=total} onClick={()=>setPage(p=>p+1)} className='px-3 py-1 border rounded disabled:opacity-40'>Next</button>
          </div>
        </div>
        </>
      )}

      {activeCompany && (
        <div className='mt-8 space-y-6'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
            <h3 className='text-lg font-semibold flex items-center gap-2'><Folder className='w-4 h-4'/> Projects for {activeCompany.name}</h3>
            <div className='flex flex-wrap gap-3'>
              <form onSubmit={createProjectInline} className='flex items-center gap-2 bg-white border rounded px-3 py-2'>
                <input value={newProject.name} onChange={e=>setNewProject(p=>({...p,name:e.target.value}))} placeholder='New project name' className='border rounded px-2 py-1 text-xs'/>
                <input value={newProject.funding_goal} onChange={e=>setNewProject(p=>({...p,funding_goal:e.target.value}))} placeholder='Goal $' className='border rounded px-2 py-1 text-xs w-24'/>
                <label className='flex items-center gap-1 text-[11px]'>
                  <input type='checkbox' checked={newProject.seeking_investment} onChange={e=>setNewProject(p=>({...p,seeking_investment:e.target.checked}))}/> Seeking
                </label>
                <button disabled={creatingProject} className='bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 transition-colors disabled:opacity-50'>
                  {creatingProject? '...' : 'Add'}
                </button>
              </form>
              <div className='flex items-center gap-2 bg-white border rounded px-3 py-2'>
                <select disabled={attaching||!unassignedProjects.length} onChange={e=>{ if(e.target.value) { attachProject(e.target.value); e.target.value=''; }}} className='text-xs border rounded px-2 py-1'>
                  <option value=''>{attaching? 'Attaching...' : 'Attach existing project'}</option>
                  {unassignedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          {projects.length ? (
            <div className='grid md:grid-cols-2 gap-4'>
              {projects.map(p => (
                <div key={p.id} className='border rounded p-4 bg-white'>
                  <div className='flex justify-between items-start'>
                    {projectEditingId===p.id ? (
                      <input className='border rounded px-2 py-1 text-xs w-40' value={projectEditForm.name} onChange={e=>setProjectEditForm(f=>({...f,name:e.target.value}))}/>
                    ) : (
                      <h4 className='font-medium text-gray-900'>{p.name}</h4>
                    )}
                    <div className='flex gap-1'>
                      {projectEditingId===p.id ? (
                        <>
                          <button disabled={projectPending[p.id]==='saving'} onClick={()=>saveProjectEdit(p)} className='text-[10px] px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50'>{projectPending[p.id]==='saving'?'Saving...':'Save'}</button>
                          <button disabled={projectPending[p.id]==='saving'} onClick={()=>cancelProjectEdit()} className='text-[10px] px-2 py-1 border rounded'>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button disabled={projectPending[p.id]} onClick={()=>startProjectEdit(p)} className='text-[10px] px-2 py-1 border rounded'>Edit</button>
                          <button disabled={projectPending[p.id]} onClick={()=>deleteProject(p)} className='text-[10px] px-2 py-1 border rounded text-red-600'>{projectPending[p.id]==='deleting'?'...':'Del'}</button>
                        </>
                      )}
                      {p.seeking_investment && <span className='text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded'>Funding</span>}
                    </div>
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500'>
                    <div>
                      <label className='block uppercase tracking-wide text-[9px] font-medium text-gray-400'>Goal</label>
                      {projectEditingId===p.id ? <input className='border rounded px-2 py-1 w-24' value={projectEditForm.funding_goal} onChange={e=>setProjectEditForm(f=>({...f,funding_goal:e.target.value}))}/> : <span>${Number(p.funding_goal||0).toLocaleString()}</span>}
                    </div>
                    <div className='flex items-center'>
                      {projectEditingId===p.id && (
                        <label className='flex items-center gap-1 text-[11px]'>
                          <input type='checkbox' checked={projectEditForm.seeking_investment} onChange={e=>setProjectEditForm(f=>({...f,seeking_investment:e.target.checked}))}/> Seeking
                        </label>
                      )}
                    </div>
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>Goal: ${Number(p.funding_goal||0).toLocaleString()}</p>
                  <p className='text-xs text-gray-400 mt-2 line-clamp-2'>{p.description||'No description.'}</p>
                  {p.funding_goal && Number(p.funding_goal)>0 && (
                    <div className='mt-2'>
                      {(() => { const pct=Math.min(100, Math.round((Number(p.amount_raised||0)/Number(p.funding_goal))*100)); return (
                        <div className='w-full bg-gray-100 h-2 rounded'>
                          <div style={{width:`${pct}%`}} className={`h-2 rounded transition-all ${pct>79?'bg-green-500':pct>49?'bg-green-500':'bg-yellow-400'}`}></div>
                        </div>
                      ); })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className='text-sm text-gray-500 border rounded p-6'>No projects linked yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
