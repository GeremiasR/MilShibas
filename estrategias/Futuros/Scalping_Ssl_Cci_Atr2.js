require('dotenv').config()
const Futures = require('../../services/Binance_Futures_Services') 
const CanalSsl = require('../../indicadores/CanalSsl')
const IndiceDeCanalDeMateriasPrimas = require('../../indicadores/IndiceDeCanalDeMateriasPrimas')
const RangoVerdaderoMedio = require('../../indicadores/RangoVerdaderoMedio')
const MediaMovil = require('../../indicadores/MediaMovil')
//Inicio Constantes
const MARKET1 = 'BTC'
const MARKET2 = 'USDT'
const MARKET = MARKET1 + MARKET2
const PERIODO = '1m'                // Periodos: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
const COSTO_OPERACION = 3           //Monto en USDT que se desea operar
const ORDER_FIX = 3                 //Numero de decimales en la orden ()
const TIPO_MARGEN = "ISOLATED";
const APALANCAMIENTO = 20

const LONGITUD_SSL = 20

const LONGITUD_CCI = 40
const HIGH_CCI = 100
const LOW_CCI = -100

const LONGITUD_ATR_Stop = 14
const MULTIPLICADOR_ATR_stop = 2.5

const LONGITUD_MMA = 497

const sleep = (timeMs) => new Promise(resolve => setTimeout(resolve, timeMs))
//Fin Constantes

class Scalping_Ssl_Cci_Atr2{

    static async init(){
        console.log('SCAL2')
        await Futures.Apalancamiento(MARKET, APALANCAMIENTO)
        await Futures.MarginType(MARKET, TIPO_MARGEN)
        broadcast()
    }



}



//Inicio variables globales
var orden =  crearOrden('NULL', 0, 0)
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

var mma = 0
//Fin variables globales

async function broadcast() {
    while(true){
        try{
            velas =  await Futures.Candles(MARKET, PERIODO)
            if(velas){
                if(vela_actual[0] != velas[velas.length -2][0] || vela_actual === ''){
                    console.log("===========================")
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
                    mma = MediaMovil.Simple(LONGITUD_MMA, velas) //Media movil simple para identificar tendencia a largo plazo
                    
                    if(tendencia.anterior != null && señalCci != -1){
                        logic() //Toda la logica iria acá
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
    if(orden.tipo === 'NULL'){  //No tengo una orden abierta
        if(señalCci == 1){
            if(tendencia.actual != tendencia.anterior && tendencia.actual && vela_actual[4] > mma){
                //COMPRAR
                await Futures.BuyLong(MARKET, cantidadOrden)
                orden = crearOrden('BUY/LONG', cantidadOrden, precioMercado)
                atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR_Stop, MULTIPLICADOR_ATR_stop, velas)
            }
        }
        if(señalCci == 0){
            if(tendencia.actual != tendencia.anterior && !tendencia.actual && vela_actual[4] < mma){
                //VENDER
                await Futures.SellShort(MARKET, cantidadOrden)
                orden = crearOrden('SELL/SHORT', cantidadOrden, precioMercado)
                atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(LONGITUD_ATR_Stop, MULTIPLICADOR_ATR_stop, velas)
            }
        }
    }else{                      //Tengo una orden abierta
        if(orden.tipo === 'BUY/LONG'){
            if(señalCci == 0){
                if(tendencia.actual != tendencia.anterior && !tendencia.actual && isBeneficio()){
                    //CERRAR COMPRA
                    await Futures.CloseLongPosition(MARKET, orden.cantidad)
                    orden = crearOrden('NULL', 0, 0)
                    señalCci = -1
                }
            }
            //Stop loss
            if(vela_actual[4] < atrStopLoss.inferior){
                await Futures.CloseLongPosition(MARKET, orden.cantidad)
                orden = crearOrden('NULL', 0, 0)
                señalCci = -1
            }
            
        }
        if(orden.tipo === 'SELL/SHORT'){
            if(señalCci == 1){
                if(tendencia.actual != tendencia.anterior && tendencia.actual && isBeneficio()){
                    //CERRAR VENTA
                    await Futures.CloseShortPosition(MARKET, orden.cantidad)
                    orden = crearOrden('NULL', 0, 0)
                    señalCci = -1
                }
            }
            //Stop loss
            if(vela_actual[4] > atrStopLoss.superior){
                    await Futures.CloseShortPosition(MARKET, orden.cantidad)
                    orden = crearOrden('NULL', 0, 0)
                    señalCci = -1
            }
        }
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

function tamañoOrden(costoOperacion, precioMercado, apalancamiento, fix){
    return ((costoOperacion * apalancamiento) / precioMercado).toFixed(fix)
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

function isBeneficio(){
    if(orden.tipo === 'BUY/LONG'){
        if(vela_actual[4] >= atrStopLoss.superior){
            return true
        }else{
            return false
        }
    }
    if(orden.tipo === 'SELL/SHORT'){
        if(vela_actual[4] <= atrStopLoss.inferior){
            return true
        }else{
            return false
        }
    }
    return false
}
module.exports = Scalping_Ssl_Cci_Atr2