/**
 * Example deal: Solar Capital De Aar RF (Pty) Ltd, as captured in the source workbook.
 * Generated from the workbook by a one-off script; keep in sync with the fixture used by the engine tests.
 */
import type { Deal } from './deal';
import { emptyDeal } from './deal';

export function solarCapitalDealFactory(): Deal {
  const d = emptyDeal();
  d.projectInformation = {
    ...d.projectInformation,
    dealName: 'Solar Capital De Aar RF (Pty) Ltd',
    borrowerNumber: '125658',
    capturer: '',
    ratingDate: '2017-12-31',
    phase: 'Post-completion Phase',
    projectType: 'Energy',
    projectStartDate: '2012-12-31',
    projectEndDate: '2036-06-30',
    constructionEndDate: '2014-06-30',
    baseValue: 1,
    currency: 'ZAR',
    clearanceCostPct: 0.01,
    ppp: 'No',
    liquidationPeriodMonths: 12,
    liquidationCostPct: 0.05,
  };
  d.projectInformation.pooledCollateral[0] = { type: 'Cash - same currency', amount: 120990406, currency: 'ZAR' };
  d.projectInformation.pooledCollateral[1] = { type: 'Cash - same currency', amount: 33724938, currency: 'ZAR' };
  d.cashflowDetails = {
    constructionFrequency: 'monthly',
    constructionCurrency: 'ZAR',
    constructionCosts: {
  "2012-12-31": 190272978,
  "2013-01-31": 182281758,
  "2013-02-28": 200537861,
  "2013-03-31": 107083219,
  "2013-04-30": 20512159,
  "2013-05-31": 78211855,
  "2013-06-30": 76894708,
  "2013-07-31": 93117388,
  "2013-08-31": 90837299,
  "2013-09-30": 91598412,
  "2013-10-31": 91618387,
  "2013-11-30": 89448353,
  "2013-12-31": 89607815,
  "2014-01-31": 91247022,
  "2014-02-28": 2152523,
  "2014-03-31": 13072873,
  "2014-04-30": 0,
  "2014-05-31": 0,
  "2014-06-30": 117925300
},
    cfadsFrequency: 'semi-annually',
    cfadsCurrency: 'ZAR',
    cfads: {
  "2014-06-30": 0,
  "2014-12-31": 0,
  "2015-06-30": 0,
  "2015-12-31": 0,
  "2016-06-30": 129423692.97495937,
  "2016-12-31": 133646941.14380816,
  "2017-06-30": 212491568.6428851,
  "2017-12-31": 190999684.92708725,
  "2018-06-30": 182474314.18342686,
  "2018-12-31": 188243721.6842926,
  "2019-06-30": 193190722.28253645,
  "2019-12-31": 199065144.1611504,
  "2020-06-30": 203617041.2472211,
  "2020-12-31": 209160736.1666568,
  "2021-06-30": 220670272.34019685,
  "2021-12-31": 220860785.64518392,
  "2022-06-30": 225198876.46458524,
  "2022-12-31": 231564772.8208685,
  "2023-06-30": 215645065.7594471,
  "2023-12-31": 195142759.24565744,
  "2024-06-30": 197918886.60408592,
  "2024-12-31": 201006019.43460476,
  "2025-06-30": 203956487.64812505,
  "2025-12-31": 221345047.09408498,
  "2026-06-30": 246839496.63674998,
  "2026-12-31": 232843177.6076125,
  "2027-06-30": 235167277.9580511,
  "2027-12-31": 235242383.35496664,
  "2028-06-30": 237541434.46346033,
  "2028-12-31": 234778856.65035892,
  "2029-06-30": 237040940.7146858,
  "2029-12-31": 240430331.13878298,
  "2030-06-30": 242673644.6729561,
  "2030-12-31": 269108887.35148513,
  "2031-06-30": 249762810.7911986,
  "2031-12-31": 254340156.51250637,
  "2032-06-30": 259688146.1193055,
  "2032-12-31": 265105989.41968167,
  "2033-06-30": 270632143.2765746,
  "2033-12-31": 276289342.87699807,
  "2034-06-30": 281979890.8065647,
  "2034-12-31": 396457177.42333174,
  "2035-06-30": 185149244.229455,
  "2035-12-31": 301104026.58230567,
  "2036-06-30": 422221693.59375656
},
    discountRatePerPeriod: 0.08501736996769146,
  };
  d.loans = [
    {
      id: 1,
      description: 'TERM_LOAN_SECURED',
      accountNumber: '123456789',
      facilityAmount: 1626419910,
      currency: 'ZAR',
      seniority: 'Senior Secured',
      maturityDate: '2029-06-30',
      paymentType: 'VariableCapital',
      paymentFrequency: 'Semi-Annual',
      firstPaymentDate: '2014-12-31',
      interestRate: 0.1053,
      residualValue: 0,
      disbursements: [
  {
    "date": "2012-12-31",
    "amount": 190272978
  },
  {
    "date": "2013-01-31",
    "amount": 182281758
  },
  {
    "date": "2013-02-28",
    "amount": 200537861
  },
  {
    "date": "2013-03-31",
    "amount": 107083219
  },
  {
    "date": "2013-04-30",
    "amount": 20512159
  },
  {
    "date": "2013-05-31",
    "amount": 78211855
  },
  {
    "date": "2013-06-30",
    "amount": 76894708
  },
  {
    "date": "2013-07-31",
    "amount": 93117388
  },
  {
    "date": "2013-08-31",
    "amount": 90837299
  },
  {
    "date": "2013-09-30",
    "amount": 91598412
  },
  {
    "date": "2013-10-31",
    "amount": 91618387
  },
  {
    "date": "2013-11-30",
    "amount": 89448353
  },
  {
    "date": "2013-12-31",
    "amount": 89607815
  },
  {
    "date": "2014-01-31",
    "amount": 91247022
  },
  {
    "date": "2014-02-28",
    "amount": 2152523
  },
  {
    "date": "2014-03-31",
    "amount": 13072873
  },
  {
    "date": "2014-06-30",
    "amount": 117925300
  }
],
      variableCapital: [
  {
    "date": "2014-12-31",
    "amount": 18400549.38
  },
  {
    "date": "2015-06-30",
    "amount": 18400549.38
  },
  {
    "date": "2015-12-31",
    "amount": 30360906.46
  },
  {
    "date": "2016-06-30",
    "amount": 26835945.01798665
  },
  {
    "date": "2016-12-31",
    "amount": 31715207.748529676
  },
  {
    "date": "2017-06-30",
    "amount": 34968049.56889169
  },
  {
    "date": "2017-12-31",
    "amount": 36594470.479072705
  },
  {
    "date": "2018-06-30",
    "amount": 40660522.75452523
  },
  {
    "date": "2018-12-31",
    "amount": 44726575.02997775
  },
  {
    "date": "2019-06-30",
    "amount": 48792627.30543027
  },
  {
    "date": "2019-12-31",
    "amount": 52858679.580882795
  },
  {
    "date": "2020-06-30",
    "amount": 54485100.4910638
  },
  {
    "date": "2020-12-31",
    "amount": 56924731.85633532
  },
  {
    "date": "2021-06-30",
    "amount": 58551152.76651632
  },
  {
    "date": "2021-12-31",
    "amount": 60990784.13178784
  },
  {
    "date": "2022-06-30",
    "amount": 60990784.13178784
  },
  {
    "date": "2022-12-31",
    "amount": 62617205.041968845
  },
  {
    "date": "2023-06-30",
    "amount": 63430415.49705935
  },
  {
    "date": "2023-12-31",
    "amount": 64243625.95214986
  },
  {
    "date": "2024-06-30",
    "amount": 65056836.40724036
  },
  {
    "date": "2024-12-31",
    "amount": 65056836.40724036
  },
  {
    "date": "2025-06-30",
    "amount": 66683257.31742138
  },
  {
    "date": "2025-12-31",
    "amount": 68309678.22760238
  },
  {
    "date": "2026-06-30",
    "amount": 69936099.13778338
  },
  {
    "date": "2026-12-31",
    "amount": 71562520.0479644
  },
  {
    "date": "2027-06-30",
    "amount": 71562520.0479644
  },
  {
    "date": "2027-12-31",
    "amount": 73188940.95814541
  },
  {
    "date": "2028-06-30",
    "amount": 74815361.86832641
  },
  {
    "date": "2028-12-31",
    "amount": 78068203.68868844
  },
  {
    "date": "2029-06-30",
    "amount": 55632773.49866575
  }
],
    },
  ];
  d.pdScorecard = {
    country: 'SOUTH AFRICA',
    offtakePct: { pre: 0, post: 1 },
    answers: {
  "A2.1": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "A2.2": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "A2.3": {
    "pre": "Low Risk",
    "post": "Moderate Risk"
  },
  "A2.4": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "B1.1": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "B1.2": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "C1.1.1": {
    "pre": "Moderate Risk",
    "post": "Low Risk"
  },
  "C1.1.2": {
    "pre": "Moderate Risk",
    "post": "Low Risk"
  },
  "C1.1.3": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "C1.2": {
    "pre": "Moderate Risk",
    "post": "Low Risk"
  },
  "C1.3": {
    "pre": "Moderate Risk",
    "post": "Low Risk"
  },
  "C1.4": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "C1.5.1": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "C1.5.2": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "C1.6": {
    "pre": "Moderate Risk",
    "post": "Low Risk"
  },
  "D1.1": {
    "pre": "Moderate Risk",
    "post": "Low Risk"
  },
  "D2.1": {
    "pre": "Moderate Risk",
    "post": "Low Risk"
  },
  "D3.1": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "D3.2": {
    "pre": "Low Risk",
    "post": "Low Risk"
  },
  "E1.1": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "E1.2": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "E2.2.1": {
    "pre": "High Risk",
    "post": "Moderate Risk"
  },
  "E2.2.2": {
    "pre": "High Risk",
    "post": "Low Risk"
  },
  "E2.2.3": {
    "pre": "High Risk",
    "post": "Low Risk"
  },
  "E3.1": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "E3.2": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "E4.1": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "E4.2": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "F1.1": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "F1.2": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "F1.3": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "G1.1": {
    "pre": "Moderate Risk",
    "post": "Moderate Risk"
  },
  "G1.2": {
    "pre": "Very High Risk",
    "post": "Low Risk"
  },
  "G1.3": {
    "pre": "High Risk",
    "post": "Moderate Risk"
  },
  "G1.4": {
    "pre": "Very High Risk",
    "post": "Moderate Risk"
  }
} as Deal['pdScorecard']['answers'],
  };
  d.lgdScorecard = {
    answers: { H2: 'Moderate Risk', 'H3.1': 'Low Risk', 'H3.2': 'Low Risk', 'H4.1': 'Low Risk' },
    canRealise: 'Yes',
  };
  d.recoveryUnderRestructure = {
    'Information Quality': 'a)',
    'Completion Risk': 'a)',
    'Completion Risk Warranties': 'c)',
    'Operation Risk': 'b)',
    'Revenue Risk': 'a)',
    'Debt Structure': 'a)',
  };
  return d;
}

export const solarCapitalDeal: Deal = solarCapitalDealFactory();
