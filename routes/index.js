import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const express = require('express');

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', (req, res) => {
  UsersController.postNew(req, res);
});
router.get('/connect', (req, res) => {
  AuthController.getConnect(req, res);
});
router.get('/disconnect', (req, res) => {
  AuthController.getDisconnect(req, res);
});
router.get('/users/me', (req, res) => {
  UsersController.getMe(req, res);
});
router.post('/files', (req, res) => {
  FilesController.postUpload(req, res);
});

export default router;
