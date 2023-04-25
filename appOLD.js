
require('dotenv').config()
const Storage = require('node-storage')
const client = require('./services/binance')
const Futures = require('./services/Binance_Futures_Services') 
const MediaMovil = require('./indicadores/MediaMovil')
const Cci = require('./indicadores/IndiceDeCanalDeMateriasPrimas')
const SSL = require('./indicadores/CanalSsl')
const MARKET1 = 'BTC'
const MARKET2 = 'USDT'
const MARKET = MARKET1 + MARKET2
const PERIODO = '5m' // Periodos: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
const ORDER_AMOUNT = process.argv[2]
const LONGITUD_SSL = 15
const LONGITUD_MEDIA = 200
const LONGITUD_RSI = 2
const LONGITUD_ATR = 14
const LONGITUD_CCI = 40
console.log('__ Mercado: '+ MARKET + '\n__ Periodo: ' + PERIODO + '\n__ Tamaño de orden: ' + ORDER_AMOUNT + '\n__ Longitud ssL: ' + LONGITUD_SSL)

const store = new Storage(`./data/${MARKET}.json`)

const sleep = (timeMs) => new Promise(resolve => setTimeout(resolve, timeMs))

/*  INICIO VARIABLES GLOBALES    */
var fmPrice
var orden =  crearOrden('NULL', 0)
var mme = 0
var sslCh
var sslChLargoPlazo
var tendencia = -1 //tendencia alcista = 1, y tendencia bajista = 0, indefinida = -1
var tendenciaLargoPlazo = -1
var stoch = 0

var stopLoss = 0
/*  FIN VARIABLES GLOBALES    */


//Función que trae el balance de los futuros
async function balanceFuturos(){
    console.info(await client.futuresBalance() );
    console.info( await client.futuresCandles( MARKET, PERIODO));
}

//Retorna el balance de la cuenta del usuario
async function _balances(){
    return await client.balance()
}

// FUNCION DE COMPRA
async function futures_market_buy(){
    const res = await Futures.BuyLong(MARKET, ORDER_AMOUNT)
    stopLoss = sslCh.avrgLow
    //const x = await client.futuresMarketSell(MARKET, ORDER_AMOUNT, {reduceOnly: true, stopPrice: sslCh.avrgLow.toFixed(5), type: 'STOP_MARKET'})
    orden = crearOrden('BUY/LONG', fmPrice)
}

async function futures_market_sell(){
    const res = await Futures.SellShort(MARKET, ORDER_AMOUNT)
    stopLoss = sslCh.avrgHigh
    //const x = await client.futuresMarketBuy(MARKET, ORDER_AMOUNT, {reduceOnly: true ,stopPrice: sslCh.avrgHigh.toFixed(5), type: 'STOP_MARKET'})
    orden = crearOrden('SELL/SHORT', fmPrice)
}

async function close_short_position(){
    const res = await Futures.CloseShortPosition(MARKET, ORDER_AMOUNT)
    orden = crearOrden('NULL', 0)
}

async function close_long_position(){
    const res = await Futures.CloseLongPosition(MARKET, ORDER_AMOUNT)
    orden = crearOrden('NULL', 0)
}

//Monitoreo broadcast (empieza en la parte dos y continua en la 3)

async function broadcast() {
    while(true){
        try{
            await peticionVelas()
            //console.log('=====================================')
            if(orden.tipo !== 'NULL'){
                await stopLose()
            }else{
                await Futures.CancelAllOrders(MARKET)
            }
            futureMarketPrice = await Futures.Prices(MARKET)
            if(futureMarketPrice){
                fmPrice = futureMarketPrice
                console.log('Precio actual de futuros: ' + fmPrice)
                sslLogic()
            }
            console.log('=====================================')
            
        } catch (err) { }
        await sleep(process.env.SLEEP_TIME)
    }
}

// Peticiones de velas y operaciones necesarias con ellas

async function peticionVelas(){
    var velas = await Futures.Candles(MARKET, PERIODO)
    //console.log(velas[velas.length -1])
    //IndiceDeFuerzaRelativa.Simple(LONGITUD_RSI, velas)
    //RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR, velas, 1.6)
    Cci.Simple(LONGITUD_CCI, velas)
    console.log('aca tendria que ir el ssl')
    SSL.Simple(LONGITUD_SSL, velas)
    let vela_actual = velas[velas.length - 2]
    
    
    if(vela_actual[0] != sslCh.vela_actual[0]){
        mme = MediaMovil.Simple(LONGITUD_MEDIA, velas)
    }
    sslChLargoPlazo = sslAverages(parseInt(LONGITUD_MEDIA), velas)
    setTendenciaLargoPlazo()
    sslCh = sslAverages(parseInt(LONGITUD_SSL), velas)
    //stoch = Estocastico.Get(velas)
    //console.log('Estocastico K: '+ stoch.K.toFixed(2))
    //console.log('Estocastico D: '+ stoch.D.toFixed(2))
    imprimirIndicadorVelas()
}

function imprimirIndicadorVelas(){
    console.log('Media móvil exponencial: ' + mme.toFixed(8))
    console.log('Indicador ssl High: ' + sslCh.avrgHigh.toFixed(8))
    console.log('Indicador ssl Low: ' + sslCh.avrgLow.toFixed(8))
}
//Calculo de la media movil simple (Se debe usar para iniciar la media movil exponencial)
function mediaMovilSimple(longitud, velas){
    let start = velas.length - longitud -2
    let vela_actual = velas[start]
    let sum = 0    
    let mediaMovilSimple = 0
        for(var i = 1; i<= longitud; i++){   
            sum = sum + parseFloat(vela_actual[4]) // Precio de cierre
            vela_actual = velas[start +i]
        }
        mediaMovilSimple = sum / longitud
            // mme = (mme anterior) + K*[precio actual - mme anterior] // K = 2 / longitud+1
    return mediaMovilSimple
}

//Calculo de la Media movil exponencial
function mediaMovilExponencial(longitud, mediaMovilActual, precioActual){ // le damos la media "actual" para que nos devuelva la nueva
    const k = (2/(longitud+1))
    //console.log('Media movil actual: ' + mediaMovilActual)
    //console.log('Precio cierre actual: ' + precioActual)
    //let precioActual = parseFloat(sslCh.vela_actual[4])
    let mediaMovilExponencial = 0
    // mme = (mme anterior) + K*[precio actual - mme anterior] // K = 2 / longitud+1
    //mediaMovilExponencial = mediaMovilActual + k* ( precioActual - mediaMovilActual )
    mediaMovilExponencial = (precioActual*k) + (mediaMovilActual*(1-k))
    return mediaMovilExponencial
}

//por ahora la mejor aproximacion a la media movil exponencial que logré :c
function mediaInicial(longitud, velas){
    let start = (velas.length - longitud)-2
    let vela_iterar = velas[start]
    //let mediaExp = mediaMovilSimple((velas.length -longitud/2)-2, longitud/2, velas)
    let mediaExp = MediaMovil.Simple((velas.length -longitud/2)-2, longitud/2, velas)

    for(var i = 1; i<= longitud; i++){
        console.log(mediaExp)
        vela_iterar = velas[start+i]
        mediaExp = mediaMovilExponencial(longitud, mediaExp, parseFloat(vela_iterar[4]))
        
    }
    return mediaExp
}

//Funcion para calcular las medias del SSL, el argumento es la cantidad de velas anteriores que se tomarán
function sslAverages(longitud, velas){
        let start = (velas.length - longitud)-2
        let vela_iterar = velas[start]
        let vela_actual = velas[velas.length - 2]
        let sumHigh = 0
        let sumLow = 0
        let avrgHigh = 0
        let avrgLow = 0

    for(var i = 1; i<= longitud; i++){ 
        sumHigh = sumHigh + parseFloat(vela_iterar[2]) 
        sumLow = sumLow + parseFloat(vela_iterar[3]) 
        vela_iterar = velas[start + i]
    }

    avrgHigh = sumHigh / longitud
    avrgLow = sumLow / longitud

    const sslChannel = {
        avrgHigh,
        avrgLow,
        vela_actual,
    }

    return sslChannel
}

function limitesStopLose(longitud, velas){
    let vela_iterar
    let limites = {
        highest: 0,
        lowest: 0
    }
    for(var i = 2; i <= longitud +1 ; i++){   //Guardamos el más precio más alto y el más bajo de las ultimas *longitud* operaciones
        vela_iterar = velas[velas.length - i]
        if(parseFloat(vela_iterar[2] > limites.highest || limites.highest == 0)){
            limites.highest = parseFloat(vela_iterar[2])
        }
        if(parseFloat(vela_iterar[3] < limites.lowest || limites.lowest == 0)){
            limites.lowest = parseFloat(vela_iterar[3])
        }
    }
    return limites
}
//Toma de desiciones con SSL

async function sslLogic(){
    /*
    Cambios de tendencia:
            * Cuando el precio actual de mercado supera el precio promedio "avrgHigh"
                y veniamos a la baja tenemos un cambio positivo en la tendencia
            * Cuando el precio actual de mercado supera el precio promedio "avrgLow"
                y veniamos al alza tenemos un cambio negativo en la tendencia
    */

    //Comenzamos a operar
    console.log('---------------------')
    if(sslCh.vela_actual[1] > sslCh.vela_actual[4]){
        console.log('Vela roja')
        if(sslCh.vela_actual[4] < sslCh.avrgLow){ 
            if(tendencia == 1){                //Cambio de tendencia alcista a bajista

                //Acá debemos cerrar las operaciones de compra abiertas que nos generen beneficios
                if(orden.tipo === 'BUY/LONG' && beneficio() > 0){
                   console.log('Cerrar operaciones de compra')
                    await Futures.CloseLongPosition(MARKET, ORDER_AMOUNT)
                    orden = crearOrden('NULL', 0)
                }
                
                if(sslCh.vela_actual[4] < mme && orden.tipo === 'NULL' && limiteDeVenta(4)){
                    //Vender(Short)
                    console.log('Vender (Short)')
                    //await futures_market_sell(ORDER_AMOUNT)
                }
                //console.log('CAMBIO DE TENDENCIA, ESPERANDO CONFIRMACIÓN (Estocastico <= 20)')
            }
            tendencia = 0
        }
    }else if(sslCh.vela_actual[1] < sslCh.vela_actual[4]){
        console.log('Vela verde')
        if(sslCh.vela_actual[4] > sslCh.avrgHigh){ 
            if(tendencia == 0){               //Cambio de tendencia bajista a alcista
                //Acá debemos cerrar las operaciones de venta abiertas que nos generen beneficios
                if(orden.tipo === 'SELL/SHORT' && beneficio() < 0){
                    console.log('Cerrar operaciones de venta')
                    await Futures.CloseShortPosition(MARKET, ORDER_AMOUNT)
                    orden = crearOrden('NULL', 0)
                }
                
                if(sslCh.vela_actual[4] > mme && orden.tipo === 'NULL' && limiteDeCompra(4)){ // Acá definimos si podemos comprar en base a la media movil exponencial
                    //Comprar(Long)
                    console.log('Comprar(long)')
                    //await futures_market_buy(ORDER_AMOUNT)
                }
                //console.log('CAMBIO DE TENDENCIA, ESPERANDO CONFIRMACIÓN (Estocastico >= 80)')
            }
            tendencia = 1
        }
    }else{
        console.log('Vela neutra')
    }
    console.log('Tipo de Orden: ' + orden.tipo) 
    imprimirTendencia()

}

function setTendenciaLargoPlazo(){
    //if(sslChLargoPlazo.vela_actual[1] < sslChLargoPlazo.vela_actual[4]){
        //Vela verde
        if(sslChLargoPlazo.vela_actual[4] > sslChLargoPlazo.avrgHigh){
            tendenciaLargoPlazo = 1
        }
  //  }else if(sslChLargoPlazo.vela_actual[1] > sslChLargoPlazo.vela_actual[4]){
        //Vela roja
        if(sslChLargoPlazo.vela_actual[4] < sslChLargoPlazo.avrgLow){
            tendenciaLargoPlazo = 0
        }
//    }
    console.log("Tendencia a largo plazo: " + tendenciaLargoPlazo)
    console.log("*********************************")
}

function limiteDeCompra(porcentajeLimite){            // Objetivo: Limitar las compras y ventas dentro de cierto margen porcentual de cambio
    var x = sslCh.vela_actual[4] - sslCh.avrgHigh    //            para evitar riesgos de liquidaciones predecibles
    x = (x*100)/sslCh.avrgHigh
    if(x < porcentajeLimite){
        return true
    }else{
        return false
    }
}

function limiteDeVenta(porcentajeLimite){
    var x = sslCh.avrgLow - sslCh.vela_actual[4]
    x = (x*100)/sslCh.vela_actual[4]
    if(x < porcentajeLimite){
        return true
    }else{
        return false
    }
}

function beneficio(){
    let costoActual = (sslCh.vela_actual[4]* orden.cantidad)/20
    let costoOriginal = (orden.precio * orden.cantidad)/20  //Costo en USDT de los BTC teniendo en cuenta el apalancamiento de 20
    let beneficio = costoActual - costoOriginal
    return beneficio
}

function imprimirTendencia(){
    switch(tendencia){
        case 1:
            console.log('Tendencia: + Alza +')
            break
        case 0:
            console.log('Tendencia: - Baja -')
            break
        case -1:
            console.log('Tendencia: * Esperando *')
            break
    }
    console.log('Open: ' + sslCh.vela_actual[1])
    console.log('Close: ' + sslCh.vela_actual[4])
}

// Devuelve mis ordenes de futuros abiertas
async function openFutureOrders(){
    const ordenesAbiertas = await client.futuresOpenOrders(MARKET)

    console.log('Ordenes de futuros abiertas:');
    console.log(ordenesAbiertas)

}

//Crear orden de compra
function crearOrden(tipo, precio){
    const orden = {
        simbolo: MARKET,
        precio,
        cantidad: ORDER_AMOUNT,
        tipo,
    }
    
    console.log(orden)
    return orden
}

//Stop lose
async function stopLose(){
    console.log('Inicio funcion de Stop Lose')
    /*
    Si es una compra, se debe cerrar si: 
        El precio actual de mercado es un *porcentaje x* menor al de la orden listada.
    Si es una venta, se debe cerrar si:
        El precio actual de mercado es un *porcentaje x* mayor al de la orden listada.
    */
    let costoActual = (fmPrice* orden.cantidad)/20
    let costoOriginal = (orden.precio * orden.cantidad)/20  //Costo en USDT de los BTC teniendo en cuenta el apalancamiento de 20
    let resto = costoActual - costoOriginal
    let porcentaje = ((resto*100) / costoOriginal)*20
    console.log('Costo Actual: ' + costoActual.toFixed(4))
    console.log('Costo Original: ' + costoOriginal.toFixed(4))
    console.log('Diferencia Actual - Original: ' + resto.toFixed(4))
    console.log('Porcentaje: ' + porcentaje)

        if(orden.tipo === 'BUY/LONG' && sslCh.vela_actual[4] < stopLoss){ //cierre por debajo del avrgLow
            await Futures.CloseLongPosition(MARKET, ORDER_AMOUNT)
            orden = crearOrden('NULL', 0)
        }
        if(orden.tipo === 'SELL/SHORT' && sslCh.vela_actual[4] > stopLoss){ // cierre por arriba del avrgHig 
            await Futures.CloseShortPosition(MARKET, ORDER_AMOUNT)
            orden = crearOrden('NULL', 0)
        }
    
}


//Funcion de inicio del bot
async function init() {
        fmPrice = await Futures.Prices(MARKET)
    
        await Futures.Apalancamiento(MARKET, 20)
        
        await Futures.MarginType(MARKET, 'ISOLATED')
        await sleep(process.env.SLEEP_TIME)
        mme = 0
        sslCh = {
            avrgHigh: 0,
            avrgLow: 0,
            vela_actual: 0,
            }
        if(fmPrice){
            var velas = await Futures.Candles(MARKET, PERIODO)
            //mme = MediaMovil.Simple(LONGITUD_MEDIA, velas)
            //await futures_market_buy()
            //await futures_market_sell()
            //await client.futuresCancelAll(MARKET)
            broadcast()
            
        }
        //console.log(await ScalpingSsl.Start(MARKET, 20, 'ISOLATED'))
    

}
    //Hora de inicio y fin del trading, horario del 0 al 23
    function isHorario(apertura, cierre){
        var hora = parseInt(hoy.getHours())
        console.log(hora)
        if(hora >= apertura && hora <= cierre){
            return true
        }else{
            return false
        }
    }

init()


    //Orden devuelta por la API por un Sell(short) que canceló una posición de Compra(Long)
        /*[Object: null prototype] {
            orderId: 52443803799,
            symbol: 'BTCUSDT',
            status: 'NEW',
            clientOrderId: 'yrui8uJRYbN5QGChtg6oqi',
            price: '0',
            avgPrice: '0.00000',
            origQty: '0.001',
            executedQty: '0',
            cumQty: '0',
            cumQuote: '0',
            timeInForce: 'GTC',
            type: 'MARKET',
            reduceOnly: false,
            closePosition: false,
            side: 'SELL',
            positionSide: 'BOTH',
            stopPrice: '0',
            workingType: 'CONTRACT_PRICE',
            priceProtect: false,
            origType: 'MARKET',
            updateTime: 1651620486718
          }*/