resource_names = ['seconds', 'minutes', 'hours', 'days', 'years']

resource_titles = {
    'seconds': document.getElementById('secondsTitle'),
    'minutes': document.getElementById('minutesTitle'),
    'hours': document.getElementById('hoursTitle'),
    'days': document.getElementById('daysTitle'),
    'years': document.getElementById('yearsTitle')
}

resource_counters = {
    'points': document.getElementById('pointsAmount'),
    'seconds': document.getElementById('secondsAmount'),
    'minutes': document.getElementById('minutesAmount'),
    'hours': document.getElementById('hoursAmount'),
    'days': document.getElementById('daysAmount'),
    'years': document.getElementById('yearsAmount')
}

resource_trackers = {
    'seconds': document.getElementById('secondsPer'),
    'minutes': document.getElementById('minutesPer'),
    'hours': document.getElementById('hoursPer'),
    'days': document.getElementById('daysPer'),
    'years': document.getElementById('yearsPer')
}

resource_factors = {
    'points': document.getElementById('pointsFactor'),
    'seconds': document.getElementById('secondsFactor'),
    'minutes': document.getElementById('minutesFactor'),
    'hours': document.getElementById('hoursFactor'),
    'days': document.getElementById('daysFactor'),
    'years': document.getElementById('yearsFactor')
}

resource_values = {
    'seconds': 0,
    'minutes': 0,
    'hours': 0,
    'days': 0,
    'years': 0,
}

resource_pers = {
    'seconds': 60,
    'minutes': 60,
    'hours': 24,
    'days': 365,
    'years': 10000,
}

resource_base_pers = {
    'seconds': 60,
    'minutes': 60,
    'hours': 24,
    'days': 365,
    'years': 10000,
}

baseTicksPerEpoch = resource_base_pers['seconds'] * resource_base_pers['minutes'] * resource_base_pers['hours'] * resource_base_pers['days'] * resource_base_pers['years']
pointRate = 1
points = 0

function start() {
    console.log("Starting...")
    setInterval(() => onTick(), 50);
}

function getTicksPerEpoch() {
    return 1 * resource_pers['seconds'] * resource_pers['minutes'] * resource_pers['hours'] * resource_pers['days'] * resource_pers['years']
}

function onTick() {
    tickrate = (1 + Math.log(points+1)) * getTicksPerEpoch() / baseTicksPerEpoch
    points += tickrate
    resource_counters['points'].innerHTML = Math.floor(points)
    resource_factors['points'].innerHTML = (1 + Math.log(points+1)).toPrecision(5)

    resource_values['seconds'] += tickrate
    resource_values['minutes'] += tickrate/resource_pers['seconds']
    resource_values['hours'] += tickrate/resource_pers['minutes']/resource_pers['seconds']
    resource_values['days'] += tickrate/resource_pers['minutes']/resource_pers['hours']/resource_pers['seconds']
    resource_values['years'] += tickrate/resource_pers['minutes']/resource_pers['hours']/resource_pers['seconds']/resource_pers['days']

    for (i in resource_names) {
        res = resource_names[i]
        if (resource_values[res] >= resource_pers[res]) {
            resource_values[res] -= resource_pers[res]
        }
    }

    resource_pers['seconds'] = 60 + 10*Math.floor(resource_values['minutes'])
    resource_pers['minutes'] = 60 + 15*Math.floor(resource_values['hours'])
    resource_pers['hours'] = 24 + 12*Math.floor(resource_values['days'])
    resource_pers['days'] = 365 + 365*Math.floor(resource_values['years'])
    for (i in resource_names) {
        res = resource_names[i]
        if (resource_values[res] >= 1) {
            //console.log(res)
            resource_titles[res].innerHTML = res
            if (resource_values[res] >= resource_pers[res]) {
                resource_values[res] = resource_values[res] % resource_pers[res]
            }
            resource_counters[res].innerHTML = Math.floor(resource_values[res])// % resource_pers[res])
            resource_trackers[res].innerHTML = Math.floor(resource_pers[res])
            resource_factors[res].innerHTML = (resource_pers[res] / Math.floor(resource_base_pers[res])).toPrecision(5)
        }
    }
}

