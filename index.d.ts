export interface ParserConfig {
    username: string;
    password: string;
}

export interface IdnBankParser {
    login: Function;
    logout: Function;
}

export interface Transaction {
    transactionDate: string|boolean; //YYYY/MM/DD or false if nothing
    bookDate: string|boolean; //YYYY/MM/DD or false if nothing
    entryType: string; // CR or DB
    amount: number; // the amount of transactions
    notes: string; // notes from the bank system, usually contain amount, description, other party's account, or reference number
}