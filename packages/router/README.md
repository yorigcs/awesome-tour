# @awesome-tour/router

Router adapters for multi-page [awesome-tour](https://yorigcs.github.io/awesome-tour/) tours: a step
with a `route` navigates there first, and hides itself while the user is elsewhere.

```bash
pnpm add @awesome-tour/router
```

```tsx
import { TourProvider } from '@awesome-tour/react';
import { useReactRouterAdapter } from '@awesome-tour/router/react-router';
// or '@awesome-tour/router/next', '@awesome-tour/router/tanstack-router'

function Providers({ children }) {
  const router = useReactRouterAdapter();
  return <TourProvider router={router}>{children}</TourProvider>;
}
```

[Multi-page guide](https://yorigcs.github.io/awesome-tour/guides/multi-page/) · MIT
