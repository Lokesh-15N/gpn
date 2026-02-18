/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PulseFlow Theme Colors
        primary: '#1A2B48',      // Deep Navy
        secondary: '#00A8E8',    // Clinical Cyan
        accent: '#EF4444',       // Emergency Red
        background: '#F8FAFC',   // Soft Gray
        success: '#10B981',      // Green
        warning: '#F59E0B',      // Amber
        info: '#00A8E8',         // Clinical Cyan
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
