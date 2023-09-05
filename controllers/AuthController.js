import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const basicAuth = req.header('Authorization');
    const basicToken = basicAuth.split(' ')[1];
    if (!basicToken) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(basicToken, 'base64').toString('utf-8');
    const [email, pas] = credentials.split(':');

    if (!email || !pas) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }

    const userCol = dbClient.db.collection('users');
    const user = await userCol.findOne({ email, password: sha1(pas) });

    if (!user) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;

    await redisClient.set(key, user._id.toString(), (24 * 3600));

    res.statusCode = 200;
    return res.send({ token });
  }

  static async getDisconnect(req, res) {
    const xToken = req.header('X-Token');

    const userId = await redisClient.get(`auth_${xToken}`);

    if (!userId) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${xToken}`);
    res.statusCode = 204;
    return res.send();
  }
}
