/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("agent-ui/tailwind-preset")],
  content: [
    "./src/**/*.{ts,tsx,html}",
    "./index.html",
    "./node_modules/agent-ui/dist/**/*.{js,cjs}",
  ],
};
