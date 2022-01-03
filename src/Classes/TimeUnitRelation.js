import Multiplier from "./Multiplier";
import TimeUnit from "./TimeUnit";

export default class TimeUnitRelation {
    constructor(fromUnit=new TimeUnit(), toUnit=new TimeUnit(), basePer=1, currentPer=1, increasePer=0, multiplier=new Multiplier(), exponent=new Multiplier()) {
        this.fromUnit = fromUnit
        this.toUnit = toUnit
        this.basePer = basePer
        this.currentPer = currentPer
        this.increasePer = increasePer
        this.multiplier = multiplier
        this.exponent = exponent
    }

    convert() {
        let increase = Math.floor(Math.pow(this.fromUnit.value / this.currentPer * this.toUnit.multiplier.calculate(), this.toUnit.exponent.calculate()))
        this.toUnit.value += increase
        this.toUnit.total += increase
        this.fromUnit.value %= this.currentPer
        this.currentPer += Math.pow(increase * this.increasePer * this.multiplier.calculate(), this.exponent.calculate())
    }

    getRatio() {
        return this.currentPer / this.basePer
    }
}