'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amlApi, Account } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { ChevronLeft, ShieldAlert, Lock, Unlock, CheckCircle2, UserCheck, MapPin, Calendar, HelpCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * AML Account Risk Profile & Control Panel.
 * 
 * AML Architecture Context:
 * Represents the primary audit profile for a customer entity.
 * Visualizes the customer's risk profile (gradient scale) and maps threat factors (sanctions, PEP).
 * Implements strict role-gating: Only a user with role `compliance_officer` can perform freezing
 * or unfreezing interventions. For other roles, these buttons are disabled and display auth warnings.
 */
export default function AccountProfile() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Account holder details
  const { data: account, isLoading, isError } = useQuery({
    queryKey: ['account', id],
    queryFn: () => amlApi.getAccount(id),
  });

  // 2. Freeze Account Mutation (restricted to compliance_officer role)
  const freezeMutation = useMutation({
    mutationFn: () => amlApi.freezeAccount(id),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData(['account', id], updatedAccount);
      showToast(`Account ${id} has been FROZEN. All outgoing funds blocked.`, 'danger');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to freeze account.', 'danger');
    },
  });

  // 3. Unfreeze Account Mutation (restricted to compliance_officer role)
  const unfreezeMutation = useMutation({
    mutationFn: () => amlApi.unfreezeAccount(id),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData(['account', id], updatedAccount);
      showToast(`Account ${id} unfrozen. Trading rights restored.`, 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to unfreeze account.', 'danger');
    },
  });

  // Role Gate check: Is the active session a Compliance Officer?
  const isComplianceOfficer = user?.role === 'compliance_officer';

  if (isLoading) {
    return (
      <div className="account-skeleton">
        <div className="skeleton-box skeleton-title-bar" />
        <div className="grid-cols-3 mt-4">
          <div className="card skeleton-card-col grid-span-2" />
          <div className="card skeleton-card-col" />
        </div>
        <style jsx>{`
          .account-skeleton { display: flex; flex-direction: column; gap: 1rem; }
          .skeleton-title-bar { height: 40px; width: 35%; }
          .skeleton-card-col { height: 450px; }
          .grid-span-2 { grid-column: span 2; }
        `}</style>
      </div>
    );
  }

  if (isError || !account) {
    return (
      <div className="error-alert-box flex-center">
        <ShieldAlert size={28} />
        <div>
          <h3 className="error-title">Account Record Missing</h3>
          <p className="error-desc">The requested account entity ID "{id}" could not be matched in the client records.</p>
        </div>
        <Link href="/alerts" className="btn btn-secondary mt-4">Back to Alerts</Link>
      </div>
    );
  }

  // Helper to color code the risk classification slider
  const getRiskLabel = (score: number) => {
    if (score > 80) return { label: 'CRITICAL THREAT', color: 'var(--risk-critical)' };
    if (score > 40) return { label: 'MEDIUM RISK', color: 'var(--risk-medium)' };
    return { label: 'LOW RISK', color: 'var(--risk-low)' };
  };

  const riskInfo = getRiskLabel(account.riskScore);

  return (
    <div className="account-workspace">
      {/* Navigation */}
      <div className="back-navigation-row mb-4">
        <Link href="/alerts" className="back-link flex-center gap-1">
          <ChevronLeft size={16} />
          <span>Back to Alerts Feed</span>
        </Link>
      </div>

      <div className="page-header-row mb-4">
        <div className="flex-between">
          <div>
            <h1 className="account-title">Account Profile: {account.accountId}</h1>
            <p className="account-subtitle">Customer entity audit and compliance intervention workspace</p>
          </div>
          <span className={`status-badge badge-${account.status}`}>
            {account.status}
          </span>
        </div>
      </div>

      {/* Profile Columns */}
      <div className="grid-cols-3">
        
        {/* COL 1 & 2: DETAILS & THREAT ANALYSIS */}
        <div className="grid-span-2 flex-col gap-4">
          
          {/* Card 1: Account Holder Personal details */}
          <div className="card customer-details-card">
            <h2 className="section-title mb-4">Customer Entity Details</h2>
            <div className="profile-details-grid">
              <div className="profile-detail-tile">
                <span className="profile-label">Full Name</span>
                <span className="profile-value font-semibold">{account.holder}</span>
              </div>
              <div className="profile-detail-tile">
                <span className="profile-label">Account Type</span>
                <span className="profile-value font-semibold">{account.accountType}</span>
              </div>
              <div className="profile-detail-tile">
                <span className="profile-label flex-center gap-1"><MapPin size={14} /> Jurisdiction</span>
                <span className="profile-value font-semibold">{account.country}</span>
              </div>
              <div className="profile-detail-tile">
                <span className="profile-label flex-center gap-1"><Calendar size={14} /> Opened Date</span>
                <span className="profile-value font-semibold">{new Date(account.openedDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Risk Meter Slider */}
          <div className="card risk-slider-card">
            <div className="flex-between mb-2">
              <h2 className="section-title">Risk Exposure Visualizer</h2>
              <span className="risk-level-tag font-semibold" style={{ color: riskInfo.color }}>
                {riskInfo.label} ({account.riskScore}%)
              </span>
            </div>

            {/* Gradient Risk Meter Scale */}
            <div className="risk-meter-container">
              <div className="risk-meter-gradient-bar" />
              <div className="risk-meter-pointer" style={{ left: `${account.riskScore}%` }}>
                <div className="pointer-dot" style={{ backgroundColor: riskInfo.color }} />
                <div className="pointer-line" />
              </div>
            </div>
            <div className="risk-scale-labels flex-between mt-2">
              <span>0% (Low)</span>
              <span>50% (Medium)</span>
              <span>100% (Critical)</span>
            </div>
          </div>

          {/* Card 3: Threat Indicators */}
          <div className="card threat-indicators-card">
            <h2 className="section-title">Flagged Audit Indicators</h2>
            <p className="section-subtitle mb-4">Specific risk metrics identified by neural pattern matchers</p>

            {account.threatFactors.length === 0 ? (
              <div className="no-threats-indicator flex-center">
                <CheckCircle2 size={18} className="success-icon" />
                <span>No high-risk indicators mapped to this client account profile.</span>
              </div>
            ) : (
              <ul className="threat-factors-list">
                {account.threatFactors.map((factor, idx) => (
                  <li key={idx} className="threat-item flex-center gap-2">
                    <ShieldAlert size={16} className="threat-alert-icon" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* COL 3: ROLE-GATED CONTROL PANEL */}
        <div className="column-controls flex-col">
          <div className="card compliance-controls-card">
            <h2 className="section-title flex-center gap-2">
              <UserCheck size={18} className="icon-blue" />
              <span>Compliance Actions</span>
            </h2>
            <p className="section-subtitle mt-1 mb-4">Freezing operations blocks all transaction requests immediately</p>

            {/* Freeze or Unfreeze Action buttons */}
            <div className="actions-button-stack">
              {account.status === 'active' ? (
                <button
                  className="btn btn-danger w-full flex-center gap-2"
                  onClick={() => freezeMutation.mutate()}
                  disabled={!isComplianceOfficer || freezeMutation.isPending}
                >
                  <Lock size={16} />
                  <span>Freeze Account</span>
                </button>
              ) : (
                <button
                  className="btn btn-primary w-full flex-center gap-2"
                  onClick={() => unfreezeMutation.mutate()}
                  disabled={!isComplianceOfficer || unfreezeMutation.isPending}
                >
                  <Unlock size={16} />
                  <span>Restore (Unfreeze)</span>
                </button>
              )}
            </div>

            {/* Warning notices & Role restrictions display */}
            {!isComplianceOfficer ? (
              <div className="compliance-role-warning mt-4">
                <Lock size={14} className="warning-icon" />
                <span>Compliance operations are locked. Log in as a **Compliance Officer** to freeze or unfreeze accounts.</span>
              </div>
            ) : (
              <div className="compliance-authorized-badge mt-4 flex-center gap-1">
                <CheckCircle2 size={14} className="authorized-icon" />
                <span>Authorized. Compliance Officer token loaded.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Styled JSX for Light mode gradient and profile layouts */}
      <style jsx>{`
        .account-workspace {
          display: flex;
          flex-direction: column;
        }

        .back-link {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .account-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .account-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .status-badge {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.35rem 0.875rem;
          border-radius: var(--radius-sm);
        }

        .status-badge.badge-active { background-color: var(--risk-low-bg); color: var(--risk-low); border: 1.5px solid var(--risk-low-border); }
        .status-badge.badge-frozen { background-color: var(--risk-critical-bg); color: var(--risk-critical); border: 1.5px solid var(--risk-critical-border); }

        .grid-span-2 {
          grid-column: span 2;
        }

        @media (max-width: 1024px) {
          .grid-span-2 {
            grid-column: span 1;
          }
        }

        .flex-col {
          display: flex;
          flex-direction: column;
        }

        .gap-4 { gap: 1.5rem; }

        .section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .section-subtitle {
          font-size: 0.775rem;
          color: var(--text-muted);
        }

        /* Customer Details grid */
        .profile-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        @media (max-width: 640px) {
          .profile-details-grid {
            grid-template-columns: 1fr;
          }
        }

        .profile-detail-tile {
          display: flex;
          flex-direction: column;
          border-bottom: 1.5px solid var(--bg-tertiary);
          padding-bottom: 0.5rem;
        }

        .profile-label {
          font-size: 0.775rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.025em;
          display: flex;
          align-items: center;
        }

        .profile-value {
          font-size: 0.95rem;
          color: var(--text-primary);
          margin-top: 0.15rem;
        }

        /* Gradient Risk Score Slider */
        .risk-meter-container {
          position: relative;
          height: 16px;
          margin: 1.5rem 0 1rem;
        }

        .risk-meter-gradient-bar {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(to right, var(--risk-low) 0%, #eab308 50%, var(--risk-critical) 100%);
        }

        .risk-meter-pointer {
          position: absolute;
          top: -4px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 24px;
        }

        .pointer-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: var(--shadow-sm);
        }

        .pointer-line {
          width: 2px;
          height: 10px;
          background-color: var(--text-primary);
        }

        .risk-scale-labels {
          font-size: 0.725rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Threat factors list */
        .threat-factors-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .threat-item {
          background-color: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-sm);
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .threat-alert-icon {
          color: var(--risk-critical);
          flex-shrink: 0;
        }

        .no-threats-indicator {
          background-color: var(--risk-low-bg);
          border: 1px solid var(--risk-low-border);
          color: var(--risk-low);
          padding: 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          gap: 0.5rem;
        }

        .success-icon {
          color: var(--risk-low);
        }

        /* Side control card */
        .compliance-controls-card {
          margin-bottom: 0;
        }

        .icon-blue {
          color: var(--color-primary);
        }

        .actions-button-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .w-full {
          width: 100%;
        }

        .compliance-role-warning {
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
          color: var(--risk-medium);
          padding: 0.875rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          line-height: 1.5;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .warning-icon {
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .compliance-authorized-badge {
          color: var(--risk-low);
          font-size: 0.775rem;
          font-weight: 600;
        }

        .authorized-icon {
          color: var(--risk-low);
        }

        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
      `}</style>
    </div>
  );
}
