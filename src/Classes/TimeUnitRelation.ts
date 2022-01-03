import Multiplier from "./Multiplier";
import TimeUnit from "./TimeUnit";

export default class TimeUnitRelation {
    fromUnit: TimeUnit;
    toUnit: TimeUnit;
    basePer: number;
    currentPer: number;
    increasePer: number;
    multiplier: Multiplier;
    exponent: Multiplier;

    constructor(fromUnit=new TimeUnit(), toUnit=new TimeUnit(), basePer=1, currentPer=1, increasePer=0, multiplier=new Multiplier(), exponent=new Multiplier()) {
        this.fromUnit = fromUnit
        this.toUnit = toUnit
        this.basePer = basePer
        this.currentPer = currentPer
        this.increasePer = increasePer
        this.multiplier = multiplier
        this.exponent = exponent
    }

    convert(): void {
        let increase = Math.floor(Math.pow(this.fromUnit.value / this.currentPer * this.toUnit.multiplier.calculate(), this.toUnit.exponent.calculate()))
        this.toUnit.value += increase
        this.toUnit.total += increase
        this.fromUnit.value %= this.currentPer
        this.currentPer += Math.pow(increase * this.increasePer * this.multiplier.calculate(), this.exponent.calculate())
    }

    getRatio(): number {
        return this.currentPer / this.basePer
    }
}