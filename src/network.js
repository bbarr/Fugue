
import { sleep, go, take, put, chan } from 'medium'
import match from 'kismatch'
import path from 'path'
import R from 'ramda'

let isF = R.is(Function)
let asCh = (obj, key) => obj[key] || (obj[key] = chan())

let getExecutable = (componentConfig, locals, rootDir) => {

  if (locals[componentConfig.name]) return locals[componentConfig.name]

  if (componentConfig.value) return null

  if (componentConfig.importPath) {
    let required = require(path.join(rootDir, componentConfig.importPath))
    if (componentConfig.key) return required[componentConfig.key]
    else return required
  }

  return new Error('Could not find executable for component with config: ', componentConfig)
}

let createNode = (fn) => {

  let ins = {}
  let outs = {}
  let active = false

  let send = (key, val) => put(asCh(outs, key), val)
  let receive = key => take(asCh(ins, key))

  let toReceive = (k, v) => put(asCh(ins, k), v)
  let fromSend = (k) => take(asCh(outs, k))

  go(async () => {
    while (true) {
      await fn(receive, send)
    }
  })

  return { toReceive, fromSend, outs, ins }
}

let createNamedNode = (name, fn) => {
  let node = createNode(fn)
  node.name = name
  return node
}

let api = {

  node: createNode,

  compose: (a, b, connections) => {

    let n1 = isF(a) ? createNode(a) : a
    let n2 = isF(b) ? createNode(b) : b

    let taps = []
    let tap = (fn) => taps = taps.concat([ fn ])
    let untap = (fn) => taps = taps.filter((t) => t !== fn)

    connections.forEach(([ n1p, n2p ]) => {
      go(async () => {
        while (true) {
          let n1v = await n1.fromSend(n1p)
          taps.forEach((fn) => fn(n1v, n1, n2, n1p, n2p))
          n2.toReceive(n2p, n1v)
        }
      })
    }) 

    return { toReceive: n1.toReceive, fromSend: n2.fromSend, tap, untap }
  },

  network: (config, locals, opts={}) => {

    let instaSend = async (r, s) => s('out', await r('in'))
    let __in__ = createNamedNode('__in__', instaSend)
    let __out__ = createNamedNode('__out__', instaSend)

    let nodes = [__in__, __out__ ].concat(
      config.components.map((n) => {
        let fn = getExecutable(n, locals, opts.dir)
        return createNamedNode(n.name, fn)
      })
    )

    let nodeMap = nodes.reduce((map, n) => R.assoc(n.name, n, map), {})
    let composed = {}

    config.connections.forEach(([ src, dest ]) => {

      let [ srcName, srcChanName ] = src.split('.')
      let [ destName, destChanName ] = dest.split('.')

      if (composed[src]) {
        composed[src].tap((val) => nodeMap[destName].toReceive(destChanName, val))
      } else {
        composed[src] = api.compose(
          nodeMap[srcName], 
          nodeMap[destName], 
          [ [ srcChanName, destChanName ] ]
        )
      }
    })

    return { toReceive: nodeMap.__in__.toReceive, fromSend: nodeMap.__out__.fromSend }
  }
}

export default api
