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
