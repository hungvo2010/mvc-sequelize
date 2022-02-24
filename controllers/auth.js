const User = require("../models/user");
const Token = require("../models/token");

const path = require("path");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const { Op } = require("sequelize");

const Email = require('../util/Email');
const AppError = require('../util/AppError');

const { validationResult } = require('express-validator/check');

require('dotenv').config({path: path.join(__dirname, '.env')});

function getErrorMessage(req){
    let message = req.flash('error');
    message = message.length > 0 ? message[0] : '';
    return message;
}

exports.getLogin = (req, res, next) => {
    let message = getErrorMessage(req);

    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {},
    })
}

exports.postLogin = async (req, res, next) => {
    const {email, password} = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()){
        return res.render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email,
                password,
            },
        })
    }

    try {
        const user = await User.findOne({
            where: {
                email,
            }
        })

        if (!user){
            req.flash('error', 'Invalid user or password');
            return res.redirect('/login');
        }

        try {
            const result = await bcryptjs.compare(password, user.password);
            if (result) { // matching password => login successfully
                req.session.isLoggedIn = true;
                req.session.user = user;
                return req.session.save(err => {
                    res.redirect('/');
                })
            }
            req.flash('error', 'Invalid user or password');
            res.redirect('/login');
        }

        catch (err) {
            return next(AppError('Some error occured.'));
        }
    } catch(err) {
        return next(AppError('Some error occured.'));
    }
}

exports.getSignup = (req, res, next) => {
    let message = getErrorMessage(req);

    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {}
    })
}

exports.postSignup = async (req, res, nexy) => {
    const {email, password, retypepassword} = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        return res.render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email,
                password,
                retypepassword
            }
        })
    }

    try {
        const user = await User.findOne({
            where: {
                email: email,
            }
        })
        if (user) {
            req.flash('error', 'Email exists');
            return res.redirect('/signup');
        }
        try {
            const hashedPassword = await bcryptjs.hash(password, 12);
            await User.create({
                email,
                password: hashedPassword,
            })
            res.redirect('/login');
            new Email(email).send('<p>Hello! Welcome you to my page</p>', 'Sign Up Successfully');
        }
            
        catch (err) {
            return next(AppError('Some error occurred, please try again later'));
        }
    }

    catch (err) {
        return next(AppError('Some error occurred, please try again later'));
    }
}

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    })
}

exports.getReset = (req, res, next) => {
    let message = getErrorMessage(req);

    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message,
    })
}

exports.postReset = async (req, res, next) => {
    const {email} = req.body;

    try {
        const user = await User.findOne({
            where: {
                email,
            }
        })

        if (!user){
            req.flash('error', 'No account with your email found!');
            return res.redirect('/reset');
        }

        crypto.randomBytes(32, async (err, buffer) => {
            if (err) {
                return next(new AppError(err));
            }

            req.flash('error', 'Check your inbox to reset password.');
            res.redirect('/login');

            const token = buffer.toString("hex");
            try {
                const existToken = await Token.findOne({
                    where: {
                        userId: user.id,
                    }
                })
                if (!existToken){
                    return Token.create({
                        userId: user.id,
                        token,
                    })
                }
                existToken.token = token;
                existToken.save();
            }
            catch (err) {
                return next(new AppError(err));
            }
            new Email(email).sendPasswordReset(`<p>Click this <a href='${process.env.BASE_URL}reset/${token}'>link</a> to reset your password.</p>`);
    })
}
    catch (err) {
        return next(new AppError(err));
    }
}

exports.getResetPassword = async (req, res, next) => {
    const {resetToken} = req.params;
    try {
        const existToken = await Token.findOne({
            where: {
                token: resetToken,
                expirationDate: {
                    [Op.gt]: Date.now()
                }
            }
        })
        if (!existToken){
                req.flash('error', 'Your request is not recognized or already expired');
                return res.redirect('/login');
        }
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            resetToken,
            userId: existToken.userId,            
        })
    }
    catch (err) {
        return next(new AppError(err));
    }
}

exports.postNewPassword = async (req, res, next) => {
    const {userId, resetToken, password} = req.body;

    try {
        const existToken = await Token.findOne({
            where: {
                token: resetToken,
                userId,
                expirationDate: {
                    [Op.gt]: Date.now()
                }
            }
        });

        if (!existToken){
            req.flash('error', 'Your request is not recognized or already expired');
            return res.redirect('/login');
        }

        existToken.destroy();
        const user = await User.findByPk(userId);

        try {
            const hashedPassword = await bcryptjs.hash(password, 12);
            user.password = hashedPassword;
            await user.save();
            res.redirect('/login');
        }

        catch (err) {
            return next(new AppError(err));
        }
    }   
    
    catch (err){
        return next(new AppError(err));
    }
}