import type { Config } from 'tailwindcss'

/**
 * MV-Prospector — tokens do Design System Master Vendas v1.0.
 *
 * Em vez de reescrever as ~380 classes `dark:` espalhadas pelas telas, as
 * escalas padrão do Tailwind (gray, red, green, amber, blue) foram
 * redefinidas aqui. `primary` é o acento esmeralda (a ação principal de cada
 * tela); `brand` é o petróleo (títulos, blocos escuros); `mint` é o apoio.
 *
 * Modo escuro: a escala `gray` já carrega as superfícies teal
 * (950 = página, 900 = camada intermediária, 800 = cartão, 700 = borda).
 */
const emerald = {
  50: '#E6F5F1',
  100: '#C3E8E0',
  200: '#8FD6C8',
  300: '#56C0AC',
  400: '#2FA992',
  500: '#1A9780',
  600: '#157E6B',
  700: '#116456',
  800: '#0D4D43',
  900: '#093730',
  950: '#062620',
}

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Acento: ação principal, links, foco, sucesso
        primary: emerald,
        green: emerald,
        // Marca: petróleo
        brand: {
          50: '#EAF1F2',
          100: '#D2E0E2',
          200: '#A9C2C7',
          300: '#7B9DA4',
          400: '#527A82',
          500: '#305E67',
          600: '#284E56',
          700: '#213F46',
          800: '#193037',
          900: '#122328',
        },
        // Apoio
        mint: {
          50: '#EFF8F6',
          100: '#DCF0EB',
          200: '#BFE4DC',
          300: '#9DD6CB',
          400: '#79C7BA',
          500: '#5AB3A4',
          600: '#45988A',
          700: '#387C70',
          800: '#2C605A',
          900: '#214641',
        },
        // Neutros levemente esverdeados (e superfícies do modo escuro)
        gray: {
          50: '#F2F7F6',
          100: '#EDF1F1',
          200: '#DDE4E4',
          300: '#C4CECE',
          400: '#97A4A4',
          500: '#6B7878',
          600: '#4E5A5A',
          700: '#33474C',
          800: '#193037',
          900: '#16292F',
          950: '#122328',
        },
        // Semânticas
        red: {
          50: '#FBE7E2',
          100: '#F7D0C8',
          200: '#F0A99C',
          300: '#E8806E',
          400: '#E06550',
          500: '#D8503C',
          600: '#BC402F',
          700: '#9A3326',
          800: '#7A291F',
          900: '#5C1F17',
          950: '#3F150F',
        },
        amber: {
          50: '#FBF1D8',
          100: '#F6E2AE',
          200: '#F0D083',
          300: '#EAC055',
          400: '#E5B138',
          500: '#E0A21B',
          600: '#BC8514',
          700: '#926710',
          800: '#6D4C0D',
          900: '#4F370A',
          950: '#362507',
        },
        blue: {
          50: '#E5F0F7',
          100: '#CBE0EE',
          200: '#A2C6DE',
          300: '#78ABCC',
          400: '#5592BB',
          500: '#3B7DA8',
          600: '#30668B',
          700: '#26516F',
          800: '#1E3F56',
          900: '#162F41',
          950: '#0F2130',
        },
        // Papéis semânticos (alternam em globals.css conforme o tema)
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-work-sans)', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['var(--font-montserrat)', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Escala de raios do guia: 8 / 12 / 16 / 24 (cada degrau sobe um nível)
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      // Sombras tingidas de teal — nunca preto
      boxShadow: {
        sm: '0 1px 3px rgba(18,35,40,.09), 0 1px 2px rgba(18,35,40,.05)',
        DEFAULT: '0 1px 3px rgba(18,35,40,.09), 0 1px 2px rgba(18,35,40,.05)',
        md: '0 4px 14px rgba(18,35,40,.10)',
        lg: '0 12px 34px rgba(18,35,40,.13)',
        xl: '0 24px 56px rgba(18,35,40,.17)',
        focus: '0 0 0 3px rgba(26,151,128,.38)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
export default config
