var _ = require('underscore');
var express = require('express');
var router = express.Router();

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
  roles = user._json.roles;
  return _.contains(roles, role);
}

function commonLocals(req) {
  return {
    userData: JSON.stringify(req.user),
    isUserAdmin: userHasRole(req.user, 'admin'),
    displayName: req.user.displayName,
    picture: req.user.picture || 'https://graph.facebook.com/3/picture',
    menuLinks: {
      sites:  process.env.SCALEWORKS_SITES_URL,
      mail:   process.env.SCALEWORKS_MAIL_URL,
      social: process.env.SCALEWORKS_SOCIAL_URL,
      store:  process.env.SCALEWORKS_STORE_URL
    }
  };
}

router.get('/', ensureAuthenticated, function(req, res, next) {
  res.render('index', commonLocals(req));
});

router.get('/account', ensureAuthenticated, function(req, res, next) {
  res.render('account', commonLocals(req));
});

router.get('/streams', ensureAuthenticated, ensureAuthorizedByRole('admin'),
  function(req, res, next) {
    res.render('streams', commonLocals(req));
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

module.exports = router;
