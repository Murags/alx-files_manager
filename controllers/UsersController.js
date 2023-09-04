import sha1 from 'sha1';
import dbClient from '../utils/db';

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
}
