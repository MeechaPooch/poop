// Source - https://stackoverflow.com/a/13705878
// Posted by mtsr, modified by community. See post 'Timeline' for change history
// Retrieved 2026-03-30, License - CC BY-SA 3.0

import { userdirsPath } from "../converter/runner/consts";
import { run } from "../converter/runner/converter";

var chokidar = require('chokidar');


export function startWatching() {

    let startTime = Date.now()
    const SECS_WAIT_BEFORE_STARTING = 3;


    var watcher = chokidar.watch(userdirsPath, { ignored: [/\.tmp$/], persistent: true });

    watcher
        .on('add', onfileupdate)
        .on('change', onfileupdate)
        .on('unlink', onfileupdate)
        .on('error', function (error) {
            console.error('Error happened', error);
        })


    async function onfileupdate(path: string) {
        if(Date.now() - startTime < SECS_WAIT_BEFORE_STARTING * 1000) return;
        console.log('file update',path)
        let pathstartingwithuser = path.replace(new RegExp(`^${userdirsPath}`), '')
        let pathparts = pathstartingwithuser.split('/').filter(Boolean);
        let username = pathparts[0];
        let contentpath = pathparts.slice(1).join('/');

        run(username, contentpath)


    }
}
