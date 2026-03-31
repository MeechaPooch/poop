import cp from 'child_process'
import { passwordfilename as passhashfilename, userdirsPath, userSecretsPath } from '../converter/runner/consts'
import fsp from 'fs/promises'
import fs from 'fs'
import crypto from 'crypto';
import sanitize_filename from 'sanitize-filename'
import { Password } from './utils/utils';

export async function createUser(username:string, password:string) {
    username = sanitize_filename(username)

    if(doesUserExist(username)) return;

    let user_directory = userdirsPath + '/' + username;
    let user_secret_directory = userSecretsPath + '/' + username;
    await fsp.mkdir(user_directory);
    await fsp.mkdir(user_secret_directory);
    // create user samba share and stuff
    let output = cp.spawnSync('sudo',[__dirname + '/createuser.sh',username,password,user_directory],).output.map(e=>e?.toString()).join('\n');

    console.log('create output',output)

    let passwordhash = await Password.hashPassword(password)
    fs.writeFileSync(user_secret_directory + '/' + passhashfilename,passwordhash)

    return;
}

export function doesUserExist(username:string) {
    username = sanitize_filename(username)

    let user_directory = userdirsPath + '/' + username;
    return fs.existsSync(user_directory);
}

export function login(username:string,password:string):string|false {
    username = sanitize_filename(username)


    // validate username and password
    let validate = validatePassword(username,password)
    if(!validate) return false;
    // generate token

    let token = saveNewToken(username);

    // return token
    return token;
}

 function validatePassword(username:string,password:string):boolean {
    username = sanitize_filename(username)

    let user_secret_directory = userSecretsPath + '/' + username;
    let passfile = user_secret_directory + '/' + passhashfilename
    if(!fs.existsSync(passfile)) return false;
    let passwordHash = fs.readFileSync(passfile).toString() 
    
    if(passwordHash=='' || password=='') return false;

    let result =  Password.comparePassword(passwordHash,password)
    return result;
}

function saveNewToken(username:string) {
    username = sanitize_filename(username)
    let user_secret_directory = userSecretsPath + '/' + username;

    let token = crypto.randomUUID();

    let timecreated = Date.now();

    fs.writeFileSync(user_secret_directory + '/' + timecreated,token)

    return `${username}.${timecreated}.${token}`;
}

export function validateToken(username:string,token:string) {

    try{
    username = sanitize_filename(username)

    let user_secret_directory = userSecretsPath + '/' + username;
    let split = token.split('.')
    let tokenusername = split[0]
    let date = split[1]
    let tokenbody = split[2];

    if(tokenusername!=username) return false;

    date = sanitize_filename(date)
    let tokenfilename = user_secret_directory + '/' + date;
    if(!fs.existsSync(tokenfilename)) return false;
    let readtoken = fs.readFileSync(tokenfilename).toString();
    let answer = readtoken == tokenbody
    return answer;
    } catch (e) {
        console.error(e);
        return false;
    }
}