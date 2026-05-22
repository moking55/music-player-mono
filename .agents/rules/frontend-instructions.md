---
trigger: always_on
---

# Agent Instruction Prompt: apps/frontend

<GoldenRules>
  <rule id="1">
    <title>Assumptions Must Be Explicit</title>
    <description>If context is missing, state assumptions. Don't hallucinate hidden infra or invent unspecified services.</description>
  </rule>
  <rule id="2">
    <title>Verify Before Claiming Complete</title>
    <description>Never claim a change is complete without running verification. "I edited the file" is not done. "I edited the file and here's the output" is done. No "should work now." Evidence before assertions, always.</description>
  </rule>
  <rule id="3">
    <title>Respect Recent Edits</title>
    <description>Do not suggest code that has been deleted in recent edits. Focus on the current state of the codebase.</description>
  </rule>
  <rule id="4">
    <title>No Export Star</title>
    <description>Never use `export * from [path]` in index.ts or any re-export file. Always use explicit `export type { ... }` for type-only re-exports.</description>
    <bad-example>export * from "./types";</bad-example>
    <good-example>export type { FeatureContainerProps, UseFeatureReturn } from "./types";</good-example>
  </rule>
  <rule id="5">
    <title>Use Named Functions Over Arrow Functions</title>
    <description>Always use named function declarations instead of arrow functions. This improves code readability, provides better stack traces for debugging, and maintains consistency across the codebase.</description>
    <bad-example>const ComponentName = () => { ... }</bad-example>
    <good-example>function ComponentName() { ... }</good-example>
  </rule>
</GoldenRules>

You are working on the `apps/frontend` application within a monorepo. This is a **Next.js 16** application using **React 19** and **Tailwind CSS 4**.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS 4 + CSS Modules (`*.module.css`)
- **Language**: TypeScript
- **HTTP Client**: `ky` (via `useApi` hook)
- **State Management**: `use-immer` (for complex local state)

## Architecture: 4-Layer Pattern

Strictly follow the **Layout → Screen → Container → Component** architecture.

### 1. Screen Layer (`app/(screens)`)

- **Role**: Entry point/Route definition.
- **Nature**: **Server Component** (default).
- **Responsibility**: Minimal. Import and render the **Container**.
- **Location**: `apps/frontend/app/(screens)/(authenticated)/[feature]/page.tsx`
- **Pattern**:

  ```tsx
  import 'server-only';
  import Container from '@/containers/[feature]/[container-name]';

  export default function [Feature]Page() {
    return <Container />;
  }
  ```

### 2. Container Layer (`src/containers`)

- **Role**: Business logic, data fetching, state management.
- **Nature**: **Client Component** (often, if using hooks) or Server Component.
- **Responsibility**: Fetch data (via hooks), manage state (via `useImmer`), handle events, compose UI components.
- **Location**: `apps/frontend/src/containers/[feature]/`
- **Structure**:
  ```
  [feature]/
  ├── [feature].tsx        // Main component
  ├── [feature].module.css // Scoped styles
  ├── types.ts             // Feature-specific types
  ├── helper.ts            // Utils/Transformers
  └── index.ts             // Exports
  ```

### 3. Component Layer (`src/components`)

- **Role**: Presentational UI.
- **Nature**: Pure components.
- **Responsibility**: Receive props and render UI. No business logic.
- **Location**: `apps/frontend/src/components/ui/[component]/`
- **Structure**:
  ```
  [component]/
  ├── [component].tsx
  ├── [component].module.css
  ├── types.ts
  └── index.ts
  ```

### 4. Hook Layer (`src/hooks`)

- **Role**: Reusable logic and API interactions.
- **Responsibility**: Encapsulate `useApi` calls, managing loading states.
- **Location**: `apps/frontend/src/hooks/[hook-name]/`
- **Structure**:
  ```
  [hook-name]/
  ├── [hook-name].ts
  ├── types.ts
  └── index.ts
  ```

---

## Step-by-Step Guide: Creating a Full Single Page

Follow this order to build a new feature page (e.g., `create-employee`).

### Step 1: Define Types & API Hook

Create the hook first to define data shape and server interaction.

1.  **Create Folder**: `apps/frontend/src/hooks/use-create-employee`
2.  **Define Types (`types.ts`)**: Input/Output interfaces.
3.  **Implement Hook (`use-create-employee.ts`)**:
    - Import `useApi` from `../use-api`.
    - Use `useCallback` for the async function.
    - Handle `loading` state.
    - Return `{ createEmployee, loading }`.

### Step 2: Build/Reuse UI Components

Ensure all necessary UI primitives exist in `src/components/ui`.

- If a new generic component is needed (e.g., specific Card or Input), create it in `src/components/ui/[name]`.
- Follow the folder structure: `[name].tsx`, `types.ts`, `[name].module.css`, `index.ts`.

### Step 3: Create the Container

Assemble the logic and UI.

1.  **Create Folder**: `apps/frontend/src/containers/create-employee`
2.  **Define Types (`types.ts`)**: Container props, local state interfaces.
3.  **Create Logic & View (`create-employee.tsx`)**:
    - `'use client'` (if using hooks).
    - Import hooks (`useCreateEmployee`, `useImmer`, `useRouter`, `useToast`).
    - Import UI components (`Button`, `Input`, `Card`).
    - Implement Form handling and State.
    - **Styles**: Import `styles` from `./create-employee.module.css`.
4.  **Export (`index.ts`)**: `export { default } from './create-employee';`

### Step 4: Create the Screen (Page)

Expose the container via a route.

1.  **Create Folder**: `apps/frontend/app/(screens)/(authenticated)/create-employee`
2.  **Create Page (`page.tsx`)**:
    - Import the Container.
    - Export default function.

## Code Patterns & Rules

### 1. State Management

- Use **`useImmer`** for object/array state updates.
  ```tsx
  const [state, setState] = useImmer<State>({ ... });
  // Update: setState(draft => { draft.value = 1; })
  ```

### 2. Styling

- **Tailwind CSS**: Use for layout, spacing, colors (utility classes).
- **CSS Modules**: Use for complex, component-specific layouts or when semantic class names are preferred for structure (`styles.container`).
- **Icons**: Use `@iconify/react` (`InlineIcon`).

### 3. Shared Types

- **Data Models**: Use types from `@packages/shared-types` whenever possible.
- **Import**: `import { [Type] } from 'shared-types';`

### 4. Imports

- Use Absolute Imports: `@/components/...`, `@/containers/...`, `@/hooks/...`.

### 5. Filenames

- **Folders**: `kebab-case` (e.g., `create-employee`, `user-profile`).
- **Files**: `kebab-case` matching folder name (e.g., `create-employee.tsx`) or standard `types.ts`, `index.ts`.
- **Components/Exports**: PascalCase (e.g., `CreateEmployeeContainer`).

### 6. Shadcn UI

- **Config**: shadcn/ui is initialized for `apps/frontend` with config at `apps/frontend/components.json`.
- **Utilities**: Use `cn` from `apps/frontend/src/lib/utils.ts` for className merges.
- **Components**: for extending a shadcn UI components store in `apps/frontend/src/components/ui/` and if it another or custom component store in `apps/frontend/src/components/`.
- **Icons**: Use `lucide-react` for shadcn components.
- **CSS Variables**: Keep shadcn variables in `apps/frontend/app/globals.css`.

### 7. Tool Logging

- When documenting automation or agent actions, explicitly mention the tool name (e.g., Read, Grep, Glob, Bash, ApplyPatch).
- Prefer short inline notes like: `Used Read to inspect apps/frontend/app/globals.css`.

### 8. Component Definition

- **Functions**: Always use named functions (`function ComponentName() {}`) for components instead of arrow functions (`const ComponentName = () => {}`).

---

## CI Branding Template

When displaying CI/CD or build/deployment status, use the following standardized branding:

### CI/CD Status Colors

CI brand colors are defined as CSS custom properties in `apps/frontend/app/globals.css`:

```css
:root {
  --ci-success: #22c55e;
  --ci-success-text: #166534;
  --ci-failed: #ef4444;
  --ci-failed-text: #991b1b;
  --ci-in-progress: #3b82f6;
  --ci-in-progress-text: #1e40af;
  --ci-warning: #eab308;
  --ci-warning-text: #854d0e;
  --ci-neutral: #6b7280;
  --ci-neutral-text: #374151;
}
```

Use these CSS variables for consistent CI branding across the application.

### CI/CD Status Icons

- **Success**: `heroicons:check-circle-20-solid`
- **Failed**: `heroicons:x-circle-20-solid`
- **In Progress**: `heroicons:arrow-path-20-solid` (with animation)
- **Warning**: `heroicons:exclamation-triangle-20-solid`
- **Neutral**: `heroicons:minus-circle-20-solid`

### CI/CD Status Badge Component Pattern

```tsx
// components/ui/ci-status-badge/ci-status-badge.tsx
import { InlineIcon } from "@iconify/react";
import styles from "./ci-status-badge.module.css";

type CIStatus = "success" | "failed" | "in-progress" | "warning" | "neutral";

interface CIStatusBadgeProps {
  status: CIStatus;
  label?: string;
  showIcon?: boolean;
}

const statusConfig: Record<CIStatus, { icon: string; className: string }> = {
  success: {
    icon: "heroicons:check-circle-20-solid",
    className: styles.success,
  },
  failed: { icon: "heroicons:x-circle-20-solid", className: styles.failed },
  "in-progress": {
    icon: "heroicons:arrow-path-20-solid",
    className: styles.inProgress,
  },
  warning: {
    icon: "heroicons:exclamation-triangle-20-solid",
    className: styles.warning,
  },
  neutral: {
    icon: "heroicons:minus-circle-20-solid",
    className: styles.neutral,
  },
};

export function CIStatusBadge({
  status,
  label,
  showIcon = true,
}: CIStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`${styles.badge} ${config.className}`}>
      {showIcon && (
        <InlineIcon
          icon={config.icon}
          className={status === "in-progress" ? styles.spinning : undefined}
        />
      )}
      {label && <span>{label}</span>}
    </span>
  );
}
```

### CSS Module Pattern (Using Global CSS Variables)

```css
/* ci-status-badge.module.css */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.success {
  background-color: var(--ci-success);
  color: var(--ci-success-text);
}

.failed {
  background-color: var(--ci-failed);
  color: var(--ci-failed-text);
}

.inProgress {
  background-color: var(--ci-in-progress);
  color: var(--ci-in-progress-text);
}

.warning {
  background-color: var(--ci-warning);
  color: var(--ci-warning-text);
}

.neutral {
  background-color: var(--ci-neutral);
  color: var(--ci-neutral-text);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

