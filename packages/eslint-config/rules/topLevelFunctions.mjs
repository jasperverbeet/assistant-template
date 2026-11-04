const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression'
]);

/**
 * Finds the functions at module scope: function declarations, `const` names
 * that hold a function, and an anonymous default export of a function.
 *
 * @param {import('estree').Program} program The parsed file.
 * @returns {{
 *   name: string | undefined;
 *   node: import('estree').Node;
 *   exportKind: 'none' | 'named' | 'default';
 * }[]}
 *   One record for each top-level function.
 */
const topLevelFunctions = (program) =>
  program.body.flatMap((statement) => {
    const exportKind =
      statement.type === 'ExportNamedDeclaration'
        ? 'named'
        : statement.type === 'ExportDefaultDeclaration'
          ? 'default'
          : 'none';
    const declaration =
      exportKind === 'none' ? statement : statement.declaration;

    if (!declaration) {
      return [];
    }

    if (FUNCTION_TYPES.has(declaration.type)) {
      return [{ name: declaration.id?.name, node: declaration, exportKind }];
    }

    if (declaration.type !== 'VariableDeclaration') {
      return [];
    }

    return declaration.declarations
      .filter((declarator) => FUNCTION_TYPES.has(declarator.init?.type))
      .map((declarator) => ({
        name:
          declarator.id.type === 'Identifier' ? declarator.id.name : undefined,
        node: declarator,
        exportKind
      }));
  });

export default topLevelFunctions;
