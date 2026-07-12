'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amlApi, Alert } from '@/lib/api-client';
import { useToast } from '@/app/providers';
import { ChevronLeft, ShieldAlert, CheckCircle2, RefreshCw, GitFork, Calendar, CheckSquare } from 'lucide-react';
import Link from 'next/link';

/**
 * AML Fraud Alert Detail & Explainability View.
 * 
 * AML Architecture Context:
 * This view exposes the explainability behind Graph Neural Network flags.
 * Rather than just a binary flag, it visualizes transaction path connections (SVG network node map),
 * displays a circular percentage gauge of model confidence, and displays an investigation timeline.
 * Compliance analysts can transition status (e.g. Pending -> Under Investigation -> Resolved).
 */
export default function AlertDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Alert Details
  const { data: alert, isLoading, isError } = useQuery({
    queryKey: ['alert', id],
    queryFn: () => amlApi.getAlert(id),
  });

  // 2. Mutation to update Alert Status (with React Query cache invalidation)
  const statusMutation = useMutation({
    mutationFn: (newStatus: Alert['status']) => amlApi.updateAlertStatus(id, newStatus),
    onSuccess: (updatedAlert) => {
      queryClient.setQueryData(['alert', id], updatedAlert);
      queryClient.invalidateQueries({ queryKey: ['alertsList'] });
      queryClient.invalidateQueries({ queryKey: ['alertsStream'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      showToast(`Alert status changed to ${updatedAlert.status.replace('_', ' ')}`, 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update alert status.', 'danger');
    },
  });

  if (isLoading) {
    return (
      <div className="alert-details-skeleton">
        <div className="skeleton-box skeleton-title-bar" />
        <div className="grid-cols-2 mt-4">
          <div className="card skeleton-details-card" />
          <div className="card skeleton-details-card" />
        </div>
        <style jsx>{`
          .alert-details-skeleton { display: flex; flex-direction: column; gap: 1rem; }
          .skeleton-title-bar { height: 40px; width: 30%; }
          .skeleton-details-card { height: 400px; }
        `}</style>
      </div>
    );
  }

  if (isError || !alert) {
    return (
      <div className="error-alert-box flex-center">
        <ShieldAlert size={28} />
        <div>
          <h3 className="error-title">Alert Record Not Found</h3>
          <p className="error-desc">The transaction alert ID "{id}" is invalid or has expired from the system.</p>
        </div>
        <Link href="/alerts" className="btn btn-secondary mt-4">Back to alerts</Link>
      </div>
    );
  }

  // GNN circular ring variables
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (alert.riskScore / 100) * circumference;

  return (
    <div className="alert-detail-workspace">
      {/* Back anchor bar */}
      <div className="back-navigation-row mb-4">
        <Link href="/alerts" className="back-link flex-center gap-1">
          <ChevronLeft size={16} />
          <span>Back to Alerts Feed</span>
        </Link>
      </div>

      <div className="alert-title-header flex-between mb-4">
        <div>
          <h1 className="detail-title">Inspect Alert: {alert.id}</h1>
          <p className="detail-subtitle">GNN Anomaly scoring and transaction route profiling</p>
        </div>
        <div className="status-selector-wrapper">
          <label className="form-label">Review Status</label>
          <select
            className="form-input status-select"
            value={alert.status}
            onChange={(e) => statusMutation.mutate(e.target.value as Alert['status'])}
            disabled={statusMutation.isPending}
          >
            <option value="pending">Pending</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="resolved">Resolved (Confirmed Fraud)</option>
            <option value="dismissed">Dismissed (False Positive)</option>
          </select>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* LEFT COLUMN: EXPLAINABILITY & METADATA */}
        <div className="column-left flex-col gap-4">
          
          {/* Card 1: GNN Explained Threat Score */}
          <div className="card risk-explanation-card">
            <h3 className="section-title">GNN Explainability Core</h3>
            
            <div className="explainability-body flex-center mt-4">
              {/* Radial gauge representing model confidence */}
              <div className="gauge-outer">
                <svg width="140" height="140" className="gauge-svg">
                  <circle cx="70" cy="70" r={radius} className="gauge-track" />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    className="gauge-fill"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    style={{ stroke: alert.riskScore > 75 ? 'var(--risk-critical)' : 'var(--risk-medium)' }}
                  />
                </svg>
                <div className="gauge-percentage-center">
                  <span className="percentage-number font-semibold">{alert.riskScore}%</span>
                  <span className="percentage-label">Risk score</span>
                </div>
              </div>

              <div className="explainability-text-container">
                <h4 className="model-verdict">Model Verdict: {alert.riskScore > 75 ? 'High Risk Anomaly' : 'Medium Suspicion'}</h4>
                <p className="explanation-paragraph">{alert.explanation}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Transaction Details */}
          <div className="card audit-details-card">
            <h3 className="section-title">Audit Metadata</h3>
            <div className="details-list mt-4">
              <div className="detail-item">
                <span className="item-label">Sender Account:</span>
                <Link href={`/accounts/${alert.senderAccountId}`} className="item-value font-semibold link-action">
                  {alert.sender} ({alert.senderAccountId})
                </Link>
              </div>
              <div className="detail-item">
                <span className="item-label">Recipient Entity:</span>
                <span className="item-value font-semibold">{alert.recipient}</span>
              </div>
              <div className="detail-item">
                <span className="item-label">Amount Transferred:</span>
                <span className="item-value font-semibold text-large">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(alert.amount)}
                </span>
              </div>
              <div className="detail-item">
                <span className="item-label">GNN Threat Class:</span>
                <span className="item-value font-semibold">Structured Layering Sequence</span>
              </div>
              <div className="detail-item">
                <span className="item-label">Ingested Time:</span>
                <span className="item-value text-muted">{new Date(alert.date).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: GRAPH VISUALIZATION & TIMELINE */}
        <div className="column-right flex-col gap-4">
          
          {/* Card 3: SVG Interactive Network Graph */}
          <div className="card network-graph-card">
            <h3 className="section-title">Entity Path Connections</h3>
            <p className="section-subtitle">Visualizing transaction nodes from neural network classification</p>

            <div className="svg-graph-container mt-4">
              <svg viewBox="0 0 400 200" className="network-svg">
                {/* Connecting lines */}
                <line x1="80" y1="100" x2="200" y2="100" className="graph-edge" />
                <line x1="200" y1="100" x2="320" y2="100" className="graph-edge" />
                
                {/* Arrow markers */}
                <polygon points="140,96 148,100 140,104" className="arrow-head" />
                <polygon points="260,96 268,100 260,104" className="arrow-head" />

                {/* Node 1: Sender */}
                <circle cx="80" cy="100" r="28" className="node node-sender" />
                <text x="80" y="145" textAnchor="middle" className="graph-label">Sender Account</text>
                <text x="80" y="103" textAnchor="middle" className="graph-sublabel">{alert.sender.split(' ')[0]}</text>

                {/* Node 2: Transaction Alert */}
                <circle cx="200" cy="100" r="32" className="node node-alert animate-pulse" style={{ fill: alert.riskScore > 75 ? 'var(--risk-critical)' : 'var(--risk-medium)' }} />
                <text x="200" y="150" textAnchor="middle" className="graph-label font-semibold">Flagged Wire</text>
                <text x="200" y="103" textAnchor="middle" className="graph-sublabel white-text">{alert.id}</text>

                {/* Node 3: Recipient */}
                <circle cx="320" cy="100" r="28" className="node node-recipient" />
                <text x="320" y="145" textAnchor="middle" className="graph-label">Recipient Account</text>
                <text x="320" y="103" textAnchor="middle" className="graph-sublabel">{alert.recipient.split(' ')[0]}</text>
              </svg>
            </div>
            <div className="graph-legend flex-center mt-4">
              <span className="legend-item"><span className="legend-color sender" /> Sender</span>
              <span className="legend-item"><span className="legend-color alert" /> Suspicious Node</span>
              <span className="legend-item"><span className="legend-color recipient" /> Recipient</span>
            </div>
          </div>

          {/* Card 4: Auditing Timeline */}
          <div className="card timeline-card">
            <h3 className="section-title">Investigation Timeline</h3>
            <div className="timeline mt-4">
              
              <div className="timeline-item">
                <div className="timeline-marker critical" />
                <div className="timeline-content">
                  <span className="flex-between">
                    <strong className="timeline-hdr">GNN Engine Flagged Anomaly</strong>
                    <span className="timeline-time flex-center gap-1"><Calendar size={12} /> {new Date(alert.date).toLocaleDateString()}</span>
                  </span>
                  <p className="timeline-desc">Model computed {alert.riskScore}% path score. Automated alert dispatched.</p>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <span className="flex-between">
                    <strong className="timeline-hdr">Triage Queue Ingested</strong>
                    <span className="timeline-time flex-center gap-1"><Calendar size={12} /> {new Date(alert.date).toLocaleDateString()}</span>
                  </span>
                  <p className="timeline-desc">Case assigned status <strong>{alert.status.replace('_', ' ')}</strong>. Initiated logging protocol.</p>
                </div>
              </div>

              {alert.status !== 'pending' && (
                <div className="timeline-item">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <span className="flex-between">
                      <strong className="timeline-hdr">Analyst Investigation Triggered</strong>
                      <span className="timeline-time flex-center gap-1"><RefreshCw size={12} /> Active</span>
                    </span>
                    <p className="timeline-desc">Audit record verified. Account profile cross-referenced.</p>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Styled JSX for details pages */}
      <style jsx>{`
        .alert-detail-workspace {
          display: flex;
          flex-direction: column;
        }

        .back-link {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .detail-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .detail-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Status Dropdown selector styling */
        .status-selector-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .status-select {
          min-width: 200px;
          height: 38px;
          border-radius: var(--radius-sm);
          font-weight: 600;
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
          margin-top: 0.15rem;
        }

        /* GNN Radial Gauge Ring Graph */
        .gauge-outer {
          position: relative;
          width: 140px;
          height: 140px;
          flex-shrink: 0;
        }

        .gauge-svg {
          transform: rotate(-90deg);
        }

        .gauge-track {
          fill: none;
          stroke: var(--bg-tertiary);
          stroke-width: 10;
        }

        .gauge-fill {
          fill: none;
          stroke-width: 10;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.5s ease;
        }

        .gauge-percentage-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .percentage-number {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .percentage-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .explainability-body {
          gap: 2rem;
        }

        .explainability-text-container {
          flex-grow: 1;
        }

        .model-verdict {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .explanation-paragraph {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Metadata Details List */
        .details-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--bg-tertiary);
          padding-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .detail-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .item-label {
          color: var(--text-secondary);
        }

        .item-value {
          color: var(--text-primary);
          text-align: right;
        }

        .item-value.link-action {
          color: var(--color-primary);
          cursor: pointer;
        }

        .item-value.link-action:hover {
          text-decoration: underline;
        }

        .text-large {
          font-size: 1.05rem;
          color: var(--color-primary);
        }

        /* SVG Network Graph Classes */
        .svg-graph-container {
          background-color: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          justify-content: center;
        }

        .network-svg {
          width: 100%;
          max-height: 200px;
        }

        .graph-edge {
          stroke: var(--bg-accent);
          stroke-width: 2.5;
          stroke-dasharray: 4 4;
        }

        .arrow-head {
          fill: var(--text-muted);
        }

        .node {
          stroke: #ffffff;
          stroke-width: 3.5;
          transition: transform var(--transition-fast);
        }

        .node-sender {
          fill: #dbeafe;
          stroke: #3b82f6;
        }

        .node-recipient {
          fill: #ffedd5;
          stroke: #f97316;
        }

        .graph-label {
          font-size: 8px;
          fill: var(--text-secondary);
          font-weight: 600;
        }

        .graph-sublabel {
          font-size: 8px;
          fill: var(--text-primary);
          font-weight: 500;
        }

        .white-text {
          fill: #ffffff !important;
          font-weight: 700 !important;
        }

        .graph-legend {
          gap: 1.5rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.775rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .legend-color.sender { background-color: #3b82f6; }
        .legend-color.recipient { background-color: #f97316; }
        .legend-color.alert { background-color: var(--risk-critical); }

        /* Timeline Card Custom overrides */
        .timeline-hdr {
          color: var(--text-primary);
        }

        .timeline-time {
          font-size: 0.725rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .timeline-desc {
          font-size: 0.775rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .gap-1 { gap: 0.25rem; }
      `}</style>
    </div>
  );
}
