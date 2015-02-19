var _ = require('underscore');
var express = require('express');
var request = require('request');
var router = express.Router();

var AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
var AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
var STREAMS_CLIENT_ID = process.env.SCALEWORKS_STREAMS_CLIENT_ID;
var STREAMS_URL = process.env.SCALEWORKS_STREAMS_BACKEND_URL;

router.get('/', ensureAuthenticated, function(req, res, next) {
  res.render('index', commonLocals(req));
});

router.get('/account', ensureAuthenticated, function(req, res, next) {
  res.render('account', commonLocals(req));
});

router.get('/streams', ensureAuthenticated, ensureAuthorizedByRole('admin'),
  function(req, res, next) {
    var params = {
      id_token: req.user.idToken,
      client_id: process.env.AUTH0_CLIENT_ID,
      target: STREAMS_CLIENT_ID,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      scope: 'openid profile',
      api_type: 'auth0'
    };

    getDelegatedToken(params, function(error, accessToken, idToken) {
      console.log("Got Streams delegated token: ", idToken);
      getStreams(idToken, {}, function(err, result) {
        console.log("Got Stream results: ", result);
        locals = _.extend(commonLocals(req), {streamResult: result});
        res.render('streams', locals);
      });
    });
  }
);

router.get('/login', function(req, res, next) {
  res.locals.clientId = process.env.AUTH0_CLIENT_ID;
  res.locals.auth0Domain = process.env.AUTH0_DOMAIN;
  res.render('login', {layout: false});
});

router.get('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/login');
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    if (!req.user) {
      throw new Error('user null');
    }
    next();
  } else {
    res.redirect('/login');
  }
}

function ensureAuthorizedByRole(role) {
  return function(req, res, next) {
    if (userHasRole(req.user, role)) {
      next();
    } else {
      throw new Error('You are not authorized to perform this action.');
    }
  };
}

function userHasRole(user, role) {
  roles = user.profile._json.roles;
  return _.contains(roles, role);
}

function commonLocals(req) {
  return {
    user: {
      accessToken: req.user.accessToken,
      idToken: req.user.idToken,
      profileString: JSON.stringify(req.user.profile, null, ' '),
      isAdmin: userHasRole(req.user, 'admin'),
      displayName: req.user.profile.displayName,
      picture: req.user.profile.picture || 'https://graph.facebook.com/3/picture',
    },
    menuLinks: {
      sites:  process.env.SCALEWORKS_SITES_URL,
      mail:   process.env.SCALEWORKS_MAIL_URL,
      social: process.env.SCALEWORKS_SOCIAL_URL,
      store:  process.env.SCALEWORKS_STORE_URL
    }
  };
}

function getDelegatedToken(params, done) {
  request.post({
    url: 'https://' + AUTH0_DOMAIN + '/delegation',
    form: params
  }, function (err, resp, body) {
    if(err) return done(err);
    var result = JSON.parse(body);
    var accessToken = result.access_token;
    var idToken = result.id_token;
    done(null, accessToken, idToken);
  });
}

function getStreams(idToken, body, done) {
  request.get({
    url: STREAMS_URL + '/secured/ping',
    headers: { "Authorization": "Bearer " + idToken }
  }, function (err, resp, body) {
    if(err) return done(err);
    done(null, body);
  });
}

module.exports = router;
