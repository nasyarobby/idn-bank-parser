require('dotenv').config();
const fs = require('fs');
const Bca = require("./dist/Bca");

let login = process.env.BCA_LOGIN;
let password = process.env.BCA_PASSWORD;

let bca = new Bca({ username: login, password: password });
let startDate = {
    day: "01",
    month: "02",
    year: "2019"
}
let endDate = {
    day: "05",
    month: "02",
    year: "2019"
}
bca.login()
    .then(res => {
        console.log(res);
        if (res.success) {
            return bca.getAccountInfoMenu()
                .then(res => {
                    console.log(res);
                    return bca.getAccountStatementMenu();
                })
                .then(res => {
                    console.log(res);
                    let fid = (res.result && res.result.as_fid) ? res.result.as_fid : "";
                    return bca.getStatement(startDate.day, startDate.month, startDate.year, endDate.day, endDate.month, endDate.year, fid)
                })
                .then(res => {
                    if (res.result && res.result.data)
                        saveFile("./output/statement.html", res.result.data);
                    //console.log(res.result.transactions);
                    return bca.parseTransactions(res.result.transactions,
                        new Date(startDate.year, Number.parseInt(startDate.month)-1, Number.parseInt(startDate.day)),
                        new Date(endDate.year, Number.parseInt(endDate.month)-1, Number.parseInt(endDate.day)));
                })
                .then(res => {
                    console.log(res);
                    return bca.logout();
                })
                .then(res => {
                    console.log(res);
                })
        }
        else {
            console.log("Login failed");
        }
    })
    .catch(err => {
        console.log(err.message, err.stack)
        console.log("Try to logout");
        bca.logout();
    })

function saveFile(filename, content) {
    return new Promise((res, rej) => {
        fs.writeFile(__dirname + "/" + filename, content, function (err) {
            if (err) rej(err);
            res("The file was saved!");
        });
    })
}