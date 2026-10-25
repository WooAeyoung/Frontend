// 공통 UI (담당 A, 2차)
import type { ReactNode } from 'react';

export function Banner({ tone, children, role }: { tone: 'error' | 'warn' | 'info' | 'dev'; children: ReactNode; role?: 'alert' | 'status' }) {
  const icon = { error: '⚠', warn: '!', info: 'i', dev: '🛠' }[tone];
  return (
    <div className={`banner banner--${tone}`} role={role}>
      <span aria-hidden="true">{icon}</span>
      <div className="banner__body">{children}</div>
    </div>
  );
}
