import { createClient } from 'redis';

class RedisClient {
  client = null;

  constructor() {
    this.client = createClient({
      url:"redis://localhost:6379"
    });
    this.client.on('error', (e) => { console.log(e.message); });

    this.client.on('connect', () => {
      console.log("Connected to redis")
    });

    this.client.connect();
  }

  isAlive() {
    return this.client.isReady;
  }

  async get(key) {
    return await this.client.get(key)
  }

  async set(key, value, time) {
    await this.client.set(key, value, { EX: time,});
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
