import defaultExportName from './rules/defaultExportName.mjs';
import filePlacement from './rules/filePlacement.mjs';
import noLineComments from './rules/noLineComments.mjs';
import oneFunctionPerFile from './rules/oneFunctionPerFile.mjs';

export default {
  meta: { name: '@assistant/eslint-plugin' },
  rules: {
    'default-export-name': defaultExportName,
    'file-placement': filePlacement,
    'no-line-comments': noLineComments,
    'one-function-per-file': oneFunctionPerFile
  }
};
