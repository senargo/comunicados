class StringHelper {
  constructor(stringValue) {
    this.value = stringValue;
  }

  static firstAndLastWord(string) {
    if(!string || typeof string !== 'string') {
      return '';
    }
    const words = string.trim().split(' ');
    if (words.length <= 2) {
      return string;
    }
    const first = words[0];
    const last = words[words.length - 1];
    return `${first} ${last}`;
  }
}