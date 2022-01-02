<script>
    import TimeUnit from './Classes/TimeUnit'
    import TimeUnitRelation from './Classes/TimeUnitRelation'
    import TimeUnitPipeline from './Classes/TimeUnitPipeline'

    let speedMult = 1

    var seconds = new TimeUnit('Seconds')
    var minutes = new TimeUnit('Minutes')
    var hours = new TimeUnit('Hours')
    var days = new TimeUnit('Days')
    var years = new TimeUnit('Years')
    var epochs = new TimeUnit('Epochs')
    var eons = new TimeUnit('Eons')
    var heatDeaths = new TimeUnit('Heat Deaths')

    var secondsToMinutes = new TimeUnitRelation(seconds, minutes, 60, 60, 10)
    var minutesToHours = new TimeUnitRelation(minutes, hours, 60, 60, 15)
    var hoursToDays = new TimeUnitRelation(hours, days, 24, 24, 6)
    var daysToYears = new TimeUnitRelation(days, years, 365, 365, 73)
    var yearsToEpochs = new TimeUnitRelation(years, epochs, 10000, 10000, 1000)
    var epochsToEons = new TimeUnitRelation(epochs, eons, 100000, 100000, 25000)
    var eonsToHeatDeaths = new TimeUnitRelation(eons, heatDeaths, 1000000, 1000000, 1000000)

    var pipeline = new TimeUnitPipeline([secondsToMinutes, minutesToHours, hoursToDays, daysToYears, yearsToEpochs, epochsToEons, eonsToHeatDeaths])

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
            <div class='col-1'>
                {unit.name}
            </div>
        {/each}
    </div>
    <div class='row'>
        <div class='col-1'>Amount:</div>
        {#each pipeline.getTimeUnits() as unit}
            <div class='col-1'>
                {Math.floor(unit.value)}
            </div>
        {/each}
    </div>
    <div class='row'>
        <div class='col-1'>Maximum:</div>
        {#each pipeline.timeUnitRelations as relation}
            <div class='col-1'>
                {Math.floor(relation.currentPer)}
            </div>
        {/each}
    </div>
    <div class='row'>
        <div class='col-1'>Multiplier:</div>
        {#each pipeline.timeUnitRelations as relation}
            <div class='col-1'>
                {relation.getRatio().toPrecision(5)}
            </div>
        {/each}
    </div>
</div>

<p id=pointsAmount>Points: {Math.floor(points)}</p>
<p>Points are speeding up time by a factor of: {(1 + Math.log(points+1)).toPrecision(5)}</p>
