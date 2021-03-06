import * as ripple from 'ripple-lib';
import * as codec from 'xrpl-tagged-address-codec'
import * as config from '../config/config';
import { FormattedSubmitResponse } from 'ripple-lib/dist/npm/transaction/submit';
import { Destination } from 'xrpl-tagged-address-codec/dist/types';
import { init } from 'node-persist';

export class XRPLApi {
    api:ripple.RippleAPI;
    constructor() {
        this.init();
    }

    init() {
        if(config.USE_PROXY)
            this.api = new ripple.RippleAPI({server: config.XRPL_SERVER, proxy: config.PROXY});
        else
            this.api = new ripple.RippleAPI({server: config.XRPL_SERVER});
    }

    async makePayment(xrp: string, memos:any[], retry?: boolean): Promise<FormattedSubmitResponse> {
        let result:FormattedSubmitResponse = null;
        try {
            console.log("XRPL connecting...")
            await this.api.connect();

            if(this.api.isConnected()) {
            
                let destinationAccount:Destination = codec.Decode(config.XRPL_DESTINATION_ACCOUNT_X_ADDRESS);
                //prepare transaction
                console.log("preparing transaction");
                const preparedTx = await this.api.preparePayment(config.XRPL_SOURCE_ACCOUNT, {
                    source: {
                        address: config.XRPL_SOURCE_ACCOUNT,
                        maxAmount: {
                            value: xrp,
                            currency: 'XRP'
                        }
                    },
                    destination: {
                        address: destinationAccount.account,
                        tag: Number(destinationAccount.tag),
                        amount: {
                            value: xrp,
                            currency: 'XRP'
                        }
                    },
                    memos: memos,
                });

                //sign transaction
                console.log("signing transaction");
                const signedTransaction = await this.api.sign(preparedTx.txJSON, config.XRPL_SOURCE_ACCOUNT_SECRET);

                //submit transaction
                console.log("submitting transaction");
                result = await this.api.submit(signedTransaction.signedTransaction);

                let retryCount = 0;
                while(retryCount < 10 && result && "tesSUCCESS" != result.resultCode) {
                    //retry to submit transaction 10 times.
                    result = await new Promise((resolve) => {
                        setTimeout(async () => {
                            retryCount++;
                            let promiseResult:FormattedSubmitResponse = await this.api.submit(signedTransaction.signedTransaction);
                            resolve(promiseResult);
                        },4000);
                    });
                }

                console.log(result);
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
            if(this.api.isConnected())
                await this.api.disconnect();
        }

        if(this.api.isConnected())
            await this.api.disconnect();

        return result;
    }
}
