"use client";
import React from 'react';

export default function GrantWriterDashboard({ user, userProfile }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grant Writer Dashboard</h1>
          <p className="text-gray-600 text-sm">Welcome{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}. Focused workspace for drafting and managing submissions.</p>
        </div>
      </header>
      <main className="flex-1 px-6 py-8 max-w-5xl w-full mx-auto space-y-6">
        <section className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
          <p className="text-gray-600 text-sm mb-4">A specialized interface for research, drafting, collaboration, and submission tracking will appear here.</p>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li>AI-assisted narrative drafting</li>
            <li>Reusable content library & compliance checklist</li>
            <li>Submission pipeline and status tracking</li>
            <li>Collaboration notes & version history</li>
          </ul>
        </section>
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-700">
          If your account was created before roles were introduced, your profile may default to company. Update your role in profile settings once that control is added.
        </section>
      </main>
    </div>
  );
}
