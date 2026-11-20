# @awesome-tour/elements

[awesome-tour](https://yorigcs.github.io/awesome-tour/) without React: a DOM renderer and an
`<awesome-tour>` custom element, for Vue, Svelte, Angular, server-rendered pages or plain HTML.
Same engine, same tours, same JSON.

```bash
pnpm add @awesome-tour/core @awesome-tour/elements
```

```html
<script type="module">
  import '@awesome-tour/elements/define';
</script>

<awesome-tour src="/tours/first-session.json" autostart persist></awesome-tour>
```

Or drive it from code:

```ts
import { createTour } from '@awesome-tour/core';
import { mountTour } from '@awesome-tour/elements';

const tour = createTour({
  id: 'first-session',
  steps: [
    /* … */
  ],
});
const unmount = mountTour(tour, { locale: 'pt-BR' });
tour.start();
```

The card renders in a shadow root: theme it with CSS custom properties (`--tour-bg`, `--tour-fg`,
`--tour-accent`, `--tour-radius`, `--tour-overlay`…) or restyle any part with `::part(card)`,
`::part(title)`, `::part(next)`… (`unstyled: true` drops the built-in look). Keyboard, focus trap,
`inert`, RTL and screen-reader announcements are built in.

[Guide](https://yorigcs.github.io/awesome-tour/guides/without-react/) · MIT
