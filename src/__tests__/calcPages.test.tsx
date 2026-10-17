import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App';
import { solarCapitalDealFactory } from '../model/exampleDeal';
import { emptyDeal } from '../model/deal';
import { STORAGE_KEY } from '../model/storage';

beforeEach(() => {
  window.localStorage.clear();
});

describe('Project Valuation page', () => {
  it('shows the parameter block, the period table and the valuation analysis', () => {
    window.location.hash = '#/project-valuation';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    expect(screen.getByRole('heading', { level: 1, name: /Project Valuation/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Est\. project value after construction/i)).toHaveTextContent('1 642 684 109');
    expect(screen.getByLabelText(/Annualised WACC/i)).toHaveTextContent('17.73%');
    const periods = screen.getByRole('table', { name: /Valuation by period/i });
    expect(within(periods).getAllByRole('row').length).toBe(49); // header + 48 half-years
    const analysis = screen.getByRole('table', { name: /Valuation Analysis/i });
    const rows = within(analysis).getAllByRole('row');
    const row2017 = rows.find((r) => r.textContent?.startsWith('2017'))!;
    expect(row2017).toHaveTextContent('1.63');
    expect(row2017).toHaveClass('highlight');
  });

  it('validates upstream steps when Calculate is pressed', () => {
    window.location.hash = '#/project-valuation';
    render(<App initialDeal={emptyDeal()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Calculate$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Project Information/i);
  });

  it('confirms the calculation on a complete deal', () => {
    window.location.hash = '#/project-valuation';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Calculate$/i }));
    expect(screen.getByTestId('calculated-status')).toHaveTextContent(/calculated/i);
  });
});

describe('PD Scorecard page', () => {
  it('renders sections, both response columns and the final PD', () => {
    window.location.hash = '#/pd-scorecard';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    expect(screen.getByRole('heading', { level: 1, name: /PD Scorecard/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/What is the country of risk/i)).toHaveValue('SOUTH AFRICA');
    expect(screen.getByTestId('sovereign-grade')).toHaveTextContent('RW15');
    expect(screen.getByTestId('pd-post')).toHaveTextContent('0.77%');
    expect(screen.getByTestId('grade-post')).toHaveTextContent('RW14');
    expect(screen.getByTestId('pd-pre')).toHaveTextContent('2.28%');
    expect(screen.getByTestId('dscr-value')).toHaveTextContent('1.63');
    expect(screen.getByTestId('dscr-score')).toHaveTextContent('4');
    const pre = screen.getByLabelText(/A2\.1 pre-completion response/i);
    expect(pre).toHaveValue('Low Risk');
  });

  it('updates the PD when a response changes', async () => {
    window.location.hash = '#/pd-scorecard';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    fireEvent.change(screen.getByLabelText(/G1\.2 post-completion response/i), { target: { value: 'Very High Risk' } });
    expect(screen.getByTestId('pd-post')).not.toHaveTextContent('0.77%');
    await new Promise((r) => setTimeout(r, 400));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).pdScorecard.answers['G1.2'].post).toBe('Very High Risk');
  });
});

describe('LGD Scorecard page', () => {
  it('shows the questionnaire, the factors and the recovery rate', () => {
    window.location.hash = '#/lgd-scorecard';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    expect(screen.getByRole('heading', { level: 1, name: /LGD Scorecard/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/H2 /i)).toHaveValue('Moderate Risk');
    expect(screen.getByTestId('lgd-haircut')).toHaveTextContent('51.68%');
    expect(screen.getByTestId('lgd-recovery')).toHaveTextContent('48.32%');
    expect(screen.getByTestId('lgd-current-haircut')).toHaveTextContent('67.04%');
    expect(screen.getByTestId('lgd-country-factor')).toHaveTextContent('1.0921');
  });
});
