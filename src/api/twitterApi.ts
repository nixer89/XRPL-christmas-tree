import * as Twit from 'twit';
import * as config from '../config/config';
import * as util from '../util';

import consoleStamp = require("console-stamp");
consoleStamp(console, { pattern: 'yyyy-mm-dd HH:MM:ss' });

export class TwitterApi {

    twitterClient:Twit;

    constructor() {}

    async initTwitter(): Promise<boolean> {
        try {
            this.twitterClient = new Twit({
                consumer_key: config.TWITTER_CONSUMER_KEY,
                consumer_secret: config.TWITTER_CONSUMER_SECRET,
                access_token: config.TWITTER_ACCESS_TOKEN,
                access_token_secret: config.TWITTER_ACCESS_SECRET
            });
        } catch(err) {
            console.log("Error initializing twitter api");
            console.log(JSON.stringify(err))
            return false;
        }

        return true;
    }

    async sendTweet(message:string) {
        try {
            await this.twitterClient.post('statuses/update', { status: message });
        } catch(err) {
            console.log("Error sending out tweet.");
            console.log(JSON.stringify(err));
        }
    }

    writeToConsole(message:string) {
        util.writeConsoleLog('[TWITTER] ', message);
    }
}
