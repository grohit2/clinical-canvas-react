import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMutateAsync = vi.fn(async () => ({}));
const undoMutate = vi.fn();
const updateMutate = vi.fn();
const updateMutateAsync = vi.fn(async () => ({}));
const deleteMutate = vi.fn();

vi.mock('../hooks/useTasks', () => ({
  useTasks: vi.fn(() => ({
    data: [
      {
        id: 'task_1',
        title: 'Post-op vitals check',
        description: '',
        priority: 'urgent',
        status: 'pending',
        dueDate: '2026-02-16T11:00:00.000Z',
        patientId: 'p1',
        patientName: undefined,
        assigneeId: 'staff_1',
        assigneeName: 'RN Alex',
        departmentId: 'A',
        createdAt: '2026-02-16T09:00:00.000Z',
        updatedAt: '2026-02-16T09:00:00.000Z',
        completedAt: undefined,
      },
    ],
    isLoading: false,
  })),
}));

vi.mock('../hooks/useCreateTask', () => ({
  useCreateTask: vi.fn(() => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  })),
}));

vi.mock('../hooks/useUndo', () => ({
  useUndo: vi.fn(() => ({
    mutate: undoMutate,
    isPending: false,
  })),
}));

vi.mock('../hooks/useUpdateTask', () => ({
  useUpdateTask: vi.fn(() => ({
    mutate: updateMutate,
    mutateAsync: updateMutateAsync,
    isPending: false,
  })),
  useDeleteTask: vi.fn(() => ({
    mutate: deleteMutate,
    isPending: false,
  })),
}));

vi.mock('../hooks/useMyActivity', () => ({
  useMyActionsToday: vi.fn(() => ({
    data: [
      {
        opId: 'op_1',
        entityId: 'task_1',
        opType: 'create',
        patchJson: '{"title":"Post-op vitals check"}',
        reason: 'Created from board',
        actorId: 'actor_1',
        createdAt: '2026-02-16T09:00:00.000Z',
      },
    ],
  })),
}));

vi.mock('../../patient-list/api/usePatients', () => ({
  usePatients: vi.fn(() => ({
    data: [{ id: 'p1', name: 'Robert Johnson' }],
  })),
}));

vi.mock('../local-ledger/utils/device', () => ({
  getActiveActorId: vi.fn(() => 'actor_1'),
}));

describe('TaskBoardScreen integration', () => {
  beforeEach(() => {
    createMutateAsync.mockClear();
    undoMutate.mockClear();
    updateMutate.mockClear();
    updateMutateAsync.mockClear();
    deleteMutate.mockClear();
  });

  it('creates, updates, opens task detail modal, undoes, and switches tabs', async () => {
    const { TaskBoardScreen } = await import('./web/TaskBoardScreen');

    render(
      <MemoryRouter>
        <TaskBoardScreen />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Add a task'), {
      target: { value: 'Medication adjustment' },
    });
    fireEvent.click(screen.getByLabelText('Create task'));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Medication adjustment',
        }),
      );
    });

    fireEvent.click(screen.getByLabelText('Toggle Post-op vitals check'));
    expect(updateMutate).toHaveBeenCalledWith({ status: 'completed' });

    fireEvent.click(screen.getByRole('button', { name: /Undo/i }));
    expect(undoMutate).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Post-op vitals check'));
    expect(screen.getByText('Task Details')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Post-op vitals check updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Post-op vitals check updated',
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Reminders/i }));
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
