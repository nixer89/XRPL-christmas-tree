import * as ably from 'ably';
import * as hue from './hueApi'
import * as config from '../config/config';

import { Client, SubscribeRequest, SubscribeResponse, TransactionStream, xrpToDrops} from 'xrpl';


export class RemoteControlApi {

    xrplClient:Client;

    hue:hue.HueApi;
    ablyCLient:ably.Realtime;

    partyModeTimer:NodeJS.Timeout;

    constructor() {

        this.xrplClient = new Client("wss://xrplcluster.com");

        this.hue = new hue.HueApi();
        this.ablyCLient = new ably.Realtime('B7SnrQ.qc3_zg:wozN1XAAVhiNqJdK');
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
                accounts:[config.XRPL_SOURCE_ACCOUNT]
            }

            let subscribeResponse: SubscribeResponse = await this.xrplClient.request(subscription);

            //subscribe to account
            //let subscribeResponse:any = await this.api.request('subscribe', {
            //    accounts:[config.XRPL_SOURCE_ACCOUNT]
            //});

            if(subscribeResponse) {
                console.log("Successfully subscribed");
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
            })

            //check for incoming tips via @xrptipbot app using Ably
            if(config.ABLY_CHANNEL_ID) {
                console.log("connecting to ably channel...");
                let pushChannel:ably.Types.RealtimeChannelCallbacks = this.ablyCLient.channels.get(config.ABLY_CHANNEL_ID);
                console.log("waiting for tips...");
                pushChannel.subscribe('bump', message => {
                    let tipMessage = JSON.parse(message.data);
                    if(tipMessage && tipMessage.code == 200 && tipMessage.message === 'BUMP_OK' && tipMessage.me.slug === config.TWITTER_USER_NAME) {
                        this.handleIncomingTransaction(tipMessage.amount);
                    }
                });
            }
            
            return true;
        } catch(err) {
            console.log(JSON.stringify(err));
            return false;
        }
    }

    async checkIncomingXRPLTrx(trx: TransactionStream) {
        if(trx && trx.validated && trx.transaction.TransactionType === 'Payment'
            && trx.meta.TransactionResult === 'tesSUCCESS' && trx.transaction.Destination === config.XRPL_SOURCE_ACCOUNT) {
                if(typeof(trx.meta.delivered_amount) === "string" ) {
                    let amount:number = Number(xrpToDrops(trx.meta.delivered_amount));
                    let destTag:number = trx.transaction.DestinationTag;

                    this.handleIncomingTransaction(amount, destTag);
                }
        }
    }

    async checkIncomingTipbotTrx(tip: any) {
        //only allow tips directly sent on twitter here. Tips through app are handled through Ably!
        if(tip.network === 'twitter')
            this.handleIncomingTransaction(tip.xrp);
    }

    async handleIncomingTransaction(amount: number, destTag?: number) {
        console.log("received transaction with " + amount + " XRP and destination tag: " + destTag);
        if(amount == 1.337 || amount == 0.5 ) {
            await this.hue.changeGroupStatus(config.HUE_GROUP_NAME, true);

            //check for party mode
            if(amount == 1.337 || (destTag && destTag === 1337))
                this.startPartyMode();

        } else if(amount == 1) {
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