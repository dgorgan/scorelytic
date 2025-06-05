'use strict';

// Object.assign() polyfill
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, 'assign', {
    value: function assign(target, varArgs) {
      // .length of function is 2
      'use strict';
      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true,
  });
}

// Array.prototype.includes() polyfill
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function (searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      // 1. Let O be ? ToObject(this value).
      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n ≥ 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(searchElement, elementK) is true, return true.
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        // c. Increase k by 1.
        k++;
      }

      // 8. Return false
      return false;
    },
  });
}

// String.prototype.includes() polyfill
if (!String.prototype.includes) {
  String.prototype.includes = function (search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }

    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

window.SimpleMaskPercent = (function () {
  var _args = {
    prefix: '',
    suffix: '',
    fixed: true,
    fractionDigits: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
    autoCompleteDecimal: false,
    emptyOrInvalid: function emptyOrInvalid() {
      return window.SimpleMaskPercent.args.fixed
        ? '0' + window.SimpleMaskPercent.args.decimalSeparator + '00'
        : '_' + window.SimpleMaskPercent.args.decimalSeparator + '__';
    },
  };

  return {
    get args() {
      return _args;
    },
    set args(value) {
      _args = Object.assign(_args, value);
      _args.prefix = value.prefix || value.preffix;
    },

    onlyNumber: function onlyNumber(value) {
      var retorno = '';

      for (var i = 0; i < value.length; i++) {
        if (isFinite(value[i])) {
          retorno += value[i];
        }
      }

      return retorno;
    },

    addingPrefix: function addingPrefix(value) {
      return '' + window.SimpleMaskPercent.args.prefix + value;
    },
    removingPrefix: function removingPrefix(value) {
      return value.replace(window.SimpleMaskPercent.args.prefix, '');
    },

    addingSuffix: function addingSuffix(value) {
      return '' + value + window.SimpleMaskPercent.args.suffix;
    },
    removingSuffix: function removingSuffix(value) {
      if (
        value.includes(
          window.SimpleMaskPercent.args.suffix,
          value.length - window.SimpleMaskPercent.args.fractionDigits,
        )
      ) {
        value = value.replace(window.SimpleMaskPercent.args.suffix, '');
      } else {
        value = value.substring(0, value.length - 1);
      }
      return value;
    },

    addingCompleterFromStart: function addingCompleterFromStart(value, completer) {
      while (value.length < window.SimpleMaskPercent.args.fractionDigits) {
        value = '' + completer + value;
      }
      return value;
    },

    addingCompleterFromEnd: function addingCompleterFromEnd(value, completer) {
      while (value.length < window.SimpleMaskPercent.args.fractionDigits) {
        value = '' + value + completer;
      }
      return value;
    },

    removingCompleterFromStart: function removingCompleterFromStart(value, completer) {
      while (value[0] === completer) {
        value = value.replace(completer, '');
      }
      return value;
    },

    removingCompleterFromEnd: function removingCompleterFromEnd(value, completer) {
      while (value[value.length - 1] === completer) {
        value = value.substring(0, value.length - 1);
      }
      return value;
    },

    addingAutoComplete: function addingAutoComplete(value) {
      var n = '' + value + window.SimpleMaskPercent.addingCompleterFromEnd('', '0');
      return n;
    },

    autoComplete: function autoComplete(value) {
      var array =
        value.match(new RegExp('\\' + window.SimpleMaskPercent.args.decimalSeparator, 'g')) || [];
      if (array.length > 1) {
        value = window.SimpleMaskPercent.addingAutoComplete(value);
      }
      return value;
    },

    addingDecimalSeparator: function addingDecimalSeparator(value, completer, separator) {
      var length = value.length - window.SimpleMaskPercent.args.fractionDigits;

      var regexpFraction = void 0;
      var decimals = '$1';
      var dezenas = completer;
      var character = isFinite(completer) ? 'd' : 'w';

      regexpFraction =
        '(\\' + character + '{' + window.SimpleMaskPercent.args.fractionDigits + '})';
      if (length > 0) {
        regexpFraction = '(\\' + character + '{' + length + '})' + regexpFraction;
        dezenas = decimals;
        decimals = '$2';
      }

      return value.replace(new RegExp(regexpFraction), '' + dezenas + separator + decimals);
    },

    addingHundredsSeparator: function addingHundredsSeparator(value) {
      var size = value.length - window.SimpleMaskPercent.args.fractionDigits;
      var hundreds = Math.ceil(size / 3);
      var regexpHundreds = '(\\d)';

      var replacement = window.SimpleMaskPercent.args.decimalSeparator + '$' + (hundreds + 1);

      for (var i = hundreds; i !== 0; i--) {
        if (size >= 3) {
          regexpHundreds = '(\\d{3})' + regexpHundreds;
          size -= 3;
        } else {
          regexpHundreds = '(\\d{' + size + '})' + regexpHundreds;
        }

        if (i > 1) {
          replacement = window.SimpleMaskPercent.args.thousandsSeparator + '$' + i + replacement;
        } else {
          replacement = '$' + i + replacement;
        }
      }

      return value.replace(new RegExp(regexpHundreds), replacement);
    },
    removeSeparator: function removeSeparator(value, separator) {
      return value.replace(new RegExp('\\' + separator, 'g'), '');
    },
    formatDecimal: function formatDecimal(value, completer, separator) {
      value = window.SimpleMaskPercent.addingCompleterFromStart(value, completer);
      value = window.SimpleMaskPercent.addingDecimalSeparator(value, completer, separator);
      return value;
    },

    textToNumber: function textToNumber(input) {
      var retorno = input.toString();
      var completer = window.SimpleMaskPercent.args.fixed ? '0' : '_';

      if (window.SimpleMaskPercent.args.prefix) {
        retorno = window.SimpleMaskPercent.removingPrefix(retorno);
      }

      if (window.SimpleMaskPercent.args.suffix) {
        retorno = window.SimpleMaskPercent.removingSuffix(retorno);
      }

      if (window.SimpleMaskPercent.args.autoCompleteDecimal) {
        retorno = window.SimpleMaskPercent.autoComplete(retorno);
      }

      retorno = window.SimpleMaskPercent.removeSeparator(
        retorno,
        window.SimpleMaskPercent.args.thousandsSeparator,
      );
      retorno = window.SimpleMaskPercent.removeSeparator(
        retorno,
        window.SimpleMaskPercent.args.decimalSeparator,
      );

      retorno = window.SimpleMaskPercent.onlyNumber(retorno);

      retorno = window.SimpleMaskPercent.removingCompleterFromStart(retorno, completer);

      return retorno || (window.SimpleMaskPercent.args.fixed ? '0' : '');
    },

    numberToText: function numberToText(input) {
      var retorno = window.SimpleMaskPercent.args.emptyOrInvalid();

      if (parseFloat(input) !== 'NaN') {
        if (input.length <= window.SimpleMaskPercent.args.fractionDigits) {
          retorno = window.SimpleMaskPercent.formatDecimal(
            input,
            window.SimpleMaskPercent.args.fixed ? '0' : '_',
            window.SimpleMaskPercent.args.decimalSeparator,
          );
        } else {
          retorno = window.SimpleMaskPercent.addingHundredsSeparator(input);
        }
      }

      if (window.SimpleMaskPercent.args.prefix) {
        retorno = window.SimpleMaskPercent.addingPrefix(retorno);
      }
      if (window.SimpleMaskPercent.args.suffix) {
        retorno = window.SimpleMaskPercent.addingSuffix(retorno);
      }

      return retorno;
    },

    format: function format(value) {
      return window.SimpleMaskPercent.numberToText(window.SimpleMaskPercent.textToNumber(value));
    },

    formatToNumber: function formatToNumber(input) {
      var retorno = '0';
      var value = window.SimpleMaskPercent.textToNumber(input);

      if (parseFloat(value) !== 'NaN') {
        if (value.length <= window.SimpleMaskPercent.args.fractionDigits) {
          value = window.SimpleMaskPercent.formatDecimal(value, '0', '.');
        } else {
          var lengthWithoutDecimals = value.length - window.SimpleMaskPercent.args.fractionDigits;
          value = value.replace(
            new RegExp(
              '(\\d{' +
                lengthWithoutDecimals +
                '})(\\d{' +
                window.SimpleMaskPercent.args.fractionDigits +
                '})',
            ),
            '$1.$2',
          );
        }

        retorno = value;
      }

      return parseFloat(retorno);
    },

    setMask: function setMask(element, args) {
      var input = typeof element == 'string' ? document.querySelector(element) : element;

      if (args) {
        window.SimpleMaskPercent.args = args;
      }

      input.addEventListener('input', function () {
        input.value = window.SimpleMaskPercent.format(input.value);
      });
      input['formatToNumber'] = function () {
        return window.SimpleMaskPercent.formatToNumber(input.value);
      };

      return input;
    },
  };
})();
