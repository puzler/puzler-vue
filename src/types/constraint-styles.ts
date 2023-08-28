import type { Color } from '@/graphql/generated/types'

type LineStyle = {
  color: Color
  width: number
}

type ShapeStyle = {
  fillColor: Color
  outlineColor: Color
  textColor: Color
  width: number
  height: number
}

type TextStyle = {
  fontColor: Color
  size: number
}

function greyscale(value: number): Color {
  return {
    red: value,
    green: value,
    blue: value,
    opacity: 1,
  }
}

const LineStyles = {
  palindrome: {
    color: {
      red: 192,
      green: 192,
      blue: 192,
      opacity: 1,
    },
    width: 0.35,
  },
  renban: {
    color: {
      red: 240,
      green: 103,
      blue: 240,
      opacity: 1,
    },
    width: 0.35,
  },
  germanWhisper: {
    color: {
      red: 103,
      green: 240,
      blue: 103,
      opacity: 1,
    },
    width: 0.35,
  },
  dutchWhisper: {
    color: {
      red: 255,
      green: 111,
      blue: 0,
      opacity: 1,
    },
    width: 0.35,
  },
  regionSum: {
    color: {
      red: 0,
      green: 200,
      blue: 255,
      opacity: 1,
    },
    width: 0.35,
  },
  betweenLine: {
    color: greyscale(187),
    width: 0.1,
  },
} as Record<string, LineStyle>

const ShapeStyles = {
  oddCell: {
    fillColor: greyscale(187),
    outlineColor: greyscale(187),
    textColor: greyscale(187),
    height: 0.7,
    width: 0.7,
  },
  evenCell: {
    fillColor: greyscale(187),
    outlineColor: greyscale(187),
    textColor: greyscale(187),
    height: 0.65,
    width: 0.65,
  },
  ratio: {
    fillColor: greyscale(0),
    outlineColor: greyscale(0),
    textColor: greyscale(255),
    height: 0.25,
    width: 0.25,
  },
  difference: {
    fillColor: greyscale(255),
    outlineColor: greyscale(0),
    textColor: greyscale(0),
    height: 0.25,
    width: 0.25,
  },
  betweenLineBulb: {
    fillColor: greyscale(255),
    outlineColor: greyscale(187),
    textColor: greyscale(0),
    height: 0.8,
    width: 0.8,
  },
} as Record<string, ShapeStyle>

const TextStyles = {
  xv: {
    fontColor: greyscale(0),
    size: 0.3,
  },
  sandwichSum: {
    fontColor: greyscale(0),
    size: 0.65,
  },
  xSum: {
    fontColor: greyscale(0),
    size: 0.65,
  },
  skyscraper: {
    fontColor: greyscale(0),
    size: 0.65,
  }
} as Record<string, TextStyle>

const CellBackgroundColors = {
  extraRegion: greyscale(221),
  clone: greyscale(204),
  rowIndexing: { 
    red: 199,
    green: 124,
    blue: 124,
    opacity: 1,
  },
  columnIndexing: {
    red: 124,
    green: 199,
    blue: 124,
    opacity: 1,
  },
  minMaxCell: greyscale(240),
} as Record<string, Color>

const ConstraintStyles = {
  lines: LineStyles,
  shapes: ShapeStyles,
  texts: TextStyles,
  cellBackgrounds: CellBackgroundColors,
  cage: {
    textColor: greyscale(0),
    cageColor: greyscale(0),
  }
}

export default ConstraintStyles