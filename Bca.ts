const axios = require("axios");
const qs = require("querystring");
const htmlParser = require("node-html-parser");

import { AxiosResponse, AxiosError } from "axios";
import { ParserConfig, IdnBankParser, Transaction } from "./index";

class Bca implements IdnBankParser {
    username: string;
    password: string;
    ip: string;
    url = {
        loginForm: 'https://m.klikbca.com/login.jsp',
        auth: 'https://m.klikbca.com/authentication.do',
        mainMenu: 'https://m.klikbca.com/authentication.do?value(actions)=menu',
        accountInfoMenu: 'https://m.klikbca.com/accountstmt.do?value(actions)=menu',
        accountStatementForm: 'https://m.klikbca.com/accountstmt.do?value(actions)=acct_stmt',
        accountStatementView: 'https://m.klikbca.com/accountstmt.do?value(actions)=acctstmtview',
        logout: 'https://m.klikbca.com/authentication.do?value(actions)=logout',
    };
    userAgent: string = 'Mozilla/5.0 (Android 7.0; Mobile; rv:54.0) Gecko/54.0 Firefox/54.0';
    axiosConfig = {
        headers: { 'User-Agent': this.userAgent }
    };
    cookie: string[] = [];

    constructor(config: ParserConfig) {
        if (config && config.username && config.password) {
            this.username = config.username;
            this.password = config.password;
            this.ip = "";
        }
        else {
            throw new Error("Missing config parameters");
        }
    }

    setCookie(cookie: string[]) {
        let cookiePlaceholder: string[] = [];
        cookie.forEach(e => {
            let c = e.split(";");
            cookiePlaceholder.push(c[0]);
        });
        this.cookie = cookiePlaceholder;
    }

    getCookie(): string {
        return this.cookie.join(";");
    }

    getLoginForm() {
        return new Promise((res, rej) => {
            axios({
                method: "get",
                url: this.url.loginForm
            })
                .then((response: AxiosResponse) => {
                    this.setCookie(response.headers["set-cookie"]);
                    let ipAddresses = this.findIpAddress(response.data);

                    if (ipAddresses && ipAddresses.length == 2)
                        this.ip = ipAddresses[0];
                    else
                        throw new Error("IP Address could not be found in the login page.");
                    res(response);
                })
                .catch((err: AxiosError) => {
                    rej(err);
                })
        });
    }

    login() {
        return new Promise((res, rej) => {
            this.getLoginForm()
                .then(ret => {
                    return axios.post(
                        this.url.auth,
                        qs.stringify({
                            'value(user_id)': this.username,
                            'value(pswd)': this.password,
                            'value(Submit)': 'LOGIN',
                            'value(actions)': 'login',
                            'value(user_ip)': this.ip,
                            'user_ip': this.ip,
                            'value(mobile)': true,
                            'mobile': true,
                            'value(browser_info)': this.userAgent
                        }),
                        {
                            headers: {
                                'User-Agent': this.userAgent,
                                'Cookie': this.getCookie(),
                                'Referer': this.url.loginForm,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        }
                    )
                })
                .then((response) => {
                    if (/MENU UTAMA/g.test(response.data)) {
                        res({
                            action: "login",
                            success: 1
                        })
                    }
                    else {
                        let reason = response.data.match(/var err='(.*)';/g)[0].slice(9, -2);
                        res({
                            action: "login",
                            success: 0,
                            reason: reason
                        })
                    }
                })
                .catch(err => {
                    rej(err);
                })
        });
    }

    logout() {
        return new Promise((res, rej) => {
            axios.get(
                this.url.logout,
                {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Cookie': this.getCookie(),
                        'Referer': this.url.mainMenu,
                    }
                }
            )
                .then((response: AxiosResponse) => {
                    if (/Silakan masukkan USER ID Anda/g.test(response.data)) {
                        res({
                            action: "logout",
                            success: 1
                        })
                    }
                    else {
                        res({
                            action: "logout",
                            success: 0
                        })
                    }
                })
                .catch((err: AxiosError) => {
                    rej(err);
                })
        })
    }

    getStatement(startDate: string, startMonth: string, startYear: string,
        endDate: string, endMonth: string, endYear: string,
        asfid: string) {
        return new Promise((res, rej) => {
            if(startDate === undefined || startMonth === undefined || startYear === undefined || endDate === undefined || endMonth === undefined || endYear === undefined ) {
                rej(new Error("Parameter(s) is undefined."))
            }

            axios.post(
                this.url.accountStatementView,
                qs.stringify({
                    'r1': 1,
                    'value(D1)': 0, //account selection
                    'value(startDt)': startDate,
                    'value(startMt)': startMonth,
                    'value(startYr)': startYear,
                    'value(endDt)': endDate,
                    'value(endMt)': endMonth,
                    'value(endYr)': endYear,
                    'as_fid': asfid
                }),
                {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Cookie': this.getCookie(),
                        'Referer': this.url.accountStatementForm,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            )
                .then((response: AxiosResponse) => {
                    if (/INFORMASI REKENING - MUTASI REKENING/g.test(response.data)) {
                        let trx = response.data.match(/<tr bgcolor='(#e0e0e0|#f0f0f0)'>(.*)(CR|DB)<\/td>/g);
                        res({
                            action: "viewStatement",
                            success: 1,
                            result: {
                                transactions: trx
                            }
                        })
                    }
                    else {
                        res({
                            action: "viewStatement",
                            success: 0
                        })
                    }
                })
                .then((error: AxiosError) => {
                    rej(error);
                })
        })
    }

    getAccountInfoMenu() {
        return new Promise((res, rej) => {
            axios.post(
                this.url.accountInfoMenu,
                {},
                {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Cookie': this.getCookie(),
                        'Referer': this.url.mainMenu,
                    }
                }
            )
                .then((response: AxiosResponse) => {
                    if (/INFORMASI REKENING/g.test(response.data)) {
                        res({
                            action: "accessAccountInfoMenu",
                            success: 1
                        })
                    }
                    else {
                        res({
                            action: "accessAccountInfoMenu",
                            success: 0
                        })
                    }
                })
                .then((error: AxiosError) => {
                    rej(error);
                })
        })
    }

    getAccountStatementMenu() {
        return new Promise((res, rej) => {
            axios.post(
                this.url.accountStatementForm,
                {},
                {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Cookie': this.getCookie(),
                        'Referer': this.url.accountInfoMenu,
                    }
                }
            )
                .then((response: AxiosResponse) => {
                    let fid = response.data.match(/<input type="hidden" name="as_fid" value="(.*)" \/><\/form>/g);
                    res({
                        action: "accessAccountStatementMenu",
                        success: 1,
                        result: {
                            "as_fid": fid ? fid[0].slice(42, -11) : ""
                        }
                    })
                })
                .then((error: AxiosError) => {
                    rej(error);
                })
        })
    }

    findIpAddress(haystack: string): RegExpMatchArray | null {
        return haystack.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g)
    }

    parseTransactions(htmlData: string[], startDate:Date, endDate:Date ):Promise<Object>{
        let statements: string = htmlData.map((e) => { return e + "</tr>"; }).join("");
        let rows = htmlParser.parse(statements).querySelectorAll("tr");
        let transactions:Transaction[] = [];
        let years: number[] = [];
        let yearIndex = 0;

        for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) {
            years.push(y);
        }

        let bookDate: Date;
        rows.forEach((row: HTMLElement, index: number) => {
            let trx: Transaction = { bookDate: "", transactionDate: "", notes: "", amount: 0, entryType: ""};
            let cols = row.querySelectorAll('td');
            for (let i = 0; i < cols.length; i++) {
                if (cols[0].innerHTML.trim() != "PEND") {
                    let date = cols[0].innerHTML.split("/");
                    for (let i = yearIndex; i < years.length; i++) {
                        let year = years[i];
                        let guessDate = new Date(year, Number.parseInt(date[1]) - 1, Number.parseInt(date[0]));
                        if (guessDate.valueOf() - startDate.valueOf() >= 0 && endDate.valueOf() - guessDate.valueOf() >= 0) {
                            yearIndex = i;
                            trx.bookDate = guessDate.getUTCFullYear() + "-" + (guessDate.getUTCMonth() + 1) + "-" + guessDate.getUTCDate();
                            bookDate = guessDate;
                            break;
                        }
                    }
                }
                else {
                    trx.bookDate = false;
                }

                let details = cols[1].innerHTML.split("<br />");
                let mm,dd;
                // 1st form, mm/dd
                if (/\d\d\/\d\d \d\d\d\d\d/g.test(details[1])) {
                    mm = details[1].slice(0, 2);
                    dd = details[1].slice(3, 5);
                }
                //2nd form, dd/mm
                else if (/TANGGAL :\d\d\/\d\d/.test(details[1])) {
                    mm = details[1].slice(12, 14);
                    dd = details[1].slice(9, 11);
                }
                //3rd form, ddmm
                else if (/\d\d\d\d\/(.*)\/\w\w\d\d\d\d\d/g.test(details[1])) {
                    mm = details[1].slice(2, 4);
                    dd = details[1].slice(0, 2);
                }
                //4th form, dd/mm
                else if (/\d\d\/\d\d\s\sWSID/g.test(details[1])) {
                    dd = details[1].slice(0, 2);
                    mm = details[1].slice(3, 5);
                }

                if (dd && mm) {
                    let month = Number.parseInt(mm);
                    let day = Number.parseInt(dd);

                    let guessTrxDate = new Date(bookDate.getUTCFullYear(), month- 1, day);
                    if (guessTrxDate.valueOf() > bookDate.valueOf()) {
                        guessTrxDate = new Date(bookDate.getUTCFullYear() - 1, month - 1, day);
                    }
                    trx.transactionDate = guessTrxDate.getUTCFullYear() + "-" + (guessTrxDate.getUTCMonth() + 1) + "-" + guessTrxDate.getUTCDate();
                }
                else {
                    trx.transactionDate = trx.bookDate;
                }
                trx.notes = details.join("\n");
                trx.amount = Number.parseFloat(details[details.length - 1].replace(",", ""));
                trx.entryType = cols[2].innerHTML;
            }
            transactions[index] = trx;
        });
        return new Promise(res => res(transactions));
    }
}

module.exports = Bca;