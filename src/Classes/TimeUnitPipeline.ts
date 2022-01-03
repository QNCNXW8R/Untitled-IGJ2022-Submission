import type TimeUnit from "./TimeUnit";
import type TimeUnitRelation from "./TimeUnitRelation";

export default class TimeUnitPipeline {
    timeUnitRelations: TimeUnitRelation[];
    constructor(timeUnitRelations=[]) {
        this.timeUnitRelations = timeUnitRelations;
    }

    convert(): void {
        for (let i in this.timeUnitRelations) {
            let relation = this.timeUnitRelations[i];
            if (relation.fromUnit.value < relation.currentPer) { break; }
            relation.convert();
        }
    }

    getTimeUnits(): TimeUnit[] {
        let timeUnits = [];
        for (let i in this.timeUnitRelations) {
            let relation = this.timeUnitRelations[i];
            if (i == '0') { timeUnits.push(relation.fromUnit); }
            timeUnits.push(relation.toUnit);
        }
        return timeUnits;
    }

    getRatio(): number {
        let ratio = 1;
        for (let i in this.timeUnitRelations) {
            let relation = this.timeUnitRelations[i];
            ratio *= relation.getRatio();
        }
        return ratio;
    }
}