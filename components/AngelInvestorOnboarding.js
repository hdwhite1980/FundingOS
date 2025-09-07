"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { angelInvestorServices } from '../lib/supabase';
import toast from 'react-hot-toast';

/*
  Angel Investor Onboarding
  Progressive disclosure:
  Step 1 (Essential): Q1,2,3,5,9,14
  Step 2 (Preferences): Q7,16,17,20,27
  Step 3 (Enhancement Core): Remaining high-impact (limit subset for MVP)
  Step 4 (Verification placeholder)

  Data stored in angel_investors.investment_preferences JSON:
  {
    core: { investment_range, annual_investment_range, stages, industries, experience_level, accredited_status },
    preferences: { geographies, motivations, involvement_level, decision_speed, evaluation_rank, notification_frequency },
    enhancement: { expertise, exits, equity_range, professional_background },
    flags: { core_completed, preferences_completed, enhancement_completed }
  }
*/

const INVESTMENT_RANGES = ["1k_5k","5k_25k","25k_100k","100k_500k","500k_plus"];
const ANNUAL_RANGES = ["under_50k","50k_250k","250k_1m","1m_5m","5m_plus"];
const STAGES = ["pre_seed","seed","series_a","series_b_plus"];
const EQUITY_RANGES = ["under_1","1_5","5_15","15_25","25_plus"];
const INDUSTRIES = [
  "Technology/Software","Healthcare/Biotech","FinTech","E-commerce/Retail","Manufacturing","Clean Energy/Sustainability","Food & Beverage","Real Estate/PropTech","Education/EdTech","Entertainment/Media","Agriculture/AgTech","Transportation/Logistics","Other"
];
const EXPERIENCE_LEVELS = ["new","emerging","experienced","seasoned"];
const ACCREDITED_STATUSES = ["verified","need_verification","no","prefer_not"];
const GEOGRAPHIES = ["local","regional","national","international","remote_first"];
const MOTIVATIONS = ["financial","supporting","expertise","networking","giving_back","learning"];
const INVOLVEMENT = ["hands_on","moderate","light","passive"];
const DECISION_SPEED = ["same_week","2_4_weeks","1_2_months","3_plus_months"];
const NOTIFICATION_FREQ = ["daily","weekly","monthly","high_priority_only"];
const EVALUATION_ITEMS = ["team","market","product","model","financials"];

export default function AngelInvestorOnboarding({ user, investor, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const prefs = investor?.investment_preferences || {};

  const [core, setCore] = useState({
    investment_range: prefs.core?.investment_range || "",
    annual_investment_range: prefs.core?.annual_investment_range || "",
    stages: prefs.core?.stages || [],
    industries: prefs.core?.industries || [],
    experience_level: prefs.core?.experience_level || "",
    accredited_status: prefs.core?.accredited_status || ""
  });

  const [preferences, setPreferences] = useState({
    geographies: prefs.preferences?.geographies || [],
    motivations: prefs.preferences?.motivations || [],
    involvement_level: prefs.preferences?.involvement_level || "",
    decision_speed: prefs.preferences?.decision_speed || "",
    evaluation_rank: prefs.preferences?.evaluation_rank || {},
    notification_frequency: prefs.preferences?.notification_frequency || ""
  });

  const [enhancement, setEnhancement] = useState({
    expertise: prefs.enhancement?.expertise || [],
    equity_range: prefs.enhancement?.equity_range || "",
    exits: prefs.enhancement?.exits || "",
    professional_background: prefs.enhancement?.professional_background || "",
  });

  const flags = prefs.flags || {};

  const toggleMulti = (setter, list, value, limit) => {
    setter(prev => {
      const exists = prev.includes(value);
      if (exists) return prev.filter(v => v !== value);
      if (limit && prev.length >= limit) return prev; // enforce limit
      return [...prev, value];
    });
  };

  const handleEvaluationRank = (item, rank) => {
    setPreferences(p => ({
      ...p,
      evaluation_rank: { ...p.evaluation_rank, [item]: rank }
    }));
  };

  const saveSegment = async (segment) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      if (segment === 'core') {
        // basic validation
        if (!core.investment_range || !core.annual_investment_range || core.stages.length === 0 || core.industries.length === 0 || !core.experience_level || !core.accredited_status) {
          throw new Error('Please complete all required core fields.');
        }
        payload.core = core;
        payload.flags = { ...(prefs.flags || {}), core_completed: true };
      } else if (segment === 'preferences') {
        if (!preferences.involvement_level || !preferences.decision_speed || !preferences.notification_frequency) {
          throw new Error('Complete required preference selections.');
        }
        payload.preferences = preferences;
        payload.flags = { ...(prefs.flags || {}), preferences_completed: true };
      } else if (segment === 'enhancement') {
        payload.enhancement = enhancement;
        payload.flags = { ...(prefs.flags || {}), enhancement_completed: true };
      }

      await angelInvestorServices.updateInvestmentPreferences(user.id, payload);
      toast.success('Saved');
      
      // After completing preferences (step 2), user has minimum required info to access dashboard
      if (segment === 'preferences' && onComplete) {
        onComplete();
        return true;
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
      toast.error(e.message);
      return false;
    } finally {
      setSaving(false);
    }
    return true;
  };

  const completeOnboarding = async () => {
    const ok = await saveSegment('enhancement');
    if (ok) onComplete && onComplete();
  };

  const StepWrapper = ({ children, title, subtitle }) => (
    <motion.div key={step} initial={{ opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0,x:-20}} className="bg-white border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      {error && <div className="mb-4 bg-red-50 text-red-700 px-3 py-2 rounded flex items-center text-sm"><AlertTriangle className="w-4 h-4 mr-2" />{error}</div>}
      {children}
      <div className="flex justify-between pt-6 mt-4 border-t">
        <button disabled={step===1||saving} onClick={()=>setStep(s=>s-1)} className="px-4 py-2 text-sm rounded border disabled:opacity-40">Back</button>
        {step < 4 ? (
          <button disabled={saving} onClick={async ()=>{ const seg = step===1? 'core': step===2?'preferences':'enhancement'; const ok = await saveSegment(seg); if (ok) setStep(s=>s+1); }} className="px-5 py-2 bg-blue-600 text-white rounded text-sm flex items-center disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Continue <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button disabled={saving} onClick={completeOnboarding} className="px-5 py-2 bg-green-600 text-white rounded text-sm flex items-center">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Finish <CheckCircle className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <ProgressBar step={step} />
        <AnimatePresence mode="wait">
          <StepWrapper title={
            step===1? 'Essential Investment Profile': step===2? 'Investment Preferences': step===3? 'Profile Enhancement': 'Verification'
          } subtitle={
            step===1? 'Tell us the basics so we can tailor opportunities immediately.' : step===2? 'Refine how and where you like to invest.' : step===3? 'Optional depth for better matching & networking.' : 'Finalize accreditation & compliance (placeholder).'
          }>
            {step===1 && <CoreFields core={core} setCore={setCore} />}
            {step===2 && <PreferenceFields preferences={preferences} setPreferences={setPreferences} onRank={handleEvaluationRank} />}
            {step===3 && <EnhancementFields enhancement={enhancement} setEnhancement={setEnhancement} />}
            {step===4 && <VerificationFields />}
          </StepWrapper>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProgressBar({ step }) {
  const labels = ['Essential','Preferences','Enhancement','Verify'];
  return (
    <div className="flex items-center mb-6">
      {labels.map((l,i)=>{
        const current = i+1 === step;
        const complete = i+1 < step;
        return (
          <div key={l} className="flex-1 flex items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border transition-colors ${complete? 'bg-green-600 text-white border-green-600': current? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-500 border-gray-300'}`}>{i+1}</div>
            {i < labels.length-1 && <div className={`h-1 flex-1 mx-2 rounded ${complete? 'bg-green-500':'bg-gray-200'}`}></div>}
          </div>
        );
      })}
    </div>
  );
}

// Step 1 fields
function CoreFields({ core, setCore }) {
  return (
    <div className="space-y-6">
      <RadioGroup label="Typical investment per company" value={core.investment_range} onChange={v=>setCore(c=>({...c,investment_range:v}))} options={INVESTMENT_RANGES} displayMap={{"1k_5k":"$1K - $5K","5k_25k":"$5K - $25K","25k_100k":"$25K - $100K","100k_500k":"$100K - $500K","500k_plus":"$500K+"}} />
      <RadioGroup label="Total annual investment" value={core.annual_investment_range} onChange={v=>setCore(c=>({...c,annual_investment_range:v}))} options={ANNUAL_RANGES} displayMap={{"under_50k":"Under $50K","50k_250k":"$50K - $250K","250k_1m":"$250K - $1M","1m_5m":"$1M - $5M","5m_plus":"$5M+"}} />
      <CheckboxGroup label="Preferred company stages" values={core.stages} setValues={vals=>setCore(c=>({...c,stages:vals}))} options={STAGES} limit={4} displayMap={{"pre_seed":"Pre-seed","seed":"Seed","series_a":"Series A","series_b_plus":"Series B+"}} />
      <CheckboxGroup label="Industry interests (max 5)" values={core.industries} setValues={vals=>setCore(c=>({...c,industries:vals}))} options={INDUSTRIES} limit={5} />
      <RadioGroup label="Angel investing experience" value={core.experience_level} onChange={v=>setCore(c=>({...c,experience_level:v}))} options={EXPERIENCE_LEVELS} displayMap={{"new":"New (0-2)","emerging":"Emerging (3-10)","experienced":"Experienced (11-25)","seasoned":"Seasoned (25+)"}} />
      <RadioGroup label="Accredited investor status" value={core.accredited_status} onChange={v=>setCore(c=>({...c,accredited_status:v}))} options={ACCREDITED_STATUSES} displayMap={{"verified":"Yes, verified","need_verification":"Yes, need verification","no":"No","prefer_not":"Prefer not to answer"}} />
    </div>
  );
}

// Step 2 fields
function PreferenceFields({ preferences, setPreferences, onRank }) {
  return (
    <div className="space-y-6">
      <CheckboxGroup label="Geographic preferences" values={preferences.geographies} setValues={vals=>setPreferences(p=>({...p,geographies:vals}))} options={GEOGRAPHIES} displayMap={{"local":"Local (<=50mi)","regional":"Regional","national":"National (US)","international":"International","remote_first":"Remote-first"}} />
      <CheckboxGroup label="Motivations (pick up to 2)" limit={2} values={preferences.motivations} setValues={vals=>setPreferences(p=>({...p,motivations:vals}))} options={MOTIVATIONS} displayMap={{"financial":"Financial returns","supporting":"Supporting entrepreneurs","expertise":"Industry expertise","networking":"Networking","giving_back":"Giving back","learning":"Learning"}} />
      <RadioGroup label="Preferred involvement level" value={preferences.involvement_level} onChange={v=>setPreferences(p=>({...p,involvement_level:v}))} options={INVOLVEMENT} displayMap={{"hands_on":"Very hands-on","moderate":"Moderately involved","light":"Light touch","passive":"Passive"}} />
      <RadioGroup label="Decision speed" value={preferences.decision_speed} onChange={v=>setPreferences(p=>({...p,decision_speed:v}))} options={DECISION_SPEED} displayMap={{"same_week":"Same day/week","2_4_weeks":"2-4 weeks","1_2_months":"1-2 months","3_plus_months":"3+ months"}} />
      <RadioGroup label="Notification frequency" value={preferences.notification_frequency} onChange={v=>setPreferences(p=>({...p,notification_frequency:v}))} options={NOTIFICATION_FREQ} displayMap={{"daily":"Daily digest","weekly":"Weekly summary","monthly":"Monthly roundup","high_priority_only":"High-priority only"}} />
      <EvaluationRanking current={preferences.evaluation_rank} onRank={onRank} />
    </div>
  );
}

// Step 3 fields
function EnhancementFields({ enhancement, setEnhancement }) {
  return (
    <div className="space-y-6">
      <RadioGroup label="Preferred equity range" value={enhancement.equity_range} onChange={v=>setEnhancement(e=>({...e,equity_range:v}))} options={EQUITY_RANGES} displayMap={{"under_1":"Under 1%","1_5":"1% - 5%","5_15":"5% - 15%","15_25":"15% - 25%","25_plus":"25%+"}} />
      <TextInput label="Number of portfolio exits" value={enhancement.exits} onChange={v=>setEnhancement(e=>({...e,exits:v}))} type="number" />
      <TextInput label="Professional background (e.g. Founder, Finance)" value={enhancement.professional_background} onChange={v=>setEnhancement(e=>({...e,professional_background:v}))} />
      <CheckboxGroup label="Areas of expertise you can offer" values={enhancement.expertise} setValues={vals=>setEnhancement(e=>({...e,expertise:vals}))} options={["strategic","fundraising","business_dev","product","marketing","operations","technical","connections","hiring"]} displayMap={{"strategic":"Strategic planning","fundraising":"Fundraising guidance","business_dev":"Business development","product":"Product development","marketing":"Marketing/sales","operations":"Operations/scaling","technical":"Technical development","connections":"Industry connections","hiring":"Hiring/recruiting"}} />
    </div>
  );
}

function VerificationFields() {
  return (
    <div className="space-y-4 text-sm text-gray-600">
      <p>Document upload & accreditation verification will be handled here in a future update.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Upload accreditation proof (CPA letter, W2s, etc.)</li>
        <li>Identity verification (KYC)</li>
        <li>Agreement to platform terms</li>
      </ul>
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-xs">Placeholder step for compliance pipeline.</div>
    </div>
  );
}

// Generic UI helpers
function RadioGroup({ label, value, onChange, options, displayMap }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={()=>onChange(opt)} className={`text-sm border rounded-md px-3 py-2 text-left hover:bg-blue-50 transition ${value===opt? 'border-blue-600 bg-blue-50 font-medium text-blue-700':'border-gray-300 text-gray-600'}`}>{displayMap?.[opt] || opt}</button>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup({ label, values, setValues, options, limit, displayMap }) {
  const toggle = (opt) => {
    if (values.includes(opt)) {
      setValues(values.filter(v=>v!==opt));
    } else {
      if (limit && values.length >= limit) return; // enforce limit
      setValues([...values, opt]);
    }
  };
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}{limit? ` (max ${limit})`:''}</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={()=>toggle(opt)} className={`text-sm border rounded-md px-3 py-2 text-left hover:bg-blue-50 transition ${(values.includes(opt))? 'border-blue-600 bg-blue-50 font-medium text-blue-700':'border-gray-300 text-gray-600'}`}>{displayMap?.[opt] || opt}</button>
        ))}
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, type='text' }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
    </div>
  );
}

function EvaluationRanking({ current, onRank }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Importance ranking (1=most important)</p>
      <div className="space-y-2">
        {EVALUATION_ITEMS.map(item => (
          <div key={item} className="flex items-center gap-3">
            <span className="w-40 text-sm capitalize">{item.replace('_',' ')}</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n=> (
                <button key={n} type="button" onClick={()=>onRank(item,n)} className={`w-8 h-8 text-xs rounded-md border flex items-center justify-center ${current?.[item]===n? 'bg-blue-600 text-white border-blue-600':'border-gray-300 text-gray-600 hover:bg-blue-50'}`}>{n}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
