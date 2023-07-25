const f = String.fromCharCode
const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/\\"
const base64ReverseDict = keyStrBase64.split('').reduce(
  (dict, char, i) => ({
    ...dict,
    [char]: i
  }),
  {} as Record<string, number>
)

const unzip = (raw: string) => {
  const input = decodeURIComponent(raw)

  const { length } = input
  const resetValue = 32
  const getNextValue = (index: number) => base64ReverseDict[input.charAt(index)]

  const dictionary = []
  const result = []
  const data = {val: getNextValue(0), position: resetValue, index:1}

  let enlargeIn = 4,
    dictSize = 4,
    numBits = 3,
    entry = "",
    i,
    w,
    bits, resb, maxpower, power,
    c;

  for(i = 0; i < 3; i++)
    dictionary[i] = i;

  bits = 0;
  maxpower = Math.pow(2, 2);
  power = 1;
  while (power != maxpower) {
    resb = data.val & data.position;
    data.position >>= 1;
    if(data.position == 0){
      data.position = resetValue;
      data.val = getNextValue(data.index++);
    }
    bits |= (resb > 0 ? 1 : 0) * power;
    power <<= 1;
  }

  switch(bits){
    case 0:
      bits = 0;
      maxpower = Math.pow(2, 8);
      power=1;
      while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if(data.position == 0){
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = f(bits);
      break;
    case 1:
      bits = 0;
      maxpower = Math.pow(2, 16);
      power = 1;
      while(power != maxpower){
        resb = data.val & data.position;
        data.position >>= 1;
        if(data.position == 0){
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = f(bits);
      break;
    case 2:
      return "";
  }
  dictionary[3] = c;
  w = c;
  result.push(c);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if(data.index > length)
      return "";

    bits = 0;
    maxpower = Math.pow(2, numBits);
    power = 1;
    while(power != maxpower){
      resb = data.val & data.position;
      data.position >>= 1;
      if(data.position == 0){
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (c = bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while(power != maxpower){
          resb = data.val & data.position;
          data.position >>= 1;
          if(data.position == 0){
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }

        dictionary[dictSize++] = f(bits);
        c = dictSize-1;
        enlargeIn--;
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power=1;
        while(power != maxpower){
          resb = data.val & data.position;
          data.position >>= 1;
          if(data.position == 0){
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = f(bits);
        c = dictSize-1;
        enlargeIn--;
        break;
      case 2:
        return result.join('');
    }

    if(enlargeIn == 0){
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    if(dictionary[c] && typeof(dictionary[c] === 'string')){
      entry = dictionary[c] as string;
    } else {
      if(c === dictSize){
        entry = w + w!.charAt(0);
      } else return null;
    }
    result.push(entry);

    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;

    w = entry;

    if(enlargeIn == 0){
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }
  }
}

export { unzip }
