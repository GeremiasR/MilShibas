class RangoVerdaderoMedio {
    //ATR Stop-Loss by garethyeo copy
    static StopLossGarethyeo(longitud, multiplicador, velas){
        let atrStopLoss = {
            superior: 0,
            inferior: 0
        }
        let indice_velaActual = 1
        let indice_velaAnterior = 0
        let vela_actual = velas[indice_velaActual]
        let vela_anterior = velas[indice_velaAnterior]
        let rangoVerdadero = 0
        let alpha = 1/longitud
        for(let i = 0; i < longitud; i++){
            rangoVerdadero = Math.max((vela_actual[2]-vela_actual[3]), (Math.abs(vela_actual[2] - vela_anterior[4]), (Math.abs(vela_actual[3]- vela_anterior[4]))))
            indice_velaActual++
            indice_velaAnterior++
            vela_actual = velas[indice_velaActual]
            vela_anterior = velas[indice_velaAnterior]
        }
        let rmaRV = rangoVerdadero
        for(let i = indice_velaActual; i<= velas.length -2; i++){
            rangoVerdadero = Math.max((vela_actual[2]-vela_actual[3]), (Math.abs(vela_actual[2] - vela_anterior[4]), (Math.abs(vela_actual[3]- vela_anterior[4]))))
            rmaRV = alpha * rangoVerdadero + (1 - alpha) * rmaRV
            
            atrStopLoss.superior = (parseFloat(vela_actual[4])  + rmaRV * multiplicador)
            atrStopLoss.inferior = (parseFloat(vela_actual[4])  - rmaRV * multiplicador)
            

            indice_velaActual++
            indice_velaAnterior++
            vela_actual = velas[indice_velaActual]
            vela_anterior = velas[indice_velaAnterior]
        }
        console.log('Stop loss superior: ' + atrStopLoss.superior)
        console.log('Stop loss inferior: ' + atrStopLoss.inferior)
        return atrStopLoss
    }
}

module.exports = RangoVerdaderoMedio