import React, { useMemo } from 'react';
import type { PermissionCatalog } from '../api/types';

export function PermissionPicker({
  catalog,
  value,
  onChange,
  disabled,
}: {
  catalog: PermissionCatalog;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, { code: string; action: string }[]>();
    for (const permission of catalog.permissions) {
      const list = map.get(permission.module) ?? [];
      list.push({ code: permission.code, action: permission.action });
      map.set(permission.module, list);
    }
    return [...map.entries()];
  }, [catalog]);

  const toggle = (code: string) => {
    onChange(value.includes(code) ? value.filter((item) => item !== code) : [...value, code]);
  };

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-xs font-bold text-slate-700 mb-1">Permissions</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map(([module, items]) => (
          <div key={module} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{module.replace(/_/g, ' ')}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {items.map((item) => (
                <label key={item.code} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={value.includes(item.code)}
                    onChange={() => toggle(item.code)}
                    aria-label={item.code}
                  />
                  <span>{item.action}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        Tax and discount changes, team management, settings, billing runs and the audit log are reserved for Business Admins.
      </p>
    </fieldset>
  );
}
