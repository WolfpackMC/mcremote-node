import 'colorts/lib/string'

const log_prefix = () => {
  const prefix = `[${new Date().toLocaleTimeString()}] 📄`.gray
  return prefix
}

export class Log {
  static info(message: string) {
    console.log(`${log_prefix()} ${'INFO'.green} ${message}`.green)
  }

  static error(message: string) {
    console.log(`${log_prefix()} ${'ERROR'.red} ${message}`.red)
  }

  static warn(message: string) {
    console.log(`${log_prefix()} ${'WARN'.yellow} ${message}`.yellow)
  }

  static debug(message: string) {
    console.log(`${log_prefix()} ${'DEBUG'.blue} ${message}`.blue)
  }

  static trace(message: string) {
    console.log(`${log_prefix()} ${'TRACE'.cyan} ${message}`.cyan)
  }

  static fatal(message: string) {
    console.log(`${log_prefix()} ${'FATAL'.red} ${message}`.red)
  }

  static success(message: string) {
    console.log(`${log_prefix()} ${'SUCCESS'.green} ${message}`.green)
  }

  static log(message: string) {
    console.log(`${log_prefix()} ${message}`)
  }
}
