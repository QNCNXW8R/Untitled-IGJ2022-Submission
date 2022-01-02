import TimeUnit from "./TimeUnit";
import Multiplier from "./Multiplier";

export default class TimeUnit {
    constructor(name='', visible=function(){return true}, costUnit=TimeUnit(), cost=0, upgradeTarget=Multiplier().addBase, upgradeValue=1) {
        this.name = name;
        this.visible = visible;
        this.costUnit = costUnit;
        this.cost = cost;
        this.upgradeTarget = upgradeTarget;
        this.upgradeValue = upgradeValue;
    }

    purchase() {
        if (this.visible() && this.costUnit.value >= this.cost) {
            console.log('Purchased upgrade "' + this.name + '"');
            this.costUnit.value -= this.cost;
            this.visible = function(){return false};
            this.upgradeTarget(this.upgradeValue)
        }
    }
}