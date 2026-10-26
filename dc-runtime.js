/* Minimal standalone runtime for the PLOT page: renders the page template
   (holes {{ }}, <sc-for>, <sc-if>) with React, driven by the page's Component class. */
(function () {
  'use strict';
  var h = React.createElement;
  var EVT = {};
  ['Click', 'DoubleClick', 'PointerDown', 'PointerMove', 'PointerUp', 'PointerCancel', 'PointerLeave', 'PointerEnter',
   'KeyDown', 'KeyUp', 'Change', 'Input', 'Focus', 'Blur', 'MouseEnter', 'MouseLeave', 'Submit', 'Scroll']
    .forEach(function (n) { EVT['on' + n.toLowerCase()] = 'on' + n; });
  var ATTR = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', autocomplete: 'autoComplete', readonly: 'readOnly', maxlength: 'maxLength' };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var camel = function (s) { return s.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }); };

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var v = scope, parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    var whole = str.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (whole) return lookup(scope, whole[1]);
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (m, p) { var v = lookup(scope, p); return v == null ? '' : String(v); });
  }
  function styleObj(s) {
    var o = {};
    String(s).split(';').forEach(function (d) {
      var i = d.indexOf(':'); if (i < 0) return;
      var k = d.slice(0, i).trim(), v = d.slice(i + 1).trim(); if (!k) return;
      o[k.indexOf('--') === 0 ? k : camel(k)] = v;
    });
    return o;
  }
  function kids(node, scope) {
    var out = [], i = 0;
    node.childNodes.forEach(function (c) { var r = conv(c, scope, i++); if (r != null && r !== false) out.push(r); });
    return out;
  }
  function conv(node, scope, key) {
    if (node.nodeType === 3) {
      var t = node.nodeValue; if (!t.trim()) return null;
      return t.indexOf('{{') >= 0 ? interp(t, scope) : t;
    }
    if (node.nodeType !== 1) return null;
    var tag = node.namespaceURI === SVGNS ? node.localName : node.localName.toLowerCase();
    if (tag === 'helmet') return null;
    if (tag === 'sc-for') {
      var list = interp(node.getAttribute('list') || '', scope) || [];
      var as = node.getAttribute('as') || 'item';
      return list.map(function (it, i) {
        var s2 = Object.create(scope); s2[as] = it; s2.$index = i;
        return h.apply(null, [React.Fragment, { key: i }].concat(kids(node, s2)));
      });
    }
    if (tag === 'sc-if') {
      return interp(node.getAttribute('value') || '', scope) ? h.apply(null, [React.Fragment, { key: key }].concat(kids(node, scope))) : null;
    }
    var props = { key: key };
    Array.prototype.forEach.call(node.attributes, function (a) {
      var n = a.name, v = a.value;
      if (n.indexOf('hint-') === 0) return;
      var val = v.indexOf('{{') >= 0 ? interp(v, scope) : v;
      var ln = n.toLowerCase();
      if (n === 'style') { props.style = styleObj(val); return; }
      if (n === 'ref') { props.ref = val; return; }
      if (EVT[ln]) { props[EVT[ln]] = val; return; }
      if (ATTR[ln]) { props[ATTR[ln]] = val; return; }
      if (ln.indexOf('aria-') === 0 || ln.indexOf('data-') === 0) { props[ln] = val; return; }
      if (n === 'value' && (tag === 'input' || tag === 'textarea')) { props.value = val == null ? '' : val; return; }
      props[n.indexOf('-') >= 0 ? camel(n) : n] = val;
    });
    return h.apply(null, [tag, props].concat(kids(node, scope)));
  }

  var tpl = document.getElementById('dc-template');
  var root = tpl.content.querySelector('x-dc');
  // page-level <helmet>: styles and font links go to <head>
  var helmet = root.querySelector('helmet');
  if (helmet) Array.prototype.slice.call(helmet.childNodes).forEach(function (n) { if (n.nodeType === 1) document.head.appendChild(n.cloneNode(true)); });

  window.DCLogic = class extends React.Component {
    render() { return h.apply(null, [React.Fragment, null].concat(kids(root, this.renderVals()))); }
  };
  window.__dcMount = function (Comp) { ReactDOM.createRoot(document.getElementById('root')).render(h(Comp)); };
})();
