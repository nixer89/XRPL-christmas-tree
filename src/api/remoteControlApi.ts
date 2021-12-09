import * as hue from './hueApi'
import * as config from '../config/config';

import { Client, dropsToXrp, SubscribeRequest, SubscribeResponse, TransactionStream} from 'xrpl';


export class RemoteControlApi {

    xrplClient:Client;

    hue:hue.HueApi;

    partyModeTimer:NodeJS.Timeout;

    constructor() {

        this.xrplClient = new Client(config.XRPL_SERVER);

        this.hue = new hue.HueApi();
    }

    async init(): Promise<boolean> {
        try {
            //connecting hue
            await this.hue.initHue();

            //connect to XRPL
            console.log("XRPL connecting...")
            await this.xrplClient.connect();
            //await this.api.connect();
            console.log("XRPL connected.")

            let subscription: SubscribeRequest = {
                command: "subscribe",
                accounts:[config.XRPL_DESTINATION_ACCOUNT]
            }

            let subscribeResponse: SubscribeResponse = await this.xrplClient.request(subscription);

            //subscribe to account
            //let subscribeResponse:any = await this.api.request('subscribe', {
            //    accounts:[config.XRPL_SOURCE_ACCOUNT]
            //});

            if(subscribeResponse) {
                console.log("Successfully subscribed to xrpl account");
                console.log("waiting for XRPL Transactions ...");
            } else {
                console.log("could not subscribe")
                console.log(JSON.stringify(subscribeResponse));
            }

            //listen on transactions

            this.xrplClient.on('transaction', trx => {
                console.log("got new transaction:");
                //handle new incoming transaction
                this.checkIncomingXRPLTrx(trx);
            });
            
            return true;
        } catch(err) {
            console.log(JSON.stringify(err));
            return false;
        }
    }

    async checkIncomingXRPLTrx(trx: TransactionStream) {
        if(trx && trx.validated && trx.transaction.TransactionType === 'Payment'
            && trx.meta.TransactionResult === 'tesSUCCESS' && trx.transaction.Destination === config.XRPL_DESTINATION_ACCOUNT) {
                if(typeof(trx.meta.delivered_amount) === "string" ) {
                    let amount:number = Number(dropsToXrp(trx.meta.delivered_amount));

                    this.handleIncomingTransaction(amount);
                }
        }
    }

    async handleIncomingTransaction(amount: number) {
        console.log("received transaction with " + amount + " XRP.");
        if(amount >= 1 ) {
            await this.hue.changeGroupStatus(config.HUE_GROUP_NAME, true);

            //check for party mode
            //if(amount == 1.337 || (destTag && destTag === 1337))
                //this.startPartyMode();

        } else if(amount < 1) {
            await this.hue.changeGroupStatus(config.HUE_GROUP_NAME, false);
        }
    }

    async startPartyMode(): Promise<void> {
        console.log("starting party mode");
        try {
            this.hue.changeGroupStatus(config.HUE_PARTY_GROUP_NAME, true);

            if(this.partyModeTimer) {
                this.partyModeTimer.refresh();
            } else {
                this.partyModeTimer = setTimeout(() => this.stopPartyMode(), 180000);
            }
        } catch(err) {
            console.log(JSON.stringify(err));
        }
    }

    async stopPartyMode(): Promise<any> {
        console.log("stopping Partymode!");
        this.hue.changeGroupStatus(config.HUE_PARTY_GROUP_NAME, false);
    }
}