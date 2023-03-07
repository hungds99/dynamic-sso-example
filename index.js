/*  EXPRESS */
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const SamlStrategy = require('passport-saml').Strategy;
const LocalStrategy = require('passport-local').Strategy;

const multipass = require('./utils/multipass');
const { createMySQLConnection } = require('./utils/dbconnection');

// init app
const app = express();

app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); // set up view engine

// to allow CORS calls
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
});

// required for passport
app.use(
  session({
    secret: process.env.SESSION_SECRET, // session secret
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

passport.serializeUser(function (user, cb) {
  cb(null, user);
});
passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
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

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    console.log('User is not authenticated');
    return next();
  }
  console.log('User is authenticated');
  res.redirect('/auth');
}

app.get('/', isLoggedIn, function (req, res) {
  return res.render('pages/index');
});

app.get('/auth', function (req, res) {
  return res.render('pages/auth');
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

app.post('/auth/login/:method', function (req, res, next) {
  // Request parameter is passed in as a string
  const method = req.params.method;
  if (method === 'local') {
    return passportRegister(
      'local-login',
      new LocalStrategy(
        {
          usernameField: 'email',
          passwordField: 'password',
          passReqToCallback: true,
        },
        function (req, email, password, done) {
          // Validate user login

          // Get user from database
          //

          // Verify user password by hashing
          //

          const user = {
            email: 'dinhsyhung99@gmail.com',
            passport: '123456',
          }; // For dummy

          // Check if user exists
          if (user.email === email) {
            return done(null, { email });
          }
          return done(null, false);
        }
      ),
      {
        successRedirect: '/auth',
        failureRedirect: '/',
      }
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
