const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');
const EmailCode = require('../models/EmailCode');
const jwt = require('jsonwebtoken');

const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async (req, res) => {
  const { email, password, firstName, lastName, image, country, frontBaseUrl } = req.body;
  const encriptedPassword = await bcrypt.hash(password, 10); // encriptacoin password
  const result = await User.create({
      email, password: encriptedPassword, firstName, lastName, image, country
  });
  
  const code = require('crypto').randomBytes(32).toString('hex');
  const link = `${frontBaseUrl}/${code}`;

  await EmailCode.create({
    code,
    userId: result.id,
  })

  await sendEmail({
    to: email,
    subject: 'Verificate email for user app',
    html: `
        <h1>Hello ${firstName} ${lastName}</h1>
        <p>Thank you for creating an account with us</p> 
        <p>To verify your email, click on the following link:</p>
        <a href='${link}'>${link}</a>
    `
    });
    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await User.destroy({ where: {id} });
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { id } = req.params;
  const { email, firstName, lastName, image, country } = req.body; // no se pueden actualizar
    const result = await User.update(
      { email, firstName, lastName, image, country }, // estas columnas
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const verifyCode = catchError(async(req, res) => {
  const { code } = req.params;
  const emailCode = await EmailCode.findOne({ where: { code: code } })
  if (!emailCode) return res.status(401).json({ message: 'Invalid code' });

  const user = await User.findByPk(emailCode.userId);
  user.isVerified = true;
  await user.save();

  // const user = await User.update(
  //   { isverified: true },
  //   { where: emailCode.userId, returning: true },
  // );

  await emailCode.destroy();

  return res.json(user);
});

const login = catchError(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.isVerified) return res.status(401).json({ message: 'User is not verified' });
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { user },
    process.env.TOKEN_SECRET,
    { expiresIn: '1d' },
  );
  return res.json({ user, token });
});

const getLoggedUser = catchError(async (req, res) => {
  return res.json(req.user);
});

// 
const resetPassword = catchError(async (req, res) => {
  const { email, frontBaseUrl } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: 'User not found' });

  const code = require('crypto').randomBytes(32).toString('hex');
  const link = `${frontBaseUrl}/${code}`;

  await EmailCode.create({
    code,
    userId: user.id,
  });

  await sendEmail({
    to: email,
    subject: 'Reset Password for User App',
    html: `
        <h1>Hello ${user.firstName} ${user.lastName}</h1>
        <p>We received a request to reset your password</p>
        <p>To reset your password, click the link below:</p>
        <a href='${link}'>${link}</a>
    `
  });

  return res.json({ message: 'Password reset email sent' });
});


const newPassword = catchError(async (req, res) => {
  const { password } = req.body;
  const { code } = req.params;
  
  const emailCode = await EmailCode.findOne({ where: { code } });
  if (!emailCode) return res.status(401).json({ message: 'Invalid code' });

  const encriptedPassword = await bcrypt.hash(password, 10); 
  
  const user = await User.findByPk(emailCode.userId);
  user.password = encriptedPassword;
  await user.save();

  await emailCode.destroy();

  return res.json({ message: 'Password updated successfully' });
});


module.exports = {
    getAll,
    create,
    getOne,
    remove,
  update,
  verifyCode,
  login,
  getLoggedUser,
  resetPassword,
    newPassword,
} 