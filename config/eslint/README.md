# ESLint configuration

The root `eslint.config.js` loads the Next.js Core Web Vitals and TypeScript flat configurations from `eslint-config-next`. Keep the shared ignores in that root configuration. Run `pnpm lint` from the repository root; application-specific exceptions should be narrow and documented next to the relevant rule.
