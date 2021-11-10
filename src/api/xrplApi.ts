import * as config from '../config/local_config';
import { Destination } from 'xrpl-tagged-address-codec/dist/types';
import { init } from 'node-persist';
import { Client, Payment, Wallet, SubmitResponse, TxResponse, xrpToDrops } from 'xrpl';
import { Memo } from 'xrpl/dist/npm/models/common';

export class XRPLApi {
    //api:ripple.RippleAPI;
    xrplClient: Client;


    constructor() {
        this.init();
    }

    async init() {
        this.xrplClient = new Client(config.XRPL_SERVER);
    }

    async makePayment(xrp: string, memos:Memo[], retry?: boolean): Promise<TxResponse> {
        let ledgerResponse:TxResponse = null;
        try {
            console.log("XRPL connecting...")
            await this.xrplClient.connect();

            if(this.xrplClient.isConnected()) {
            
                let destinationAccount:Destination = {
                    account: config.XRPL_DESTINATION_ACCOUNT
                }
                //prepare transaction
                console.log("preparing transaction");

                let newPayment:Payment = {
                    TransactionType: "Payment",
                    Account: config.XRPL_SOURCE_ACCOUNT,
                    Amount: xrpToDrops(xrp),
                    Destination: destinationAccount.account,
                    Memos: memos
                }
                
                let wallet:Wallet = Wallet.fromSecret(config.XRPL_SOURCE_ACCOUNT_SECRET);

                console.log(JSON.stringify(newPayment));

                ledgerResponse = await this.xrplClient.submitAndWait(newPayment, { wallet: wallet});

                let retryCount = 0;
                while(retryCount < 10 && ledgerResponse && ledgerResponse.result && typeof(ledgerResponse.result.meta) === 'object' && "tesSUCCESS" != ledgerResponse.result.meta.TransactionResult) {
                    //retry to submit transaction 10 times.
                    ledgerResponse = await new Promise((resolve) => {
                        setTimeout(async () => {
                            retryCount++;
                            let promiseResult:TxResponse = await this.xrplClient.submitAndWait(newPayment, { wallet: wallet});;
                            resolve(promiseResult);
                        },4000);
                    });
                }

                console.log(ledgerResponse);
            } else {
                if(!retry) {
                    init();
                    this.makePayment(xrp, memos, true);
                } else {
                    console.log("Error: could not connect to XRPL");
                }
            }

        } catch(err) {
            console.log("Error sending XRP Payment.");
            console.log(err);
            if(this.xrplClient.isConnected())
                await this.xrplClient.disconnect();
        }

        if(this.xrplClient.isConnected())
            await this.xrplClient.disconnect();

        return ledgerResponse;
    }
}
