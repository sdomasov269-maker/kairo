"use client";

import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-card">
      <header className="settings-card-header">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function SettingsRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div>
        <label id={`${id}-label`} htmlFor={id}>
          {label}
        </label>
        <p id={`${id}-description`}>{description}</p>
      </div>
      <div className="settings-control">{children}</div>
    </div>
  );
}

export function SettingsSwitch({
  id,
  checked,
  label,
  descriptionId,
  onChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  descriptionId: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-switch">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-label={label}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true">
        <i />
      </span>
    </label>
  );
}
