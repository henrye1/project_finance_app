import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import App from '../App';

describe('App shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('shows the seven workbook steps in order in the navigation', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: /steps/i });
    const items = within(nav).getAllByRole('link').map((a) => a.textContent?.replace(/\s+/g, ' ').trim());
    expect(items[0]).toBe('Instructions');
    expect(items.slice(1, 8)).toEqual([
      '1 Project Information',
      '2 Cashflow Details',
      '3 Funding Details',
      '4 Project Valuation',
      '5 PD Scorecard',
      '6 LGD Scorecard',
      '7 Results',
    ]);
    expect(items).toContain('Terms of Use');
    expect(items).toContain('Reference Tables');
    expect(items).toContain('Recovery Under Restructure');
  });

  it('starts on the Instructions page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /PROJECT FINANCE SCORECARD - INSTRUCTIONS/i })).toBeInTheDocument();
    expect(screen.getByText(/press the calculation button/i)).toBeInTheDocument();
  });

  it('loads the example deal into the header', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /load example/i }));
    expect(screen.getByTestId('deal-name')).toHaveTextContent('Solar Capital De Aar RF (Pty) Ltd');
  });

  it('navigates to a step via the hash route', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /5 PD Scorecard/i }));
    expect(window.location.hash).toBe('#/pd-scorecard');
    expect(screen.getByRole('heading', { level: 1, name: /PD Scorecard/i })).toBeInTheDocument();
  });

  it('shows step status from the computed deal', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: /steps/i });
    expect(within(nav).getByRole('link', { name: /1 Project Information/i })).toHaveAttribute('data-status', 'empty');
    fireEvent.click(screen.getByRole('button', { name: /load example/i }));
    expect(within(nav).getByRole('link', { name: /7 Results/i })).toHaveAttribute('data-status', 'complete');
  });
});
