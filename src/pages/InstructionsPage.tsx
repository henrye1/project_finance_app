import { STEPS } from '../components/Layout';
import { hrefFor } from '../components/useHashRoute';
import { useDeal } from '../model/dealContext';

const STATUS_TEXT = { empty: 'Not started', partial: 'In progress', complete: 'Complete' } as const;

export function InstructionsPage() {
  const { computed } = useDeal();
  const step = (n: number) => STEPS[n - 1];
  const Item = ({ n }: { n: number }) => {
    const s = step(n);
    const status = computed.stepStatus[s.id];
    return (
      <li>
        <a href={hrefFor(s.route)}>{s.label}</a>
        <span className={`status-pill ${status}`}>{STATUS_TEXT[status]}</span>
      </li>
    );
  };
  return (
    <article className="page instructions">
      <h1>PROJECT FINANCE SCORECARD - INSTRUCTIONS</h1>
      <p className="lede">
        This app follows the workbook step by step. Work down the list; each step feeds the next, and the results update as you capture.
      </p>
      <section>
        <h2>Please complete the following sheets:</h2>
        <ol className="step-list" start={1}>
          <Item n={1} />
          <Item n={2} />
          <Item n={3} />
        </ol>
        <h2>On the following sheet, please press the calculation button:</h2>
        <ol className="step-list" start={4}>
          <Item n={4} />
        </ol>
        <h2>Please complete the following sheets:</h2>
        <ol className="step-list" start={5}>
          <Item n={5} />
          <Item n={6} />
        </ol>
        <h2>The results can be obtained on the following sheet:</h2>
        <ol className="step-list" start={7}>
          <Item n={7} />
        </ol>
      </section>
      <section>
        <h2>The following sheet can be used for help:</h2>
        <ul className="step-list">
          <li>
            <a href={hrefFor('terms-of-use')}>Terms of Use</a>
          </li>
        </ul>
        <h2>The following sheets are for informational purposes only:</h2>
        <ul className="step-list">
          <li>
            <a href={hrefFor('reference-tables')}>Reference Tables</a>
          </li>
          <li>
            <a href={hrefFor('recovery-under-restructure')}>Recovery Under Restructure</a>
          </li>
        </ul>
      </section>
      <section className="legend">
        <h2>How fields are coloured</h2>
        <ul>
          <li>
            <span className="swatch choice" /> Please select the appropriate option from the drop-down list in the yellow fields.
          </li>
          <li>
            <span className="swatch capture" /> Please capture the appropriate value in the green fields.
          </li>
          <li>
            <span className="swatch calc" /> Grey fields are calculated; nothing is captured there.
          </li>
        </ul>
      </section>
      {computed.warnings.length > 0 && (
        <section className="warnings">
          <h2>Still needed before the results are complete</h2>
          <ul>
            {computed.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
