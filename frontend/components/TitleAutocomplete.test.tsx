import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TitleAutocomplete from './TitleAutocomplete';

jest.mock('@/lib/api', () => ({
  api: {
    quizzes: {
      autocompleteTitles: jest.fn(),
    },
  },
}));

import { api } from '@/lib/api';
const mockAutocomplete = api.quizzes.autocompleteTitles as jest.Mock;

const SUGGESTIONS = [
  { id: 1, title: 'The Matrix', year: 1999, kind: 'movie' as const },
  { id: 2, title: 'The Matrix Reloaded', year: 2003, kind: 'movie' as const },
  { id: 3, title: 'The Matrix Revolutions', year: 2003, kind: 'movie' as const },
];

function ControlledHarness({
  initial = '',
  onSelect,
  onSubmit,
}: {
  initial?: string;
  onSelect?: (s: { title: string }) => void;
  onSubmit?: () => void;
}) {
  const [value, setValue] = require('react').useState(initial) as [
    string,
    (v: string) => void,
  ];
  return (
    <TitleAutocomplete
      value={value}
      onChange={setValue}
      onSelect={onSelect}
      onSubmit={onSubmit}
    />
  );
}

describe('TitleAutocomplete', () => {
  beforeEach(() => {
    mockAutocomplete.mockReset();
    mockAutocomplete.mockResolvedValue({ results: SUGGESTIONS });
  });

  describe('ARIA contract', () => {
    it('renders an input with role=combobox', () => {
      render(<ControlledHarness />);
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('opens listbox after typing 2+ chars and updates aria-expanded', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'th');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      expect(screen.getByRole('combobox')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('skips fetch for queries shorter than 2 chars', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'a');
      // Allow debounce window.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 250));
      });
      expect(mockAutocomplete).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown moves active descendant', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      const input = screen.getByRole('combobox');
      await user.type(input, 'th');
      await screen.findByRole('listbox');

      await user.keyboard('{ArrowDown}');
      const options = screen.getAllByRole('option');
      // index 0 is initial active, ArrowDown moves to 1
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp from 0 wraps to last option', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      const input = screen.getByRole('combobox');
      await user.type(input, 'th');
      await screen.findByRole('listbox');

      await user.keyboard('{ArrowUp}');
      const options = screen.getAllByRole('option');
      expect(options[options.length - 1]).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('Escape closes the listbox', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'th');
      await screen.findByRole('listbox');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('Enter on highlighted option calls onSelect', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<ControlledHarness onSelect={onSelect} />);
      await user.type(screen.getByRole('combobox'), 'th');
      await screen.findByRole('listbox');
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'The Matrix' })
      );
    });

    it('Enter with closed listbox calls onSubmit', async () => {
      // Make autocomplete return zero suggestions so the listbox never opens.
      mockAutocomplete.mockResolvedValue({ results: [] });
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<ControlledHarness onSubmit={onSubmit} />);
      await user.type(screen.getByRole('combobox'), 'zzz');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 250));
      });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      await user.keyboard('{Enter}');
      expect(onSubmit).toHaveBeenCalled();
    });

    it('Home jumps to first, End jumps to last', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'th');
      await screen.findByRole('listbox');
      await user.keyboard('{ArrowDown}{ArrowDown}');
      await user.keyboard('{Home}');
      let options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{End}');
      options = screen.getAllByRole('option');
      expect(options[options.length - 1]).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('mouse selection', () => {
    it('selects an option on mouseDown (not click) so input does not blur first', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<ControlledHarness onSelect={onSelect} />);
      await user.type(screen.getByRole('combobox'), 'th');
      await screen.findByRole('listbox');

      const option = screen.getByText('The Matrix Reloaded');
      await act(async () => {
        option.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        );
      });

      await waitFor(() => expect(onSelect).toHaveBeenCalled());
      expect(onSelect.mock.calls[0][0]).toMatchObject({
        title: 'The Matrix Reloaded',
      });
    });
  });

  describe('race conditions and focus management', () => {
    it('drops stale results when a newer query has started', async () => {
      let resolveFirst: (v: { results: typeof SUGGESTIONS }) => void = () => {};
      const firstPromise = new Promise<{ results: typeof SUGGESTIONS }>((r) => {
        resolveFirst = r;
      });
      const secondResults = [
        { id: 99, title: 'Inception', year: 2010, kind: 'movie' as const },
      ];

      mockAutocomplete.mockReset();
      mockAutocomplete.mockImplementationOnce(() => firstPromise);
      mockAutocomplete.mockResolvedValueOnce({ results: secondResults });

      const user = userEvent.setup();
      render(<ControlledHarness />);
      const input = screen.getByRole('combobox');
      await user.type(input, 'th');
      // Wait through the debounce window so the first fetch is in flight.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      // Type more to trigger a second (newer) fetch.
      await user.type(input, 'in');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      // Resolve the original (stale) request after the new one has rendered.
      await act(async () => {
        resolveFirst({ results: SUGGESTIONS });
        await new Promise((r) => setTimeout(r, 50));
      });

      // Only the second fetch's result should be on screen.
      const options = screen.queryAllByRole('option');
      expect(options.some((o) => o.textContent?.includes('Inception'))).toBe(
        true
      );
      expect(options.some((o) => o.textContent?.includes('The Matrix'))).toBe(
        false
      );
    });

    it('re-focusing cancels the pending close timer from blur', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      const input = screen.getByRole('combobox');
      await user.type(input, 'th');
      await screen.findByRole('listbox');
      // Blur the input — schedules a close timer.
      await act(async () => {
        input.blur();
      });
      // Immediately refocus before the 120ms timer fires.
      await act(async () => {
        input.focus();
      });
      // Wait past the original close timeout.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });
      // Listbox should still be open because focus cancelled the close.
      expect(screen.queryByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('optional props and rendering', () => {
    it('mouseDown without an onSelect prop still updates value and closes', async () => {
      // Harness without onSelect; the mouseDown handler's onSelect?.() is skipped.
      function NoOnSelectHarness() {
        const [value, setValue] = require('react').useState('') as [
          string,
          (v: string) => void,
        ];
        return <TitleAutocomplete value={value} onChange={setValue} />;
      }
      const user = userEvent.setup();
      render(<NoOnSelectHarness />);
      await user.type(screen.getByRole('combobox'), 'th');
      await screen.findByRole('listbox');
      const option = screen.getByText('The Matrix');
      await act(async () => {
        option.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        );
      });
      // Listbox closes after selection.
      await waitFor(() =>
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      );
    });

    it('renders TV suggestions with no year', async () => {
      mockAutocomplete.mockResolvedValue({
        results: [
          { id: 1, title: 'Mystery Show', year: null, kind: 'tv' as const },
        ],
      });
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'my');
      await screen.findByRole('listbox');
      // No "·" separator when year is null.
      expect(screen.getByText('Mystery Show')).toBeInTheDocument();
      expect(screen.getByText('TV')).toBeInTheDocument();
    });

    it('renders movie with year using the · separator', async () => {
      mockAutocomplete.mockResolvedValue({
        results: [
          { id: 1, title: 'Some Movie', year: 2024, kind: 'movie' as const },
        ],
      });
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'so');
      await screen.findByRole('listbox');
      expect(screen.getByText(/Movie · 2024/)).toBeInTheDocument();
    });

    it('Enter with closed listbox and no onSubmit is a no-op', async () => {
      // No onSubmit prop — covers the falsy branch.
      mockAutocomplete.mockResolvedValue({ results: [] });
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'zzz');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 250));
      });
      // Should not throw.
      await user.keyboard('{Enter}');
    });

    it('ArrowUp with no suggestions is a no-op', async () => {
      mockAutocomplete.mockResolvedValue({ results: [] });
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'zz');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 250));
      });
      await user.keyboard('{ArrowUp}');
      // No throw, no listbox.
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('mouse hover', () => {
    it('hovering an option updates the active descendant', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'th');
      await screen.findByRole('listbox');
      const options = screen.getAllByRole('option');
      // userEvent.hover dispatches the right synthetic React events.
      await user.hover(options[2]);
      expect(options[2]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowDown is a no-op when no suggestions are available', async () => {
      // 0 results means suggestions array is empty.
      mockAutocomplete.mockResolvedValue({ results: [] });
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'zz');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 250));
      });
      await user.keyboard('{ArrowDown}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('survives a failed fetch without crashing', async () => {
      mockAutocomplete.mockRejectedValueOnce(new Error('boom'));
      const user = userEvent.setup();
      render(<ControlledHarness />);
      await user.type(screen.getByRole('combobox'), 'th');
      // Wait for debounce + rejected promise to settle.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 300));
      });
      // No listbox shown; no exception bubbled.
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
