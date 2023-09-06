import env from 'process';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromise } from 'fs';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class FilesController {
  static async postUpload(req, res) {
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

    const fileTypes = ['folder', 'file', 'image'];

    const {
      name, type, parentId = null, isPublic = false, data = '',
    } = req.body;

    if (!name) {
      res.statusCode = 400;
      return res.send({ error: 'Missing name' });
    }

    if (!type || !fileTypes.includes(type)) {
      res.statusCode = 400;
      return res.send({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      res.statusCode = 400;
      return res.send({ error: 'Missing data' });
    }

    const filesColl = dbClient.db.collection('files');

    if (parentId !== null) {
      const file = await filesColl.findOne({ _id: ObjectId(parentId) });
      if (!file) {
        res.statusCode = 400;
        return res.send({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        res.statusCode = 400;
        return res.send({ error: 'Parent is not a folder' });
      }
      if (file.type === 'folder') {
        const folderPath = file.localpath;
        const filePath = `${folderPath}/${name}`;
        const dataDecoded = Buffer.from(data, 'base64');
        await fsPromise.mkdir(folderPath, { recursive: true });
        if (type !== 'folder') {
          await fsPromise.writeFile(filePath, dataDecoded);
        } else {
          await fsPromise.mkdir(filePath);
        }

        const newFile = await filesColl.insertOne({
          userId,
          name,
          type,
          isPublic,
          parentId,
          localpath: filePath,
        });

        res.statusCode = 201;
        return res.send({
          id: newFile.insertedId,
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      }
    } else {
      const folderPath = env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = uuidv4();
      const filePath = `${folderPath}/${fileName}`;
      const dataDecoded = Buffer.from(data, 'base64');

      await fsPromise.mkdir(folderPath, { recursive: true });
      if (type !== 'folder') {
        await fsPromise.writeFile(filePath, dataDecoded);
      } else {
        await fsPromise.mkdir(filePath);
      }

      const newFile = await filesColl.insertOne({
        userId,
        name,
        type,
        isPublic,
        parentId: 0,
        localpath: filePath,
      });

      res.statusCode = 201;

      return res.send({
        id: newFile.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId: 0,
      });
    }
    return res.send();
  }
}
