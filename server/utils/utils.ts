import crypto from "crypto";

export class Password {

    static hashPassword(password: string) {
        // const salt = randomBytes(16).toString("hex");
        // const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        // return `${buf.toString("hex")}.${salt}`;

        const salt = crypto.randomBytes(128).toString('base64');
        const hashBuffer = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');

        return `${hashBuffer.toString("hex")}.${salt}`;

    }

    static comparePassword(
        storedPassword: string,
        suppliedPassword: string
    ): boolean {
        // // split() returns array
        // const [hashedPassword, salt] = storedPassword.split(".");
        // // we need to pass buffer values to timingSafeEqual
        // const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
        // // we hash the new sign-in password
        // const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
        // // compare the new supplied password with the stored hashed password
        // return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);

       let stuff = storedPassword.split('.');
        let hashBuffer = Buffer.from(stuff[0],'hex')
        let salt = stuff[1]
        const encryptHash = crypto.pbkdf2Sync(suppliedPassword, salt, 10000, 512, 'sha512');

        return crypto.timingSafeEqual(hashBuffer, encryptHash)
    }
}