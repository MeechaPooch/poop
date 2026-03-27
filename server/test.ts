import express from 'express'
import multer from 'multer'
import fsp from 'fs/promises'
import fs from 'fs'
import path from 'path'
import cors from 'cors'
import { userdirsPath, deployFolder } from '../converter/runner/consts.ts'
import { compile } from '../converter/runner/converter.ts'
import e from 'express'
import asynchandler from 'express-async-handler'


const app = express();
app.use(cors({
    // origin: [/https:\/\/.*.micahpowch.com/, 'https://micahpowch.com']
    // origin:['*.micahpowch.com','micahpowch.com']
    origin:'*',
    // methods: ['GET', 'POST', 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(cors({origin:'*'}))

app.get('/test', (req, res) => {
    console.log('test')
    res.send('hi')
})

app.listen(7070, (error) => {
    if(error) console.log(error)
    else console.log('Server running on http://localhost:7070')
});
