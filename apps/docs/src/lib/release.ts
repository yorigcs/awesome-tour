// The version the site documents. Docs are deployed together with each release (see RELEASING.md),
// so this is the version on npm. All @awesome-tour packages are released together.
import react from '../../../../packages/react/package.json';

export const VERSION: string = react.version;
export const NPM_URL = `https://www.npmjs.com/package/@awesome-tour/react/v/${VERSION}`;
