import TimeUnit from "./TimeUnit";
import Multiplier from "./Multiplier";

export default class Upgrade {
    constructor(name='', visible=function(){return true}, costUnit=new TimeUnit(), cost=0, upgradeTarget=function(){new Multiplier().multiplyFactor(1)}) {
        this.name = name;
        this.visible = visible;
        this.costUnit = costUnit;
        this.cost = cost;
        this.upgradeTarget = upgradeTarget;
    }

    purchase() {
        if (this.visible() && this.costUnit.value >= this.cost) {
            this.costUnit.value -= this.cost;
            this.visible = function(){return false};
            this.upgradeTarget()
            return true
        }
        return false
    }
}