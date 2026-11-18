# @awesome-tour/three

Point tour steps at objects inside a [react-three-fiber](https://r3f.docs.pmnd.rs) scene. The
object's bounds are projected to the screen every frame, so the regular overlay and card follow it,
and `useTourCamera` flies the camera to a shot per step.

```bash
pnpm add @awesome-tour/three   # peers: @react-three/fiber, three
```

```tsx
import { anchor } from '@awesome-tour/react';
import { TourTarget3D, useTourCamera } from '@awesome-tour/three';

// step: { id: 'pads', target: anchor('pads'), title: 'Sixteen pads' }
<Canvas>
  <TourTarget3D name="pads">
    <DrumPads />
  </TourTarget3D>
  <CameraRig /> {/* useTourCamera({ pads: { position: [0, 3, 3], lookAt: [0, 0, 0] } }) */}
</Canvas>;
```

[3D guide and live demo](https://yorigcs.github.io/awesome-tour/guides/three/) · MIT
