// We use cryptographically strong PRNGs (crypto.getRandomBytes())
// When using crypto.getRandomValues(), our primitive is hexString(),
// from which we construct fraction().

import NodeRandomGenerator from './NodeRandomGenerator';
import createRandom from './createRandom';

// Create the Random object with default options
// You can pass { kuuid: true } or { kuuid: false } to explicitly enable or disable kuuid
// You can also pass { length: n } to set the default length for generated IDs
export const Random = createRandom(new NodeRandomGenerator({ kuuid: undefined, length: undefined }));
