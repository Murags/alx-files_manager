import env from 'process';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromise } from 'fs';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import { tryCatch } from 'bull/lib/utils';

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
      name, type, parentId = 0, isPublic = false, data = '',
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

    if (parentId !== 0) {
      let file = null;
      try {
        file = await filesColl.findOne({ _id: ObjectId(parentId) });
      } catch (error) {
        res.statusCode = 400;
        return res.send({ error: "could not retreive parent"})
      }
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
        const filename = uuidv4()
        const filePath = `${folderPath}/${filename}`;
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

  static async getShow(req, res){
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

    const { id } = req.params;

    try {
      const fileColl = await dbClient.db.collection('files');
      const file =  await fileColl.findOne({ _id: ObjectId(id)})
      if(!file){
        res.statusCode = 400;
        return res.send({ error: "Cannot find file"})
      }
      return res.send({
        id: file.insertedId,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      })
    } catch (error) {
      res.statusCode = 400;
      res.send({ error: "Could not retreive file"})
    }
  }

  static async getIndex(req, res){
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

    let { parentId } = req.query;
    const page = parseInt(req.query.page) || 0

    let pageSize = 20
    let skip = page * pageSize


    if (parentId == '0' || !parentId){
      const pipeline = [
        { $match: { parentId: 0 }},
        { $skip: skip},
        { $limit: pageSize}
      ]

      const fileColl = await dbClient.db.collection('files');
      const files = await fileColl.aggregate(pipeline).toArray();
      if(!files){
        return res.send([])
      }
      return res.send(files)
    }

    try {
      const pipeline = [
        { $match: { parentId: parentId}},
        { $skip: skip},
        { $limit: pageSize}
      ]
      const fileColl = await dbClient.db.collection('files');
      const files =  await fileColl.aggregate(pipeline).toArray()
      if(!files){
        return res.send([])
      }
      return res.send(files)
    } catch (error) {
      res.statusCode = 400;
      res.send({ error: "Could not retreive file"})
    }
  }
}
