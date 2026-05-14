import { createPinePlugin } from '@simahfud/pine-to-kline'
const pineAPI = createPinePlugin()
const res = pineAPI.compile(`//@version=5
indicator("My Custom SMA", overlay=true)
length = input.int(14, "Length")
plot(ta.sma(close, length), "SMA", color=color.blue, linewidth=2)
`)
console.log(JSON.stringify(res, null, 2))
