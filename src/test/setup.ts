// Marks the environment as an act() test environment so React's test-time
// warnings behave correctly (React 19). Referenced from vite.config.ts.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export {};
