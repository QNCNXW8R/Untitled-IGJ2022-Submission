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



    var resource_names = ['seconds', 'minutes', 'hours', 'days', 'years']

    var resource_values = {
        'seconds': 0,
        'minutes': 0,
        'hours': 0,
        'days': 0,
        'years': 0,
    }

    var resource_pers = {
        'seconds': 60,
        'minutes': 60,
        'hours': 24,
        'days': 365,
        'years': 10000,
    }

    var resource_base_pers = {
        'seconds': 60,
        'minutes': 60,
        'hours': 24,
        'days': 365,
        'years': 10000,
    }

    var baseTicksPerEpoch = resource_base_pers['seconds'] * resource_base_pers['minutes'] * resource_base_pers['hours'] * resource_base_pers['days'] * resource_base_pers['years']
    var pointRate = 1
    var points = 0

    var points2 = 0

    window.start = function() {
        console.log("Starting...")
        setInterval(() => onTick(), 50);
    }

    function getTicksPerEpoch() {
        return 1 * resource_pers['seconds'] * resource_pers['minutes'] * resource_pers['hours'] * resource_pers['days'] * resource_pers['years']
    }

    function onTick() {
        var tickrate = (1 + Math.log(points+1)) * getTicksPerEpoch() / baseTicksPerEpoch
        let tickrate2 = (1 + Math.log(points2+1)) * pipeline.getRatio()
        points += tickrate
        points2 += tickrate2

        pipeline.timeUnitRelations[0].fromUnit.value += tickrate
        pipeline.timeUnitRelations[0].fromUnit.total += tickrate
        pipeline.convert()



        resource_values['seconds'] += tickrate
        resource_values['minutes'] += tickrate/resource_pers['seconds']
        resource_values['hours'] += tickrate/resource_pers['minutes']/resource_pers['seconds']
        resource_values['days'] += tickrate/resource_pers['minutes']/resource_pers['hours']/resource_pers['seconds']
        resource_values['years'] += tickrate/resource_pers['minutes']/resource_pers['hours']/resource_pers['seconds']/resource_pers['days']

        resource_pers['seconds'] = 60 + 10*Math.floor(resource_values['minutes'])
        resource_pers['minutes'] = 60 + 15*Math.floor(resource_values['hours'])
        resource_pers['hours'] = 24 + 12*Math.floor(resource_values['days'])
        resource_pers['days'] = 365 + 365*Math.floor(resource_values['years'])
        for (var i in resource_names) {
            var res = resource_names[i]
            if (resource_values[res] >= 1) {
                if (resource_values[res] >= resource_pers[res]) {
                    resource_values[res] = resource_values[res] % resource_pers[res]
                }
            }
        }
    }
</script>

<button onclick=start()>Go</button>
<h1>Untitled Game</h1>
<table>
    <thead>
        <tr>
            <td>UNIT</td>
            <td id=secondsTitle>{resource_values['seconds'] < 1 ? '???' : 'Seconds'}</td>
            <td id=minutesTitle>{resource_values['minutes'] < 1 ? '???' : 'Minutes'}</td>
            <td id=hoursTitle>{resource_values['hours'] < 1 ? '???' : 'Hours'}</td>
            <td id=daysTitle>{resource_values['days'] < 1 ? '???' : 'Days'}</td>
            <td id=yearsTitle>{resource_values['years'] < 1 ? '???' : 'Years'}</td>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>AMOUNT</td>
            <td id=secondsAmount>{resource_values['seconds'] < 1 ? '?' : Math.floor(resource_values['seconds'])}</td>
            <td id=minutesAmount>{resource_values['minutes'] < 1 ? '?' : Math.floor(resource_values['minutes'])}</td>
            <td id=hoursAmount>{resource_values['hours'] < 1 ? '?' : Math.floor(resource_values['hours'])}</td>
            <td id=daysAmount>{resource_values['days'] < 1 ? '?' : Math.floor(resource_values['days'])}</td>
            <td id=yearsAmount>{resource_values['years'] < 1 ? '?' : Math.floor(resource_values['years'])}</td>
        </tr>
        <tr>
            <td>MAX</td>
            <td id=secondsPer>{resource_values['seconds'] < 1 ? '?' : Math.floor(resource_pers['seconds'])}</td>
            <td id=minutesPer>{resource_values['minutes'] < 1 ? '?' : Math.floor(resource_pers['minutes'])}</td>
            <td id=hoursPer>{resource_values['hours'] < 1 ? '?' : Math.floor(resource_pers['hours'])}</td>
            <td id=daysPer>{resource_values['days'] < 1 ? '?' : Math.floor(resource_pers['days'])}</td>
            <td id=yearsPer>{resource_values['years'] < 1 ? '?' : Math.floor(resource_pers['years'])}</td>
        </tr>
        <tr>
            <td>Squeezing that many of this unit into each of the next unit is speeding up time by a factor of:</td>
            <td id=secondsFactor>{resource_values['seconds'] < 1 ? '?' : (resource_pers['seconds'] / Math.floor(resource_base_pers['seconds'])).toPrecision(5)}</td>
            <td id=minutesFactor>{resource_values['minutes'] < 1 ? '?' : (resource_pers['minutes'] / Math.floor(resource_base_pers['minutes'])).toPrecision(5)}</td>
            <td id=hoursFactor>{resource_values['hours'] < 1 ? '?' : (resource_pers['hours'] / Math.floor(resource_base_pers['hours'])).toPrecision(5)}</td>
            <td id=daysFactor>{resource_values['days'] < 1 ? '?' : (resource_pers['days'] / Math.floor(resource_base_pers['days'])).toPrecision(5)}</td>
            <td id=yearsFactor>{resource_values['years'] < 1 ? '?' : (resource_pers['years'] / Math.floor(resource_base_pers['years'])).toPrecision(5)}</td>
        </tr>
    </tbody>
</table>
<p>Points:</p>
<p id=pointsAmount>{points}</p>
<p>Points are speeding up time by a factor of:</p>
<p id=pointsFactor>{(1 + Math.log(points+1)).toPrecision(5)}</p>


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
                {unit.value}
            </td>
        {/each}
        </tr>
        <tr>
            <td>Max:</td>
            {#each pipeline.timeUnitRelations as relation}
            <td>
                {relation.currentPer}
            </td>
        {/each}
        </tr>
        <tr>
            <td>Squeezing more of this unit into the next one is speeding up time by:</td>
            {#each pipeline.timeUnitRelations as relation}
            <td>
                {relation.getRatio()}
            </td>
        {/each}
        </tr>
    </tbody>
</table>

<p>Points:</p>
<p id=pointsAmount>{points2}</p>
<p>Points are speeding up time by a factor of:</p>
<p id=pointsFactor>{(1 + Math.log(points2+1)).toPrecision(5)}</p>

<style>
    table {
        table-layout: fixed;
    }

    td {
        width: 300px;
    }
</style>