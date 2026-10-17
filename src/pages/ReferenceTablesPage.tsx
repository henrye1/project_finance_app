import { referenceTables as rt, sovereignRatings } from '../data';
import { DataTable, type Column } from '../components/DataTable';

type Row = Record<string, string | number | null>;

function Simple({ caption, columns, rows }: { caption: string; columns: { key: string; label: string; kind?: 'static' | 'percent' | 'number'; digits?: number }[]; rows: Row[] }) {
  const cols: Column<Row>[] = columns.map((c) => ({ key: c.key, label: c.label, kind: c.kind ?? 'static', digits: c.digits, get: (r) => r[c.key], align: c.kind && c.kind !== 'static' ? 'right' : 'left' }));
  return <DataTable caption={caption} columns={cols} rows={rows} rowKey={(_, i) => String(i)} compact />;
}

export function ReferenceTablesPage() {
  const responseRows: Row[] = Object.entries(rt.responses).flatMap(([id, options]) => options.map((o) => ({ id, response: o.response, description: o.description, score: o.score })));
  return (
    <article className="page">
      <h1>Reference Tables</h1>
      <p className="lede">The lookup tables behind the scorecards, exactly as extracted from the workbook. They are read-only here.</p>
      <div className="results-grid">
        <section className="sheet">
          <h2>PD calibration</h2>
          <Simple caption="PD calibration" columns={[{ key: 'p', label: 'Parameter' }, { key: 'v', label: 'Value', kind: 'number', digits: 9 }]} rows={[{ p: 'alpha', v: rt.pdCalibration.alpha }, { p: 'beta', v: rt.pdCalibration.beta }, { p: 'off-take slope', v: rt.offtake.slope }, { p: 'off-take intercept', v: rt.offtake.intercept }, { p: 'LGD scaling', v: rt.lgdScaling }]} />
          <h2>Sector volatility</h2>
          <Simple caption="Sector volatility" columns={[{ key: 'name', label: 'Sector' }, { key: 'volatility', label: 'Volatility', kind: 'number', digits: 4 }]} rows={rt.sectors} />
          <h2>Construction phase parameters</h2>
          <Simple caption="Construction phase parameters" columns={[{ key: 'p', label: 'Parameter' }, { key: 'pre', label: 'Pre-completion', kind: 'number', digits: 2 }, { key: 'post', label: 'Post-completion', kind: 'number', digits: 2 }]} rows={[{ p: 'Recovery costs', pre: rt.construction.pre.recoveryCosts, post: rt.construction.post.recoveryCosts }, { p: 'Construction adjustment', pre: rt.construction.pre.adjustment, post: rt.construction.post.adjustment }]} />
          <h2>Risk score bands</h2>
          <Simple caption="Risk score bands" columns={[{ key: 'min', label: 'Score from', kind: 'number', digits: 2 }, { key: 'rating', label: 'Rating' }]} rows={rt.scoreBands} />
          <h2>Capital structure</h2>
          <Simple caption="Capital structure" columns={[{ key: 'seniority', label: 'Seniority' }, { key: 'rank', label: 'Rank' }]} rows={rt.capitalStructure} />
          <h2>Collateral types</h2>
          <Simple caption="Collateral types" columns={[{ key: 'type', label: 'Collateral type' }, { key: 'recoveryRate', label: 'Recovery rate', kind: 'percent', digits: 0 }]} rows={rt.collateralTypes} />
        </section>
        <section className="sheet">
          <h2>Risk grades</h2>
          <Simple caption="Risk grades" columns={[{ key: 'grade', label: 'Grade' }, { key: 'pdFitted', label: 'PD (fitted)', kind: 'percent', digits: 4 }, { key: 'pdLower', label: 'PD (lower)', kind: 'percent', digits: 4 }, { key: 'pdUpper', label: 'PD (upper)', kind: 'percent', digits: 4 }]} rows={rt.riskGrades} />
          <h2>Moody's mapping</h2>
          <Simple caption="Moody's mapping" columns={[{ key: 'moodys', label: "Moody's" }, { key: 'sp', label: 'S&P' }, { key: 'grade', label: 'Risk grade' }]} rows={rt.moodysMap} />
          <h2>Sovereign ratings</h2>
          <Simple caption="Sovereign ratings" columns={[{ key: 'country', label: 'Country' }, { key: 'rating', label: "Moody's LT issuer rating" }]} rows={sovereignRatings} />
        </section>
      </div>
      <section className="sheet">
        <h2>Insolvency regime scores</h2>
        <Simple caption="Insolvency regime scores" columns={[{ key: 'country', label: 'Country' }, { key: 'score', label: 'Score', kind: 'number', digits: 3 }]} rows={Object.entries(rt.insolvencyScores).map(([country, score]) => ({ country, score }))} />
      </section>
      <section className="sheet">
        <h2>Scorecard responses</h2>
        <Simple caption="Scorecard responses" columns={[{ key: 'id', label: 'Question' }, { key: 'response', label: 'Response' }, { key: 'description', label: 'Description' }, { key: 'score', label: 'Score', kind: 'number', digits: 0 }]} rows={responseRows} />
      </section>
    </article>
  );
}
