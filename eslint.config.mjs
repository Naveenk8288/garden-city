import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginSecurity from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/map-data/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginSecurity.configs.recommended,
  noUnsanitized.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Explicit hard bans on dynamic code execution & unsafe DOM sinks (OWASP ASVS V5)
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'document',
          property: 'write',
          message: 'document.write is banned for XSS safety.'
        },
        {
          object: 'document',
          property: 'writeln',
          message: 'document.writeln is banned for XSS safety.'
        }
      ],
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-pseudoRandomBytes': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
];
