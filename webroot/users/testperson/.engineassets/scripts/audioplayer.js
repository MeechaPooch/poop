window.audioplayer = {
    audio: new Audio(),
    playurl: (url) => {
        audioplayer.playurls([url])
    },
    playlist: [], // list of urls
    index: 0,
    playurls: (urls, startindex, toggle) => { // index is optional arguement
        if (!urls) return;

        if (toggle) {
            // if already playing the queued track, just do nothing
            if (urls.toString() == audioplayer.playlist.toString() && startindex == audioplayer.index) {
                audioplayer.toggle()
                return;
            }
        }

        startindex = parseInt(startindex)
        if (startindex === NaN) startindex = 0;
        audioplayer.playlist = urls;
        audioplayer.index = startindex;
        audioplayer.audio.src = audioplayer.playlist[audioplayer.index]
        audioplayer.play()
    },
    runAllListeners: () => {
        audioplayer.listeners.forEach(d => {
            try { d() }
            catch (e) { console.log('caught error', e) }
        })
    },
    play: () => {
        audioplayer.audio.play()
        audioplayer.runAllListeners()

        playerelement.classList.add('showme')
    },
    pause: () => {
        audioplayer.audio.pause()
        audioplayer.runAllListeners()

    },
    toggle: () => {
        if (audioplayer.audio.paused) audioplayer.play()
        else audioplayer.pause()
    },
    moveby: (indexnum) => {
        audioplayer.index += indexnum
        if (audioplayer.index >= audioplayer.playlist.length) { audioplayer.index = audioplayer.playlist.length - 1; audioplayer.pause(); return; } // this is where auto shuffle radio would be initiated
        if (audioplayer.index < 0) { audioplayer.index = 0; audioplayer.pause(); return; }
        audioplayer.audio.src = audioplayer.playlist[audioplayer.index]
        audioplayer.play()
    },
    next: () => {
        audioplayer.moveby(1)
    },
    prev: () => {
        audioplayer.moveby(-1)
    },
    // percent: 0-1
    seektopercent: (percent) => {
        let timToSet = percent * audioplayer.audio.duration
        audioplayer.audio.currentTime = timToSet
    },
    listeners: [],
    addListener: (f) => {
        audioplayer.listeners.push(f)
    }
}
window.audioplayer.audio.addEventListener('ended', () => {
    if (audioplayer.index < audioplayer.playlist.length - 1) {
        audioplayer.next();
    } else {
        audioplayer.index = null
        // the playlist has ended
        try { audioplayer.listeners.forEach(d => d()) } catch (e) { }
    }
})

window.audioplayeraddons = {
    setPlayingElement: () => {
        // remove all playing
        document.querySelectorAll('.audiotrack.trackplaying').forEach(track => track.classList.remove('trackplaying'))
        document.querySelectorAll('.audiotrack.trackpaused').forEach(track => track.classList.remove('trackpaused'))
        // set current track playing
        document.querySelector(`.audiotrack[x-trackurl="${audioplayer.playlist[audioplayer.index]}"]`).classList.add(audioplayer.audio.paused ? 'trackpaused' : 'trackplaying')
    },
    setPlayerStatusClass: () => {
        playerelement.classList.remove('playing')
        playerelement.classList.remove('paused')
        playerelement.classList.remove('stopped')
        playerelement.classList.add(audioplayer.audio.paused ? 'paused' : 'playing')
    },
    setPlayingContainers: (excludefaders) => {
        document.querySelectorAll('.playingcontainer').forEach(e => e.classList.remove('playingcontainer'))
        document.querySelectorAll('.fadetonormal').forEach(e => e.classList.remove('fadetonormal'))
        playingUrl = audioplayer.playlist[audioplayer.index];
        let sections = playingUrl.split('/')
        let foundmyperm = false;
        for (let i = sections.length - 1; i >= 0; i--) {
            // come back to this make sure they line up teh urls
            // fix if need fixing for url being /micahpowch or /micahpowch/home. do not highlight home
            let asseturl = '/' + sections.slice(1, i).join('/')
            let elems = document.querySelectorAll(`[x-asseturl="${asseturl}"]`)
            elems = [...elems].reverse()
            for (e of elems) {
                if (foundmyperm) {
                    return;
                    if (!excludefaders) {
                        e.classList.add('playingcontainer')
                        e.classList.add('fadetonormal')
                        setTimeout(() => {
                            e.classList.remove('playingcontainer')
                        }, 100)
                    } else {
                        // do nothing
                        continue;
                    }
                } else {
                    if (foundmyperm) continue;
                    if (e.classList.contains('locationbutton') && !e.nextElementSibling) {
                        // do not highlight it if we are in the item itself
                    } else {
                        e.classList.add('playingcontainer')

                    }
                    foundmyperm = true;
                }
            }
        }
    }
}
audioplayer.addListener(audioplayeraddons.setPlayingElement)
audioplayer.addListener(audioplayeraddons.setPlayerStatusClass)
audioplayer.addListener(() => { if (!audioplayer.audio.paused) audioplayeraddons.setPlayingContainers() })

let audioprogress = document.querySelector('.audioprogress')
let playerelement = document.querySelector('.controls')
// new Audio().
audioplayer.audio.addEventListener('timeupdate', (e) => {
    // setInterval(() => {
    if (!audioplayer.audio.duration) return;
    console.log('timeupdate event')
    if (magicmouse.mousedown && magicmouse.target == audioprogress) return;
    let percent = 1000 * audioplayer.audio.currentTime / audioplayer.audio.duration;
    // percent = Math.round(percent)
    audioprogress.value = percent

    playerelement.querySelector('.time .playercurrentime').innerText = magicutils.secstohms(audioplayer.audio.currentTime)
    updateSliderVisuals()

}, 100)
audioplayer.audio.addEventListener('durationchange', (e) => {
    playerelement.querySelector('.time .playerduration').innerText = magicutils.secstohms(audioplayer.audio.duration)
    playerelement.querySelector('.time .playercurrentime').innerText = magicutils.secstohms(0) // to look nice so they go at the same time, maybe remove this

})