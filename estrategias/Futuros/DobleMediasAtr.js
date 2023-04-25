require('dotenv').config()
const Futures = require('../../services/Binance_Futures_Services') 
const MediaMovil = require('../../indicadores/MediaMovil')
const RangoVerdaderoMedio = require('../../indicadores/RangoVerdaderoMedio')

/* Inicio constantes */

const MARKET1 = 'BTC'
const MARKET2 = 'USDT'
const MARKET = MARKET1 + MARKET2
const PERIODO = '1m'                // Periodos: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
const COSTO_OPERACION = 3           //Monto en USDT que se desea operar
const ORDER_FIX = 3                 //Numero de decimales en la orden ()
const TIPO_MARGEN = "ISOLATED";
const APALANCAMIENTO = 20

const LONGITUD_MA_LARGA = 200
const LONGITUD_MA_CORTA = 14
const tamañoListaMA = 5

const LONGITUD_ATR = 14
const MULTIPLICADOR_ATR_stop = 2.5
const MULTIPLICADOR_ATR_take = 5 // take/stop = risk reward ratio Aproximadamente

const market_type ={
    stop: "STOP_MARKET",
    take: "TAKE_PROFIT_MARKET"
}
const sleep = (timeMs) => new Promise(resolve => setTimeout(resolve, timeMs))
/* Fin constantes */

class DobleMediasAtr{

    static async init(){
        console.log('Doble medias Atr')
        lista_ma_corta = iniciarArray(tamañoListaMA)
        lista_ma_larga = iniciarArray(tamañoListaMA)
        //await Futures.GetOpenPosition()
        await Futures.Apalancamiento(MARKET, APALANCAMIENTO)
        await Futures.MarginType(MARKET, TIPO_MARGEN)
        //console.log(await Futures.GetOpenPositions())
        //await Futures.GetFuturesOpenOrders(MARKET)
        broadcast()
    }

}


/* Inicio variables */
var orden =  crearOrden('NULL', 0, 0)
var velas = ''
var vela_actual = ''

var ma_larga = 0
var ma_corta = 0

var lista_ma_larga = []
var lista_ma_corta = []

var atrStopLoss
var atrTakeProfit

var tendencia= {
    larga: null,
    corta: null
}

var cuentaVelas = 0
var maximoCuentaVelas = 4

/* Fin variables */

async function broadcast() {
    while(true){
        try{
            velas =  await Futures.Candles(MARKET, PERIODO)
            if(velas){
                if(vela_actual[0] != velas[velas.length -2][0] || vela_actual === ''){
                    console.log("===========================")
                    //Nueva vela
                    vela_actual = velas[velas.length -2]
                    //Calculo las nuevas medias
                    
                    ma_corta = parseFloat(MediaMovil.Simple(LONGITUD_MA_CORTA, velas))  //Media movil simple para identificar tendencia a corto plazo
                    ma_larga = parseFloat(MediaMovil.Simple(LONGITUD_MA_LARGA, velas)) 
                    ma_corta = parseFloat(ma_corta.toFixed(2))
                    ma_larga = parseFloat(ma_larga.toFixed(2))
                    //Actualizo listas de medias
                    lista_ma_corta = pushMa(ma_corta, lista_ma_corta)
                    lista_ma_larga = pushMa(ma_larga, lista_ma_larga)
                    if(lista_ma_corta[0] != null && lista_ma_larga[0] != null){ //Ya puedo definir la tendencia
                        //Calculo las tendencias
                        definirTendencia()
                        //Ejecuto la estrategia
                        logic() //Toda la logica
                    }
                    console.log("===========================")
                }
            }            

        } catch (err) { }
        await sleep(process.env.SLEEP_TIME)
    }
}

async function logic(){
    let precioMercado = parseFloat(velas[velas.length-1][4])
    let cantidadOrden = tamañoOrden(COSTO_OPERACION, precioMercado, APALANCAMIENTO, ORDER_FIX)
    let listaPosiciones = await Futures.GetOpenPositions()
    if(listaPosiciones.length == 0){
        orden = crearOrden('NULL', 0, 0)
        await Futures.CancelAllOrders(MARKET)
        cuentaVelas = 0
    }
    if(orden.tipo === 'NULL'){  //No tengo una orden abierta
        if(ma_corta > ma_larga && lista_ma_corta[tamañoListaMA-2] < lista_ma_larga[tamañoListaMA-2] && parseFloat(vela_actual[4]) > ma_larga){
            if(tendencia.corta && tendencia.larga ){
                //COMPRAR
                await Futures.BuyLong(MARKET, cantidadOrden)
                orden = crearOrden('BUY/LONG', cantidadOrden, precioMercado)
                atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR, MULTIPLICADOR_ATR_stop, velas)
                atrTakeProfit = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR, MULTIPLICADOR_ATR_take, velas)
                await Futures.CloseLimitLongPosition(MARKET, cantidadOrden,parseFloat(atrTakeProfit.superior.toFixed(1)), market_type.take)
                await Futures.CloseLimitLongPosition(MARKET, cantidadOrden, parseFloat(atrStopLoss.inferior.toFixed(1)), market_type.stop)
            }
        }
        if(ma_corta < ma_larga && lista_ma_corta[tamañoListaMA-2] > lista_ma_larga[tamañoListaMA-2] && parseFloat(vela_actual[4]) < ma_larga){
            if(!tendencia.corta && !tendencia.larga){
                //VENDER
                await Futures.SellShort(MARKET, cantidadOrden)
                orden = crearOrden('SELL/SHORT', cantidadOrden, precioMercado)
                atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR, MULTIPLICADOR_ATR_stop, velas)
                atrTakeProfit = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR, MULTIPLICADOR_ATR_take, velas)
                await Futures.CloseLimitShortPosition(MARKET, cantidadOrden, parseFloat(atrTakeProfit.inferior.toFixed(1)), market_type.take)
                await Futures.CloseLimitShortPosition(MARKET, cantidadOrden, parseFloat(atrStopLoss.superior.toFixed(1)), market_type.stop)
            }
        }
    }else{                      //Tengo una orden abierta
        /* if(orden.tipo === 'BUY/LONG'){
            //Stop loss
            if(vela_actual[4] < ma_larga){
                cuentaVelas++
                if(cuentaVelas > maximoCuentaVelas){
                    await Futures.CloseLongPosition(MARKET, orden.cantidad)
                    orden = crearOrden('NULL', 0, 0)
                    await Futures.CancelAllOrders(MARKET)
                }
            }else{
                cuentaVelas = 0
            }
            
        }
        if(orden.tipo === 'SELL/SHORT'){
            //Stop loss
            if(vela_actual[4] > ma_larga){
                cuentaVelas++
                if(cuentaVelas > maximoCuentaVelas){
                    await Futures.CloseShortPosition(MARKET, orden.cantidad)
                    orden = crearOrden('NULL', 0, 0)
                    await Futures.CancelAllOrders(MARKET)
                }
            }else{
                cuentaVelas = 0
            }
        } */
    }

}

function crearOrden(tipo, cantidad, precio){
    const orden = {
        simbolo: MARKET,
        cantidad,
        tipo,
        precio
    }
    
    return orden
}

function definirTendencia(){
    if(lista_ma_larga[lista_ma_larga.length-1] > lista_ma_larga[0]){
        tendencia.larga = true
    }else if(lista_ma_larga[lista_ma_larga.length-1] < lista_ma_larga[0]){
        tendencia.larga = false
    }
    if(lista_ma_corta[lista_ma_corta.length-1] > lista_ma_corta[0]){
        tendencia.corta = true
    }else if(lista_ma_corta[lista_ma_corta.length-1] < lista_ma_corta[0]){
        tendencia.corta = false
    }
}

function iniciarArray(n){
    let x = []
    for (let i = 0; i < n; i++) {
        x.push(null)
    }
    return x
}

function pushMa(nuevoElemento, antiguaLista){
    let nuevaLista = antiguaLista.slice(1, antiguaLista.length)
    nuevaLista.push(nuevoElemento)
    return nuevaLista
}

function tamañoOrden(costoOperacion, precioMercado, apalancamiento, fix){
    return ((costoOperacion * apalancamiento) / precioMercado).toFixed(fix)
}

module.exports = DobleMediasAtr