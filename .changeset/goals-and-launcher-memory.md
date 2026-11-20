---
"@awesome-tour/core": minor
"@awesome-tour/react": patch
---

- Goals survive reloads: `persist()` saves when a run's goal was armed and reached, and resumes watching it on the next visit (counted once). New `tour.trackGoal(since)` to do it yourself.
- `manager.getImpression(id)`; launcher items and badges fall back to remembered impressions, so a tour finished in an earlier session isn't shown as "new" again.
