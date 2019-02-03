require('dotenv').config();
const fs = require('fs');
const Bca = require("./dist/Bca");

let login = process.env.BCA_LOGIN;
let password = process.env.BCA_PASSWORD;

let bca = new Bca({ username: login, password: password });

bca.login()
    .then(res => {
        console.log(res);
        return bca.logout();
    })
    .then(res => {
        console.log(res);
    })
    .catch(err => {
        console.log(err.message, err.stack)
    })

function saveFile(filename, content) {
    return new Promise((res, rej) => {
        fs.writeFile(__dirname + "/" + filename, content, function (err) {
            if (err) rej(err);
            res("The file was saved!");
        });
    })
}