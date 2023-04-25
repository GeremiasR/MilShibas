require("dotenv").config();
const Futures = require("../../services/Binance_Futures_Services");
const IndiceDeFuerzaRelativa = require("../../indicadores/IndiceDeFuerzaRelativa");
const MediaMovil = require("../../indicadores/MediaMovil");
const rsiTIndicator = require("trading-indicator").rsi;
var RSI = require("technicalindicators").RSI;
/*        CONFIGURACIONES DE INICIO         */
const MARKET1 = "1000SHIB";
const MARKET2 = "BUSD";
const PERIODO = "1m"; // Periodos: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
const COSTO_OPERACION = 5; //Monto en USDT que se desea operar
const TIPO_MARGEN = "ISOLATED";
const APALANCAMIENTO = 10;
const PIRAMIDAR = 15;
const ORDER_FIX = 0;
const periodo1 = "3m"; // periodos para calculos
const periodo2 = "5m"; // de rsi's secundarios
const longitudRSI = 10;
const rsiOb = 70;
const rsiOs = 30;
var rsiBandaSuperiorAlternativa = 70; // se alternan en base a la tendencia
var rsiBandaInferiorAlternativa = 30;
const tiempoMedia = "1d";
const longitudMedia = 10;
/*       FIN CONFIGURACIONES DE INICIO         */

const MARKET = MARKET1 + MARKET2;
console.log(
  "__ Mercado: " +
    MARKET +
    "\n__ Periodo: " +
    PERIODO +
    "\n__ Costo operacion: " +
    COSTO_OPERACION +
    " " +
    MARKET2
);

const sleep = (timeMs) => new Promise((resolve) => setTimeout(resolve, timeMs));

/*  INICIO VARIABLES GLOBALES    */
//var orden =  crearOrden('NULL', 0)
var velas = "";
var velasTendencia = ""; //Velas para calculos
var velas2 = ""; //de rsi's secundarios
var velaAnterior;

var rsi = { anterior: 0, actual: 0 };
var rsi1 = { anterior: 0, actual: 0 };
var rsi2 = { anterior: 0, actual: 0 };
var htCrossLong;
var htCrossShort;
var señalDeCompra;
var señalDeVenta;

var rsiBandaSuperior = rsiOb;
var rsiBandaInferior = rsiOs;
var media = 0;

/*       CONFIGURACIONES DE INICIO ESPECIAL         */
var piramidadoActual = 0;
var cantidadOrdenesLong = 0; //orden acumulativa
var cantidadOrdenesShort = 0; //orden acumulativa DEBE COMENZAR EN CERO SI NO HAY POSICIONES ABIERTAS

/*       FIN CONFIGURACIONES DE INICIO ESPECIAL         */

/*  FIN VARIABLES GLOBALES    */

class MTF_Layered_rsi {
  static async init() {
    await Futures.Apalancamiento(MARKET, APALANCAMIENTO);
    await Futures.MarginType(MARKET, TIPO_MARGEN);

    broadcast();
  }
}

async function broadcast() {
  //Es necesario iniciar los rsi anteriores a partir de los arrays para que no opere erroneamente en el primer bucle
  let arrayRsi;
  let arrayRsi1;
  let arrayRsi2;
  try {
    const velas1 = await Futures.Candles(MARKET, PERIODO);
    const velas2 = await Futures.Candles(MARKET, periodo1);
    const velas3 = await Futures.Candles(MARKET, periodo2);

    rsi = IndiceDeFuerzaRelativa.Simple(10, velas1);
    rsi1 = IndiceDeFuerzaRelativa.Simple(10, velas2);
    rsi2 = IndiceDeFuerzaRelativa.Simple(10, velas3);
  } catch (err) {}

  console.log("*** INICIO DEL BUCLE ***");
  console.log("=====================================");
  while (true) {
    ImprimirInfo();
    try {
      velas = await Futures.Candles(MARKET, PERIODO);
      //velasTendencia = await Futures.Candles(MARKET, tiempoMedia);
      //if (velas && velasTendencia) {
      if (velas) {
        if (VelasDiferentes(velaAnterior, velas[velas.length - 2][0])) {
          velaAnterior = velas[velas.length - 2][0];
          //media = MediaMovil.Simple(longitudMedia, velasTendencia);

          /* if (parseFloat(velas[velas.length - 2][4]) < media) {
            rsiBandaSuperior = rsiBandaSuperiorAlternativa;
            rsiBandaInferior = rsiOs;
          }
          if (parseFloat(velas[velas.length - 2][4]) > media) {
            rsiBandaInferior = rsiBandaInferiorAlternativa;
            rsiBandaSuperior = rsiOb;
          } */

          logic(); //Toda la logica iria acá

          const velas_2 = await Futures.Candles(MARKET, periodo1);
          const velas_3 = await Futures.Candles(MARKET, periodo2);
          rsi = IndiceDeFuerzaRelativa.Simple(10, velas);
          rsi1 = IndiceDeFuerzaRelativa.Simple(10, velas_2);
          rsi2 = IndiceDeFuerzaRelativa.Simple(10, velas_3);
          console.log(rsi.anterior, rsi1.anterior, rsi2.anterior);
          if (arrayRsi && arrayRsi1 && arrayRsi2) {
            rsi.anterior = rsi.actual;
            rsi.actual = arrayRsi[arrayRsi.length - 2];
            rsi1.anterior = rsi1.actual;
            rsi1.actual = arrayRsi1[arrayRsi1.length - 2];
            rsi2.anterior = rsi2.actual;
            rsi2.actual = arrayRsi2[arrayRsi2.length - 2];
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
    await sleep(process.env.SLEEP_TIME);
  }
}

async function logic() {
  let precioMercado = parseFloat(velas[velas.length - 1][4]);
  let cantidadOrden = tamañoOrden(
    COSTO_OPERACION,
    precioMercado,
    APALANCAMIENTO,
    ORDER_FIX
  );

  if (
    (CruzaHaciaArriba(rsi1.actual, rsi1.anterior, rsiBandaInferior) &&
      rsi2.actual > rsiBandaInferior &&
      rsi.actual > rsiBandaInferior) ||
    (CruzaHaciaArriba(rsi2.actual, rsi2.anterior, rsiBandaInferior) &&
      rsi1.actual > rsiBandaInferior &&
      rsi.actual > rsiBandaInferior)
  ) {
    htCrossLong = true;
  } else {
    htCrossLong = false;
  }

  if (
    (CruzaHaciaAbajo(rsi1.actual, rsi1.anterior, rsiBandaSuperior) &&
      rsi2.actual < rsiBandaSuperior &&
      rsi.actual < rsiBandaSuperior) ||
    (CruzaHaciaAbajo(rsi2.actual, rsi2.anterior, rsiBandaSuperior) &&
      rsi1.actual < rsiBandaSuperior &&
      rsi.actual < rsiBandaSuperior)
  ) {
    htCrossShort = true;
  } else {
    htCrossShort = false;
  }

  if (
    (CruzaHaciaArriba(rsi.actual, rsi.anterior, rsiBandaInferior) &&
      rsi1.actual < rsiBandaInferior &&
      rsi2.actual < rsiBandaInferior) ||
    htCrossLong
  ) {
    señalDeCompra = true;
  } else {
    señalDeCompra = false;
  }

  if (
    (CruzaHaciaAbajo(rsi.actual, rsi.anterior, rsiBandaSuperior) &&
      rsi1.actual > rsiBandaSuperior &&
      rsi2.actual > rsiBandaSuperior) ||
    htCrossShort
  ) {
    señalDeVenta = true;
  } else {
    señalDeVenta = false;
  }

  if (señalDeCompra) {
    if (cantidadOrdenesShort > 0) {
      console.log("Cerrar Short");
      console.log(
        await Futures.CloseShortPosition(MARKET, cantidadOrdenesShort)
      );
      cantidadOrdenesShort = 0;
      piramidadoActual = 0;
    }
    if (piramidadoActual < PIRAMIDAR) {
      console.log("Comprar (Long)");
      console.log(await Futures.BuyLong(MARKET, cantidadOrden));
      cantidadOrdenesLong = parseFloat(
        (cantidadOrdenesLong + cantidadOrden).toFixed(ORDER_FIX)
      );
      piramidadoActual++;
      ImprimirInfo();
    }
  }
  if (señalDeVenta) {
    if (cantidadOrdenesLong > 0) {
      console.log("Cerrar Long");
      console.log(await Futures.CloseLongPosition(MARKET, cantidadOrdenesLong));
      cantidadOrdenesLong = 0;
      piramidadoActual = 0;
    }
    if (piramidadoActual < PIRAMIDAR) {
      console.log("Vender (Short)");
      console.log(await Futures.SellShort(MARKET, cantidadOrden));
      cantidadOrdenesShort = parseFloat(
        (cantidadOrdenesShort + cantidadOrden).toFixed(ORDER_FIX)
      );
      piramidadoActual++;
      ImprimirInfo();
    }
  }
  htCrossLong = false;
  señalDeCompra = false;
  htCrossShort = false;
  señalDeVenta = false;
}

function crearOrden(tipo, cantidad) {
  const orden = {
    simbolo: MARKET,
    cantidad,
    tipo,
  };

  console.log(orden);
  return orden;
}
function tamañoOrden(costoOperacion, precioMercado, apalancamiento, fix) {
  return parseFloat(
    ((costoOperacion * apalancamiento) / precioMercado).toFixed(fix)
  );
}

function CruzaHaciaArriba(valor_actual, valor_anterior, banda) {
  if (valor_actual > banda && valor_anterior <= banda) {
    return true;
  } else {
    return false;
  }
}

function CruzaHaciaAbajo(valor_actual, valor_anterior, banda) {
  if (valor_actual < banda && valor_anterior >= banda) {
    return true;
  } else {
    return false;
  }
}

function VelasDiferentes(velaAnterior, velaActual) {
  if (velaActual != velaAnterior) {
    return true;
  } else {
    return false;
  }
}

function ImprimirInfo() {
  console.log("RSI  actual: " + rsi.actual + "  RSI anterior: " + rsi.anterior);
  console.log(
    "RSI1 actual: " + rsi1.actual + "   RSI1 anterior: " + rsi1.anterior
  );
  console.log(
    "RSI2 actual: " + rsi2.actual + "  RSI2 anterior: " + rsi2.anterior
  );
  console.log("Ordenes compradas(long): " + cantidadOrdenesLong);
  console.log("Ordenes vendidas(Short): " + cantidadOrdenesShort);
  console.log("Piramidado actual: " + piramidadoActual);
  console.log(
    "HTCrossLong: " + htCrossLong + "  HTCrossShort: " + htCrossShort
  );
  console.log(
    "Señal de compra: " + señalDeCompra + "  Señal de Venta: " + señalDeVenta
  );
  console.log("Media: " + media);
  console.log(
    "Bandas actuales: " + rsiBandaSuperior + " // " + rsiBandaInferior
  );
  console.log("**********************************");
  console.log("**********************************");
}

module.exports = MTF_Layered_rsi;
