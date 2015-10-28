
import R from 'ramda'
import Jimp from 'jimp'
import request from 'request'

export default (id) => {

  var urlToBuffer = (url) => {
    return new Promise((res) => {
      request({ uri: url, encoding: null, method: 'GET' }, (e, resp, body) => res(body))
    })
  }

  var bufferToImage = (buffer) => {
    return new Promise((res) => new Jimp(buffer, (e, img) => res(img)))
  }

  var imageToBuffer = (img, mime) => {
    return new Promise((res) => {
      img.getBuffer(mime, (e, buffer) => res(buffer))
    })
  }

  var getMime = (url) => {
    var ext = getExt(url)
    switch (ext) {
      case 'jpg': return Jimp.MIME_JPEG;
      case 'jpeg': return Jimp.MIME_JPEG;
      case 'png': return Jimp.MIME_PNG;
    }
  }

  var getExt = (url) => R.last(url.split('.'))

  var updateProp = (key, updater) => ((obj) => R.merge(obj, { [key]: updater(obj[key]) }))

  var duckType = (x) => /^\d+$/.test(x) ? parseInt(x, 10) : x
  var prepMods = R.pipe(
    R.split('.'),
    R.map(R.pipe(R.split('_'), R.map(duckType)))
  )

  var parseId = R.pipe(
    R.split('&'),
    R.map(R.split('=')),
    R.fromPairs,
    updateProp('mods', prepMods)
  )

  var applyMod = (tgt, mod) => tgt[mod[0]].apply(tgt, mod.slice(1))

  var go = async function() {
    var req = parseId(id)
    var ext = getExt(req.src)
    var mime = getMime(req.src)
    var buffer = await urlToBuffer(req.src)
    var original = await bufferToImage(buffer)
    var modified = req.mods.reduce(applyMod, original)
    return await imageToBuffer(modified, mime)
  }

  return go().then(function(buffer) {
    return { id, buffer }
  }, function(e) {
    console.log('ERROR', e)
  })

}
