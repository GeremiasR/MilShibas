
const PERIODOS = 5;
const SMOOTH = 3;
class Estocastico {
  static Get(velas){
    let estocastico= { D: 0, K: 0, Top: 80, Mid: 50, Bottom: 20 };
    let Candle ={
      Open_Time: 0,
      Open: 1,
      High: 2,
      Low: 3,
      Close :4,
      Volume :5,
      Close_Time : 6,
      QA_volume : 7,
      Trades : 8, // Number of trades
      Taker_Base : 9, // Taker buy base asset volume
      Taker_Quote : 10, // Taker buy quote asset volume
      Ignore : 11,
    }
    let acum_estocastico = [];
    for (let i = 0; i < PERIODOS; i++) {
      const precio_actual = parseFloat(
        velas[velas.length - (2 + i)][Candle.Close]
      );
      let precio_menor = precio_actual;
      let precio_mayor = 0;
      for (let index = 0; index < PERIODOS; index++) {
        precio_mayor =
          precio_mayor <
          parseFloat(velas[velas.length - (index + 2 + i)][Candle.High])
            ? parseFloat(velas[velas.length - (index + 2 + i)][Candle.High])
            : precio_mayor;
        precio_menor =
          precio_menor >
          parseFloat(velas[velas.length - (index + 2 + i)][Candle.Low])
            ? parseFloat(velas[velas.length - (index + 2 + i)][Candle.Low])
            : precio_menor;
      }
      const k =
        100 * ((precio_actual - precio_menor) / (precio_mayor - precio_menor));
      acum_estocastico.push(k);
    }
    let smooth_K = 0;
    for (let index = 0; index < SMOOTH; index++) {
        smooth_K = smooth_K + acum_estocastico[index]
    }
    estocastico.K = smooth_K / SMOOTH
    let smooth_D = 0;
    for (let i = 0; i < SMOOTH; i++) {
        let temp_k = 0
        for (let j = 0; j < SMOOTH; j++) {
            temp_k = temp_k + acum_estocastico[i+j]
        }
        smooth_D = smooth_D + temp_k / SMOOTH
    }
    estocastico.D = smooth_D / SMOOTH
    return estocastico;
  }
  
}

module.exports = Estocastico


/* El Oscilador Estocástico se mide usando las líneas %K y %D.

%K = 100 [(C – Ln) / (Hn – Ln)]

Donde:

C es el precio de cierre actual
Ln es el precio más bajo durante las últimas "n" sesiones de trading
Hn es el precio más alto durante las últimas "n" sesiones de trading
%D = es la media móvil de %K durante N períodos */
