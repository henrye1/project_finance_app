import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App';
import { solarCapitalDealFactory } from '../model/exampleDeal';
import { emptyDeal } from '../model/deal';
import { STORAGE_KEY } from '../model/storage';

function stored() {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
}

async function flushSave() {
  await new Promise((r) => setTimeout(r, 400));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('Project Information page', () => {
  it('shows the workbook fields with their numbering and derived values', () => {
    window.location.hash = '#/project-information';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    expect(screen.getByRole('heading', { level: 1, name: /Project Information/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Deal Name/i)).toHaveValue('Solar Capital De Aar RF (Pty) Ltd');
    expect(screen.getByLabelText(/1\.1\.1\s*Type of project/i)).toHaveValue('Energy');
    expect(screen.getByLabelText(/Life of the project/i)).toHaveTextContent('282');
    expect(screen.getByLabelText(/Duration of construction phase/i)).toHaveTextContent('18');
    expect(screen.getByRole('heading', { name: /Additional pooled collateral offered/i })).toBeInTheDocument();
  });

  it('writes edits back to the deal', async () => {
    window.location.hash = '#/project-information';
    render(<App initialDeal={emptyDeal()} />);
    fireEvent.change(screen.getByLabelText(/Deal Name/i), { target: { value: 'Wind Farm A' } });
    fireEvent.change(screen.getByLabelText(/Construction or post-construction phase/i), { target: { value: 'Pre-completion Phase' } });
    await flushSave();
    expect(stored().projectInformation.dealName).toBe('Wind Farm A');
    expect(stored().projectInformation.phase).toBe('Pre-completion Phase');
  });
});

describe('Cashflow Details page', () => {
  it('generates the date rows from Project Information and shows amounts', () => {
    window.location.hash = '#/cashflow-details';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    const construction = screen.getByRole('table', { name: /Construction Costs/i });
    expect(within(construction).getAllByRole('row').length).toBe(20); // header + 19 months
    expect(within(construction).getAllByRole('textbox')[0]).toHaveValue('190 272 978');
    const cfads = screen.getByRole('table', { name: /Cash flow Available to Service Debt/i });
    expect(within(cfads).getAllByRole('row').length).toBe(46); // header + 45 half-years
    expect(screen.getByLabelText(/Discount rate/i)).toHaveValue('8.50');
  });

  it('keeps amounts keyed by date when a value is typed', async () => {
    window.location.hash = '#/cashflow-details';
    const deal = solarCapitalDealFactory();
    render(<App initialDeal={deal} />);
    const cfads = screen.getByRole('table', { name: /Cash flow Available to Service Debt/i });
    const inputs = within(cfads).getAllByRole('textbox');
    fireEvent.focus(inputs[0]);
    fireEvent.change(inputs[0], { target: { value: '1 000' } });
    await flushSave();
    expect(stored().cashflowDetails.cfads['2014-06-30']).toBe(1000);
  });

  it('tells the user when dates cannot be generated yet', () => {
    window.location.hash = '#/cashflow-details';
    render(<App initialDeal={emptyDeal()} />);
    expect(screen.getAllByText(/capture the project dates/i).length).toBeGreaterThan(0);
  });
});

describe('Funding Details page', () => {
  it('shows the loan terms and the generated schedule', () => {
    window.location.hash = '#/funding-details';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    expect(screen.getByLabelText(/Facility Amount/i)).toHaveValue('1 626 419 910');
    expect(screen.getByLabelText(/Settlement Type/i)).toHaveValue('VariableCapital');
    const schedule = screen.getByRole('table', { name: /Amortisation schedule/i });
    expect(within(schedule).getAllByRole('row').length).toBe(31); // header + 30 payments
    expect(within(schedule).getAllByRole('row')[1]).toHaveTextContent('31/12/2014');
    expect(screen.getByRole('table', { name: /Drawdown schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Capital repayments/i })).toBeInTheDocument();
  });

  it('adds and removes loans up to five', () => {
    window.location.hash = '#/funding-details';
    render(<App initialDeal={solarCapitalDealFactory()} />);
    const add = screen.getByRole('button', { name: /add loan/i });
    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.click(add);
    expect(screen.getByRole('tab', { name: /Loan 5/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add loan/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /remove loan 5/i }));
    expect(screen.queryByRole('tab', { name: /Loan 5/i })).toBeNull();
  });

  it('adds a drawdown row and persists it', async () => {
    window.location.hash = '#/funding-details';
    render(<App initialDeal={emptyDeal()} />);
    fireEvent.click(screen.getByRole('button', { name: /add drawdown/i }));
    await flushSave();
    expect(stored().loans[0].disbursements.length).toBe(1);
  });
});
