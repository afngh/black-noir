---
name: supabase-apikey-generator
description: Build a production-grade API key generator form styled after Supabase's design system. Use this skill whenever the user asks to create an API key management UI, token generator, credential manager, or any form that creates/displays/revokes API keys or secrets. Trigger on: "api key form", "generate api key", "supabase style", "key management ui", "token generator", "credential form", "api token page". Always use this skill when the deliverable is a Supabase-themed component or API key workflow, even if only loosely described.
---

# Supabase API Key Generator — Skill

Build a polished, functional API key generator form that faithfully replicates Supabase's design language: dark background (`#1c1c1c` / `#0f0f0f`), green accent (`#3ecf8e`), subtle borders, monospace keys, and clean table rows.

---

## Design System Reference

### Colors (CSS variables to use)
```css
--sb-bg:          #0f0f0f;   /* page background */
--sb-surface:     #1c1c1c;   /* card / panel */
--sb-surface-2:   #2a2a2a;   /* input, table row hover */
--sb-border:      #2e2e2e;   /* dividers, input borders */
--sb-green:       #3ecf8e;   /* primary accent, CTA buttons */
--sb-green-dim:   #1a6444;   /* button hover, badge bg */
--sb-text:        #ededed;   /* primary text */
--sb-muted:       #888;      /* secondary text, labels */
--sb-red:         #e57373;   /* destructive / revoke */
--sb-yellow:      #f59e0b;   /* warning badges */
```

### Typography
- **UI font**: `'Inter', sans-serif` (or `system-ui`)
- **Monospace** (keys, tokens): `'JetBrains Mono', 'Fira Code', monospace`
- Label size: `12px`, `font-weight: 500`, `letter-spacing: 0.04em`, `text-transform: uppercase`, color `--sb-muted`
- Body: `14px`, color `--sb-text`

### Component Patterns
- **Inputs**: `background: var(--sb-surface-2)`, `border: 1px solid var(--sb-border)`, `border-radius: 6px`, `padding: 8px 12px`, focus ring `outline: 2px solid var(--sb-green)`
- **Primary button**: `background: var(--sb-green)`, `color: #000`, `font-weight: 600`, `border-radius: 6px`, hover → `filter: brightness(1.1)`
- **Danger button**: outlined `border: 1px solid var(--sb-red)`, `color: var(--sb-red)`, hover → `background: rgba(229,115,115,0.1)`
- **Cards/panels**: `background: var(--sb-surface)`, `border: 1px solid var(--sb-border)`, `border-radius: 8px`
- **Table rows**: alternating `--sb-surface` / `--sb-surface-2`, row hover `background: var(--sb-surface-2)`
- **Badges**: small pill, `border-radius: 9999px`, `padding: 2px 8px`, `font-size: 11px`

---

## Required Form Features

### 1. Create Key Panel
Fields to include:
- **Key Name** — text input, placeholder `"e.g. production-server"`
- **Permission Scope** — select or toggle group: `read`, `write`, `admin`
- **Expiry** — select: `Never`, `30 days`, `90 days`, `1 year`, `Custom date`
- **Generate button** — calls key generation logic

### 2. Key Display Modal / Inline Banner
Shown **once** after generation. Never shown again.
- Full key in monospace box with copy icon
- Warning: `"Copy this key now. It won't be shown again."`
- Dismiss / "I've copied it" button

### 3. Keys Table
Columns: **Name**, **Prefix** (e.g. `sk_live_abc...`), **Scope**, **Created**, **Expires**, **Status**, **Actions**

Status badges:
- `active` → green pill
- `expiring soon` → yellow pill
- `expired` / `revoked` → red pill

Actions per row:
- **Revoke** button (danger style, confirm dialog before action)
- Optional **Rotate** button

### 4. Empty State
When no keys exist: centered illustration placeholder + "No API keys yet" + CTA to generate first key.

---

## Key Generation Logic (Frontend Mock)

```javascript
function generateApiKey(prefix = 'sk_live') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const random = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => chars[b % chars.length]).join('');
  return `${prefix}_${random}`;
}

// Display only first 8 chars + ellipsis in table
function maskKey(key) {
  return key.slice(0, 12) + '••••••••••••';
}
```

---

## Implementation Paths

### React (`.jsx`) — Preferred
Use `useState` for keys list, modal visibility, form state.
Import: `lucide-react` for icons (`Copy`, `Eye`, `Trash2`, `RefreshCw`, `Key`, `ShieldCheck`).
No external UI library needed — build from scratch using the design tokens above.

```jsx
// State shape
const [keys, setKeys] = useState([]);
const [showModal, setShowModal] = useState(false);
const [newKey, setNewKey] = useState(null);
const [form, setForm] = useState({ name: '', scope: 'read', expiry: 'never' });
```

### HTML/CSS/JS — Alternative
Single file. Use CSS custom properties from the design system. Vanilla JS for DOM manipulation.

---

## UX Details to Include

- **Copy to clipboard** on key reveal: show ✓ checkmark for 2s after copy
- **Confirm revoke**: inline confirmation row expansion or small modal — `"Are you sure? This action cannot be undone."`
- **Form validation**: name required, show inline error in red under input
- **Skeleton loader** (optional): pulse animation on table rows during "loading" state
- **Keyboard accessible**: focus management after key generation, ESC closes modal

---

## Supabase Layout Structure

```
┌─────────────────────────────────────────────────┐
│  API Keys                          [+ New Key]   │
│  Manage access credentials for your project      │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐ │
│  │  Create new key                             │ │
│  │  Name: [_________________]                  │ │
│  │  Scope: [read] [write] [admin]              │ │
│  │  Expiry: [Never ▼]                          │ │
│  │                          [Generate Key →]   │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Name      Prefix       Scope   Expires  Status  │
│  ─────────────────────────────────────────────── │
│  prod-key  sk_live_abc  write   30d      ● active │
│  dev-key   sk_live_xyz  read    Never    ● active │
└─────────────────────────────────────────────────┘
```

---

## Quality Checklist

Before finalizing output, verify:
- [ ] All color values use CSS variables matching Supabase palette
- [ ] Generated key is shown once with copy button
- [ ] Table has proper monospace font for key prefix
- [ ] Revoke has a confirmation step
- [ ] Empty state is implemented
- [ ] Form validation fires on submit
- [ ] No hardcoded placeholder keys in production UI
- [ ] Responsive: works at 320px width (stack form fields vertically)

---

## Example Prompts This Skill Handles

- "Build an API key generator in Supabase style"
- "Create a React component for managing API tokens like Supabase"
- "I need a dark-themed API key management page"
- "Make a credential generator form with a keys table"
- "Build an API key UI for my agent dashboard"