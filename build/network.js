'use strict';

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _regeneratorRuntime = require('babel-runtime/regenerator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this = this;

var _medium = require('medium');

var _kismatch = require('kismatch');

var _kismatch2 = _interopRequireDefault(_kismatch);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var isF = _ramda2['default'].is(Function);
var asCh = function asCh(obj, key) {
  return obj[key] || (obj[key] = (0, _medium.chan)());
};

var getExecutable = function getExecutable(componentConfig, locals, rootDir) {

  if (locals[componentConfig.name]) return locals[componentConfig.name];

  if (componentConfig.value) return null;

  if (componentConfig.importPath) {
    var required = require(_path2['default'].join(rootDir, componentConfig.importPath));
    if (componentConfig.key) return required[componentConfig.key];else return required;
  }

  return new Error('Could not find executable for component with config: ', componentConfig);
};

var createNode = function createNode(fn) {

  var ins = {};
  var outs = {};
  var active = false;

  var send = function send(key, val) {
    return (0, _medium.put)(asCh(outs, key), val);
  };
  var receive = function receive(key) {
    return (0, _medium.take)(asCh(ins, key));
  };

  var toReceive = function toReceive(k, v) {
    return (0, _medium.put)(asCh(ins, k), v);
  };
  var fromSend = function fromSend(k) {
    return (0, _medium.take)(asCh(outs, k));
  };

  (0, _medium.go)(function callee$1$0() {
    return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          if (!true) {
            context$2$0.next = 5;
            break;
          }

          context$2$0.next = 3;
          return _regeneratorRuntime.awrap(fn(receive, send));

        case 3:
          context$2$0.next = 0;
          break;

        case 5:
        case 'end':
          return context$2$0.stop();
      }
    }, null, _this);
  });

  return { toReceive: toReceive, fromSend: fromSend, outs: outs, ins: ins };
};

var createNamedNode = function createNamedNode(name, fn) {
  var node = createNode(fn);
  node.name = name;
  return node;
};

var api = {

  node: createNode,

  compose: function compose(a, b, connections) {

    var n1 = isF(a) ? createNode(a) : a;
    var n2 = isF(b) ? createNode(b) : b;

    var taps = [];
    var tap = function tap(fn) {
      return taps = taps.concat([fn]);
    };
    var untap = function untap(fn) {
      return taps = taps.filter(function (t) {
        return t !== fn;
      });
    };

    connections.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2);

      var n1p = _ref2[0];
      var n2p = _ref2[1];

      (0, _medium.go)(function callee$2$0() {
        var _loop;

        return _regeneratorRuntime.async(function callee$2$0$(context$3$0) {
          var _this2 = this;

          while (1) switch (context$3$0.prev = context$3$0.next) {
            case 0:
              _loop = function callee$3$0() {
                var n1v;
                return _regeneratorRuntime.async(function callee$3$0$(context$4$0) {
                  while (1) switch (context$4$0.prev = context$4$0.next) {
                    case 0:
                      context$4$0.next = 2;
                      return _regeneratorRuntime.awrap(n1.fromSend(n1p));

                    case 2:
                      n1v = context$4$0.sent;

                      taps.forEach(function (fn) {
                        return fn(n1v, n1, n2, n1p, n2p);
                      });
                      n2.toReceive(n2p, n1v);

                    case 5:
                    case 'end':
                      return context$4$0.stop();
                  }
                }, null, _this2);
              };

            case 1:
              if (!true) {
                context$3$0.next = 6;
                break;
              }

              context$3$0.next = 4;
              return _regeneratorRuntime.awrap(_loop());

            case 4:
              context$3$0.next = 1;
              break;

            case 6:
            case 'end':
              return context$3$0.stop();
          }
        }, null, _this);
      });
    });

    return { toReceive: n1.toReceive, fromSend: n2.fromSend, tap: tap, untap: untap };
  },

  network: function network(config, locals) {
    var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var instaSend = function instaSend(r, s) {
      return _regeneratorRuntime.async(function instaSend$(context$2$0) {
        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            context$2$0.next = 2;
            return _regeneratorRuntime.awrap(r('in'));

          case 2:
            context$2$0.t0 = context$2$0.sent;
            return context$2$0.abrupt('return', s('out', context$2$0.t0));

          case 4:
          case 'end':
            return context$2$0.stop();
        }
      }, null, _this);
    };
    var __in__ = createNamedNode('__in__', instaSend);
    var __out__ = createNamedNode('__out__', instaSend);

    var nodes = [__in__, __out__].concat(config.components.map(function (n) {
      var fn = getExecutable(n, locals, opts.dir);
      return createNamedNode(n.name, fn);
    }));

    var nodeMap = nodes.reduce(function (map, n) {
      return _ramda2['default'].assoc(n.name, n, map);
    }, {});
    var composed = {};

    config.connections.forEach(function (_ref3) {
      var _ref32 = _slicedToArray(_ref3, 2);

      var src = _ref32[0];
      var dest = _ref32[1];

      var _src$split = src.split('.');

      var _src$split2 = _slicedToArray(_src$split, 2);

      var srcName = _src$split2[0];
      var srcChanName = _src$split2[1];

      var _dest$split = dest.split('.');

      var _dest$split2 = _slicedToArray(_dest$split, 2);

      var destName = _dest$split2[0];
      var destChanName = _dest$split2[1];

      if (composed[src]) {
        composed[src].tap(function (val) {
          return nodeMap[destName].toReceive(destChanName, val);
        });
      } else {
        composed[src] = api.compose(nodeMap[srcName], nodeMap[destName], [[srcChanName, destChanName]]);
      }
    });

    return { toReceive: nodeMap.__in__.toReceive, fromSend: nodeMap.__out__.fromSend };
  }
};

exports['default'] = api;
module.exports = exports['default'];