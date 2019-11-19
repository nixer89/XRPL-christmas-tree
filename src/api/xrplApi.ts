import * as ripple from 'ripple-lib';
import * as codec from 'xrpl-tagged-address-codec'
import * as config from '../config/config';
import { FormattedSubmitResponse } from 'ripple-lib/dist/npm/transaction/submit';
import { Destination } from 'xrpl-tagged-address-codec/dist/types';

export class XRPLApi {
    api:ripple.RippleAPI;
    constructor() {
        this.api = new ripple.RippleAPI({server: 'wss://s.altnet.rippletest.net', proxy: config.USE_PROXY ? config.PROXY : null});
    }

    async makePayment(xrp: string, memos:any[]): Promise<FormattedSubmitResponse> {
        let result:FormattedSubmitResponse = null;
        try {
            console.log("XRPL connecting...")
            await this.api.connect();
            
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

            console.log(result);
        } catch(err) {
            console.log("Error sending XRP Payment.");
            console.log(JSON.stringify(err));
        }

        return result;
    }
}
