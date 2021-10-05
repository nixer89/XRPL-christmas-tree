import * as codec from 'xrpl-tagged-address-codec'
import * as config from '../config/config';
import { Destination } from 'xrpl-tagged-address-codec/dist/types';
import { init } from 'node-persist';
import { Client, Payment, Wallet, SubmitResponse } from 'xrpl';

export class XRPLApi {
    //api:ripple.RippleAPI;
    xrplClient: Client;


    constructor() {
        this.init();
    }

    init() {
        this.xrplClient = new Client("wss://xrplcluster.com");
    }

    async makePayment(xrp: string, memos:any[], retry?: boolean): Promise<SubmitResponse> {
        let ledgerResponse:SubmitResponse = null;
        try {
            console.log("XRPL connecting...")
            await this.xrplClient.connect();

            if(this.xrplClient.isConnected()) {
            
                let destinationAccount:Destination = codec.Decode(config.XRPL_DESTINATION_ACCOUNT_X_ADDRESS);
                //prepare transaction
                console.log("preparing transaction");

                let newPayment:Payment = {
                    TransactionType: "Payment",
                    Account: config.XRPL_SOURCE_ACCOUNT,
                    Amount: xrp,
                    Destination: destinationAccount.account,
                    DestinationTag: Number(destinationAccount.tag),
                    Memos: memos
                }
                
                let wallet:Wallet = Wallet.fromSecret(config.XRPL_SOURCE_ACCOUNT_SECRET);

                let ledgerResponse = await this.xrplClient.submitTransaction(wallet, newPayment);

                let retryCount = 0;
                while(retryCount < 10 && ledgerResponse && ledgerResponse.result && "tesSUCCESS" != ledgerResponse.result.engine_result) {
                    //retry to submit transaction 10 times.
                    ledgerResponse = await new Promise((resolve) => {
                        setTimeout(async () => {
                            retryCount++;
                            let promiseResult:SubmitResponse = await this.xrplClient.submitTransaction(wallet, newPayment);
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
            console.log(JSON.stringify(err));
            if(this.xrplClient.isConnected())
                await this.xrplClient.disconnect();
        }

        if(this.xrplClient.isConnected())
            await this.xrplClient.disconnect();

        return ledgerResponse;
    }
}
