"use client";
import React from 'react';
import Dashboard from './Dashboard';

// Thin wrapper so role-based routing can reference a clear CompanyDashboard component.
export default function CompanyDashboard(props) {
  return <Dashboard {...props} />;
}
