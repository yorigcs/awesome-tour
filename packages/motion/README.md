# @awesome-tour/motion

Spring animations for [awesome-tour](https://yorigcs.github.io/awesome-tour/) with
[Motion](https://motion.dev): a spotlight cutout that morphs between targets and chases moving
ones, and enter/exit presets for the card. Reduced motion makes everything instant.

```bash
pnpm add @awesome-tour/motion motion
```

```tsx
import { MotionContent, MotionOverlay } from '@awesome-tour/motion';

<Tour.Portal>
  <MotionOverlay padding={6} radius={10} />
  <MotionContent preset="slide" animateStepChange>
    <Tour.Title />
    <Tour.Next>Next</Tour.Next>
  </MotionContent>
</Tour.Portal>;
```

[Animation guide](https://yorigcs.github.io/awesome-tour/guides/animation/) · MIT
