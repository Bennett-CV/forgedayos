/** @type {import('tailwindcss').Config} */
const oklch = (token) => `oklch(var(${token}) / <alpha-value>)`;

module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'var(--radius)',
  			sm: 'var(--radius)',
        none: '0',
  		},
  		colors: {
        page: oklch('--page'),
        shell: oklch('--shell'),
        ink: oklch('--ink'),
        caption: oklch('--caption'),
        faint: oklch('--faint'),
        clay: {
          DEFAULT: oklch('--clay'),
          hover: oklch('--clay-hover'),
          fg: oklch('--clay-fg'),
        },
        track: oklch('--track'),
        strong: oklch('--border-strong'),
        pillar: {
          career: oklch('--pillar-career'),
          lifts: oklch('--pillar-lifts'),
          nutrition: oklch('--pillar-nutrition'),
          finance: oklch('--pillar-finance'),
          mindfulness: oklch('--pillar-mindfulness'),
        },
  			background: oklch('--background'),
  			foreground: oklch('--foreground'),
  			card: {
  				DEFAULT: oklch('--card'),
  				foreground: oklch('--card-foreground')
  			},
  			popover: {
  				DEFAULT: oklch('--popover'),
  				foreground: oklch('--popover-foreground')
  			},
  			primary: {
  				DEFAULT: oklch('--primary'),
  				foreground: oklch('--primary-foreground')
  			},
  			secondary: {
  				DEFAULT: oklch('--secondary'),
  				foreground: oklch('--secondary-foreground')
  			},
  			muted: {
  				DEFAULT: oklch('--muted'),
  				foreground: oklch('--muted-foreground')
  			},
  			accent: {
  				DEFAULT: oklch('--accent'),
  				foreground: oklch('--accent-foreground')
  			},
  			destructive: {
  				DEFAULT: oklch('--destructive'),
  				foreground: oklch('--destructive-foreground')
  			},
  			border: oklch('--border'),
  			input: oklch('--input'),
  			ring: oklch('--ring'),
        success: oklch('--success'),
        warning: oklch('--warning'),
        info: oklch('--info'),
        overbudget: oklch('--overbudget'),
  			chart: {
  				'1': oklch('--chart-1'),
  				'2': oklch('--chart-2'),
  				'3': oklch('--chart-3'),
  				'4': oklch('--chart-4'),
  				'5': oklch('--chart-5')
  			},
  			sidebar: {
  				DEFAULT: oklch('--sidebar-background'),
  				foreground: oklch('--sidebar-foreground'),
  				primary: oklch('--sidebar-primary'),
  				'primary-foreground': oklch('--sidebar-primary-foreground'),
  				accent: oklch('--sidebar-accent'),
  				'accent-foreground': oklch('--sidebar-accent-foreground'),
  				border: oklch('--sidebar-border'),
  				ring: oklch('--sidebar-ring')
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
