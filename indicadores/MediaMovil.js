class MediaMovil {
    static Simple(longitud, velas) {
        let start = velas.length - longitud - 1
        let vela_actual = velas[start]
        let sum = 0
        let mediaMovilSimple = 0
        for (var i = 1; i <= longitud; i++) {
            sum = sum + parseFloat(vela_actual[4]) // Precio de cierre
            vela_actual = velas[start + i]
        }
        mediaMovilSimple = (sum / longitud).toFixed(5)
        // mme = (mme anterior) + K*[precio actual - mme anterior] // K = 2 / longitud+1
        //console.log("Media movil de " + longitud + " periodos: "+ mediaMovilSimple)
        return mediaMovilSimple
    }


}

module.exports = MediaMovil