// lib/ai-agent/services/ComplianceService.js
import { supabase } from '../../supabase.js';
import cron from 'node-cron';

/**
 * Comprehensive Compliance Service for FundingOS
 * Handles automated compliance tracking, alerts, and reporting
 */
export class ComplianceService {
  constructor(userId) {
    this.userId = userId;
    this.isRunning = false;
    this.scheduledTasks = new Map();
    this.complianceRules = new Map();
    this.alertThresholds = {
      critical: 7, // days before deadline
      warning: 14,
      info: 30
    };
    
    // Initialize compliance rules
    this.initializeComplianceRules();
  }

  /**
   * Start the compliance service
   */
  async start() {
    try {
      this.isRunning = true;
      console.log(`Starting compliance service for user ${this.userId}`);

      // Load user compliance preferences
      await this.loadCompliancePreferences();

      // Start scheduled compliance checks
      await this.startScheduledChecks();

      // Initialize compliance tracking
      await this.initializeComplianceTracking();

      console.log('Compliance service started successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to start compliance service:', error);
      throw error;
    }
  }

  /**
   * Stop the compliance service
   */
  async stop() {
    try {
      this.isRunning = false;
      
      // Stop all scheduled tasks
      this.scheduledTasks.forEach((task, name) => {
        if (task) {
          task.stop();
          console.log(`Stopped compliance task: ${name}`);
        }
      });
      this.scheduledTasks.clear();

      console.log('Compliance service stopped');
      return { success: true };
    } catch (error) {
      console.error('Failed to stop compliance service:', error);
      throw error;
    }
  }

  /**
   * Run a comprehensive compliance check
   */
  async runComplianceCheck(parameters = {}) {
    try {
      const checkTypes = parameters.types || ['all'];
      const results = {
        overallStatus: 'compliant',
        checks: [],
        alerts: [],
        recommendations: [],
        summary: {}
      };

      // Run different types of compliance checks
      if (checkTypes.includes('all') || checkTypes.includes('deadlines')) {
        const deadlineCheck = await this.checkUpcomingDeadlines();
        results.checks.push(deadlineCheck);
      }

      if (checkTypes.includes('all') || checkTypes.includes('reporting')) {
        const reportingCheck = await this.checkReportingRequirements();
        results.checks.push(reportingCheck);
      }

      if (checkTypes.includes('all') || checkTypes.includes('documents')) {
        const documentCheck = await this.checkRequiredDocuments();
        results.checks.push(documentCheck);
      }

      if (checkTypes.includes('all') || checkTypes.includes('recurring')) {
        const recurringCheck = await this.checkRecurringCompliance();
        results.checks.push(recurringCheck);
      }

      // Determine overall status
      results.overallStatus = this.calculateOverallStatus(results.checks);

      // Generate alerts for issues
      results.alerts = await this.generateComplianceAlerts(results.checks);

      // Generate recommendations
      results.recommendations = await this.generateRecommendations(results.checks);

      // Create summary
      results.summary = this.createComplianceSummary(results.checks);

      // Log the compliance check
      await this.logComplianceCheck(results);

      return results;
    } catch (error) {
      console.error('Compliance check failed:', error);
      throw error;
    }
  }

  /**
   * Check for upcoming compliance deadlines
   */
  async checkUpcomingDeadlines() {
    try {
      const { data: trackingItems } = await supabase
        .from('compliance_tracking')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .not('deadline_date', 'is', null);

      const now = new Date();
      const upcomingDeadlines = [];
      const overdueItems = [];

      trackingItems?.forEach(item => {
        const deadline = new Date(item.deadline_date);
        const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline < 0) {
          overdueItems.push({ ...item, daysOverdue: Math.abs(daysUntilDeadline) });
        } else if (daysUntilDeadline <= this.alertThresholds.info) {
          upcomingDeadlines.push({ ...item, daysUntilDeadline });
        }
      });

      return {
        type: 'deadlines',
        status: overdueItems.length > 0 ? 'critical' : 
               upcomingDeadlines.some(d => d.daysUntilDeadline <= this.alertThresholds.critical) ? 'warning' : 'good',
        upcomingDeadlines,
        overdueItems,
        totalTracked: trackingItems?.length || 0
      };
    } catch (error) {
      console.error('Deadline check failed:', error);
      return { type: 'deadlines', status: 'error', error: error.message };
    }
  }

  /**
   * Check reporting requirements
   */
  async checkReportingRequirements() {
    try {
      const { data: reportingItems } = await supabase
        .from('compliance_tracking')
        .select('*')
        .eq('user_id', this.userId)
        .eq('compliance_type', 'reporting')
        .eq('status', 'active');

      const pendingReports = reportingItems?.filter(item => 
        item.status === 'pending' || item.status === 'in_progress'
      ) || [];

      const overdueReports = reportingItems?.filter(item => {
        const deadline = new Date(item.deadline_date);
        return deadline < new Date() && item.status !== 'completed';
      }) || [];

      return {
        type: 'reporting',
        status: overdueReports.length > 0 ? 'critical' : 
               pendingReports.length > 5 ? 'warning' : 'good',
        pendingReports,
        overdueReports,
        totalReporting: reportingItems?.length || 0
      };
    } catch (error) {
      console.error('Reporting check failed:', error);
      return { type: 'reporting', status: 'error', error: error.message };
    }
  }

  /**
   * Check required documents
   */
  async checkRequiredDocuments() {
    try {
      const { data: documents } = await supabase
        .from('compliance_documents')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_required', true);

      const missingDocuments = documents?.filter(doc => !doc.document_url) || [];
      const expiredDocuments = documents?.filter(doc => {
        if (!doc.expiration_date) return false;
        return new Date(doc.expiration_date) < new Date();
      }) || [];

      const expiringDocuments = documents?.filter(doc => {
        if (!doc.expiration_date) return false;
        const expiration = new Date(doc.expiration_date);
        const daysUntilExpiration = Math.ceil((expiration - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiration > 0 && daysUntilExpiration <= this.alertThresholds.warning;
      }) || [];

      return {
        type: 'documents',
        status: (missingDocuments.length > 0 || expiredDocuments.length > 0) ? 'critical' :
               expiringDocuments.length > 0 ? 'warning' : 'good',
        missingDocuments,
        expiredDocuments,
        expiringDocuments,
        totalRequired: documents?.length || 0
      };
    } catch (error) {
      console.error('Document check failed:', error);
      return { type: 'documents', status: 'error', error: error.message };
    }
  }

  /**
   * Check recurring compliance items
   */
  async checkRecurringCompliance() {
    try {
      const { data: recurringItems } = await supabase
        .from('compliance_recurring')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true);

      const now = new Date();
      const overdueRecurring = [];
      const upcomingRecurring = [];

      recurringItems?.forEach(item => {
        const nextDue = new Date(item.next_due_date);
        const daysUntilDue = Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          overdueRecurring.push({ ...item, daysOverdue: Math.abs(daysUntilDue) });
        } else if (daysUntilDue <= this.alertThresholds.info) {
          upcomingRecurring.push({ ...item, daysUntilDue });
        }
      });

      return {
        type: 'recurring',
        status: overdueRecurring.length > 0 ? 'critical' :
               upcomingRecurring.length > 0 ? 'warning' : 'good',
        overdueRecurring,
        upcomingRecurring,
        totalRecurring: recurringItems?.length || 0
      };
    } catch (error) {
      console.error('Recurring compliance check failed:', error);
      return { type: 'recurring', status: 'error', error: error.message };
    }
  }

  /**
   * Generate compliance alerts
   */
  async generateComplianceAlerts(checks) {
    const alerts = [];

    checks.forEach(check => {
      if (check.status === 'critical') {
        alerts.push({
          level: 'critical',
          type: check.type,
          message: this.generateAlertMessage(check),
          actionRequired: true,
          data: check
        });
      } else if (check.status === 'warning') {
        alerts.push({
          level: 'warning',
          type: check.type,
          message: this.generateAlertMessage(check),
          actionRequired: false,
          data: check
        });
      }
    });

    // Save alerts to database
    for (const alert of alerts) {
      await this.saveComplianceAlert(alert);
    }

    return alerts;
  }

  /**
   * Generate alert messages
   */
  generateAlertMessage(check) {
    switch (check.type) {
      case 'deadlines':
        if (check.overdueItems?.length > 0) {
          return `${check.overdueItems.length} compliance items are overdue`;
        }
        return `${check.upcomingDeadlines?.length} compliance deadlines approaching`;
      
      case 'reporting':
        if (check.overdueReports?.length > 0) {
          return `${check.overdueReports.length} reports are overdue`;
        }
        return `${check.pendingReports?.length} reports pending completion`;
      
      case 'documents':
        if (check.missingDocuments?.length > 0) {
          return `${check.missingDocuments.length} required documents missing`;
        }
        if (check.expiredDocuments?.length > 0) {
          return `${check.expiredDocuments.length} documents have expired`;
        }
        return `${check.expiringDocuments?.length} documents expiring soon`;
      
      case 'recurring':
        if (check.overdueRecurring?.length > 0) {
          return `${check.overdueRecurring.length} recurring compliance items overdue`;
        }
        return `${check.upcomingRecurring?.length} recurring items due soon`;
      
      default:
        return 'Compliance issue detected';
    }
  }

  /**
   * Generate recommendations based on compliance check results
   */
  async generateRecommendations(checks) {
    const recommendations = [];

    checks.forEach(check => {
      switch (check.type) {
        case 'deadlines':
          if (check.overdueItems?.length > 0) {
            recommendations.push({
              priority: 'high',
              action: 'Address overdue compliance items immediately',
              details: check.overdueItems.map(item => item.requirement_name)
            });
          }
          break;

        case 'documents':
          if (check.missingDocuments?.length > 0) {
            recommendations.push({
              priority: 'high',
              action: 'Upload missing required documents',
              details: check.missingDocuments.map(doc => doc.document_type)
            });
          }
          break;

        case 'recurring':
          if (check.upcomingRecurring?.length > 0) {
            recommendations.push({
              priority: 'medium',
              action: 'Prepare for upcoming recurring compliance tasks',
              details: check.upcomingRecurring.map(item => item.task_name)
            });
          }
          break;
      }
    });

    return recommendations;
  }

  /**
   * Start scheduled compliance checks
   */
  async startScheduledChecks() {
    // Daily compliance check at 9 AM
    const dailyCheck = cron.schedule('0 9 * * *', async () => {
      if (!this.isRunning) return;
      
      console.log('Running daily compliance check...');
      try {
        const results = await this.runComplianceCheck();
        
        // Send notifications for critical issues
        if (results.overallStatus === 'critical' || results.alerts.some(a => a.level === 'critical')) {
          await this.sendComplianceNotification(results);
        }
      } catch (error) {
        console.error('Daily compliance check failed:', error);
      }
    }, { scheduled: false });

    // Weekly comprehensive report on Mondays at 8 AM
    const weeklyReport = cron.schedule('0 8 * * 1', async () => {
      if (!this.isRunning) return;
      
      console.log('Generating weekly compliance report...');
      try {
        await this.generateWeeklyComplianceReport();
      } catch (error) {
        console.error('Weekly compliance report failed:', error);
      }
    }, { scheduled: false });

    this.scheduledTasks.set('dailyCheck', dailyCheck);
    this.scheduledTasks.set('weeklyReport', weeklyReport);

    dailyCheck.start();
    weeklyReport.start();
  }

  /**
   * Initialize compliance rules
   */
  initializeComplianceRules() {
    // Define standard compliance rules
    this.complianceRules.set('grant_reporting', {
      frequency: 'quarterly',
      deadline_offset: 30, // days before due
      required_documents: ['financial_report', 'progress_report'],
      critical: true
    });

    this.complianceRules.set('tax_filing', {
      frequency: 'annual',
      deadline_offset: 60,
      required_documents: ['990_form', 'financial_statements'],
      critical: true
    });

    this.complianceRules.set('audit_preparation', {
      frequency: 'annual',
      deadline_offset: 90,
      required_documents: ['audit_documentation', 'internal_controls'],
      critical: false
    });
  }

  /**
   * Utility methods
   */
  calculateOverallStatus(checks) {
    if (checks.some(c => c.status === 'critical')) return 'critical';
    if (checks.some(c => c.status === 'warning')) return 'warning';
    if (checks.some(c => c.status === 'error')) return 'error';
    return 'good';
  }

  createComplianceSummary(checks) {
    const summary = {
      totalChecks: checks.length,
      passedChecks: checks.filter(c => c.status === 'good').length,
      warningChecks: checks.filter(c => c.status === 'warning').length,
      criticalChecks: checks.filter(c => c.status === 'critical').length,
      errorChecks: checks.filter(c => c.status === 'error').length
    };

    summary.complianceScore = Math.round(
      (summary.passedChecks / summary.totalChecks) * 100
    );

    return summary;
  }

  /**
   * Database operations
   */
  async loadCompliancePreferences() {
    try {
      const { data } = await supabase
        .from('compliance_preferences')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (data) {
        this.alertThresholds = { ...this.alertThresholds, ...data.alert_thresholds };
      }
    } catch (error) {
      console.log('Using default compliance preferences');
    }
  }

  async initializeComplianceTracking() {
    // Initialize any missing compliance tracking items based on user profile
    // This would create default compliance items for the user's organization type
  }

  async logComplianceCheck(results) {
    try {
      await supabase.from('compliance_history').insert({
        user_id: this.userId,
        check_date: new Date().toISOString(),
        overall_status: results.overallStatus,
        results: results,
        compliance_score: results.summary?.complianceScore || 0
      });
    } catch (error) {
      console.error('Failed to log compliance check:', error);
    }
  }

  async saveComplianceAlert(alert) {
    try {
      await supabase.from('compliance_alerts').insert({
        user_id: this.userId,
        alert_type: alert.type,
        severity: alert.level,
        message: alert.message,
        alert_data: alert.data,
        is_active: true,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save compliance alert:', error);
    }
  }

  async sendComplianceNotification(results) {
    // Send notification through the agent notification system
    try {
      await fetch('/api/ai/agent-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          type: 'compliance_alert',
          title: 'Compliance Alert',
          message: `Compliance check found ${results.alerts.length} issues requiring attention`,
          priority: results.overallStatus === 'critical' ? 'urgent' : 'high',
          metadata: { complianceResults: results }
        })
      });
    } catch (error) {
      console.error('Failed to send compliance notification:', error);
    }
  }

  async generateWeeklyComplianceReport() {
    // Generate and send weekly compliance report
    try {
      const results = await this.runComplianceCheck();
      
      // Create detailed report
      const report = {
        weekOf: new Date().toISOString(),
        summary: results.summary,
        detailedFindings: results.checks,
        recommendations: results.recommendations,
        trends: await this.getComplianceTrends()
      };

      // Save report
      await supabase.from('compliance_analytics').insert({
        user_id: this.userId,
        report_type: 'weekly',
        report_date: new Date().toISOString(),
        report_data: report
      });

      console.log('Weekly compliance report generated successfully');
    } catch (error) {
      console.error('Failed to generate weekly compliance report:', error);
    }
  }

  async getComplianceTrends() {
    try {
      const { data } = await supabase
        .from('compliance_history')
        .select('check_date, compliance_score, overall_status')
        .eq('user_id', this.userId)
        .order('check_date', { ascending: false })
        .limit(30);

      return data || [];
    } catch (error) {
      console.error('Failed to get compliance trends:', error);
      return [];
    }
  }
}

export default ComplianceService;