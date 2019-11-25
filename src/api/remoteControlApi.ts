import * as ripple from 'ripple-lib';
import * as mqtt from 'mqtt';
import * as hue from './hueApi'
import * as config from '../config/config';

export class RemoteControlApi {

    api:ripple.RippleAPI;
    hue:hue.HueApi;
    mqttClient: mqtt.Client;

    partyModeTimer:NodeJS.Timeout;

    constructor() {
        if(config.USE_PROXY)
            this.api = new ripple.RippleAPI({server: config.XRPL_SERVER, proxy: config.PROXY});
        else
            this.api = new ripple.RippleAPI({server: config.XRPL_SERVER});

        this.hue = new hue.HueApi();
    }

    async init(): Promise<boolean> {
        try {
            //connecting hue
            await this.hue.initHue();

            //connect to XRPL
            console.log("XRPL connecting...")
            await this.api.connect();
            console.log("XRPL connected.")

            //subscribe to account
            let subscribeResponse:any = await this.api.request('subscribe', {
                accounts:[config.XRPL_SOURCE_ACCOUNT]
            });

            if(subscribeResponse) {
                console.log("Successfully subscribed");
                console.log("waiting for XRPL Transactions ...");
            } else {
                console.log("could not subscribe")
                console.log(JSON.stringify(subscribeResponse));
            }

            //listen on transactions
            this.api.connection.on('transaction', (trx) => {
                console.log("got new transaction:");
                //handle new incoming transaction
                this.checkIncomingXRPLTrx(trx);
            });

            console.log("connecting mqtt...");
            //connect to XRPTipBot API MQTT
            this.mqttClient = mqtt.connect(config.XRPTIPBOT_MQTT_URL);
            this.mqttClient.on('connect', () => {
                console.log("MQTT connected. Subscribing to topics:");
                console.log("subscribing to topic: " + 'tip/received/twitter/'+config.TWITTER_USER_NAME);
                this.mqttClient.subscribe('tip/received/twitter/'+config.TWITTER_USER_NAME);
                this.mqttClient.subscribe('tip/received/twitter/'+config.TWITTER_USER_NAME.toLowerCase());
                console.log("waiting for tips...");
            });

            this.mqttClient.on('message', async (topic, message) => {
                this.checkIncomingTipbotTrx(JSON.parse(message.toString()));
            });

            return true;
        } catch(err) {
            console.log(JSON.stringify(err));
            return false;
        }
    }

    async checkIncomingXRPLTrx(trx: any) {
        if(trx && trx.validated && trx.transaction.TransactionType === 'Payment') {
            let amount:number = Number(this.api.dropsToXrp(trx.meta.delivered_amount));
            let destTag:number = trx.transaction.DestinationTag;

            console.log("sent " + amount + " XRP to Destination Tag: " + destTag);
            this.handleIncomingTransaction(amount, destTag);
        }
    }

    async checkIncomingTipbotTrx(tip: any) {
        this.handleIncomingTransaction(tip.xrp);
    }

    async handleIncomingTransaction(amount: number, destTag?: number) {
        console.log("received transaction with " + amount + " XRP and destination tag: " + destTag);
        if(amount == 1.337 || amount == 0.5 ) {
            await this.hue.changeGroupStatus(config.HUE_GROUP_NAME, true);

            //check for party mode
            if(amount == 1.337 || (destTag && destTag === 1337))
                this.startPartyMode();

        } else if(amount == 1 ) {
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
                this.partyModeTimer = setTimeout(() => this.stopPartyMode(), 60000);
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