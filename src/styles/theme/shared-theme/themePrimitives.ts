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
  50: 'hsl(199, 100%, 95%)',
  100: 'hsl(199, 100%, 90%)',
  200: 'hsl(199, 95%, 78%)',
  300: 'hsl(199, 95%, 65%)',
  400: 'hsl(199, 100%, 55%)',
  500: 'hsl(199, 100%, 48%)',
  600: 'hsl(199, 95%, 42%)',
  700: 'hsl(199, 90%, 32%)',
  800: 'hsl(199, 85%, 20%)',
  900: 'hsl(199, 80%, 12%)',
}

// Deep navy surfaces (#0A0C16 / #151921)
export const gray = {
  50: 'hsl(220, 20%, 97%)',
  100: 'hsl(220, 18%, 92%)',
  200: 'hsl(220, 14%, 82%)',
  300: 'hsl(220, 12%, 70%)',
  400: 'hsl(220, 10%, 55%)',
  500: 'hsl(220, 10%, 42%)',
  600: 'hsl(220, 14%, 32%)',
  700: 'hsl(222, 18%, 22%)',
  800: 'hsl(222, 24%, 12%)',
  900: 'hsl(228, 28%, 6%)',
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

/** Soft red DCB surfaces */
export const smsSurfaces = {
  background: '#120e10',
  paper: '#1a1416',
  elevated: '#24181a',
  border: 'rgba(196, 92, 92, 0.18)',
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
        main: brand[400],
        dark: brand[700],
        contrastText: brand[50],
        ...(mode === 'dark' && {
          contrastText: brand[50],
          light: brand[300],
          main: brand[400],
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
        default: 'hsl(0, 0%, 99%)',
        paper: 'hsl(220, 35%, 97%)',
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
          primary: '#FFFFFF',
          secondary: 'rgba(255, 255, 255, 0.55)',
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
      borderRadius: 8,
    },
    shadows: customShadows,
  }
}

export const colorSchemes = {
  light: {
    palette: {
      primary: {
        light: brand[200],
        main: brand[400],
        dark: brand[700],
        contrastText: brand[50],
      },
      info: {
        light: brand[100],
        main: brand[300],
        dark: brand[600],
        contrastText: gray[50],
      },
      warning: {
        light: orange[300],
        main: orange[400],
        dark: orange[800],
      },
      error: {
        light: red[300],
        main: red[400],
        dark: red[800],
      },
      success: {
        light: green[300],
        main: green[400],
        dark: green[800],
      },
      grey: {
        ...gray,
      },
      divider: alpha(gray[300], 0.4),
      background: {
        default: 'hsl(0, 0%, 99%)',
        paper: 'hsl(220, 35%, 97%)',
      },
      text: {
        primary: gray[800],
        secondary: gray[600],
        warning: orange[400],
      },
      action: {
        hover: alpha(gray[200], 0.2),
        selected: `${alpha(gray[200], 0.3)}`,
      },
      baseShadow: 'hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px',
    },
  },
  dark: {
    palette: {
      primary: {
        contrastText: brand[50],
        light: brand[300],
        main: brand[400],
        dark: brand[700],
      },
      info: {
        contrastText: brand[200],
        light: brand[400],
        main: brand[500],
        dark: brand[800],
      },
      warning: {
        light: orange[300],
        main: orange[400],
        dark: orange[600],
      },
      error: {
        light: red[400],
        main: red[500],
        dark: red[700],
      },
      success: {
        light: green[300],
        main: green[400],
        dark: green[600],
      },
      grey: {
        ...gray,
      },
      divider: smsSurfaces.border,
      background: {
        default: smsSurfaces.background,
        paper: smsSurfaces.paper,
      },
      text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.55)',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.06)',
        selected: 'rgba(255, 255, 255, 0.12)',
      },
      baseShadow: '0 4px 24px rgba(0, 0, 0, 0.45)',
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
