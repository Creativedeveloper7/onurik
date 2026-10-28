import { fileURLToPath } from "url";

// Point Tailwind at its config explicitly: Vite may run from the repo root, not website/.
export default {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL("./tailwind.config.js", import.meta.url)) },
    autoprefixer: {},
  },
};
