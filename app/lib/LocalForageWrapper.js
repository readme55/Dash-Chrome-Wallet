class LocalForageWrapper {
    constructor() {
        this.forage = localforage;
        this.isConfig = false;
    }

    config() {
        this.isConfig = true;
    }

    async setItem(key, item) {
        console.log('setItem', key, item);
        if (typeof item === 'object') {
            await this.forage.setItem(key, JSON.stringify(item));
        } else {
            await this.forage.setItem(key, item);
        }

        return item;
    }

    async getItem(key) {
        console.log('get item', key);
        const item = await this.forage.getItem(key);
        let res;
        try {
            res = JSON.parse(item);
        } catch (e) {
            res = item;
        }
        return res || null;
    }
}