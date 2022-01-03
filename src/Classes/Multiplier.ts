export default class Multiplier {
    base: number;
    factor: number;
    dynamicBaseFunctions: { (): number; }[];
    dynamicFactorFunctions: { (): number; }[];

    constructor(base=1, factor=1, dynamicBaseFunctions=[], dynamicFactorFunctions=[]) {
        this.base = base;
        this.factor = factor;
        this.dynamicBaseFunctions = dynamicBaseFunctions;
        this.dynamicFactorFunctions = dynamicFactorFunctions;
    }

    addBase(x: number): void {
        this.base += x;
    }

    multiplyFactor(x: number): void {
        this.factor *= x;
    }

    addBaseFunction(f: () => number): void {
        this.dynamicBaseFunctions.push(f);
    }

    addFactorFunction(f: () => number): void {
        this.dynamicFactorFunctions.push(f);
    }

    calculate(): number {
        let x = 0;
        x += this.base;
        for (let i in this.dynamicBaseFunctions) { x += this.dynamicBaseFunctions[i](); }
        x *= this.factor;
        for (let i in this.dynamicFactorFunctions) { x *= this.dynamicFactorFunctions[i](); }
        return x;
    }
}