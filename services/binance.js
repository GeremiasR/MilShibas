const Binance = require('node-binance-api')
const client = new Binance().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,
    recvWindow: 6000
})

module.exports = client