"use client";
import React from 'react';
import { PenTool, FileText, Clock, CheckCircle } from 'lucide-react';
import Logo from './Logo';

export default function GrantWriterDashboard({ user, userProfile }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col">
      <header className="bg-white border-b border-green-200 shadow-sm px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Logo variant="dark" size="md" showText={false} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Grant Writer Dashboard</h1>
              <p className="text-neutral-600 text-sm sm:text-base">Welcome{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}. Focused workspace for drafting and managing submissions.</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <PenTool className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-neutral-900">AI Drafting</h3>
            </div>
            <p className="text-sm text-neutral-600">AI-assisted narrative drafting and optimization</p>
          </div>

          <div className="bg-white rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl mr-4">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-neutral-900">Content Library</h3>
            </div>
            <p className="text-sm text-neutral-600">Reusable content library & compliance checklist</p>
          </div>

          <div className="bg-white rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-neutral-900">Pipeline Tracking</h3>
            </div>
            <p className="text-sm text-neutral-600">Submission pipeline and status tracking</p>
          </div>

          <div className="bg-white rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl mr-4">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-neutral-900">Collaboration</h3>
            </div>
            <p className="text-sm text-neutral-600">Collaboration notes & version history</p>
          </div>
        </div>

        <section className="bg-white border border-green-100 rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Coming Soon</h2>
          <p className="text-neutral-600 mb-6 leading-relaxed">A specialized interface for research, drafting, collaboration, and submission tracking will appear here.</p>
          <ul className="text-neutral-700 list-disc pl-6 space-y-2">
            <li>AI-assisted narrative drafting with smart suggestions</li>
            <li>Reusable content library with compliance checker</li>
            <li>Submission pipeline with automated status tracking</li>
            <li>Real-time collaboration with notes & version history</li>
            <li>Grant opportunity matching and deadline reminders</li>
            <li>Performance analytics and success metrics</li>
          </ul>
        </section>

        <section className="bg-green-50 border border-green-200 rounded-xl p-6 text-sm text-green-800">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full mt-0.5 flex-shrink-0"></div>
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
