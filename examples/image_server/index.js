
import { node, compose, network } from '../../src/network'

import imageProcessor from './procesor'
import cache from './cache'

var config = {

  components: [
    { 
      name: 'readCache',
      importPath: './cache',
      key: 'get'
    },
    {
      name: 'writeCache',
      importPath: './cache',
      key: 'set'
    },
    {
      name: 'imageProcessor',
      importPath: './procesor'
    }
  ],

  connections: [
    [ '__in__.out', 'readCache.key' ],
    [ '__in__.out', 'writeCache.key' ],
    [ 'readCache.found', '__out__.in' ],
    [ 'readCache.notFound', 'imageProcessor.url' ],
    [ 'imageProcessor.out', '__out__.in' ],
    [ 'imageProcessor.out', 'writeCache.val' ]
  ]
}

var processImage = network(config, {
  fanOut: {

  }
}, { dir: __dirname })

var demo = async () => {

  var url = 'src=http://www.jpaulmorrison.com/fbp/images/FBP_representation_of_3_function_calls.png&mods=resize_10_10'

  processImage.toReceive('in', url)
  console.log('OUT: ', await processImage.fromSend('out'))
  processImage.toReceive('in', url)
  console.log('OUT: ', await processImage.fromSend('out'))
}

demo()
