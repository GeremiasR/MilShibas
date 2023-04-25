require('dotenv').config()
const Futures = require('./services/Binance_Futures_Services') 
const MediaMovil = require('./indicadores/MediaMovil')
const IndiceDeFuerzaRelativa = require('./indicadores/IndiceDeFuerzaRelativa')
const RangoVerdaderoMedio = require('./indicadores/RangoVerdaderoMedio')

const MARKET1 = 'DOGE'
const MARKET2 = 'USDT'
const MARKET = MARKET1 + MARKET2
const PERIODO = '30m'                // Periodos: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
const COSTO_OPERACION = 3            //Monto en USDT que se desea operar
const TIPO_MARGEN = "ISOLATED";
const APALANCAMIENTO = 20
const longitudMediaLarga = 200
const longitudMediaCorta = 5

const longitudRSI = 2
const rsiBandaSuperior = 80
const rsiBandaInferior = 20

const longitud_ATR_Stop = 14
const multiplicador_ATR_stop = 1.6


console.log('__ Mercado: '+ MARKET + '\n__ Periodo: ' + PERIODO + '\n__ Costo operacion: ' + COSTO_OPERACION + ' ' + MARKET2)

const sleep = (timeMs) => new Promise(resolve => setTimeout(resolve, timeMs))
/*  INICIO VARIABLES GLOBALES    */
var orden =  crearOrden('NULL', 0)
var velas = ''
var mediaMovilLarga = 0
var mediaMovilCorta = 0

var rsi
var atrStopLoss
/*  FIN VARIABLES GLOBALES    */

async function broadcast() {
    
    while(true){
        try{
            velas =  await Futures.Candles(MARKET, PERIODO)
            if(velas){
                mediaMovilLarga = MediaMovil.Simple(longitudMediaLarga, velas)
                mediaMovilCorta = MediaMovil.Simple(longitudMediaCorta, velas)
                console.log('Media larga: ' + mediaMovilLarga)
                console.log('Media corta: ' + mediaMovilCorta)
                rsi = IndiceDeFuerzaRelativa.Simple(longitudRSI, velas)
            }            
            logic() //Toda la logica iria acá
            
            console.log('=====================================')
            
        } catch (err) { }
        await sleep(process.env.SLEEP_TIME)
    }
}

async function logic(){
    let precioMercado = parseFloat(velas[velas.length-1][4])
    let vela_actual = velas[velas.length - 2]
    let cierreVelaActual = parseFloat(vela_actual[4]) 
    let cantidadOrden = tamañoOrden(COSTO_OPERACION, precioMercado, APALANCAMIENTO)
    console.log('Tamaño de las ordenes: ' + cantidadOrden)
    if(orden.tipo === 'NULL'){ //si no tengo una orden hecha
        if(cierreVelaActual > mediaMovilLarga){ //Solo Longs/Compras
            if(cierreVelaActual < mediaMovilCorta){
                if(señalDeCompraRsi()){
                    //LONG COMPRAR
                    console.log('Comprar(long)')
                    await Futures.BuyLong(MARKET, cantidadOrden)
                    orden = crearOrden('BUY/LONG', cantidadOrden)
                    atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(longitud_ATR_Stop, multiplicador_ATR_stop, velas)
                }
            }
        }
        if(cierreVelaActual < mediaMovilLarga){ //Solo Shorts/Ventas
            if(cierreVelaActual > mediaMovilCorta){
                if(señalDeVentaRsi()){
                    //SHORT VENDER
                    console.log('Vender (Short)')
                    await Futures.SellShort(MARKET, cantidadOrden)
                    orden = crearOrden('SELL/SHORT', cantidadOrden)
                    atrStopLoss = RangoVerdaderoMedio.StopLossGarethyeo(longitud_ATR_Stop, multiplicador_ATR_stop, velas)
                }
            }
        }
    }else{ //Tengo una orden abierta
        if(orden.tipo === 'BUY/LONG'){
            if(parseFloat(vela_actual[4]) > mediaMovilCorta || parseFloat(vela_actual[4]) < atrStopLoss.inferior){ //Condicion: de cierre de compra || stoploss
                await Futures.CloseLongPosition(MARKET, orden.cantidad)
                orden = crearOrden('NULL', 0)
            }
        }
        if(orden.tipo === 'SELL/SHORT'){
            if(parseFloat(vela_actual[4]) < mediaMovilCorta || parseFloat(vela_actual[4]) > atrStopLoss.superior){ //Condicion: cierre de venta || stoploss
                await Futures.CloseShortPosition(MARKET, orden.cantidad)
                orden = crearOrden('NULL', 0)
            }
        }
    }
}

function señalDeVentaRsi(){
    if(rsi.anterior > rsiBandaSuperior && rsi.actual < rsiBandaSuperior){//señal de venta
        return true
    }else{
        return false
    }
}

function señalDeCompraRsi(){
    if(rsi.anterior < rsiBandaInferior && rsi.actual > rsiBandaInferior){//señal de compra
        return true
    }else{
        return false
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

async function init(){
    await Futures.Apalancamiento(MARKET, APALANCAMIENTO)
    await Futures.MarginType(MARKET, TIPO_MARGEN)

    broadcast()
}

init()