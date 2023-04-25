class IndiceDeCanalDeMateriasPrimas{
// CCI, Comodity channel index
    static Simple(longitud, velas){
        console.log('---INICIO CCI---')
        let indice_velaActual = velas.length - 2
        let vela_actual = velas[indice_velaActual]
        let hlc3Medio = 0
        let hlc3Aux = 0
        let hlc3 = []
        let desviacion = 0
        let indiceMateriasPrimas = 0

        // calculamos la media
        for (let i = 0; i < longitud; i++) { 
            vela_actual = velas[indice_velaActual]
            hlc3Aux = (parseFloat(vela_actual[2]) + parseFloat(vela_actual[3]) + parseFloat(vela_actual[4]))/3 // (high + low + close)/3
            hlc3.push(hlc3Aux)
            hlc3Medio += hlc3Aux
            indice_velaActual--
        }
        hlc3Medio = hlc3Medio/longitud

        //calculamos la desviacion media
        for (let i = 0; i < longitud; i++) {
            desviacion += Math.abs(hlc3[i] - hlc3Medio)
            
        }
        desviacion = desviacion/longitud

        //calculamos el indice
        indiceMateriasPrimas = ((hlc3[0] - hlc3Medio) / (0.015 * desviacion)).toFixed(2)
        console.log('Indice materias primas: ' + indiceMateriasPrimas)
        console.log('---FIN CCI---')
        return indiceMateriasPrimas
    }

}

module.exports = IndiceDeCanalDeMateriasPrimas