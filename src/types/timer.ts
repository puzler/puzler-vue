class Timer {
  private currentStart = null as null|number
  private appendMilliseconds = 0

  play() {
    if (this.currentStart !== null) return
    this.currentStart = Date.now()
  }

  pause() {
    if (this.currentStart === null) return
    this.appendMilliseconds += Date.now() - this.currentStart
    this.currentStart = null
  }

  get paused() {
    return this.currentStart === null
  }

  get milliseconds() {
    if (this.currentStart === null) return this.appendMilliseconds

    return this.appendMilliseconds + (Date.now() - this.currentStart)
  }

  get readableOutput() {
    let seconds = Math.floor(this.milliseconds / 1000)
    let minutes = Math.floor(seconds / 60)
    let hours = Math.floor(minutes / 60)

    const pad = (n: number) => n.toString().padStart(2, '0')

    seconds %= 60
    minutes %= 60

    const minSec = `${pad(minutes)}:${pad(seconds)}`
    if (hours === 0) return minSec

    return `${hours}:${minSec}`
  }
}

export { Timer }
