import { env } from 'process';
import { MongoClient } from 'mongodb';
import { error } from 'console';

const DB_HOST = env.DB_HOST || 'localhost';
const DB_PORT = env.DB_PORT || 27017;
const DB_DATABASE = env.DB_DATABASE || 'files_manager';

const url = `mongodb://${DB_HOST}:${DB_PORT}`;

class DBStorage {
  constructor() {
    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.client.connect((err) => {
      if (!err) {
        this.db = this.client.db(DB_DATABASE);
      } else {
        this.db = false;
        console.log(error.message);
      }
    });
  }

  isAlive() {
    return Boolean(this.db);
  }

  async nbUsers() {
    const usersCol = this.db.collection('users');
    return usersCol.countDocuments();
  }

  async nbFiles() {
    const filesCol = this.db.collection('files');
    return filesCol.countDocuments();
  }
}

const dbClient = new DBStorage();

export default dbClient;
