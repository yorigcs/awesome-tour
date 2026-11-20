# @awesome-tour/devtools

A development panel for [awesome-tour](https://yorigcs.github.io/awesome-tour/): every registered
tour and step, target health (found, missing, hidden by `when`), jump to any step, the event log,
why a tour's display rules keep it hidden, and an element picker that suggests a stable target.

```bash
pnpm add -D @awesome-tour/devtools
```

```tsx
import { TourDevtools } from '@awesome-tour/devtools';

{
  import.meta.env.DEV && <TourDevtools />;
}
{
  /* Alt+Shift+T toggles it */
}
```

[Devtools guide](https://yorigcs.github.io/awesome-tour/guides/devtools/) · MIT
