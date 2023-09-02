declare module 'json-fn' {
  function stringify(obj: Object): string
  function parse(str: string, date2obj: boolean): Object
  function clone(obj: Object, date2obj: boolean): Object
}
