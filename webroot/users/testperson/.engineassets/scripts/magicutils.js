const SECS_IN_MINUTE = 60
const MINUTES_IN_HOUR = 60
function secstohms(secs) {
    if (secs === undefined) return '?:??';
    let mins = secs / SECS_IN_MINUTE
    let hours = mins / SECS_IN_MINUTE

    secs = Math.round(secs)
    mins = Math.floor(mins)
    hours = Math.floor(hours)
    mins = mins - hours * MINUTES_IN_HOUR;
    secs = secs - ((hours * MINUTES_IN_HOUR) + mins) * SECS_IN_MINUTE;

    let output = [
        hours,
        (mins ?? '0').toString().padStart(hours ? 2 : 1, '0'),
        secs.toString().padStart(2, '0')
    ].filter(Boolean).join(':')
    return output
}
window.magicutils = {
    secstohms,
}
function sleep(mil) { return new Promise(r => setTimeout(r, mil)) }
