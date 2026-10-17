/** Engine-facing input types. The model layer re-exports these for the UI. */

export type Phase = 'Pre-completion Phase' | 'Post-completion Phase';
export type Frequency = 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
export type PaymentFrequency = 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
export type PaymentType = 'FixedPayment' | 'ConstantCapital' | 'InterestOnly' | 'VariableCapital';
export type Seniority = 'Senior Secured' | 'Senior Unsecured' | 'Mezzanine' | 'Subordinated' | 'Other';
export type RiskResponse = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk';
export type YesNo = 'Yes' | 'No';

export const SENIORITIES: Seniority[] = ['Senior Secured', 'Senior Unsecured', 'Mezzanine', 'Subordinated', 'Other'];

export interface DatedAmount {
  date: string;
  amount: number;
}

export interface LoanInput {
  id: number;
  description: string;
  accountNumber: string;
  facilityAmount: number | null;
  currency: string;
  seniority: Seniority | null;
  maturityDate: string | null;
  paymentType: PaymentType | null;
  paymentFrequency: PaymentFrequency | null;
  firstPaymentDate: string | null;
  interestRate: number | null;
  residualValue: number | null;
  disbursements: DatedAmount[];
  variableCapital: DatedAmount[];
}

export interface ScheduleRow {
  date: string;
  opening: number;
  drawdown: number;
  interest: number;
  capital: number;
  payment: number;
  closing: number;
}
