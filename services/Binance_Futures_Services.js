const client = require('./binance')

class BinanceFuturesServices {
    static async Prices(MARKET) {
        var x = await client.futuresPrices(MARKET)
        x = x[MARKET]
        return parseFloat(x)
    }

    static async Apalancamiento(MARKET, value){
        return await client.futuresLeverage( MARKET, value)
    }

    static async MarginType(MARKET, tipo){
       return await client.futuresMarginType( MARKET, tipo) 
    }
    
    static async Candles(MARKET, PERIODO){
        return await client.futuresCandles(MARKET, PERIODO)
    }
    
    static async CancelAllOrders(MARKET){
        return await client.futuresCancelAll(MARKET)
    }
    
    static async BuyLong(MARKET, ORDER_AMOUNT){
        console.log('+++ Compra +++')
        const res = await client.futuresMarketBuy(MARKET, ORDER_AMOUNT)
        //await client.futuresMarketSell(MARKET, ORDER_AMOUNT, {reduceOnly: true, stopPrice: stopLoss, type: 'STOP_MARKET'})
        return res
    }

    static async SellShort(MARKET, ORDER_AMOUNT){
        console.log('--- Venta ---')
        const res = await client.futuresMarketSell( MARKET, ORDER_AMOUNT)
        //await client.futuresMarketBuy(MARKET, ORDER_AMOUNT, {reduceOnly: true ,stopPrice: stopLoss, type: 'STOP_MARKET'})
        return res
    }
    
    static async CloseShortPosition(MARKET, ORDER_AMOUNT){
        console.log('Cierre de short')
        return await client.futuresMarketBuy(MARKET, ORDER_AMOUNT, {reduceOnly: true})
    }

    static async CloseLongPosition(MARKET, ORDER_AMOUNT){
        console.log('Cierre de long')
        return await client.futuresMarketSell(MARKET, ORDER_AMOUNT, {reduceOnly: true})
    }

    static async LimitShort(MARKET, ORDER_AMOUNT, PRICE){
        console.log('limit short')
        return await client.futuresSell(MARKET, ORDER_AMOUNT, PRICE)
    }

    static async LimitLong(MARKET, ORDER_AMOUNT, PRICE){
        console.log('limit long')
        let msg = await client.futuresBuy(MARKET, ORDER_AMOUNT,PRICE)
        console.log(msg)
        return msg
    }

    static async CloseLimitShortPosition(MARKET, ORDER_AMOUNT, PRICE, type){ // type: 'TAKE_PROFIT_MARKET' || STOP_MARKET
        console.log('Close limit short')
        let msg = await client.futuresBuy(MARKET, ORDER_AMOUNT, 0,{type: type, reduceOnly: true, stopPrice: PRICE})
        console.log(msg)
        return msg
    }

    static async CloseLimitLongPosition(MARKET, ORDER_AMOUNT, PRICE, type){ // type: 'TAKE_PROFIT_MARKET' || STOP_MARKET
        console.log('Close limit long')
        return await client.futuresSell(MARKET, ORDER_AMOUNT, 0,{type: type, reduceOnly: true, stopPrice: PRICE})
    }

    static async GetOpenPositions(){
        let position_data = await client.futuresPositionRisk(), markets = Object.keys( position_data );
        let listaPosiciones = []
        for ( let market of markets ) {
            let obj = position_data[market], size = Number( obj.positionAmt );
            if ( size == 0 ) continue;
            listaPosiciones.push(obj)
            //console.info( obj ); //positionAmt entryPrice markPrice unRealizedProfit liquidationPrice leverage marginType isolatedMargin isAutoAddMargin maxNotionalValue
        }
        return listaPosiciones
    }

    static async GetFuturesOpenOrders(MARKET){
        let msg = await client.futuresOpenOrders( MARKET )
        console.log(msg)
        return msg
    }
    /* Retorno de GetOpenPosition() cuando hay una posicion abierta
    [Object: null prototype] {
    symbol: 'BTCUSDT',
    positionAmt: '-0.003',
    entryPrice: '19407.1',
    markPrice: '19358.25450403',
    unRealizedProfit: '0.14653648',
    liquidationPrice: '20291.83138446',
    leverage: '20',
    maxNotionalValue: '10000000',
    marginType: 'isolated',
    isolatedMargin: '3.04423261',
    isAutoAddMargin: 'false',
    positionSide: 'BOTH',
    notional: '-58.07476351',
    isolatedWallet: '2.89769613',
    updateTime: 1657665902793
    } 
    */
    /* Retorno de open orders
    [
  [Object: null prototype] {
    orderId: 62636418722,
    symbol: 'BTCUSDT',
    status: 'NEW',
    clientOrderId: 'electron_waoXGFEFO5JubHdOg3Ly',
    price: '0',
    avgPrice: '0',
    origQty: '0',
    executedQty: '0',
    cumQuote: '0',
    timeInForce: 'GTE_GTC',
    type: 'TAKE_PROFIT_MARKET',
    reduceOnly: true,
    closePosition: true,
    side: 'BUY',
    positionSide: 'BOTH',
    stopPrice: '19649',
    workingType: 'MARK_PRICE',
    priceProtect: false,
    origType: 'TAKE_PROFIT_MARKET',
    time: 1657735756928,
    updateTime: 1657735756928
  },
  [Object: null prototype] {
    orderId: 62636418734,
    symbol: 'BTCUSDT',
    status: 'NEW',
    clientOrderId: 'electron_6lmjBOulpAiKFTgf6rWl',
    price: '0',
    avgPrice: '0',
    origQty: '0',
    executedQty: '0',
    cumQuote: '0',
    timeInForce: 'GTE_GTC',
    type: 'STOP_MARKET',
    reduceOnly: true,
    closePosition: true,
    side: 'BUY',
    positionSide: 'BOTH',
    stopPrice: '19815',
    workingType: 'MARK_PRICE',
    priceProtect: false,
    origType: 'STOP_MARKET',
    time: 1657735756931,
    updateTime: 1657735756931
  }
] 
*/
}

module.exports = BinanceFuturesServices


//export default new BinanceFuturesServices()