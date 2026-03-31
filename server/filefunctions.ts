import { userdirsPath, deployFolder } from '../converter/runner/consts.ts'
import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
let sanitize: any = undefined;

{
    (async () => {
        if (!sanitize) sanitize = (await import('path-sanitizer')).default

    })()
}




export async function deleteFile(filepath: string, username: string) {
    if (!sanitize) sanitize = (await import('path-sanitizer')).default

    filepath = sanitize(filepath)

    let fullfilepath = userdirsPath + path.sep + username + path.sep + filepath;

    // Ensure the directory exists
    // const directory = path.dirname(fullfilepath);
    if (fs.existsSync(fullfilepath)) {
        console.log('path exists, deleting',fullfilepath)
        fs.rmSync(fullfilepath,{recursive:true})
    } else {
        console.error('path did not exist',fullfilepath)
    }
}

export async function uploadFile(filepath: string, username: string, file: Express.Multer.File) {
    if (!sanitize) sanitize = (await import('path-sanitizer')).default

    filepath = sanitize(filepath)
    process.chdir(deployFolder)

    let fullfilepath = userdirsPath + path.sep + username + path.sep + filepath;

    // Ensure the directory exists
    const directory = path.dirname(fullfilepath);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    return fsp.writeFile(fullfilepath, file.buffer,{
        mode:0o770
    });
}