// 공통 UI (담당 A, 2차)
import type { ReactNode } from 'react';

interface Props {
  title?: ReactNode;
  step?: number;
  desc?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  as?: 'section' | 'div' | 'fieldset';
  className?: string;
  labelledBy?: string;
}

export function Card({ title, step, desc, actions, children, as = 'section', className, labelledBy }: Props) {
  const Tag = as;
  return (
    <Tag className={`card ${className ?? ''}`} aria-labelledby={labelledBy} style={as === 'fieldset' ? { margin: 0, minWidth: 0 } : undefined}>
      {(title || actions) && (
        <div className="card__head">
          {step !== undefined && <span className="card__step" aria-hidden="true">{step}</span>}
          {title && <h2 className="card__title" id={labelledBy}>{title}</h2>}
          {actions && <div className="card__actions">{actions}</div>}
          {desc && <p className="card__desc" style={{ flexBasis: '100%' }}>{desc}</p>}
        </div>
      )}
      {children}
    </Tag>
  );
}
