import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, User, TrendingUp, Building, Shield } from 'lucide-react';

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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving:', payload);
    } catch (e) {
      console.error(e);
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
    return true;
  };

  const completeOnboarding = async () => {
    console.log('AngelOnboarding: Completing onboarding...')
    // Step 4 is just verification/completion - no need to save data
    // Enhancement was already saved in step 3
    if (onComplete) {
      console.log('AngelOnboarding: Calling onComplete callback')
      onComplete();
    } else {
      console.log('AngelOnboarding: No onComplete callback provided')
    }
  };

  const StepWrapper = ({ children, title, subtitle, icon: Icon }) => (
    <motion.div 
      key={step} 
      initial={{ opacity:0, x:20}} 
      animate={{opacity:1, x:0}} 
      exit={{opacity:0,x:-20}}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center mb-6">
        <div className="p-2.5 bg-emerald-50 rounded-lg mr-4">
          <Icon className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center text-sm border border-red-200">
          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {children}
      
      <div className="flex justify-between pt-6 mt-8 border-t border-slate-100">
        <button 
          disabled={step===1||saving} 
          onClick={()=>setStep(s=>s-1)} 
          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors duration-200 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        
        {step < 4 ? (
          <button 
            disabled={saving} 
            onClick={async ()=>{ 
              const seg = step===1? 'core': step===2?'preferences':'enhancement'; 
              const ok = await saveSegment(seg); 
              if (ok) setStep(s=>s+1); 
            }} 
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center disabled:opacity-60 hover:bg-emerald-700 transition-colors duration-200"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Continue 
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        ) : (
          <button 
            disabled={saving} 
            onClick={completeOnboarding} 
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-emerald-700 transition-colors duration-200"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Complete Setup
            <CheckCircle className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>
    </motion.div>
  );

  const stepConfigs = [
    { title: 'Essential Investment Profile', subtitle: 'Tell us the basics so we can tailor opportunities immediately.', icon: User },
    { title: 'Investment Preferences', subtitle: 'Refine how and where you like to invest.', icon: TrendingUp },
    { title: 'Profile Enhancement', subtitle: 'Optional depth for better matching & networking.', icon: Building },
    { title: 'Verification & Setup', subtitle: 'Finalize accreditation & compliance setup.', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Angel Investing</h1>
          <p className="text-lg text-slate-600">Let's set up your investment profile to get started</p>
        </div>
        
        <ProgressBar step={step} />
        
        <AnimatePresence mode="wait">
          <StepWrapper 
            title={stepConfigs[step-1].title}
            subtitle={stepConfigs[step-1].subtitle}
            icon={stepConfigs[step-1].icon}
          >
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
  const labels = ['Essential','Preferences','Enhancement','Verification'];
  return (
    <div className="flex items-center mb-8 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      {labels.map((label, i) => {
        const current = i + 1 === step;
        const complete = i + 1 < step;
        return (
          <div key={label} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200 ${
                complete 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : current 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-white text-slate-400 border-slate-200'
              }`}>
                {complete ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium mt-2 transition-colors duration-200 ${
                current || complete ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`h-0.5 flex-1 mx-4 rounded transition-all duration-700 ease-out ${
                complete ? 'bg-emerald-500' : 'bg-slate-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Step 1 fields
function CoreFields({ core, setCore }) {
  return (
    <div className="space-y-8">
      <RadioGroup 
        label="Typical investment per company" 
        value={core.investment_range} 
        onChange={v=>setCore(c=>({...c,investment_range:v}))} 
        options={INVESTMENT_RANGES} 
        displayMap={{"1k_5k":"$1K - $5K","5k_25k":"$5K - $25K","25k_100k":"$25K - $100K","100k_500k":"$100K - $500K","500k_plus":"$500K+"}} 
      />
      <RadioGroup 
        label="Total annual investment budget" 
        value={core.annual_investment_range} 
        onChange={v=>setCore(c=>({...c,annual_investment_range:v}))} 
        options={ANNUAL_RANGES} 
        displayMap={{"under_50k":"Under $50K","50k_250k":"$50K - $250K","250k_1m":"$250K - $1M","1m_5m":"$1M - $5M","5m_plus":"$5M+"}} 
      />
      <CheckboxGroup 
        label="Preferred company stages" 
        values={core.stages} 
        setValues={vals=>setCore(c=>({...c,stages:vals}))} 
        options={STAGES} 
        limit={4} 
        displayMap={{"pre_seed":"Pre-seed","seed":"Seed","series_a":"Series A","series_b_plus":"Series B+"}} 
      />
      <CheckboxGroup 
        label="Industry interests" 
        values={core.industries} 
        setValues={vals=>setCore(c=>({...c,industries:vals}))} 
        options={INDUSTRIES} 
        limit={5} 
      />
      <RadioGroup 
        label="Angel investing experience" 
        value={core.experience_level} 
        onChange={v=>setCore(c=>({...c,experience_level:v}))} 
        options={EXPERIENCE_LEVELS} 
        displayMap={{"new":"New (0-2 investments)","emerging":"Emerging (3-10 investments)","experienced":"Experienced (11-25 investments)","seasoned":"Seasoned (25+ investments)"}} 
      />
      <RadioGroup 
        label="Accredited investor status" 
        value={core.accredited_status} 
        onChange={v=>setCore(c=>({...c,accredited_status:v}))} 
        options={ACCREDITED_STATUSES} 
        displayMap={{"verified":"Yes, verified","need_verification":"Yes, need verification","no":"No","prefer_not":"Prefer not to answer"}} 
      />
    </div>
  );
}

// Step 2 fields
function PreferenceFields({ preferences, setPreferences, onRank }) {
  return (
    <div className="space-y-8">
      <CheckboxGroup 
        label="Geographic preferences" 
        values={preferences.geographies} 
        setValues={vals=>setPreferences(p=>({...p,geographies:vals}))} 
        options={GEOGRAPHIES} 
        displayMap={{"local":"Local (≤50mi)","regional":"Regional","national":"National (US)","international":"International","remote_first":"Remote-first"}} 
      />
      <CheckboxGroup 
        label="Investment motivations" 
        limit={3} 
        values={preferences.motivations} 
        setValues={vals=>setPreferences(p=>({...p,motivations:vals}))} 
        options={MOTIVATIONS} 
        displayMap={{"financial":"Financial returns","supporting":"Supporting entrepreneurs","expertise":"Industry expertise","networking":"Networking","giving_back":"Giving back","learning":"Learning"}} 
      />
      <RadioGroup 
        label="Preferred involvement level" 
        value={preferences.involvement_level} 
        onChange={v=>setPreferences(p=>({...p,involvement_level:v}))} 
        options={INVOLVEMENT} 
        displayMap={{"hands_on":"Very hands-on","moderate":"Moderately involved","light":"Light touch","passive":"Passive"}} 
      />
      <RadioGroup 
        label="Decision timeline" 
        value={preferences.decision_speed} 
        onChange={v=>setPreferences(p=>({...p,decision_speed:v}))} 
        options={DECISION_SPEED} 
        displayMap={{"same_week":"Same day/week","2_4_weeks":"2-4 weeks","1_2_months":"1-2 months","3_plus_months":"3+ months"}} 
      />
      <RadioGroup 
        label="Notification frequency" 
        value={preferences.notification_frequency} 
        onChange={v=>setPreferences(p=>({...p,notification_frequency:v}))} 
        options={NOTIFICATION_FREQ} 
        displayMap={{"daily":"Daily digest","weekly":"Weekly summary","monthly":"Monthly roundup","high_priority_only":"High-priority only"}} 
      />
      <EvaluationRanking current={preferences.evaluation_rank} onRank={onRank} />
    </div>
  );
}

// Step 3 fields
function EnhancementFields({ enhancement, setEnhancement }) {
  return (
    <div className="space-y-8">
      <RadioGroup 
        label="Preferred equity range" 
        value={enhancement.equity_range} 
        onChange={v=>setEnhancement(e=>({...e,equity_range:v}))} 
        options={EQUITY_RANGES} 
        displayMap={{"under_1":"Under 1%","1_5":"1% - 5%","5_15":"5% - 15%","15_25":"15% - 25%","25_plus":"25%+"}} 
      />
      <TextInput 
        label="Number of portfolio exits" 
        value={enhancement.exits} 
        onChange={v=>setEnhancement(e=>({...e,exits:v}))} 
        type="number" 
        placeholder="e.g. 3"
      />
      <TextInput 
        label="Professional background" 
        value={enhancement.professional_background} 
        onChange={v=>setEnhancement(e=>({...e,professional_background:v}))} 
        placeholder="e.g. Former Founder, Finance Executive, Product Leader"
      />
      <CheckboxGroup 
        label="Areas of expertise you can offer" 
        values={enhancement.expertise} 
        setValues={vals=>setEnhancement(e=>({...e,expertise:vals}))} 
        options={["strategic","fundraising","business_dev","product","marketing","operations","technical","connections","hiring"]} 
        displayMap={{"strategic":"Strategic planning","fundraising":"Fundraising guidance","business_dev":"Business development","product":"Product development","marketing":"Marketing/sales","operations":"Operations/scaling","technical":"Technical development","connections":"Industry connections","hiring":"Hiring/recruiting"}} 
      />
    </div>
  );
}

function VerificationFields() {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <Shield className="w-6 h-6 text-amber-600 mr-3" />
          <h3 className="text-lg font-semibold text-amber-900">Verification Process</h3>
        </div>
        <p className="text-sm text-amber-800 mb-4">
          The following verification steps will be completed to ensure compliance and security:
        </p>
        <ul className="space-y-3 text-sm text-amber-700">
          <li className="flex items-center">
            <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
            Upload accreditation documentation (CPA letter, W2s, bank statements)
          </li>
          <li className="flex items-center">
            <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
            Identity verification (KYC) through secure document upload
          </li>
          <li className="flex items-center">
            <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
            Review and acceptance of platform terms and conditions
          </li>
          <li className="flex items-center">
            <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
            Background check and anti-money laundering (AML) screening
          </li>
        </ul>
      </div>
      
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-emerald-900 mb-2">Ready to Get Started!</h3>
        <p className="text-sm text-emerald-700">
          Your investment profile is complete. Once you finish setup, you'll have access to:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-emerald-600">
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Curated deal flow matching your preferences
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Direct communication with entrepreneurs
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Portfolio tracking and analytics
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Investor community and networking
          </li>
        </ul>
      </div>
    </div>
  );
}

// Generic UI helpers
function RadioGroup({ label, value, onChange, options, displayMap }) {
  return (
    <div>
      <label className="text-lg font-semibold text-slate-900 mb-4 block">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map(opt => (
          <button 
            key={opt} 
            type="button" 
            onClick={()=>onChange(opt)} 
            className={`text-sm border rounded-lg px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 ${
              value===opt 
                ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100 font-medium text-emerald-700' 
                : 'border-slate-200 text-slate-600 bg-white hover:shadow-sm'
            }`}
          >
            {displayMap?.[opt] || opt}
          </button>
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
      if (limit && values.length >= limit) return;
      setValues([...values, opt]);
    }
  };
  
  return (
    <div>
      <label className="text-lg font-semibold text-slate-900 mb-2 block">
        {label}
        {limit && <span className="text-sm font-normal text-slate-500 ml-2">(max {limit})</span>}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map(opt => (
          <button 
            key={opt} 
            type="button" 
            onClick={()=>toggle(opt)} 
            className={`text-sm border rounded-lg px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 ${
              values.includes(opt) 
                ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100 font-medium text-emerald-700' 
                : 'border-slate-200 text-slate-600 bg-white hover:shadow-sm'
            }`}
          >
            {displayMap?.[opt] || opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, type='text', placeholder }) {
  return (
    <div>
      <label className="text-lg font-semibold text-slate-900 mb-3 block">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={(e)=>onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white" 
      />
    </div>
  );
}

function EvaluationRanking({ current, onRank }) {
  return (
    <div>
      <label className="text-lg font-semibold text-slate-900 mb-4 block">
        Investment evaluation priorities
        <span className="text-sm font-normal text-slate-500 ml-2">(1 = most important)</span>
      </label>
      <div className="bg-slate-50 rounded-xl p-6 space-y-4">
        {EVALUATION_ITEMS.map(item => (
          <div key={item} className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 capitalize min-w-0 flex-1">
              {item.replace('_',' ')}
            </span>
            <div className="flex gap-2 ml-6">
              {[1,2,3,4,5].map(n=> (
                <button 
                  key={n} 
                  type="button" 
                  onClick={()=>onRank(item,n)} 
                  className={`w-10 h-10 text-sm font-medium rounded-lg border flex items-center justify-center transition-all duration-200 ${
                    current?.[item]===n 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                      : 'border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 bg-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}