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

    var secondsToMinutes = new TimeUnitRelation(seconds, minutes, 60, 60, 10)
    var minutesToHours = new TimeUnitRelation(minutes, hours, 60, 60, 15)
    var hoursToDays = new TimeUnitRelation(hours, days, 24, 24, 12)
    var daysToYears = new TimeUnitRelation(days, years, 365, 365, 365)

    var pipeline = new TimeUnitPipeline([secondsToMinutes, minutesToHours, hoursToDays, daysToYears])

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

<h1>Untitled Game</h1>
<h3>Dev Speed Multiplier:</h3>
<label>
	<input type=number bind:value={speedMult} min=0 max=100>
	<input type=range bind:value={speedMult} min=0 max=100>
</label>
<button onclick=start()>Start</button>
<button onclick=stop()>Stop</button>
<table>
    <thead>
        <td>Units:</td>
        {#each pipeline.getTimeUnits() as unit}
            <td>
                {unit.name}
            </td>
        {/each}
    </thead>
    <tbody>
        <tr>
            <td>Amount:</td>
            {#each pipeline.getTimeUnits() as unit}
            <td>
                {Math.floor(unit.value)}
            </td>
        {/each}
        </tr>
        <tr>
            <td>Max:</td>
            {#each pipeline.timeUnitRelations as relation}
            <td>
                {Math.floor(relation.currentPer)}
            </td>
        {/each}
        </tr>
        <tr>
            <td>Squeezing more of this unit into the next one is speeding up time by:</td>
            {#each pipeline.timeUnitRelations as relation}
            <td>
                {relation.getRatio().toPrecision(5)}
            </td>
        {/each}
        </tr>
    </tbody>
</table>

<p id=pointsAmount>Points: {Math.floor(points)}</p>
<p>Points are speeding up time by a factor of: {(1 + Math.log(points+1)).toPrecision(5)}</p>

<style>
    table {
        table-layout: fixed;
    }

    td {
        width: 300px;
    }
</style>