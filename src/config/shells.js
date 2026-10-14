// src/config/shells.js
export const SHELLS = [
  { id: 'bash',       label: 'Bash',       enabled: true },
  { id: 'powershell', label: 'PowerShell', enabled: true },
  { id: 'cmd',        label: 'CMD',        enabled: false }, // re-enable later
];

export const ENABLED_SHELLS = SHELLS.filter(s => s.enabled);