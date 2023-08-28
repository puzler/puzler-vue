import type { Color } from '@/graphql/generated/types'

function colorToRGBA({ red, green, blue, opacity }: Color) {
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

const colorRegex = {
  hexNoAlpha: /^#(?<red>[0-9a-fA-F]{2})(?<green>[0-9a-fA-F]{2})(?<blue>[0-9a-fA-F]{2})$/,
  hexWithAlpha: /^#(?<red>[0-9a-fA-F]{2})(?<green>[0-9a-fA-F]{2})(?<blue>[0-9a-fA-F]{2})(?<alpha>[0-9a-fA-F]{1,2})$/,
  shortHexNoAlpha: /^#(?<red>[0-9a-fA-F])(?<green>[0-9a-fA-F])(?<blue>[0-9a-fA-F])$/,
  shortHexWithAlpha: /^#(?<red>[0-9a-fA-F])(?<green>[0-9a-fA-F])(?<blue>[0-9a-fA-F])(?<alpha>[0-9a-fA-F])$/,
  rgb: /^rgb\((?<red>\d{1,3}(\.\d+){0,1})[\s,]*(?<green>\d{1,3}(\.\d+){0,1})[\s,]+(?<blue>\d{1,3}(\.\d+){0,1})\)$/,
  rgba: /^rgba\((?<red>\d{1,3}(\.\d+){0,1})[\s,]*(?<green>\d{1,3}(\.\d+){0,1})[\s,]+(?<blue>\d{1,3}(\.\d+){0,1})[\s,]+(?<alpha>1|0{0,1}\.\d+)\)$/
} as Record<string, RegExp>

function parseRaw(value: string|null|undefined, valueType: 'hex'|'dec', max = 255.0) {
  if (!value) return max

  console.log(value, valueType, max)
  switch (valueType) {
    case 'hex': {
      const number = parseInt(value.padEnd(2, value), 16)
      return (number / 255.0) * max
    }
    case 'dec':
      return parseFloat(value)
  }

  throw new Error('Unknown Value Type')
}

function valueTypeForRegexKey(regexKey: string): 'hex'|'dec' {
  if (regexKey.startsWith('rgb')) return 'dec'

  return 'hex'
}

function rawRgbaValues(colorString: string) {
  const regexKeys = Object.keys(colorRegex)
  for (let i = 0; i < regexKeys.length; i += 1) {
    const key = regexKeys[i]
    const match = colorString.match(colorRegex[key])
    if (match) {
      return {
        valueType: valueTypeForRegexKey(key),
        rawValues: match.groups
      }
    }
  }

  return null
}

function strToColor(colorString: string) {
  console.log(colorString)
  const conversion = rawRgbaValues(colorString)
  if (conversion) {
    const { valueType, rawValues } = conversion
    if (!rawValues) return

    console.log(rawValues)
    return {
      red: parseRaw(rawValues.red, valueType),
      green: parseRaw(rawValues.green, valueType),
      blue: parseRaw(rawValues.blue, valueType),
      opacity: parseRaw(rawValues.alpha, valueType, 1.0),
    }
  }
}

const ColorConverter = {
  colorToRGBA,
  strToColor,
}

export default ColorConverter
