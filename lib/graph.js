
import { sleep, go, take, put, chan } from 'medium'
import { types } from './lib/matcher'

var run = (def, scope) => {

  var nodes = def.nodes.map((n) => scope[n.name])

  var liveNodes = nodes.map((node) => {
    var input = chan()
    var output = chan()
    var process = node()
    return { process, input, output }
  })

  var listenedTo = def.connections.map(([ src, dest ]) => {

    var [ srcI, srcFlag ] = src
    var [ destI, destFlag ] = dest

    go(async () => {
      while (true) {
        var x = await take(liveNodes[srcI].input)
        var result = await liveNodes[srcI].process(x)
        await put(liveNodes[srcI].output, result)
      }
    })

    go(async () => {
      while (true) {
        var x = await take(liveNodes[srcI].output)
        // ensure we always match output type, else keep trying
        if (x[0] !== srcFlag) {
          put(liveNodes[srcI].output, x)
          continue
        }
        var mod = [ destFlag ].concat(x.slice(1))
        await put(liveNodes[destI].input, mod)
      }
    })

    go (async () => {
      while (true) {
        var x = await take(liveNodes[destI].input)
        var result = await liveNodes[destI].process(x)
        await put(liveNodes[destI].output, result)
      }
    })

    return srcI
  })

  var output = chan()
  var sinks = liveNodes.filter((_, i) => listenedTo.indexOf(i) === -1)
  sinks.forEach((sink) => {
    go(async () => {
      while (true) {
        var x = await take(sink.output)
        await put(output, x)
      }
    })
  })

  var input = chan()
  go(async () => {
    while (true) {
      var data = await take(input)   
      await put(liveNodes[0].input, data)
    }
  })

  return { input, output }
}

var json = {
  nodes: [
    { name: 'cacheGetter' },
    { name: 'imageProcessor' },
    { name: 'cacheSetter' },
    { name: 'output' }
  ],
  connections: [
    [ [ 0, { found: false } ], [ 1 ] ],
    [ [ 0, { found: true } ], [ 3 ] ],
    [ [ 1 ], [ 2 ] ],
    [ [ 2 ], [ 3 ] ]
  ]
}

var sub = run({
  nodes: [ 
    { name: 'analyzer' },
    { name: 'pngResizer' },
    { name: 'jpgResizer' }
  ], 
  connections: [
    [ [ 0, 'JPG' ], [ 2, 'IN' ] ],
    [ [ 0, 'PNG' ], [ 2, 'IN' ] ]
  ]
}, {
  analyzer() {
    return matcher(
      types.string,
      (url) => {
        var jpg = Math.random() > .5
        return { mime: jpg ? 'JPG' : 'PNG', url: url + '+analyzed' }
      }
    )
  },
  jpgResizer() {
    return matcher(
      types.string,
      async (url) => {
        await sleep(1000)
        return url + '+resized-jpg'
      }
    )
  },
  pngResizer() {
    return matcher(
      types.string,
      async (url) => {
        await sleep(1000)
        return url + '+resized-png'
      }
    )
  }
})

var cache = {}

var scope = {

  cacheGetter() {
    return matcher(
      types.string,
      (url) => {
        return cache[url] ? 
          { found: true, url: url, img: cache[url] } : 
          { found: false, url }
      }
    )
  },

  output() {
    return (data) => data
  },

  cacheSetter() {
    return matcher(
      { url: types.string, buffer: types.object },
      ({ url, buffer }) => {
        cache[url] = buffer
        return { url, buffer }
      }
    )
  },

  imageProcessor() {
    return matcher(
      types.string,
      async (url) => {
        await put(sub.input, url)
        var processedUrl = await take(sub.output)
        return { url: processedUrl, buffer: { src: processedUrl } }
      }
    )
  }
}

var processImage = run(json, scope)

go(async () => {
  var i = 0
  while (i++ < 10) {
    console.log('FINAL OUT: ', await take(processImage.output))
    await sleep(1000)
    put(processImage.input, { url: 'some/url' } ])
  }
})

go(async () => {
  await put(processImage.input, { url: 'some/url/2' })
})
