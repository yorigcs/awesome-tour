import { connectAudio, createLoopwork } from '@loopwork';

/** The playground's one Loopwork project, shared by every page. */
export const studio = createLoopwork();
connectAudio(studio);
