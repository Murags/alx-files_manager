import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      res.statusCode = 400;
      return res.send({ error: 'Missing email' });
    }
    if (!password) {
      res.statusCode = 400;
      return res.send({ error: 'Missing password' });
    }

    const usersCol = dbClient.db.collection('users');

    if (await usersCol.findOne({ email })) {
      res.statusCode = 400;
      return res.send({ error: 'Already exist' });
    }

    const newUser = await usersCol.insertOne({ email, password: sha1(password) });

    res.statusCode = 201;
    return res.send({ id: newUser.insertedId, email });
  }

  static async getMe(req, res) {
    const xToken = req.header('X-Token');

    const userId = await redisClient.get(`auth_${xToken}`);
    if (!userId) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }
    const usersCol = dbClient.db.collection('users');
    const user = await usersCol.findOne({ _id: ObjectId(userId) });

    if (!user) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }

    return res.send({ email: user.email, id: userId });
  }
}
