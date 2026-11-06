import { createTheme, alpha, PaletteMode, Shadows } from '@mui/material/styles'

declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    highlighted: true
  }
}
declare module '@mui/material/styles/createPalette' {
  interface ColorRange {
    50: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string
    700: string
    800: string
    900: string
  }

  interface PaletteColor extends ColorRange {}

  interface Palette {
    baseShadow: string
  }
}

const defaultTheme = createTheme()

const customShadows: Shadows = [...defaultTheme.shadows]

// SMS Internal–inspired accents (cyan primary)
export const brand = {
  50: 'hsl(222, 100%, 95%)',
  100: 'hsl(222, 100%, 90%)',
  200: 'hsl(222, 95%, 78%)',
  300: 'hsl(222, 95%, 65%)',
  400: 'hsl(222, 100%, 55%)',
  500: 'hsl(222, 100%, 48%)',
  600: 'hsl(222, 95%, 42%)',
  700: 'hsl(222, 90%, 32%)',
  800: 'hsl(222, 85%, 20%)',
  900: 'hsl(222, 80%, 12%)',
}

// Neutral surfaces with a faint mint cast
export const gray = {
  50: 'hsl(140, 14%, 97%)',
  100: 'hsl(140, 12%, 92%)',
  200: 'hsl(140, 9%, 84%)',
  300: 'hsl(140, 7%, 72%)',
  400: 'hsl(140, 5%, 56%)',
  500: 'hsl(140, 5%, 43%)',
  600: 'hsl(140, 6%, 32%)',
  700: 'hsl(140, 8%, 21%)',
  800: 'hsl(140, 10%, 11%)',
  900: 'hsl(140, 14%, 6%)',
}

export const green = {
  50: 'hsl(152, 80%, 98%)',
  100: 'hsl(152, 75%, 94%)',
  200: 'hsl(152, 70%, 82%)',
  300: 'hsl(152, 65%, 62%)',
  400: 'hsl(152, 70%, 48%)',
  500: 'hsl(152, 72%, 38%)',
  600: 'hsl(152, 70%, 28%)',
  700: 'hsl(152, 72%, 20%)',
  800: 'hsl(152, 75%, 12%)',
  900: 'hsl(152, 80%, 8%)',
}

export const orange = {
  50: 'hsl(32, 100%, 97%)',
  100: 'hsl(32, 95%, 90%)',
  200: 'hsl(32, 94%, 78%)',
  300: 'hsl(32, 95%, 62%)',
  400: 'hsl(32, 100%, 52%)',
  500: 'hsl(28, 95%, 45%)',
  600: 'hsl(28, 90%, 35%)',
  700: 'hsl(28, 88%, 26%)',
  800: 'hsl(28, 85%, 16%)',
  900: 'hsl(28, 80%, 10%)',
}

export const purple = {
  50: 'hsl(270, 100%, 97%)',
  100: 'hsl(270, 90%, 92%)',
  200: 'hsl(270, 85%, 80%)',
  300: 'hsl(270, 85%, 70%)',
  400: 'hsl(270, 90%, 62%)',
  500: 'hsl(270, 85%, 52%)',
  600: 'hsl(270, 80%, 42%)',
  700: 'hsl(270, 75%, 32%)',
  800: 'hsl(270, 70%, 20%)',
  900: 'hsl(270, 65%, 12%)',
}

/** Shared navy surfaces */
export const smsSurfaces = {
  background: '#101722',
  paper: '#1b2636',
  elevated: '#272b34',
  border: '#3b4c63',
}

export const red = {
  50: 'hsl(0, 100%, 97%)',
  100: 'hsl(0, 92%, 90%)',
  200: 'hsl(0, 94%, 80%)',
  300: 'hsl(0, 90%, 65%)',
  400: 'hsl(0, 90%, 40%)',
  500: 'hsl(0, 90%, 30%)',
  600: 'hsl(0, 91%, 25%)',
  700: 'hsl(0, 94%, 18%)',
  800: 'hsl(0, 95%, 12%)',
  900: 'hsl(0, 93%, 6%)',
}

export const getDesignTokens = (mode: PaletteMode) => {
  customShadows[1] =
    mode === 'dark'
      ? 'hsla(220, 30%, 5%, 0.7) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.8) 0px 8px 16px -5px'
      : 'hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px'

  return {
    palette: {
      mode,
      primary: {
        light: brand[200],
        main: '#2563eb',
        dark: brand[700],
        contrastText: brand[50],
        ...(mode === 'dark' && {
          contrastText: brand[50],
          light: brand[300],
          main: '#2563eb',
          dark: brand[700],
        }),
      },
      info: {
        light: brand[100],
        main: brand[300],
        dark: brand[600],
        contrastText: gray[50],
        ...(mode === 'dark' && {
          contrastText: brand[300],
          light: brand[500],
          main: brand[700],
          dark: brand[900],
        }),
      },
      warning: {
        light: orange[300],
        main: orange[400],
        dark: orange[800],
        ...(mode === 'dark' && {
          light: orange[400],
          main: orange[500],
          dark: orange[700],
        }),
      },
      error: {
        light: red[300],
        main: red[400],
        dark: red[800],
        ...(mode === 'dark' && {
          light: red[400],
          main: red[500],
          dark: red[700],
        }),
      },
      success: {
        light: green[300],
        main: green[400],
        dark: green[800],
        ...(mode === 'dark' && {
          light: green[400],
          main: green[500],
          dark: green[700],
        }),
      },
      grey: {
        ...gray,
      },
      divider: mode === 'dark' ? alpha(gray[700], 0.6) : alpha(gray[300], 0.4),
      background: {
        default: '#f5f6f8',
        paper: '#ffffff',
        ...(mode === 'dark' && {
          default: smsSurfaces.background,
          paper: smsSurfaces.paper,
        }),
      },
      text: {
        primary: gray[800],
        secondary: gray[600],
        warning: orange[400],
        ...(mode === 'dark' && {
          primary: '#e9ecf2',
          secondary: '#a0a8b7',
        }),
      },
      action: {
        hover: alpha(gray[200], 0.2),
        selected: `${alpha(gray[200], 0.3)}`,
        ...(mode === 'dark' && {
          hover: alpha(gray[600], 0.2),
          selected: alpha(gray[600], 0.3),
        }),
      },
    },
    typography: {
      fontFamily: ['"Inter", "sans-serif"'].join(','),
      h1: {
        fontSize: defaultTheme.typography.pxToRem(48),
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: -0.5,
      },
      h2: {
        fontSize: defaultTheme.typography.pxToRem(36),
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h3: {
        fontSize: defaultTheme.typography.pxToRem(30),
        lineHeight: 1.2,
      },
      h4: {
        fontSize: defaultTheme.typography.pxToRem(24),
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h5: {
        fontSize: defaultTheme.typography.pxToRem(20),
        fontWeight: 600,
      },
      h6: {
        fontSize: defaultTheme.typography.pxToRem(18),
        fontWeight: 600,
      },
      subtitle1: {
        fontSize: defaultTheme.typography.pxToRem(18),
      },
      subtitle2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 500,
      },
      body1: {
        fontSize: defaultTheme.typography.pxToRem(14),
      },
      body2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 400,
      },
      caption: {
        fontSize: defaultTheme.typography.pxToRem(12),
        fontWeight: 400,
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: customShadows,
  }
}

// Soft palette: mint surfaces with ink primary (keep in sync with src/styles/shell-soft.css).
export const colorSchemes = {
  light: {
    palette: {
      primary: {
        light: '#3a3e44',
        main: '#16181b',
        dark: '#000000',
        contrastText: '#ffffff',
      },
      secondary: {
        light: '#fde8d2',
        main: '#f08a24',
        dark: '#b8620f',
        contrastText: '#ffffff',
      },
      info: {
        light: '#d9e7fb',
        main: '#3b74f0',
        dark: '#2a55b8',
        contrastText: '#ffffff',
      },
      warning: {
        light: '#fbe3b5',
        main: '#e8930c',
        dark: '#a86400',
      },
      error: {
        light: '#fbdfe3',
        main: '#e5484d',
        dark: '#b3262b',
      },
      success: {
        light: '#cdeedb',
        main: '#12a15a',
        dark: '#0b7440',
      },
      grey: {
        ...gray,
      },
      divider: '#e3eae5',
      background: {
        default: '#dfe9e2',
        paper: '#ffffff',
      },
      text: {
        primary: '#15171a',
        secondary: '#69716c',
        warning: '#e8930c',
      },
      action: {
        hover: 'rgba(21, 23, 26, 0.05)',
        selected: 'rgba(21, 23, 26, 0.08)',
      },
      baseShadow: '0 1px 2px rgba(21, 23, 26, 0.04)',
    },
  },
  dark: {
    palette: {
      primary: {
        light: '#ffffff',
        main: '#ebf1ed',
        dark: '#c9d3cc',
        contrastText: '#121714',
      },
      secondary: {
        light: '#33291f',
        main: '#f5a55a',
        dark: '#c77a2c',
        contrastText: '#121714',
      },
      info: {
        light: '#1b2a3d',
        main: '#6c9cff',
        dark: '#4a78d6',
        contrastText: '#121714',
      },
      warning: {
        light: '#3a2f18',
        main: '#f0b43c',
        dark: '#c28a14',
      },
      error: {
        light: '#3a2226',
        main: '#f47a7e',
        dark: '#c9484d',
      },
      success: {
        light: '#173326',
        main: '#3fcf86',
        dark: '#23a262',
      },
      grey: {
        ...gray,
      },
      divider: '#29312c',
      background: {
        default: '#0e1411',
        paper: '#171d1a',
      },
      text: {
        primary: '#ebf1ed',
        secondary: '#9ba69f',
      },
      action: {
        hover: 'rgba(235, 241, 237, 0.06)',
        selected: 'rgba(235, 241, 237, 0.1)',
      },
      baseShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    },
  },
}

export const typography = {
  fontFamily: ['"Inter", "sans-serif"'].join(','),
  h1: {
    fontSize: defaultTheme.typography.pxToRem(48),
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: defaultTheme.typography.pxToRem(36),
    fontWeight: 600,
    lineHeight: 1.2,
  },
  h3: {
    fontSize: defaultTheme.typography.pxToRem(30),
    lineHeight: 1.2,
  },
  h4: {
    fontSize: defaultTheme.typography.pxToRem(24),
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h5: {
    fontSize: defaultTheme.typography.pxToRem(20),
    fontWeight: 600,
  },
  h6: {
    fontSize: defaultTheme.typography.pxToRem(18),
    fontWeight: 600,
  },
  subtitle1: {
    fontSize: defaultTheme.typography.pxToRem(18),
  },
  subtitle2: {
    fontSize: defaultTheme.typography.pxToRem(14),
    fontWeight: 500,
  },
  body1: {
    fontSize: defaultTheme.typography.pxToRem(14),
  },
  body2: {
    fontSize: defaultTheme.typography.pxToRem(14),
    fontWeight: 400,
  },
  caption: {
    fontSize: defaultTheme.typography.pxToRem(12),
    fontWeight: 400,
  },
}

export const shape = {
  borderRadius: 8,
}

// @ts-ignore
const defaultShadows: Shadows = ['none', 'var(--template-palette-baseShadow)', ...defaultTheme.shadows.slice(2)]
export const shadows = defaultShadows
