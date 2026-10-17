import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App';
import { solarCapitalDealFactory } from '../model/exampleDeal';
import { emptyDeal } from '../model/deal';

beforeEach(() => {
  window.localStorage.clear();
});

describe('Results page', () => {
  it('shows the scorecard results and the capital calculation for the example', () => {
    window.location.hash = '#/results';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    expect(screen.getByRole('heading', { level: 1, name: /Results/i })).toBeInTheDocument();
    expect(screen.getByTestId('final-pd')).toHaveTextContent('0.77%');
    expect(screen.getByTestId('final-grade')).toHaveTextContent('RW14');
    expect(screen.getByTestId('country-of-risk')).toHaveTextContent('SOUTH AFRICA');
    expect(screen.getByTestId('sovereign-rg')).toHaveTextContent('RW15');
    expect(screen.getByTestId('recovery-rate')).toHaveTextContent('48.32%');
    const lgdTable = screen.getByRole('table', { name: /Loan-level lifetime LGD/i });
    const senior = within(lgdTable).getAllByRole('row')[1];
    expect(senior).toHaveTextContent('Senior Secured');
    expect(senior).toHaveTextContent(/2\d\.\d\d%/); // 12-month LGD around 29.6%
    // The example keeps the 5% liquidation cost and both pooled collateral rows (see spec deviations D1/D2), so K is 4.89% here against 5.17% in the sheet.
    expect(screen.getByTestId('capital-k')).toHaveTextContent(/4\.\d\d%/);
    expect(screen.getByTestId('capital-rwa')).toHaveTextContent(/6\d\.\d\d%/);
    expect(screen.getByTestId('capital-pct')).toHaveTextContent(/6\.\d\d%/);
    expect(screen.getByTestId('remaining-maturity')).toHaveTextContent('5.00');
    expect(screen.getByText(/PF Scorecard Model_v08\.4\.2/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Project LGD by year/i })).toBeInTheDocument();
  });

  it('lists what is still missing on an empty deal instead of numbers', () => {
    window.location.hash = '#/results';
    render(<App initialDeal={emptyDeal()} />);
    expect(screen.getByTestId('final-pd')).toHaveTextContent('');
    expect(screen.getByRole('heading', { name: /Still needed/i })).toBeInTheDocument();
  });
});

describe('Reference pages', () => {
  it('Terms of Use is searchable', () => {
    window.location.hash = '#/terms-of-use';
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /Terms of Use/i })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cross-border' } });
    expect(screen.getByText(/A2\.1/)).toBeInTheDocument();
    expect(screen.queryByText(/^Facility Amount$/)).toBeNull();
  });

  it('Reference Tables renders the risk grades and sectors', () => {
    window.location.hash = '#/reference-tables';
    render(<App />);
    expect(screen.getByRole('table', { name: /Risk grades/i })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Sector volatility/i })).toHaveTextContent('Energy');
    expect(screen.getByRole('table', { name: /Sovereign ratings/i })).toHaveTextContent('SOUTH AFRICA');
  });

  it('Recovery Under Restructure computes the weighted score', () => {
    window.location.hash = '#/recovery-under-restructure';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    expect(screen.getByTestId('restructure-score')).toHaveTextContent('1.20');
    fireEvent.change(screen.getByLabelText(/Information Quality/i), { target: { value: 'c)' } });
    expect(screen.getByTestId('restructure-score')).toHaveTextContent('1.50');
  });
});
