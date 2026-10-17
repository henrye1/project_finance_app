import { useEffect, useId, useState } from 'react';
import { fmtNumber, parseNumber } from './format';
import { HelpNote } from './HelpNote';

export type FieldColour = 'capture' | 'choice' | 'calc';

interface BaseProps {
  label: string;
  code?: string;
  help?: string;
  error?: string;
  suffix?: string;
  colour?: FieldColour;
}

interface TextProps extends BaseProps {
  kind: 'text';
  value: string;
  onChange: (v: string) => void;
}
interface NumberProps extends BaseProps {
  kind: 'number';
  value: number | null;
  onChange: (v: number | null) => void;
  digits?: number;
}
interface PercentProps extends BaseProps {
  kind: 'percent';
  value: number | null;
  onChange: (v: number | null) => void;
  digits?: number;
}
interface DateProps extends BaseProps {
  kind: 'date';
  value: string | null;
  onChange: (v: string | null) => void;
}
interface SelectProps extends BaseProps {
  kind: 'select';
  value: string | null;
  onChange: (v: string | null) => void;
  options: readonly string[];
  placeholder?: string;
}
interface StaticProps extends BaseProps {
  kind: 'static';
  value: string;
}

export type FieldProps = TextProps | NumberProps | PercentProps | DateProps | SelectProps | StaticProps;

export function NumberInput({ value, onChange, id, scale, digits, className, ariaLabel }: { value: number | null; onChange: (v: number | null) => void; id?: string; scale: number; digits: number; className: string; ariaLabel?: string }) {
  const toText = (v: number | null) => (v === null ? '' : fmtNumber(v * scale, digits));
  const [text, setText] = useState(toText(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      className={className}
      inputMode="decimal"
      value={text}
      onFocus={() => {
        setFocused(true);
        setText(value === null ? '' : String(Number((value * scale).toFixed(10))));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNumber(e.target.value);
        onChange(n === null ? null : n / scale);
      }}
      onBlur={() => setFocused(false)}
    />
  );
}

export function Field(props: FieldProps) {
  const id = useId();
  const colour = props.colour ?? (props.kind === 'select' ? 'choice' : props.kind === 'static' ? 'calc' : 'capture');
  const inputClass = `field-input ${colour}${props.error ? ' invalid' : ''}`;
  let control: JSX.Element;
  switch (props.kind) {
    case 'text':
      control = <input id={id} className={inputClass} value={props.value} onChange={(e) => props.onChange(e.target.value)} />;
      break;
    case 'number':
      control = <NumberInput id={id} className={inputClass} value={props.value} onChange={props.onChange} scale={1} digits={props.digits ?? 2} />;
      break;
    case 'percent':
      control = <NumberInput id={id} className={inputClass} value={props.value} onChange={props.onChange} scale={100} digits={props.digits ?? 2} />;
      break;
    case 'date':
      control = <input id={id} type="date" className={inputClass} value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value || null)} />;
      break;
    case 'select':
      control = (
        <select id={id} className={inputClass} value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value || null)}>
          <option value="">{props.placeholder ?? 'Select…'}</option>
          {props.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case 'static':
      control = (
        <output id={id} className={inputClass}>
          {props.value}
        </output>
      );
      break;
  }
  return (
    <div className="field">
      <div className="field-label">
        <label htmlFor={id}>
          {props.code && <span className="field-code">{props.code} </span>}
          {props.label}
        </label>
        {props.help && <HelpNote text={props.help} />}
      </div>
      <div className="field-control">
        {control}
        {props.suffix && <span className="field-suffix">{props.suffix}</span>}
      </div>
      {props.error && <div className="field-error">{props.error}</div>}
    </div>
  );
}
