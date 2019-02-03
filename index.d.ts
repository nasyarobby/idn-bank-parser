export interface ParserConfig {
    username: string;
    password: string;
}

export interface IdnBankParser {
    login: Function;
    logout: Function;
}