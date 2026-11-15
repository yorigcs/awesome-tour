---

## '@awesome-tour/core': patch

Targets hidden under the page's `scroll-padding` (e.g. behind a sticky header) now count as out of view and are scrolled into view. `scrollTargetsIntoView` reads the root's `scroll-padding` before deciding to skip scrolling.
