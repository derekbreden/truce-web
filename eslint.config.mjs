import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.js"], languageOptions: { globals: {...globals.browser, ...globals.node} } },
]);
