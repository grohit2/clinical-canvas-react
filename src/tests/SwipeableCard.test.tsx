import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableCard } from '@/components/ui/SwipeableCard';
import { TestTube, Copy } from 'lucide-react';

const mockActions = [
  {
    id: 'test1',
    label: 'Test Action',
    icon: <TestTube />,
    color: 'bg-blue-500',
    onClick: jest.fn(),
  },
  {
    id: 'test2',
    label: 'Copy',
    icon: <Copy />,
    color: 'bg-green-500',
    onClick: jest.fn(),
  },
];

describe('SwipeableCard', () => {
  it('renders children content', () => {
    render(
      <SwipeableCard actions={mockActions}>
        <div>Test Content</div>
      </SwipeableCard>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders action buttons when swiped', () => {
    render(
      <SwipeableCard actions={mockActions}>
        <div>Test Content</div>
      </SwipeableCard>
    );

    // Check that action buttons are rendered (though hidden initially)
    expect(screen.getByLabelText('Test Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy')).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', () => {
    render(
      <SwipeableCard actions={mockActions}>
        <div>Test Content</div>
      </SwipeableCard>
    );

    const actionButton = screen.getByLabelText('Test Action');
    fireEvent.click(actionButton);

    expect(mockActions[0].onClick).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(
      <SwipeableCard actions={mockActions}>
        <div>Test Content</div>
      </SwipeableCard>
    );

    const container = screen.getByRole('group');
    expect(container).toHaveAttribute('aria-label', 'Swipeable card with actions');

    const actionButtons = screen.getAllByRole('button');
    actionButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });
});