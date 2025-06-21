/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Eldercare-optimized font sizes
      fontSize: {
        'elder-xs': '1.1rem',     // 17.6px - Minimum readable size
        'elder-sm': '1.2rem',     // 19.2px - Small text
        'elder-base': '1.3rem',   // 20.8px - Base text
        'elder-lg': '1.6rem',     // 25.6px - Large text
        'elder-xl': '2rem',       // 32px - Headings
        'elder-2xl': '2.4rem',    // 38.4px - Large headings
        'elder-3xl': '3rem',      // 48px - Hero text
      },
      
      // Eldercare-optimized spacing
      spacing: {
        'touch': '44px',          // Minimum touch target size
        'touch-lg': '56px',       // Large touch target
        'elder-gap': '2rem',      // Generous spacing between elements
      },
      
      // High contrast color system
      colors: {
        // Primary colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        
        // Semantic colors for health states
        health: {
          safe: '#059669',        // Green - safe/success
          'safe-light': '#10b981',
          'safe-bg': '#d1fae5',
          warning: '#f59e0b',     // Amber - minor warnings
          'warning-light': '#fbbf24',
          'warning-bg': '#fef3c7',
          danger: '#dc2626',      // Red - serious warnings
          'danger-light': '#ef4444',
          'danger-bg': '#fee2e2',
        },
        
        // Eldercare UI colors
        elder: {
          text: '#1a202c',        // High contrast text
          'text-secondary': '#4a5568',
          background: '#ffffff',
          'background-alt': '#f7fafc',
          border: '#e2e8f0',
          'border-dark': '#cbd5e0',
        },
      },
      
      // Animation for voice feedback
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
      },
      
      // Typography
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      
      // Line height for readability
      lineHeight: {
        'elder': '1.7',
        'elder-relaxed': '1.8',
      },
      
      // Border radius
      borderRadius: {
        'elder': '12px',
        'elder-lg': '16px',
      },
      
      // Box shadows for depth
      boxShadow: {
        'elder': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'elder-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'elder-hover': '0 6px 12px rgba(0, 0, 0, 0.15)',
      },
      
      // Screen breakpoints
      screens: {
        'xs': '480px',
        'elder-tablet': '768px',
        'elder-desktop': '1024px',
      },
    },
  },
  plugins: [
    // Custom plugin for eldercare utilities
    function({ addUtilities }) {
      const eldercareUtilities = {
        // Touch target utilities
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
        '.touch-target-lg': {
          minHeight: '56px',
          minWidth: '56px',
        },
        
        // Focus visible utilities
        '.focus-visible-elder': {
          outline: '3px solid #3b82f6',
          outlineOffset: '2px',
        },
        
        // High contrast utilities
        '.high-contrast': {
          filter: 'contrast(1.2)',
        },
        
        // Voice button styles
        '.voice-button': {
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '4rem',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        },
      };
      
      addUtilities(eldercareUtilities);
    },
  ],
}