export default class Multiplier {
    constructor(base=1, factor=1, dynamicBaseFunctions=[], dynamicFactorFunctions=[]) {
        this.base = base;
        this.factor = factor;
        this.dynamicBaseFunctions = dynamicBaseFunctions
        this.dynamicFactorFunctions = dynamicFactorFunctions
    }

    addBase(x) {
        this.base += x;
    }

    multiplyFactor(x) {
        this.factor *= x;
    }

    addBaseFunction(f) {
        this.dynamicBaseFunctions.push(f);
    }

    addFactorFunction(f) {
        this.dynamicFactorFunctions.push(f);
    }

    calculate() {
        let x = 0;
        x += this.base;
        for (i in this.dynamicBaseFunctions) {x += this.dynamicBaseFunctions[i]()}
        x *= this.factor;
        for (i in this.dynamicFactorFunctions) {x *= this.dynamicFactorFunctions[i]()}
        return x;
    }
}