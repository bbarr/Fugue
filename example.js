
import $ from './lib/index'
import iron_mq from 'iron_mq'

var imq = new iron_mq.Client({ token: 'Gns7iHNVP5AzAoiwxCIwWPQeiOI', project_id: '55c2742c74c57e0006000083' })
var q = imq.queue('calculations')
q.get({}, (e, body) => {
  console.log('body', body, e)
})

$.define(

  { cmd: 'add' },
  ({ a, b }) => a + b,

  { cmd: 'subtract' },
  ({ a, b }) => a - b,

  { cmd: 'divide' },
  ({ a, b }) => a / b,

  { cmd: 'divide', b: 0 },
  ({ a }) => new Error(`Attempting to divide ${a} by 0`),

  { cmd: 'multiply' },
  ({ a, b }) => a * b
)
