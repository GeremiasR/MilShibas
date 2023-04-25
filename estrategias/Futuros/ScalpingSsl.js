const Futures = require("../../services/Binance_Futures_Services")

class ScalpingSsl {
  price;
  mme;
  static async Start(MARKET, APALANCAMIENTO, TIPO_MARGEN) {
    this.price = await Futures.Prices(MARKET);
    const res = await Futures.Apalancamiento(MARKET, APALANCAMIENTO);
    const res2 = await Futures.MarginType(MARKET, TIPO_MARGEN);
    console.log(res, res2);
    if(this.price){
        return this.price
    }
  }
}

module.exports = ScalpingSsl;
