const axios = require("axios");
const qs = require("querystring");
import { AxiosResponse, AxiosError } from "axios";
import { ParserConfig, IdnBankParser } from "./index";

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
                        res({
                            action: "login",
                            success: 0
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

    getTransactions() {

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
                            action: "accessAccountInfo",
                            success: 1
                        })
                    }
                    else {
                        res({
                            action: "accessAccountInfo",
                            success: 0
                        })
                    }
                })
                .then((error: AxiosError) => {
                    rej(error);
                })
        })
    }

    findIpAddress(haystack: string): RegExpMatchArray | null {
        return haystack.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g)
    }
}

module.exports = Bca;