import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Status Control Component for testing status transition calls
interface StatusControlProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

function StatusControl({ currentStatus, onStatusChange, disabled = false }: StatusControlProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="task-status-select" className="text-xs font-bold text-slate-600 uppercase">
        Task Status
      </label>
      <select
        id="task-status-select"
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 disabled:opacity-70"
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="in_review">In Review</option>
        <option value="done">Completed</option>
      </select>
    </div>
  );
}

describe('Task Status Selector Control', () => {
  it('correctly reports chosen status on option clicks', () => {
    const handleStatusChange = vi.fn();
    render(<StatusControl currentStatus="todo" onStatusChange={handleStatusChange} />);

    const selectElement = screen.getByLabelText('Task Status') as HTMLSelectElement;
    expect(selectElement.value).toBe('todo');

    // Trigger select change event to "in_progress"
    fireEvent.change(selectElement, { target: { value: 'in_progress' } });

    expect(handleStatusChange).toHaveBeenCalledTimes(1);
    expect(handleStatusChange).toHaveBeenCalledWith('in_progress');
  });

  it('restricts user selection clicks when disabled', () => {
    const handleStatusChange = vi.fn();
    render(<StatusControl currentStatus="in_progress" onStatusChange={handleStatusChange} disabled={true} />);

    const selectElement = screen.getByLabelText('Task Status') as HTMLSelectElement;
    expect(selectElement).toBeDisabled();
  });
});
