# TypeScript configuration

`tsconfig.base.json` contains the project-wide strict compiler settings. The root `tsconfig.json` extends it and supplies Next.js's generated type includes and the application import alias. Keep framework-specific includes at the root so they resolve from the Next.js project directory.
