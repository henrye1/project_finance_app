import { Layout } from './components/Layout';
import { useHashRoute, type Route } from './components/useHashRoute';
import { DealProvider } from './model/dealContext';
import type { Deal } from './model/deal';
import { InstructionsPage } from './pages/InstructionsPage';
import { ProjectInformationPage } from './pages/ProjectInformationPage';
import { CashflowDetailsPage } from './pages/CashflowDetailsPage';
import { FundingDetailsPage } from './pages/FundingDetailsPage';
import { ProjectValuationPage } from './pages/ProjectValuationPage';
import { PdScorecardPage } from './pages/PdScorecardPage';
import { LgdScorecardPage } from './pages/LgdScorecardPage';
import { ResultsPage } from './pages/ResultsPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';
import { ReferenceTablesPage } from './pages/ReferenceTablesPage';
import { RecoveryUnderRestructurePage } from './pages/RecoveryUnderRestructurePage';

function Page({ route }: { route: Route }) {
  switch (route) {
    case 'project-information':
      return <ProjectInformationPage />;
    case 'cashflow-details':
      return <CashflowDetailsPage />;
    case 'funding-details':
      return <FundingDetailsPage />;
    case 'project-valuation':
      return <ProjectValuationPage />;
    case 'pd-scorecard':
      return <PdScorecardPage />;
    case 'lgd-scorecard':
      return <LgdScorecardPage />;
    case 'results':
      return <ResultsPage />;
    case 'terms-of-use':
      return <TermsOfUsePage />;
    case 'reference-tables':
      return <ReferenceTablesPage />;
    case 'recovery-under-restructure':
      return <RecoveryUnderRestructurePage />;
    default:
      return <InstructionsPage />;
  }
}

export default function App({ initialDeal }: { initialDeal?: Deal }) {
  const [route, navigate] = useHashRoute();
  return (
    <DealProvider initialDeal={initialDeal}>
      <Layout route={route} onNavigate={navigate}>
        <Page route={route} />
      </Layout>
    </DealProvider>
  );
}
