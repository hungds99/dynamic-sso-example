/*  EXPRESS */
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const SamlStrategy = require('passport-saml').Strategy;

const multipass = require('./utils/multipass');

// init app
const app = express();

// set up view engine
app.set('view engine', 'ejs');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// set up passport
app.use(passport.initialize());

// set up session
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: { secure: true },
  })
);

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

const OKTA_SAML_CONFIG = {
  issuer: process.env.OKTA_SAML_ISSUER,
  callbackUrl: `${HOST_DOMAIN}/auth/login/callback/saml`,
  entryPoint: process.env.OKTA_SAML_ENTRY_POINT,
  cert: fs.readFileSync('./saml.pem', 'utf-8'),
};

const GOOGLE_AUTH_CONFIG = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${HOST_DOMAIN}/auth/login/callback/google`,
  scope: ['profile', 'email'],
};

app.get('/', function (req, res) {
  res.render('pages/index');
});

const passportRegister = (name, strategy, options) => {
  passport.use(name, strategy);
  return passport.authenticate(name, options);
};

app.get('/auth/login/:method', function (req, res, next) {
  // Request parameter is passed in as a string
  const method = req.params.method;

  // Login with Google method
  if (method === 'google') {
    return passportRegister(
      'google-custom',
      new GoogleStrategy(GOOGLE_AUTH_CONFIG, (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      })
    )(req, res, next);
  }

  // Login with Okta SAML method
  if (method === 'saml') {
    return passportRegister(
      'saml-custom',
      new SamlStrategy(OKTA_SAML_CONFIG, (profile, done) => {
        return done(null, profile);
      })
    )(req, res, next);
  }
});

app.get(
  '/auth/login/callback/:method',
  function (req, res, next) {
    // Request parameter is passed in as a string
    const method = req.params.method;

    // Login with Google method
    if (method === 'google') {
      return passport.authenticate('google-custom')(req, res, next);
    }

    // Login with Okta SAML method
    if (method === 'saml') {
      return passport.authenticate('saml-custom')(req, res, next);
    }
  },
  (req, res) => {
    // Request parameter is passed in as a string
    const method = req.params.method;

    // NOTE: notice how we use `passport.unuse` to delete
    // the specific strategy after it is done being used
    passport.unuse(method === 'google' ? 'google-custom' : 'saml-custom');

    // Generate a Shopify multipass URL to your shop
    const url = multipass.generateUrl({
      email: req.user.emails[0].value,
    });

    return res.redirect(url);
  }
);

app.post(
  '/auth/login/callback/:method',
  function (req, res, next) {
    // Request parameter is passed in as a string
    const method = req.params.method;

    // Login with Okta SAML method
    if (method === 'saml') {
      return passport.authenticate('saml-custom')(req, res, next);
    }
  },
  (req, res) => {
    // NOTE: notice how we use `passport.unuse` to delete
    // the specific strategy after it is done being used
    passport.unuse('saml-custom');

    // Generate a Shopify multipass URL to your shop
    const url = multipass.generateUrl({
      email: req.user.email,
    });

    return res.redirect(url);
  }
);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App listening on port ' + port));
