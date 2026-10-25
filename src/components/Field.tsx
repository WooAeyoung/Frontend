// 공통 UI (담당 A, 2차). 입력칸 묶음: 라벨 + 입력 + 안내/오류/경고 문구.
import type { ReactNode } from 'react';
import { FIELD_ERROR_MESSAGES, WARNING_MESSAGES } from '../validation/messages';
import type { FieldErrorCode, WarningCode } from '../types/api';

/** 경로 → DOM id (첫 오류 칸으로 포커스할 때 같은 규칙을 쓴다) */
export function fieldId(path: string): string {
  return 'f-' + path.replace(/[^a-zA-Z0-9]+/g, '-');
}

interface FieldProps {
  path: string;
  label: ReactNode;
  error?: FieldErrorCode;
  warning?: WarningCode;
  hint?: ReactNode;
  className?: string;
  /** 라벨을 화면에 숨기고 스크린리더에만 */
  hideLabel?: boolean;
  /** 라디오 묶음 등 label for 를 쓸 수 없을 때 */
  asGroup?: boolean;
  children: ReactNode;
}

export function Field({ path, label, error, warning, hint, className, hideLabel, asGroup, children }: FieldProps) {
  const id = fieldId(path);
  const Label = asGroup ? 'span' : 'label';
  return (
    <div className={`field ${className ?? ''}`} data-path={path}>
      <Label className={`field__label ${hideLabel ? 'sr-only' : ''}`} {...(asGroup ? { id: id + '-label' } : { htmlFor: id })}>
        {label}
      </Label>
      {children}
      {hint && !error && <span className="field__hint" id={id + '-hint'}>{hint}</span>}
      <FieldMessages id={id} error={error} warning={warning} />
    </div>
  );
}

export function FieldMessages({ id, error, warning }: { id: string; error?: FieldErrorCode; warning?: WarningCode }) {
  return (
    <>
      {error && <span className="msg msg--error" id={id + '-error'} role="alert">⚠ {FIELD_ERROR_MESSAGES[error]}</span>}
      {!error && warning && <span className="msg msg--warn" id={id + '-warn'}>! {WARNING_MESSAGES[warning]}</span>}
    </>
  );
}

/** 입력 요소에 붙일 접근성 속성 */
export function a11y(path: string, error?: string, warning?: string) {
  const id = fieldId(path);
  const describedBy = [error ? id + '-error' : null, !error && warning ? id + '-warn' : null].filter(Boolean).join(' ');
  return { id, 'aria-invalid': error ? (true as const) : undefined, 'aria-describedby': describedBy || undefined };
}
