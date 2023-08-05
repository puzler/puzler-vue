function addressToCoordinates(address: string) {
  const match = address.match(/^R(-{0,1}\d+)C(-{0,1}\d+)$/)
  if (!match) return { row: 0, col: 0 }

  const [row, col] = [match[1], match[2]].map((n) => parseInt(n, 10))
  return { row, col }
}

export { addressToCoordinates }
