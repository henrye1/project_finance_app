// Generated from the workbook dumps by a one-off script; do not edit by hand.
import type { LoanInput, DatedAmount } from '../../types';

export const solarLoan: LoanInput = {
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
  disbursements: [{"date": "2012-12-31", "amount": 190272978}, {"date": "2013-01-31", "amount": 182281758}, {"date": "2013-02-28", "amount": 200537861}, {"date": "2013-03-31", "amount": 107083219}, {"date": "2013-04-30", "amount": 20512159}, {"date": "2013-05-31", "amount": 78211855}, {"date": "2013-06-30", "amount": 76894708}, {"date": "2013-07-31", "amount": 93117388}, {"date": "2013-08-31", "amount": 90837299}, {"date": "2013-09-30", "amount": 91598412}, {"date": "2013-10-31", "amount": 91618387}, {"date": "2013-11-30", "amount": 89448353}, {"date": "2013-12-31", "amount": 89607815}, {"date": "2014-01-31", "amount": 91247022}, {"date": "2014-02-28", "amount": 2152523}, {"date": "2014-03-31", "amount": 13072873}, {"date": "2014-06-30", "amount": 117925300}],
  variableCapital: [{"date": "2014-12-31", "amount": 18400549.38}, {"date": "2015-06-30", "amount": 18400549.38}, {"date": "2015-12-31", "amount": 30360906.46}, {"date": "2016-06-30", "amount": 26835945.01798665}, {"date": "2016-12-31", "amount": 31715207.748529676}, {"date": "2017-06-30", "amount": 34968049.56889169}, {"date": "2017-12-31", "amount": 36594470.479072705}, {"date": "2018-06-30", "amount": 40660522.75452523}, {"date": "2018-12-31", "amount": 44726575.02997775}, {"date": "2019-06-30", "amount": 48792627.30543027}, {"date": "2019-12-31", "amount": 52858679.580882795}, {"date": "2020-06-30", "amount": 54485100.4910638}, {"date": "2020-12-31", "amount": 56924731.85633532}, {"date": "2021-06-30", "amount": 58551152.76651632}, {"date": "2021-12-31", "amount": 60990784.13178784}, {"date": "2022-06-30", "amount": 60990784.13178784}, {"date": "2022-12-31", "amount": 62617205.041968845}, {"date": "2023-06-30", "amount": 63430415.49705935}, {"date": "2023-12-31", "amount": 64243625.95214986}, {"date": "2024-06-30", "amount": 65056836.40724036}, {"date": "2024-12-31", "amount": 65056836.40724036}, {"date": "2025-06-30", "amount": 66683257.31742138}, {"date": "2025-12-31", "amount": 68309678.22760238}, {"date": "2026-06-30", "amount": 69936099.13778338}, {"date": "2026-12-31", "amount": 71562520.0479644}, {"date": "2027-06-30", "amount": 71562520.0479644}, {"date": "2027-12-31", "amount": 73188940.95814541}, {"date": "2028-06-30", "amount": 74815361.86832641}, {"date": "2028-12-31", "amount": 78068203.68868844}, {"date": "2029-06-30", "amount": 55632773.49866575}],
};

/** Amortisation Schedule sheet (pasted values in the workbook). */
export const sheetSchedule = [{"date": "2014-12-31", "opening": 0, "drawdown": 1626419910, "interest": 86353188.14282995, "payment": 104753737.52282995, "closing": 1608019360.62}, {"date": "2015-06-30", "opening": 1608019360.62, "drawdown": 0, "interest": 83948510.91614778, "payment": 102349060.29614778, "closing": 1589618811.2399998}, {"date": "2015-12-31", "opening": 1589618811.2399998, "drawdown": 0, "interest": 84399269.48655553, "payment": 114760175.94655553, "closing": 1559257904.7799997}, {"date": "2016-06-30", "opening": 1559257904.7799997, "drawdown": 0, "interest": 81864207.59591578, "payment": 108700152.61390243, "closing": 1532421959.7620132}, {"date": "2016-12-31", "opening": 1532421959.7620132, "drawdown": 0, "interest": 81362458.11546497, "payment": 113077665.86399464, "closing": 1500706752.0134835}, {"date": "2017-06-30", "opening": 1500706752.0134835, "drawdown": 0, "interest": 78346132.0420707, "payment": 113314181.61096239, "closing": 1465738702.4445918}, {"date": "2017-12-31", "opening": 1465738702.4445918, "drawdown": 0, "interest": 77821975.22435966, "payment": 114416445.70343237, "closing": 1429144231.9655192}, {"date": "2018-06-30", "opening": 1429144231.9655192, "drawdown": 0, "interest": 74610127.8977442, "payment": 115270650.65226942, "closing": 1388483709.210994}, {"date": "2018-12-31", "opening": 1388483709.210994, "drawdown": 0, "interest": 73720196.2651523, "payment": 118446771.29513004, "closing": 1343757134.1810162}, {"date": "2019-06-30", "opening": 1343757134.1810162, "drawdown": 0, "interest": 70152395.68008187, "payment": 118945022.98551214, "closing": 1294964506.875586}, {"date": "2019-12-31", "opening": 1294964506.875586, "drawdown": 0, "interest": 68754884.89348024, "payment": 121613564.47436303, "closing": 1242105827.2947032}, {"date": "2020-06-30", "opening": 1242105827.2947032, "drawdown": 0, "interest": 65213079.24111322, "payment": 119698179.73217702, "closing": 1187620726.8036394}, {"date": "2020-12-31", "opening": 1187620726.8036394, "drawdown": 0, "interest": 63055570.97121316, "payment": 119980302.82754847, "closing": 1130695994.947304}, {"date": "2021-06-30", "opening": 1130695994.947304, "drawdown": 0, "interest": 59029292.43220068, "payment": 117580445.198717, "closing": 1072144842.1807877}, {"date": "2021-12-31", "opening": 1072144842.1807877, "drawdown": 0, "interest": 56924490.84271373, "payment": 117915274.97450157, "closing": 1011154058.0489998}, {"date": "2022-06-30", "opening": 1011154058.0489998, "drawdown": 0, "interest": 52788467.32747344, "payment": 113779251.45926127, "closing": 950163273.9172119}, {"date": "2022-12-31", "opening": 950163273.9172119, "drawdown": 0, "interest": 50447997.74922841, "payment": 113065202.79119726, "closing": 887546068.875243}, {"date": "2023-06-30", "opening": 887546068.875243, "drawdown": 0, "interest": 46335369.26000037, "payment": 109765784.75705972, "closing": 824115653.3781836}, {"date": "2023-12-31", "opening": 824115653.3781836, "drawdown": 0, "interest": 43755621.552626915, "payment": 107999247.50477678, "closing": 759872027.4260337}, {"date": "2024-06-30", "opening": 759872027.4260337, "drawdown": 0, "interest": 39894825.10163134, "payment": 104951661.5088717, "closing": 694815191.0187935}, {"date": "2024-12-31", "opening": 694815191.0187935, "drawdown": 0, "interest": 36890538.87353248, "payment": 101947375.28077284, "closing": 629758354.6115532}, {"date": "2025-06-30", "opening": 629758354.6115532, "drawdown": 0, "interest": 32877263.421915106, "payment": 99560520.73933649, "closing": 563075097.2941318}, {"date": "2025-12-31", "opening": 563075097.2941318, "drawdown": 0, "interest": 29895926.332568347, "payment": 98205604.56017072, "closing": 494765419.06652945}, {"date": "2026-06-30", "opening": 494765419.06652945, "drawdown": 0, "interest": 25829801.058753736, "payment": 95765900.1965371, "closing": 424829319.9287461}, {"date": "2026-12-31", "opening": 424829319.9287461, "drawdown": 0, "interest": 22555900.82661833, "payment": 94118420.87458272, "closing": 353266799.8807817}, {"date": "2027-06-30", "opening": 353266799.8807817, "drawdown": 0, "interest": 18442701.95519905, "payment": 90005222.00316344, "closing": 281704279.8328173}, {"date": "2027-12-31", "opening": 281704279.8328173, "drawdown": 0, "interest": 14956815.596928896, "payment": 88145756.5550743, "closing": 208515338.8746719}, {"date": "2028-06-30", "opening": 208515338.8746719, "drawdown": 0, "interest": 10947478.884820735, "payment": 85762840.75314714, "closing": 133699977.0063455}, {"date": "2028-12-31", "opening": 133699977.0063455, "drawdown": 0, "interest": 7098670.643500049, "payment": 85166874.33218849, "closing": 55631773.31765705}, {"date": "2029-06-30", "opening": 55631773.31765705, "drawdown": 0, "interest": 2904321.082204703, "payment": 58536094.39986175, "closing": 0}];

/** Cashflow Details: construction costs (monthly) and CFADS (semi-annual). */
export const constructionCosts: DatedAmount[] = [{"date": "2012-12-31", "amount": 190272978}, {"date": "2013-01-31", "amount": 182281758}, {"date": "2013-02-28", "amount": 200537861}, {"date": "2013-03-31", "amount": 107083219}, {"date": "2013-04-30", "amount": 20512159}, {"date": "2013-05-31", "amount": 78211855}, {"date": "2013-06-30", "amount": 76894708}, {"date": "2013-07-31", "amount": 93117388}, {"date": "2013-08-31", "amount": 90837299}, {"date": "2013-09-30", "amount": 91598412}, {"date": "2013-10-31", "amount": 91618387}, {"date": "2013-11-30", "amount": 89448353}, {"date": "2013-12-31", "amount": 89607815}, {"date": "2014-01-31", "amount": 91247022}, {"date": "2014-02-28", "amount": 2152523}, {"date": "2014-03-31", "amount": 13072873}, {"date": "2014-04-30", "amount": 0}, {"date": "2014-05-31", "amount": 0}, {"date": "2014-06-30", "amount": 117925300}];
export const cfads: DatedAmount[] = [{"date": "2014-06-30", "amount": 0}, {"date": "2014-12-31", "amount": 0}, {"date": "2015-06-30", "amount": 0}, {"date": "2015-12-31", "amount": 0}, {"date": "2016-06-30", "amount": 129423692.97495937}, {"date": "2016-12-31", "amount": 133646941.14380816}, {"date": "2017-06-30", "amount": 212491568.6428851}, {"date": "2017-12-31", "amount": 190999684.92708725}, {"date": "2018-06-30", "amount": 182474314.18342686}, {"date": "2018-12-31", "amount": 188243721.6842926}, {"date": "2019-06-30", "amount": 193190722.28253645}, {"date": "2019-12-31", "amount": 199065144.1611504}, {"date": "2020-06-30", "amount": 203617041.2472211}, {"date": "2020-12-31", "amount": 209160736.1666568}, {"date": "2021-06-30", "amount": 220670272.34019685}, {"date": "2021-12-31", "amount": 220860785.64518392}, {"date": "2022-06-30", "amount": 225198876.46458524}, {"date": "2022-12-31", "amount": 231564772.8208685}, {"date": "2023-06-30", "amount": 215645065.7594471}, {"date": "2023-12-31", "amount": 195142759.24565744}, {"date": "2024-06-30", "amount": 197918886.60408592}, {"date": "2024-12-31", "amount": 201006019.43460476}, {"date": "2025-06-30", "amount": 203956487.64812505}, {"date": "2025-12-31", "amount": 221345047.09408498}, {"date": "2026-06-30", "amount": 246839496.63674998}, {"date": "2026-12-31", "amount": 232843177.6076125}, {"date": "2027-06-30", "amount": 235167277.9580511}, {"date": "2027-12-31", "amount": 235242383.35496664}, {"date": "2028-06-30", "amount": 237541434.46346033}, {"date": "2028-12-31", "amount": 234778856.65035892}, {"date": "2029-06-30", "amount": 237040940.7146858}, {"date": "2029-12-31", "amount": 240430331.13878298}, {"date": "2030-06-30", "amount": 242673644.6729561}, {"date": "2030-12-31", "amount": 269108887.35148513}, {"date": "2031-06-30", "amount": 249762810.7911986}, {"date": "2031-12-31", "amount": 254340156.51250637}, {"date": "2032-06-30", "amount": 259688146.1193055}, {"date": "2032-12-31", "amount": 265105989.41968167}, {"date": "2033-06-30", "amount": 270632143.2765746}, {"date": "2033-12-31", "amount": 276289342.87699807}, {"date": "2034-06-30", "amount": 281979890.8065647}, {"date": "2034-12-31", "amount": 396457177.42333174}, {"date": "2035-06-30", "amount": 185149244.229455}, {"date": "2035-12-31", "amount": 301104026.58230567}, {"date": "2036-06-30", "amount": 422221693.59375656}];

/** PD Scorecard responses, columns E (pre-completion) and J (post-completion). */
export const pdAnswers: Record<string, { pre: string | null; post: string | null }> = {
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
};

/** External template PD path used by the workbook's Project LGD New sheet (col AE). */
export const externalPdByYear = (year: number): number => (year <= 2013 ? 0.029353106208183811 : 0.0079850580192199587);
