'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { amlApi, Alert } from '@/lib/api-client';
import { Search, SlidersHorizontal, AlertTriangle, Eye, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

/**
 * AML Interactive Alerts Dashboard.
 * 
 * AML Architecture Context:
 * Ingests financial alerts from the classification pipeline and allows AML analysts
 * to sort, filter, and inspect entities based on custom risk tolerance matrices.
 * Employs client-side filtering on cached React Query data for instantaneous, fluid UI responses.
 */
export default function AlertsPage() {
  // Query and Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [minRiskScore, setMinRiskScore] = useState<number>(0);
  const [statusFilters, setStatusFilters] = useState({
    pending: true,
    under_investigation: true,
    resolved: true,
    dismissed: true,
  });

  // Table Sort and Pagination States
  const [sortField, setSortField] = useState<keyof Alert>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // React Query server data retrieval
  const { data: alerts = [], isLoading, isError } = useQuery({
    queryKey: ['alertsList'],
    queryFn: amlApi.getAlerts,
    refetchInterval: 12000, // Refresh alerts stream periodically
  });

  // Toggle status checkboxes
  const handleStatusToggle = (key: keyof typeof statusFilters) => {
    setStatusFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    setCurrentPage(1); // Reset page on filter
  };

  // Filter transaction records based on active user parameters
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => {
        // 1. Text Search matching sender, recipient, or Alert ID
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          alert.id.toLowerCase().includes(query) ||
          alert.sender.toLowerCase().includes(query) ||
          alert.recipient.toLowerCase().includes(query);

        // 2. GNN Threat score constraint
        const matchesRisk = alert.riskScore >= minRiskScore;

        // 3. Priority selector constraint
        const matchesPriority =
          priorityFilter === 'all' || alert.priority === priorityFilter;

        // 4. Status checkbox constraint
        const matchesStatus = statusFilters[alert.status];

        return matchesSearch && matchesRisk && matchesPriority && matchesStatus;
      })
      .sort((a, b) => {
        // Dynamic sorting
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (typeof aVal === 'string') {
          return sortAsc
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        } else {
          return sortAsc
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }
      });
  }, [alerts, searchQuery, minRiskScore, priorityFilter, statusFilters, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAlerts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAlerts, currentPage]);

  // Adjust sort targets
  const requestSort = (field: keyof Alert) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'critical': return 'badge badge-critical';
      case 'high':
      case 'medium': return 'badge badge-medium';
      default: return 'badge badge-low';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="alerts-workspace">
      <div className="page-header-row mb-4">
        <h1 className="alerts-title">GNN Fraud Alert Auditor</h1>
        <p className="alerts-subtitle">Audit and update transaction alerts processed by the threat machine learning models</p>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="card filters-container">
        <div className="filters-header">
          <SlidersHorizontal size={18} className="filters-icon" />
          <h2 className="filters-title-text">Advanced Search & Risk Filtering</h2>
        </div>

        <div className="filters-grid mt-4">
          {/* Text Search Input */}
          <div className="form-group">
            <label className="form-label">Search Query</label>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search Account Holder or Alert ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Priority dropdown */}
          <div className="form-group">
            <label className="form-label">Priority Threshold</label>
            <select
              className="form-input"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          {/* Min Risk Score range slider */}
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label">Minimum GNN Threat Score</label>
              <span className="slider-value-badge font-semibold">{minRiskScore}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="risk-slider"
              value={minRiskScore}
              onChange={(e) => { setMinRiskScore(Number(e.target.value)); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Status Checkboxes Row */}
        <div className="status-filters-row mt-4">
          <span className="status-row-label">Transaction Status:</span>
          <div className="checkboxes-wrapper">
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={statusFilters.pending}
                onChange={() => handleStatusToggle('pending')}
              />
              <span className="checkbox-custom pending" />
              <span className="checkbox-label">Pending</span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={statusFilters.under_investigation}
                onChange={() => handleStatusToggle('under_investigation')}
              />
              <span className="checkbox-custom investigation" />
              <span className="checkbox-label">Under Investigation</span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={statusFilters.resolved}
                onChange={() => handleStatusToggle('resolved')}
              />
              <span className="checkbox-custom resolved" />
              <span className="checkbox-label">Resolved</span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={statusFilters.dismissed}
                onChange={() => handleStatusToggle('dismissed')}
              />
              <span className="checkbox-custom dismissed" />
              <span className="checkbox-label">Dismissed</span>
            </label>
          </div>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <div className="table-container">
        {isLoading ? (
          // Loader Skeleton Rows
          <table className="data-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Sender Account</th>
                <th>Recipient Entity</th>
                <th>Amount</th>
                <th>Threat Score</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx}>
                  {Array.from({ length: 8 }).map((__, tdIdx) => (
                    <td key={tdIdx}>
                      <div className="skeleton-box skeleton-table-cell" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : isError ? (
          <div className="error-alert-box flex-center">
            <AlertTriangle className="error-icon" size={20} />
            <span>Failed to load transaction alerts database. Connect with server or retry.</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="empty-results-box flex-center">
            <SlidersHorizontal size={36} className="empty-icon" />
            <p className="empty-title">No matching transaction alerts found</p>
            <p className="empty-subtitle">Try relaxing your search terms or lowering the threat score filter.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')} className="sortable-header">
                  Alert ID <ArrowUpDown size={12} className="inline-icon" />
                </th>
                <th onClick={() => requestSort('sender')} className="sortable-header">
                  Sender <ArrowUpDown size={12} className="inline-icon" />
                </th>
                <th onClick={() => requestSort('recipient')} className="sortable-header">
                  Recipient <ArrowUpDown size={12} className="inline-icon" />
                </th>
                <th onClick={() => requestSort('amount')} className="sortable-header">
                  Amount <ArrowUpDown size={12} className="inline-icon" />
                </th>
                <th onClick={() => requestSort('riskScore')} className="sortable-header">
                  Threat Score <ArrowUpDown size={12} className="inline-icon" />
                </th>
                <th onClick={() => requestSort('priority')} className="sortable-header">
                  Priority <ArrowUpDown size={12} className="inline-icon" />
                </th>
                <th onClick={() => requestSort('status')} className="sortable-header">
                  Status <ArrowUpDown size={12} className="inline-icon" />
                </th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="font-semibold">{alert.id}</td>
                  <td>
                    <Link href={`/accounts/${alert.senderAccountId}`} className="sender-link" title="Click to view sender profile">
                      {alert.sender}
                    </Link>
                  </td>
                  <td>{alert.recipient}</td>
                  <td className="amount-col font-semibold">{formatCurrency(alert.amount)}</td>
                  <td>
                    <div className="risk-score-display-cell">
                      <span className="risk-num font-semibold">{alert.riskScore}%</span>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill" style={{ width: `${alert.riskScore}%`, backgroundColor: alert.riskScore > 75 ? 'var(--risk-critical)' : 'var(--risk-medium)' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={getPriorityBadgeClass(alert.priority)}>{alert.priority}</span>
                  </td>
                  <td className="status-col">
                    <span className={`status-pill status-${alert.status}`}>{alert.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <Link href={`/alerts/${alert.id}`} className="review-btn flex-center gap-1">
                      <Eye size={14} />
                      <span>Inspect</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION PANEL */}
      {totalPages > 1 && (
        <div className="pagination-wrapper mt-4">
          <span className="pagination-info">
            Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredAlerts.length} total entries)
          </span>
          <div className="pagination-btns">
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Styled JSX for the Alerts Table controls */}
      <style jsx>{`
        .alerts-workspace {
          display: flex;
          flex-direction: column;
        }

        .alerts-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .alerts-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Filter Panel */
        .filters-container {
          padding: 1.5rem;
        }

        .filters-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid var(--bg-tertiary);
          padding-bottom: 0.75rem;
        }

        .filters-icon {
          color: var(--color-primary);
        }

        .filters-title-text {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        .search-input-wrapper {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input {
          padding-left: 2.25rem !important;
        }

        .slider-value-badge {
          font-size: 0.8rem;
          color: var(--color-primary);
          background-color: var(--color-primary-light);
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-sm);
        }

        .risk-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--bg-tertiary);
          outline: none;
          margin-top: 0.625rem;
          accent-color: var(--color-primary);
        }

        /* Status Filters Checkbox Row */
        .status-filters-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .status-row-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .checkboxes-wrapper {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .checkbox-item input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }

        .checkbox-custom {
          width: 16px;
          height: 16px;
          border: 1.5px solid var(--bg-accent);
          border-radius: var(--radius-sm);
          position: relative;
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
        }

        .checkbox-item input:checked ~ .checkbox-custom {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
        }

        .checkbox-item input:checked ~ .checkbox-custom::after {
          content: "";
          position: absolute;
          left: 4px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .sender-link {
          font-weight: 600;
          color: var(--color-primary);
        }

        .sender-link:hover {
          text-decoration: underline;
        }

        /* Sort headers */
        .sortable-header {
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .sortable-header:hover {
          background-color: var(--bg-accent) !important;
        }

        .inline-icon {
          display: inline-block;
          vertical-align: middle;
          margin-left: 0.25rem;
          color: var(--text-muted);
        }

        /* Risk Displays */
        .risk-score-display-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 130px;
        }

        .risk-num {
          font-size: 0.85rem;
          width: 32px;
          text-align: right;
        }

        .risk-bar-track {
          flex-grow: 1;
          height: 6px;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .risk-bar-fill {
          height: 100%;
        }

        /* Table Status Indicators */
        .status-pill {
          display: inline-block;
          font-size: 0.725rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-sm);
        }

        .status-pill.status-pending { background-color: var(--risk-critical-bg); color: var(--risk-critical); }
        .status-pill.status-under_investigation { background-color: var(--risk-medium-bg); color: var(--risk-medium); }
        .status-pill.status-resolved { background-color: var(--risk-low-bg); color: var(--risk-low); }
        .status-pill.status-dismissed { background-color: var(--bg-tertiary); color: var(--text-muted); }

        .review-btn {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          background-color: var(--color-primary-light);
          color: var(--color-primary);
          border: 1px solid var(--color-primary-light);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .review-btn:hover {
          background-color: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        /* Pagination Classes */
        .pagination-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
          font-size: 0.825rem;
          color: var(--text-secondary);
        }

        .pagination-btns {
          display: flex;
          gap: 0.5rem;
        }

        /* Empty/Error place holders */
        .skeleton-table-cell {
          height: 16px;
          width: 80px;
        }

        .empty-results-box {
          flex-direction: column;
          padding: 4rem 1rem;
          text-align: center;
        }

        .empty-icon {
          color: var(--text-muted);
          margin-bottom: 1rem;
        }

        .empty-title {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 1.1rem;
        }

        .empty-subtitle {
          color: var(--text-muted);
          font-size: 0.825rem;
          margin-top: 0.25rem;
        }

        .error-alert-box {
          background-color: var(--risk-critical-bg);
          border: 1px solid var(--risk-critical-border);
          color: var(--risk-critical);
          padding: 2rem;
          gap: 0.75rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.875rem;
        }

        .error-icon {
          flex-shrink: 0;
        }

        .gap-1 { gap: 0.25rem; }
      `}</style>
    </div>
  );
}
