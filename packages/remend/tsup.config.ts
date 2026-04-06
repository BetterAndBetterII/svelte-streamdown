import { createTsupPackageConfig } from '../../config/tsup-package.mjs';

export default createTsupPackageConfig({
  entry: ['src/index.ts', 'src/utils.ts'],
});
