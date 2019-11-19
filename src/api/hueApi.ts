import * as hue from 'huejay';
import * as config from '../config/config';

export class HueApi {
    
    client:any;

    async initHue(): Promise<boolean> {
        let bridge = await this.discoverBridges();

        if(bridge && bridge.ip) {
            this.client = new hue.Client({
                host:     bridge.ip,
                username: config.HUE_USER_NAME,
            });

            return this.client.bridge.isAuthenticated();
        } else {
            return false;
        }
    }

    async discoverBridges(): Promise<any> {
        let bridges = await hue.discover();

        console.log("Found bridgers: " + JSON.stringify(bridges));
        return bridges[0];
    }

    async checkChristmasTreeStatus(): Promise<boolean> {
        let lightOn = false;
        
        let groups = await this.client.groups.getAll();
        
        groups.forEach(group => {
            if('Weihnachtsbaum' === group.name) {
                console.log("Hue Group: " + JSON.stringify(group));
                lightOn = group.allOn;
            }
        });

        return lightOn;
    }
}