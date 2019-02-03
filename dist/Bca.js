const axios = require("axios");
const qs = require("querystring");
class Bca {
    constructor(config) {
        this.url = {
            loginForm: 'https://m.klikbca.com/login.jsp',
            auth: 'https://m.klikbca.com/authentication.do',
            menu: 'https://m.klikbca.com/authentication.do?value(actions)=menu',
            logout: 'https://m.klikbca.com/authentication.do?value(actions)=logout',
        };
        this.userAgent = 'Mozilla/5.0 (Android 7.0; Mobile; rv:54.0) Gecko/54.0 Firefox/54.0';
        this.axiosConfig = {
            headers: { 'User-Agent': this.userAgent }
        };
        this.cookie = [];
        if (config && config.username && config.password) {
            this.username = config.username;
            this.password = config.password;
            this.ip = "";
        }
        else {
            throw new Error("Missing config parameters");
        }
    }
    setCookie(cookie) {
        let cookiePlaceholder = [];
        cookie.forEach(e => {
            let c = e.split(";");
            cookiePlaceholder.push(c[0]);
        });
        this.cookie = cookiePlaceholder;
    }
    getCookie() {
        return this.cookie.join(";");
    }
    getLoginForm() {
        return new Promise((res, rej) => {
            axios({
                method: "get",
                url: this.url.loginForm
            })
                .then((response) => {
                this.setCookie(response.headers["set-cookie"]);
                let ipAddresses = this.findIpAddress(response.data);
                if (ipAddresses && ipAddresses.length == 2)
                    this.ip = ipAddresses[0];
                else
                    throw new Error("IP Address could not be found in the login page.");
                res(response);
            })
                .catch((err) => {
                rej(err);
            });
        });
    }
    login() {
        return new Promise((res, rej) => {
            this.getLoginForm()
                .then(ret => {
                return axios.post(this.url.auth, qs.stringify({
                    'value(user_id)': this.username,
                    'value(pswd)': this.password,
                    'value(Submit)': 'LOGIN',
                    'value(actions)': 'login',
                    'value(user_ip)': this.ip,
                    'user_ip': this.ip,
                    'value(mobile)': true,
                    'mobile': true,
                    'value(browser_info)': this.userAgent
                }), {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Cookie': this.getCookie(),
                        'Referer': this.url.loginForm,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
            })
                .then((response) => {
                if (/MENU UTAMA/g.test(response.data)) {
                    res({
                        action: "login",
                        success: 1
                    });
                }
                else {
                    res({
                        action: "login",
                        success: 0
                    });
                }
            })
                .catch(err => {
                rej(err);
            });
        });
    }
    logout() {
        return new Promise((res, rej) => {
            axios.get(this.url.logout, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Cookie': this.getCookie(),
                    'Referer': this.url.auth,
                }
            })
                .then((response) => {
                if (/Silakan masukkan USER ID Anda/g.test(response.data)) {
                    res({
                        action: "logout",
                        success: 1
                    });
                }
                else {
                    res({
                        action: "logout",
                        success: 0
                    });
                }
            })
                .catch((err) => {
                rej(err);
            });
        });
    }
    findIpAddress(haystack) {
        return haystack.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g);
    }
}
module.exports = Bca;
//# sourceMappingURL=Bca.js.map