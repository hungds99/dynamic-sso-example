/*  EXPRESS */
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const SamlStrategy = require('passport-saml').Strategy;

const multipass = require('./multipass');

// init app
const app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
// set up session
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: 'SECRET',
  })
);
// set up view engine
app.set('view engine', 'ejs');
// set up passport
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function (user, cb) {
  cb(null, user);
});
passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});
// to allow CORS calls
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
});

// configuration constants
const HOST_DOMAIN = process.env.HOST_DOMAIN;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = `${HOST_DOMAIN}/auth/login/callback/google`;

const OKTA_SAML_CERT = fs.readFileSync('./saml.pem', 'utf-8');
const OKTA_SAML_ISSUER = process.env.OKTA_SAML_ISSUER;
const OKTA_SAML_ENTRY_POINT = process.env.OKTA_SAML_ENTRY_POINT;
const OKTA_SAML_CALLBACK_URL = `${HOST_DOMAIN}/auth/login/callback/saml`;

const OKTA_SAML_CONFIG = {
  issuer: OKTA_SAML_ISSUER,
  callbackUrl: OKTA_SAML_CALLBACK_URL,
  entryPoint: OKTA_SAML_ENTRY_POINT,
  cert: OKTA_SAML_CERT,
};

const GOOGLE_AUTH_CONFIG = {
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: GOOGLE_CALLBACK_URL,
};

app.get('/', function (req, res) {
  res.render('pages/auth');
});

app.get('/success', (req, res) => {
  res.send('success');
});

app.get('/error', (req, res) => res.send('error logging in'));

app.get('/auth/login/:method', function (req, res, next) {
  // Request parameter is passed in as a string
  const method = req.params.method;

  // Login with Google method
  if (method === 'google') {
    console.log('Login with Google method');
    passport.use(
      'google-custom',
      new GoogleStrategy(GOOGLE_AUTH_CONFIG, (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      })
    );

    return passport.authenticate('google-custom', {
      scope: ['profile', 'email'],
    })(req, res, next);
  }
});

app.get(
  '/auth/login/callback/:method',
  function (req, res, next) {
    return passport.authenticate('google-custom', {
      failureRedirect: '/error',
    })(req, res, next);
  },
  (req, res) => {
    // NOTE: notice how we use `passport.unuse` to delete
    // the specific strategy after it is done being used
    passport.unuse('google-custom');
    const url = multipass.generateUrl({
      email: req.user.emails[0].value,
      first_name: 'Nic',
      last_name: 'Potts',
      tag_string: 'canadian, premium',
      identifier: 'nic123',
    });
    console.log(url);
    return res.redirect(url);
  }
);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App listening on port ' + port));
