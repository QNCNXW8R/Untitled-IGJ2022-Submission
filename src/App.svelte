<script lang="ts">
    import TimeUnit from './Classes/TimeUnit';
    import TimeUnitRelation from './Classes/TimeUnitRelation';
    import TimeUnitPipeline from './Classes/TimeUnitPipeline';
    import Upgrade from './Classes/Upgrade';

    //export let name: string;

    let speedMult = 1;

    var seconds = new TimeUnit('Seconds');
    var minutes = new TimeUnit('Minutes', 0, 0, function() {return seconds.total >= 30}, function() {return seconds.total >= 60}); // Require upgrade here in future
    var hours = new TimeUnit('Hours', 0, 0, function() {return minutes.total >= 30}, function() {return minutes.total >= 60});
    var days = new TimeUnit('Days', 0, 0, function() {return hours.total >= 12}, function() {return hours.total >= 24});
    var years = new TimeUnit('Years', 0, 0, function() {return days.total >= 90}, function() {return days.total >= 365});
    var epochs = new TimeUnit('Epochs', 0, 0, function() {return years.total >= 1000}, function() {return years.total >= 10000});
    var eons = new TimeUnit('Eons', 0, 0, function() {return epochs.total >= 1000}, function() {return epochs.total >= 100000});
    var heatDeaths = new TimeUnit('Heat Deaths', 0, 0, function() {return eons.total >= 1000}, function() {return eons.total >= 1000000});

    var secondsToMinutes = new TimeUnitRelation(seconds, minutes, 60, 60, 10);
    var minutesToHours = new TimeUnitRelation(minutes, hours, 60, 60, 15);
    var hoursToDays = new TimeUnitRelation(hours, days, 24, 24, 6);
    var daysToYears = new TimeUnitRelation(days, years, 365, 365, 73);
    var yearsToEpochs = new TimeUnitRelation(years, epochs, 10000, 10000, 1000);
    var epochsToEons = new TimeUnitRelation(epochs, eons, 100000, 100000, 25000);
    var eonsToHeatDeaths = new TimeUnitRelation(eons, heatDeaths, 1000000, 1000000, 1000000);

    var pipeline = new TimeUnitPipeline([secondsToMinutes, minutesToHours, hoursToDays, daysToYears, yearsToEpochs, epochsToEons, eonsToHeatDeaths]);

    var upgrades: Upgrade[] = [
        //  Upgrade(name, visibilityFunction, costUnit, cost, upgradeTarget)
        new Upgrade('Increase Seconds base by 100%', function() {return seconds.total >= 5}, seconds, 10, function() {seconds.multiplier.addBase(1)}),
        new Upgrade('Increase Seconds base by 100% again', function() {return seconds.total >= 20}, seconds, 30, function() {seconds.multiplier.addBase(1)}),
        new Upgrade('Increase Seconds base by another 100%', function() {return seconds.total >= 40}, seconds, 60, function() {seconds.multiplier.addBase(1)}),
        new Upgrade('Increase Seconds base by yet another 100%', function() {return seconds.total >= 80}, seconds, 100, function() {seconds.multiplier.addBase(1)}),
        new Upgrade('Double Minutes', function() {return minutes.total >= 5}, minutes, 10, function() {minutes.multiplier.multiplyFactor(2)}),
        new Upgrade('Triple Minutes', function() {return minutes.total >= 10}, minutes, 15, function() {minutes.multiplier.multiplyFactor(3)}),
        new Upgrade('Seconds gain is squared', function() {return hours.total >= 1}, hours, 1, function() {seconds.exponent.multiplyFactor(2)}),
        new Upgrade('Increase Minutes gain by total Hours', function() {return hours.total >= 1}, hours, 1, function() {minutes.multiplier.addBaseFunction(function() {return hours.total})})
    ];

    var points = 0;

    var intervalID = null;

    function start(): void {
        console.log("Starting...");
        clearInterval(intervalID);
        intervalID = setInterval(() => onTick(), 50);
    }

    function stop(): void {
        console.log("Stopping...");
        clearInterval(intervalID);
        intervalID = null;
    }

    function attemptPurchase(upgrade: Upgrade): boolean {
        let success = upgrade.purchase();
        if (success) {
            upgrades = upgrades.filter((value) => value.name !== upgrade.name);
            console.log('Successfully purchased upgrade "' + upgrade.name + '"');
        } else {
            console.log('Purchase failed');
        }
        return success;
    }

    function onTick(): void {
        let tickrate = speedMult/20
        let firstUnitMod = Math.pow(pipeline.timeUnitRelations[0].fromUnit.multiplier.calculate(), pipeline.timeUnitRelations[0].fromUnit.exponent.calculate())
        let increase = firstUnitMod * (1 + Math.log(points+1)) * pipeline.getRatio() * tickrate
        points += increase;
        upgrades = upgrades; // Without this line, newly-visible upgrades don't appear because reasons
        pipeline.timeUnitRelations[0].fromUnit.value += increase;
        pipeline.timeUnitRelations[0].fromUnit.total += increase;
        pipeline.convert();
    }
</script>

<div class='container content'>
    <h1 class='title'>Untitled Game</h1>
    <h3>Dev Speed Multiplier:</h3>
    <label>
        <input type=number bind:value={speedMult} min=0 max=100>
        <input type=range bind:value={speedMult} min=0 max=100>
    </label>
    <button on:click={start}>Start</button>
    <button on:click={stop}>Stop</button>

    <div class='container'>
        <div class='row'>
            <div class='col-1'>Units:</div>
            {#each pipeline.getTimeUnits() as unit}
                {#if unit.visible()}
                    <div class='col-1'>
                        {unit.requirement() ? unit.name : '???'}
                    </div>
                {/if}
            {/each}
        </div>
        <div class='row'>
            <div class='col-1'>Amount:</div>
            {#each pipeline.getTimeUnits() as unit}
                {#if unit.visible()}
                    <div class='col-1'>
                        {unit.requirement() ? Math.floor(unit.value) : '?'}
                    </div>
                {/if}
            {/each}
        </div>
        <div class='row'>
            <div class='col-1'>Maximum:</div>
            {#each pipeline.timeUnitRelations as relation}
                {#if relation.fromUnit.visible()}
                    <div class='col-1'>
                        {relation.fromUnit.requirement() ? Math.floor(relation.currentPer) : '?'}
                    </div>
                {/if}
            {/each}
        </div>
        <div class='row'>
            <div class='col-1'>Multiplier:</div>
            {#each pipeline.timeUnitRelations as relation}
            {#if relation.fromUnit.visible()}
                    <div class='col-1'>
                        {relation.fromUnit.requirement() ? relation.getRatio().toPrecision(5) : '?'}
                    </div>
                {/if}
            {/each}
        </div>
    </div>

    <p id=pointsAmount>Points: {Math.floor(points)}</p>
    <p>Points are speeding up time by a factor of: {(1 + Math.log(points+1)).toPrecision(5)}</p>

    <div class='container'>
        {#each upgrades as upgrade}
            {#if upgrade.visible()}
                <div on:click={function() {attemptPurchase(upgrade)}}>
                    {upgrade.name}: {upgrade.cost} {upgrade.costUnit.name}
                </div>
            {/if}
        {/each}
    </div>
</div>
