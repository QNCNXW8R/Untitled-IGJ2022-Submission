import Multiplier from "./Multiplier";

export default class TimeUnit {
    name: string;
    value: number;
    total: number;
    visible: () => boolean;
    requirement: () => boolean;
    multiplier: Multiplier;
    exponent: Multiplier;
    
    constructor(name='', value=0, total=0, visible=function(){return true}, requirement=function(){return true}, multiplier=new Multiplier(), exponent=new Multiplier()) {
        this.name = name;
        this.value = value;
        this.total = total;
        this.visible = visible;
        this.requirement = requirement;
        this.multiplier=multiplier;
        this.exponent=exponent;
    }
}