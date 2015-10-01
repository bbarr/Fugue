
import R from 'ramda'
import { go, put, take, chan } from 'medium'
import kisschema from 'kisschema'

const PATTERN_INDEX = 0
const ACTION_INDEX = 1
const PATTERN_DEFINITION_LENGTH = 2

var patternTester = R.curry((pattern, data) => {
  var count = 0
  for (var key in pattern) {
    if (pattern.hasOwnProperty(key)) {
      if (pattern[key] !== data[key]) return 0
      count++
    }
  }
  return count
})

var chooseBestMatch = (matchingDefs, data) => {
  var dataPropCount = Object.keys(data).length
  return R.last(R.sortBy((def) => def[PATTERN_INDEX](data), matchingDefs))
}

var asPairs = R.splitEvery(PATTERN_DEFINITION_LENGTH)
var wrapPatternWithTester = R.adjust(patternTester, PATTERN_INDEX)
var processNewDefinitions = R.pipe(asPairs, R.map(wrapPatternWithTester))

var $ = {

  types: kisschema.types,
  definitions: [],

  define(...args) {
    $.definitions.push(...processNewDefinitions(args))
  },

  call(data) {
    var matchingDefs = $.definitions.filter((def) => def[PATTERN_INDEX](data))
    var best = chooseBestMatch(matchingDefs, data)
    return new Promise((res, rej) => res(best[ACTION_INDEX](data)))
  }
}

export default $
