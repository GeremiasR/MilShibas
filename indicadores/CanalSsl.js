class CanalSsl{
    static Simple(longitud, velas){
        console.log('---INICIO SSL---')
        let indice_velaActual = velas.length - 2
        let vela_iterar = velas[indice_velaActual]
        let vela_actual = velas[velas.length - 2]
        let sumHigh = 0
        let sumLow = 0
        let avrgHigh = 0
        let avrgLow = 0

        for(var i = 0; i< longitud; i++){ 
            sumHigh = sumHigh + parseFloat(vela_iterar[2]) 
            sumLow = sumLow + parseFloat(vela_iterar[3])
            indice_velaActual--
            vela_iterar = velas[indice_velaActual]
        }

        avrgHigh = (sumHigh / longitud).toFixed(5)
        avrgLow = (sumLow / longitud).toFixed(5)

        let sslChannel = {
            avrgHigh,
            avrgLow,
        }
        console.log('Ssl High: '+ sslChannel.avrgHigh + '\nSsl Low: ' + sslChannel.avrgLow)
        console.log('---FIN SSL---')

        return sslChannel
    }
}

module.exports = CanalSsl