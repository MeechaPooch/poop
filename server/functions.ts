import cp from 'child_process'
import { userdirsPath } from '../converter/runner/consts'
import fsp from 'fs/promises'
import fs from 'fs'

export async function createUser(username:string, password:string) {
    if(doesUserExist(username)) return;

    let user_directory = userdirsPath + '/' + username;
    await fsp.mkdir(user_directory);
    // create user samba share and stuff
    cp.spawnSync(__dirname + '/createuser.sh ',[username,password,user_directory],);

    return;
}

export function doesUserExist(username:string) {
    let user_directory = userdirsPath + '/' + username;
    return fs.existsSync(user_directory);
}