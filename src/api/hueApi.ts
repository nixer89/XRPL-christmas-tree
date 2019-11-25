import * as hue from 'huejay';
import * as config from '../config/config';

export class HueApi {
    
    client:any;

    async initHue(): Promise<boolean> {
        try {
            this.client = new hue.Client({
                host:     config.HUE_BRIDGE_IP,
                username: config.HUE_USER_NAME,
            });

            if(this.client)
                return this.client.bridge.isAuthenticated();
            else
                return false;
        } catch(err) {
            console.log("Error discovering bridges");
            console.log(JSON.stringify(err));
        }
    }

    async discoverBridges(): Promise<any> {
        //only search for local bridges!
        let bridges:any[] = await hue.discover();
        console.log("discovered bridges: " + JSON.stringify(bridges));

        return bridges[0];
    }

    async checkChristmasTreeStatus(): Promise<boolean> {
        let lightOn = false;
        
        try {
            let groups = await this.client.groups.getAll();
            
            groups.forEach(group => {
                if(config.HUE_GROUP_NAME === group.name) {
                    lightOn = group.allOn;
                }
            });
        } catch(err) {
            console.log("Error getting light data");
            console.log(JSON.stringify(err));
            //try to reinitialize
            await this.initHue();
        }

        return lightOn;
    }
}