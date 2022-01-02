<script>
    import TimeUnit from './Classes/TimeUnit'
    import TimeUnitRelation from './Classes/TimeUnitRelation'
    import TimeUnitPipeline from './Classes/TimeUnitPipeline'

    var seconds = new TimeUnit('Seconds')
    var minutes = new TimeUnit('Minutes')
    var hours = new TimeUnit('Hours')

    var secondsToMinutes = new TimeUnitRelation(seconds, minutes, 60, 60, 10)
    var minutesToHours = new TimeUnitRelation(minutes, hours, 60, 60, 15)

    var pipeline = new TimeUnitPipeline([secondsToMinutes, minutesToHours])

    var points = 0

    window.start = function() {
        console.log("Starting...")
        setInterval(() => onTick(), 50);
    }

    function onTick() {
        let tickrate = (1 + Math.log(points+1)) * pipeline.getRatio()
        points += tickrate

        pipeline.timeUnitRelations[0].fromUnit.value += tickrate
        pipeline.timeUnitRelations[0].fromUnit.total += tickrate
        pipeline.convert()
    }
</script>

<button onclick=start()>Go</button>
<h1>Untitled Game</h1>
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

<p>Points:</p>
<p id=pointsAmount>{points}</p>
<p>Points are speeding up time by a factor of:</p>
<p id=pointsFactor>{(1 + Math.log(points+1)).toPrecision(5)}</p>

<style>
    table {
        table-layout: fixed;
    }

    td {
        width: 300px;
    }
</style>