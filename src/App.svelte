<script>
    import TimeUnit from './Classes/TimeUnit'
    import TimeUnitRelation from './Classes/TimeUnitRelation'
    import TimeUnitPipeline from './Classes/TimeUnitPipeline'
    import Upgrade from './Classes/Upgrade'

    let speedMult = 1

    var seconds = new TimeUnit('Seconds')
    var minutes = new TimeUnit('Minutes', 0, 0, function() {return seconds.total >= 30}, function() {return seconds.total >= 60}) // Require upgrade here in future
    var hours = new TimeUnit('Hours', 0, 0, function() {return minutes.total >= 30}, function() {return minutes.total >= 60})
    var days = new TimeUnit('Days', 0, 0, function() {return hours.total >= 12}, function() {return hours.total >= 24})
    var years = new TimeUnit('Years', 0, 0, function() {return days.total >= 90}, function() {return days.total >= 365})
    var epochs = new TimeUnit('Epochs', 0, 0, function() {return years.total >= 1000}, function() {return years.total >= 10000})
    var eons = new TimeUnit('Eons', 0, 0, function() {return epochs.total >= 1000}, function() {return epochs.total >= 100000})
    var heatDeaths = new TimeUnit('Heat Deaths', 0, 0, function() {return eons.total >= 1000}, function() {return eons.total >= 1000000})

    var secondsToMinutes = new TimeUnitRelation(seconds, minutes, 60, 60, 10)
    var minutesToHours = new TimeUnitRelation(minutes, hours, 60, 60, 15)
    var hoursToDays = new TimeUnitRelation(hours, days, 24, 24, 6)
    var daysToYears = new TimeUnitRelation(days, years, 365, 365, 73)
    var yearsToEpochs = new TimeUnitRelation(years, epochs, 10000, 10000, 1000)
    var epochsToEons = new TimeUnitRelation(epochs, eons, 100000, 100000, 25000)
    var eonsToHeatDeaths = new TimeUnitRelation(eons, heatDeaths, 1000000, 1000000, 1000000)

    var pipeline = new TimeUnitPipeline([secondsToMinutes, minutesToHours, hoursToDays, daysToYears, yearsToEpochs, epochsToEons, eonsToHeatDeaths])

    var upgrades = [
        new Upgrade('Double Minutes', function() {return minutes.total >= 0}, minutes, 10, function(){minutes.multiplier.multiplyFactor(2)}),
        new Upgrade('Triple Minutes', function() {return minutes.total >= 0}, minutes, 15, function(){minutes.multiplier.multiplyFactor(3)})
    ]

    var points = 0

    var intervalID = -1

    window.start = function() {
        console.log("Starting...")
        intervalID = setInterval(() => onTick(), 50);
    }

    window.stop = function() {
        console.log("Stopping...")
        clearInterval(intervalID)
        intervalID = -1
    }

    function attemptPurchase(upgrade) {
        let success = upgrade.purchase()
        if (success) {
            upgrades = upgrades.filter((value) => value.name !== upgrade.name);
            console.log('Successfully purchased upgrade "' + upgrade.name + '"');
        } else {
            'Purchase failed'
        }
    }

    function onTick() {
        let tickrate = (1 + Math.log(points+1)) * pipeline.getRatio() * speedMult/20
        points += tickrate

        pipeline.timeUnitRelations[0].fromUnit.value += tickrate
        pipeline.timeUnitRelations[0].fromUnit.total += tickrate
        pipeline.convert()
    }
</script>

<h1 class='title'>Untitled Game</h1>
<h3>Dev Speed Multiplier:</h3>
<label>
	<input type=number bind:value={speedMult} min=0 max=100>
	<input type=range bind:value={speedMult} min=0 max=100>
</label>
<button onclick=start()>Start</button>
<button onclick=stop()>Stop</button>

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

<ul>
    {#each upgrades as upgrade}
        {#if upgrade.visible()}
            <li><button on:click={function() {attemptPurchase(upgrade)}}>{upgrade.name}: {upgrade.cost} {upgrade.costUnit.name}</button></li>
        {/if}
    {/each}
</ul>