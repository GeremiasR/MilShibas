class IndiceDeFuerzaRelativa {

    static Simple(longitud, velas) {
        let indice_velaActual = 1
        let indice_velaAnterior = 0

        let vela_actual = velas[indice_velaActual]
        let vela_anterior = velas[indice_velaAnterior]

        let ganancia = 0
        let perdida = 0

        
        let alpha = 1/longitud
        let rsi = {
            actual: 0,
            anterior: 0
        }        
        let gananciaMedia = 0
        let perdidaMedia = 0
        
        for(let i  = 1; i < longitud; i++){
            if(parseFloat(vela_actual[4]) > parseFloat(vela_anterior[4])){
                ganancia += parseFloat(vela_actual[4])-parseFloat(vela_anterior[4])
            }else{
                perdida += parseFloat(vela_anterior[4]) - parseFloat(vela_actual[4])
            }
            indice_velaAnterior++
            indice_velaActual++
            vela_anterior = velas[indice_velaAnterior]
            vela_actual = velas[indice_velaActual]
            
        }
        gananciaMedia = ganancia/longitud
        perdidaMedia = perdida/longitud

        for (let i = indice_velaActual; i <= velas.length-2; i++) {   
            if(parseFloat(vela_actual[4]) > parseFloat(vela_anterior[4])){
                gananciaMedia = alpha* (parseFloat(vela_actual[4])-parseFloat(vela_anterior[4])) + (1-alpha) * gananciaMedia
                perdidaMedia = alpha* (0) + (1-alpha) * perdidaMedia
            }else if(parseFloat(vela_actual[4]) < parseFloat(vela_anterior[4])){
                perdidaMedia = alpha* (parseFloat(vela_anterior[4]) - parseFloat(vela_actual[4])) + (1-alpha) * perdidaMedia
                gananciaMedia = alpha* (0) + (1-alpha) * gananciaMedia
            }
            
            if(perdidaMedia == 0){
                rsi.actual = 100
            }else if(gananciaMedia == 0){
                rsi.actual = 0
            }else{
                rsi.actual = 100 - 100 / (1+ gananciaMedia / perdidaMedia)
            }
            if(indice_velaActual < velas.length-2){
                rsi.anterior = rsi.actual
            }
            indice_velaAnterior++
            indice_velaActual++
            vela_anterior = velas[indice_velaAnterior]
            vela_actual = velas[indice_velaActual]
            
        }
        //console.log('rsi anterior: ' + rsi.anterior)
        //console.log('rsi actual: ' + rsi.actual)
        //console.log('*+*+*+*+*+*+*+*+*+*+*')
        return rsi
    }

}

module.exports = IndiceDeFuerzaRelativa