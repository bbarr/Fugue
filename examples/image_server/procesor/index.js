
import matcher from 'kismatch'
import modify from './modify'
let { types } = matcher

export default async (receive, send) => {
  let url = await receive('url')
  let modified = await modify(url)
  send('out', modified)
}
