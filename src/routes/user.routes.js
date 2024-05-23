const { getAll, create, getOne, remove, update, verifyCode, login, getLoggedUser, resetPassword, newPassword } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require('../utils/verifyJWT');

const userRouter = express.Router();

userRouter.route('/users')
    .get(verifyJWT, getAll)
  .post(create); // NO PROTEGER
    
userRouter.route('/users/verify/:code')
  .get(verifyCode); // NO PROTEGER

userRouter.route('/users/login')
  .post(login);  // NO PROTEGER

userRouter.route('/users/me')
  .get(verifyJWT, getLoggedUser);

  //
userRouter.route('/users/reset_password')
  .post(resetPassword);

userRouter.route('/users/reset_password/:code')
  .post(newPassword);

//

userRouter.route('/users/:id')
    .get(verifyJWT, getOne)
    .delete(verifyJWT, remove)
    .put(verifyJWT, update);

module.exports = userRouter;  