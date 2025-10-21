import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env files
  // FIX: Replaced `process.cwd()` with `''` and removed the failing triple-slash directive.
  // The `loadEnv` function defaults to `process.cwd()` for an empty `envDir`,
  // which resolves the type error for `process.cwd()` without changing behavior.
  const env = loadEnv(mode, '', '');

  return {
    plugins: [react(), basicSsl()],
    server: {
      port: 5660,
    },
    define: {
      // Expose VITE_ variables to the client. We use JSON.stringify to ensure
      // the values are correctly quoted as strings in the client-side code.
      // Fallback to empty string if not defined.
      'process.env.VITE_AI_GATEWAY_URL': JSON.stringify(env.VITE_AI_GATEWAY_URL || ''),
      'process.env.VITE_AI_GATEWAY_API_KEY': JSON.stringify(env.VITE_AI_GATEWAY_API_KEY || ''),
      'process.env.VITE_AI_GATEWAY_MODEL': JSON.stringify(env.VITE_AI_GATEWAY_MODEL || ''),

      // Per project guidelines, the Gemini API key MUST come from the execution environment's `process.env.API_KEY`.
      // It is NOT defined here. The application code in `geminiService.ts` will read it directly
      // from the true `process.env` object at runtime.
    },
  };
});
