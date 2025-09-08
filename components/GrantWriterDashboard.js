"use client";
import React from 'react';
import { PenTool, FileText, Clock, CheckCircle } from 'lucide-react';
import Logo from './Logo';
import { StatCard } from './ui/StatCard';

export default function GrantWriterDashboard({ user, userProfile }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Logo variant="dark" size="md" showText={false} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Grant Writer Dashboard</h1>
              <p className="text-slate-600 text-sm sm:text-base">Welcome{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}. Focused workspace for drafting and managing submissions.</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            icon={PenTool}
            label="AI Drafting"
            value="AI-assisted narrative drafting and optimization"
          />

          <StatCard 
            icon={FileText}
            label="Content Library"
            value="Reusable content library & compliance checklist"
          />

          <StatCard 
            icon={Clock}
            label="Pipeline Tracking"
            value="Submission pipeline and status tracking"
          />

          <StatCard 
            icon={CheckCircle}
            label="Collaboration"
            value="Collaboration notes & version history"
          />
        </div>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Coming Soon</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">A specialized interface for research, drafting, collaboration, and submission tracking will appear here.</p>
          <ul className="text-slate-700 list-disc pl-6 space-y-2">
            <li>AI-assisted narrative drafting with smart suggestions</li>
            <li>Reusable content library with compliance checker</li>
            <li>Submission pipeline with automated status tracking</li>
            <li>Real-time collaboration with notes & version history</li>
            <li>Grant opportunity matching and deadline reminders</li>
            <li>Performance analytics and success metrics</li>
          </ul>
        </section>

        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-sm text-emerald-800">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-emerald-500 rounded-full mt-0.5 flex-shrink-0"></div>
            <div>
              <p className="font-semibold mb-2">Profile Setup Notice</p>
              <p>If your account was created before roles were introduced, your profile may default to company. Update your role in profile settings once that control is added.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
