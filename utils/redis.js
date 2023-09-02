import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (e) => { console.log(e.message); });

    this.client.on('connect', () => {
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    const value = await getAsync(key);
    return value;
  }

  async set(key, value, time) {
    const asyncSet = promisify(this.client.set).bind(this.client);
    await asyncSet(key, value, 'EX', time);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
