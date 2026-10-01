import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", "hotel_teesta_photos/**", "hotel_teesta_photos_web/**", "hotel_teesta_photos_originals/**", "output/**", ".playwright-cli/**"]),
]);
