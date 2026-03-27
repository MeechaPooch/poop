import express from 'express'
import multer from 'multer'
import fsp from 'fs/promises'
import fs from 'fs'
import path from 'path'
import cors from 'cors'
import { userdirsPath, deployFolder } from '../converter/runner/consts.ts'
import { compile, run } from '../converter/runner/converter.ts'
import e from 'express'
import asynchandler from 'express-async-handler'
let sanitize: any = undefined;
import bodyParser from 'body-parser'
import { createUser, doesUserExist } from './functions.ts'

{
    (async () => {
        if (!sanitize) sanitize = (await import('path-sanitizer')).default

    })()
}

async function uploadFile(filepath: string, username: string, file: Express.Multer.File) {
    if (!sanitize) sanitize = (await import('path-sanitizer')).default

    filepath = sanitize(filepath)
    process.chdir(deployFolder)

    let fullfilepath = userdirsPath + path.sep + username + path.sep + filepath;

   // Ensure the directory exists
    const directory = path.dirname(fullfilepath);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    return fsp.writeFile(fullfilepath, file.buffer);
}

// replace with only regenerating specific files
async function regenerateUser(username: string) {
    try {
        return await run(username)
    } catch (e) {
        console.error(e)
    }
}


const app = express();
app.use(cors({
    // origin: [/https:\/\/.*.micahpowch.com/, 'https://micahpowch.com']
    // origin:['*.micahpowch.com','micahpowch.com']
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(bodyParser.json())
// app.use(asynchandler)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 * 1024 }
}); // Keep file in buffer initially


app.get('/test', (req, res) => {
    console.log('test')
    res.send('hi')
})

//
app.post('/newfolder', async (req, res) => {
    let username = req.body.username
    let where: string = decodeURIComponent(req.body.location) as string
    where = sanitize(where);
    let fullpath = userdirsPath + '/' + username + '/' + where;
    console.log('making',fullpath)
    fs.mkdirSync(fullpath);
    await regenerateUser(username)
    res.send('reload')
})

app.post('/upload', upload.single('file'), (async (req, res, next) => {
    // in future, resolve username using backend authentication. store token in user directory?!?!?!?! YES. ;P
    let { filepath, username } = req.body; // The path specified by the user
    const file = req.file;

    filepath = decodeURIComponent(filepath)
    console.log('recieved a file!', filepath)


    if (!file) {
        return res.status(400).send('Missing file');
    }
    if (!filepath) {
        return res.status(400).send('Missing target path.');
    }


    console.log('recieved a file!', filepath)


    await uploadFile(filepath, username, file)

    await regenerateUser(username)

    res.send('reload').sendStatus(200)

    // next();

}));

app.post('/newuser',async (req,res)=>{
    let {username,password,email} = req.body;

    username = username.trim()
    if(username=='') {
        res.send(400).send('cannot have blank username')
        return;
    }

    if(doesUserExist(username)) {
        res.send(409).send('user already exists')
        return;
    }

    //otherwise

    await createUser(username,password)
    await run(username)

    res.status(200).send(username);
})

console.log('hi')
app.listen(7070, (error) => {
    if (error) console.log(error)
    else console.log('Server running on http://localhost:7070')
});
