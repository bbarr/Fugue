
import matcher from 'kismatch'
var { types } = matcher

var cache = {}

var api = {

  set: async (receive, send) => {

    var key = await receive('key')
    var val = await receive('val')

    cache[key] = val
    console.log('cache set!', key, val)
    send('ok', val)
  },

  get: async (receive, send) => {

    var key = await receive('key')
    console.log('get got key')

    if (cache[key]) send('found', cache[key])
    else send('notFound', key)
  }
}

export default api
