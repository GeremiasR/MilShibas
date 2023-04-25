require('dotenv').config()
const Futures = require('../../services/Binance_Futures_Services') 
const CanalSsl = require('../../indicadores/CanalSsl')
const IndiceDeCanalDeMateriasPrimas = require('../../indicadores/IndiceDeCanalDeMateriasPrimas')
const RangoVerdaderoMedio = require('../../indicadores/RangoVerdaderoMedio')

//Inicio Constantes
const MARKET1 = 'DOGE'
const MARKET2 = 'USDT'
const MARKET = MARKET1 + MARKET2
const PERIODO = '1m'                // Periodos: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
const COSTO_OPERACION = 3           //Monto en USDT que se desea operar
const TIPO_MARGEN = "ISOLATED";
const APALANCAMIENTO = 20

const LONGITUD_SSL = 34

const LONGITUD_CCI = 20
const HIGH_CCI = 100
const LOW_CCI = -100

const LONGITUD_ATR_Stop = 14
const MULTIPLICADOR_ATR_stop = 2.5

const sleep = (timeMs) => new Promise(resolve => setTimeout(resolve, timeMs))
//Fin Constantes

class Scalping_Ssl_Cci_Atr{

    static async init(){
        await Futures.Apalancamiento(MARKET, APALANCAMIENTO)
        await Futures.MarginType(MARKET, TIPO_MARGEN)
        broadcast()
    }



}



//Inicio variables globales
var orden =  crearOrden('NULL', 0)
var velas = ''
var vela_actual = ''

var ssl
var tendencia = {
    actual: null,
    anterior: null
}

var cci = {
    actual: null,
    anterior: null
}
var señalCci = -1 // 1: Long, 0: Short, -1: Nada

var atrStopLoss
//Fin variables globales

async function broadcast() {
    
    while(true){
        try{
            velas =  await Futures.Candles(MARKET, PERIODO)
            if(velas){
                if(vela_actual[0] != velas[velas.length -2][0] || vela_actual === ''){
                    //Nueva vela
                    vela_actual = velas[velas.length -2]
                    //Verificamos no romper el Stop loss

                    //Calculamos ssl y en base a este la tendencia actual y anterior
                    ssl = CanalSsl.Simple(LONGITUD_SSL, velas)
                    definirTendencia()
                    //Calculamos el nuevo cci para identificar señales de entrada
                    cci.anterior = cci.actual
                    cci.actual = IndiceDeCanalDeMateriasPrimas.Simple(LONGITUD_CCI, velas)
                    definirSeñalCci()
                    if(tendencia.anterior != null && señalCci != -1){
                        logic() //Toda la logica iria acá
                    }
                    console.log('Stop loss superior: ' + atrStopLoss.superior)
                    console.log('Stop loss inferior: ' + atrStopLoss.inferior)
                    console.log('=====================================')
                }
            }            

        } catch (err) { }
        await sleep(process.env.SLEEP_TIME)
    }
}

async function logic(){
    let precioMercado = parseFloat(velas[velas.length-1][4])
    let cantidadOrden = tamañoOrden(COSTO_OPERACION, precioMercado, APALANCAMIENTO)
    if(orden.tipo === 'NULL'){  //No tengo una orden abierta
        if(señalCci == 1){
            if(tendencia.actual != tendencia.anterior && tendencia.actual){
                //COMPRAR
                await Futures.BuyLong(MARKET, cantidadOrden)
                orden = crearOrden('BUY/LONG', cantidadOrden)
                atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR_Stop, MULTIPLICADOR_ATR_stop, velas)
            }
        }
        if(señalCci == 0){
            if(tendencia.actual != tendencia.anterior && !tendencia.actual){
                //VENDER
                await Futures.SellShort(MARKET, cantidadOrden)
                orden = crearOrden('SELL/SHORT', cantidadOrden)
                atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR_Stop, MULTIPLICADOR_ATR_stop, velas)
            }
        }
    }else{                      //Tengo una orden abierta
        if(orden.tipo === 'BUY/LONG'){
            if(señalCci == 0){
                if(tendencia.actual != tendencia.anterior && !tendencia.actual){
                    //CERRAR COMPRA Y ABRIR UNA NUEVA VENTA
                    await Futures.CloseLongPosition(MARKET, orden.cantidad)
                    await Futures.SellShort(MARKET, cantidadOrden)
                    orden = crearOrden('SELL/SHORT', cantidadOrden)
                    atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR_Stop, MULTIPLICADOR_ATR_stop, velas)
                }
            }
            //Stop loss
            if(vela_actual[4] < atrStopLoss.inferior){
                await Futures.CloseLongPosition(MARKET, orden.cantidad)
                orden = crearOrden('NULL', 0)
            }
            
        }
        if(orden.tipo === 'SELL/SHORT'){
            if(señalCci == 1){
                if(tendencia.actual != tendencia.anterior && tendencia.actual){
                    //CERRAR VENTA Y ABRIR UNA NUEVA COMPRA
                    await Futures.CloseShortPosition(MARKET, orden.cantidad)
                    await Futures.BuyLong(MARKET, cantidadOrden)
                    orden = crearOrden('BUY/LONG', cantidadOrden)
                    atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR_Stop, MULTIPLICADOR_ATR_stop, velas)
                }
            }
            //Stop loss
            if(vela_actual[4] > atrStopLoss.superior){
                    await Futures.CloseShortPosition(MARKET, orden.cantidad)
                    orden = crearOrden('NULL', 0)
                }
        }
    }

}

function crearOrden(tipo, cantidad){
    const orden = {
        simbolo: MARKET,
        cantidad,
        tipo,
    }
    
    console.log(orden)
    return orden
}

function tamañoOrden(costoOperacion, precioMercado, apalancamiento){
    return Math.ceil((costoOperacion * apalancamiento) / precioMercado)
}

function definirTendencia(){

    tendencia.anterior = tendencia.actual
    if(parseFloat(vela_actual[4]) > ssl.avrgHigh && (!tendencia.anterior || tendencia.actual == null)){
        tendencia.actual = true
    }
    if(parseFloat(vela_actual[4]) < ssl.avrgLow && (tendencia.anterior || tendencia.actual == null)){
        tendencia.actual = false
    }

    console.log('Tendencia anterior: '+ tendencia.anterior + '\nTendencia actual: '+tendencia.actual)
}

function definirSeñalCci(){
    if(cci.anterior > HIGH_CCI && cci.actual < HIGH_CCI){
        señalCci = 0 //Señal de short
    }
    if(cci.anterior < LOW_CCI && cci.actual > LOW_CCI){
        señalCci = 1 //Señal de long
    }
}
module.exports = Scalping_Ssl_Cci_Atr