(()=>{"use strict";var t={885:(t,e)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.attributeNameToCamelCase=e.decodeHtmlAttrib=e.encodeHtmlAttrib=void 0,e.encodeHtmlAttrib=function(t){var e,i,r,n,o,s,l;return null!==(l=null===(s=null===(o=null===(n=null===(r=null===(i=null===(e=null==t?void 0:t.replace(/&/g,"&amp;"))||void 0===e?void 0:e.replace(/'/g,"&apos;"))||void 0===i?void 0:i.replace(/"/g,"&quot;"))||void 0===r?void 0:r.replace(/</g,"&lt;"))||void 0===n?void 0:n.replace(/>/g,"&gt;"))||void 0===o?void 0:o.replace(/\r\n/g,"&#13;"))||void 0===s?void 0:s.replace(/[\r\n]/g,"&#13;"))&&void 0!==l?l:""},e.decodeHtmlAttrib=function(t){var e,i,r,n,o,s;return null!==(s=null===(o=null===(n=null===(r=null===(i=null===(e=null==t?void 0:t.replace(/&amp;/g,"&"))||void 0===e?void 0:e.replace(/&apos;/g,"'"))||void 0===i?void 0:i.replace(/&quot;/g,'"'))||void 0===r?void 0:r.replace(/&lt;/g,"<"))||void 0===n?void 0:n.replace(/&gt;/g,">"))||void 0===o?void 0:o.replace(/&#13;/g,"\n"))&&void 0!==s?s:""},e.attributeNameToCamelCase=function(t){return t.replace(/-./g,(t=>t[1].toUpperCase()))}},246:function(t,e,i){var r,n,o,s,l=this&&this.__awaiter||function(t,e,i,r){return new(i||(i=Promise))((function(n,o){function s(t){try{a(r.next(t))}catch(t){o(t)}}function l(t){try{a(r.throw(t))}catch(t){o(t)}}function a(t){var e;t.done?n(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e)}))).then(s,l)}a((r=r.apply(t,e||[])).next())}))};Object.defineProperty(e,"__esModule",{value:!0});const a=i(283);class c extends a.IRenderer{constructor(){super(...arguments),this.fsroot=(0,a.folderPath)(self.location.href)}parseHTML(t,e={isRoot:!1}){if(e.isRoot)return(new DOMParser).parseFromString(t,"text/html");{const e=document.createRange();return e.selectNodeContents(document.body),e.createContextualFragment(t)}}serializeHTML(t){return(new XMLSerializer).serializeToString(t).replace(/\s?xmlns="[^"]+"/gm,"")}renderLocalPath(t,e){throw new Error("Not implemented.")}}const h=new c;self.Mancha=h;const d=null===(r=self.document)||void 0===r?void 0:r.currentScript;if(null===(o=null===(n=self.document)||void 0===n?void 0:n.currentScript)||void 0===o?void 0:o.hasAttribute("init")){h.update(Object.assign({},null==d?void 0:d.dataset));const t=null==d?void 0:d.hasAttribute("debug"),e=null==d?void 0:d.getAttribute("cache"),i=((null===(s=null==d?void 0:d.getAttribute("target"))||void 0===s?void 0:s.split(","))||["body"]).map((i=>l(void 0,void 0,void 0,(function*(){const r=self.document.querySelector(i);yield h.mount(r,{cache:e,debug:t})}))));Promise.all(i).then((()=>{dispatchEvent(new Event("mancha-render",{bubbles:!0}))}))}e.default=h},283:function(t,e,i){var r=this&&this.__awaiter||function(t,e,i,r){return new(i||(i=Promise))((function(n,o){function s(t){try{a(r.next(t))}catch(t){o(t)}}function l(t){try{a(r.throw(t))}catch(t){o(t)}}function a(t){var e;t.done?n(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e)}))).then(s,l)}a((r=r.apply(t,e||[])).next())}))};Object.defineProperty(e,"__esModule",{value:!0}),e.IRenderer=e.safeEval=e.extractTextNodeKeys=e.resolvePath=e.folderPath=e.traverse=void 0;const n=i(975),o=i(63),s=i(885),l=new Set([":bind",":bind-events",":data",":for",":show","@watch"]),a={$text:"$text-content",$html:"$inner-HTML"};function*c(t,e=new Set){const i=new Set,r=Array.from(t.childNodes).filter((t=>!e.has(t)));for(yield t;r.length;){const t=r.pop();i.has(t)||(i.add(t),yield t),t.childNodes&&Array.from(t.childNodes).filter((t=>!e.has(t))).forEach((t=>r.push(t)))}}function h(t){return t.endsWith("/")?t.slice(0,-1):n.dirname(t)}function d(t){const e=new RegExp(/{{ ([\w\.]+) }}/gm);return Array.from(t.matchAll(e)).map((t=>{const e=t[0];let i=t[1];const r=[];if(i.includes(".")){const t=i.split(".");i=t[0],r.push(...t.slice(1))}return[e,i,r]}))}function u(t,e,i={}){const r=`with (this) { return (async () => (${t}))(); }`;return new Function(...Object.keys(i),r).call(e,...Object.values(i))}e.traverse=c,e.folderPath=h,e.resolvePath=function t(e){if(e.includes("://")){const[i,r]=e.split("://",2);return`${i}://${t("/"+r).substring(1)}`}return n.resolve(e)},e.extractTextNodeKeys=d,e.safeEval=u;const f={maxdepth:10};class v extends o.ReactiveProxyStore{constructor(){super(...arguments),this.fsroot=".",this.skipNodes=new Set}clone(){return new this.constructor(Object.fromEntries(this.store.entries()))}log(t,...e){(null==t?void 0:t.debug)&&console.debug(...e)}eval(t){return r(this,arguments,void 0,(function*(t,e={},i){const r=(0,o.proxify)(this),n=yield u(t,r,Object.assign({},e));return this.log(i,`eval \`${t}\` => `,n),n}))}resolveIncludes(t,e){return r(this,void 0,void 0,(function*(){e=Object.assign({fsroot:this.fsroot},f,e);const i=Array.from(c(t,this.skipNodes)).map((t=>t)).filter((t=>{var e;return"include"===(null===(e=t.tagName)||void 0===e?void 0:e.toLocaleLowerCase())})).map((t=>r(this,void 0,void 0,(function*(){var i,r;const o=null===(i=t.getAttribute)||void 0===i?void 0:i.call(t,"src"),l=Object.assign({},t.dataset);if(Object.entries(l).forEach((([t,e])=>this.set(t,(0,s.decodeHtmlAttrib)(e)))),!o)throw new Error(`"src" attribute missing from ${t}.`);const a=e=>{t.replaceWith(...Array.from(e.childNodes))};if(e.maxdepth--,-1!==o.indexOf("://"))yield this.renderRemotePath(o,Object.assign(Object.assign({},e),{isRoot:!1})).then(a);else if(-1!==(null===(r=e.fsroot)||void 0===r?void 0:r.indexOf("://"))){const t=`${e.fsroot}/${o}`;yield this.renderRemotePath(t,Object.assign(Object.assign({},e),{isRoot:!1})).then(a)}else if("/"===o.charAt(0))yield this.renderLocalPath(o,Object.assign(Object.assign({},e),{isRoot:!1})).then(a);else{const t=n.join(e.fsroot,o);yield this.renderLocalPath(t,Object.assign(Object.assign({},e),{isRoot:!1})).then(a)}}))));if(yield Promise.all(i),0===i.length)return this;if(0===e.maxdepth)throw new Error("Maximum recursion depth reached.");return this.resolveIncludes(t,{fsroot:e.fsroot,maxdepth:e.maxdepth-1})}))}resolveTextNode(t,e){if(3!==t.nodeType)return[];const i=t.nodeValue||"",r=d(i).filter((([,t])=>this.store.has(t)));if(0===r.length)return[];this.log(e,r,"keys found in node:",t);const n=()=>{let e=i;r.forEach((([t,i,r])=>{var n;e=e.replace(t,String(null!==(n=this.get(i,...r))&&void 0!==n?n:""))})),t.nodeValue=e};return n(),this.watch(r.map((([,t])=>t)),n),r.map((([,t])=>this.store.get(t)))}resolveDataAttribute(t,e){return r(this,void 0,void 0,(function*(){var i;if(this.skipNodes.has(t))return;const r=t,n=null===(i=r.getAttribute)||void 0===i?void 0:i.call(r,":data");if(n){this.log(e,":data attribute found in:\n",t),r.removeAttribute(":data");const i=yield this.eval(n,{$elem:t},e);this.log(e,":data",n,"=>",i),yield this.update(i)}}))}resolveWatchAttribute(t,e){return r(this,void 0,void 0,(function*(){var i;if(this.skipNodes.has(t))return;const r=t,n=null===(i=r.getAttribute)||void 0===i?void 0:i.call(r,"@watch");if(n){this.log(e,"@watch attribute found in:\n",t),r.removeAttribute("@watch");const i=()=>this.eval(n,{$elem:t},e),[o,s]=yield this.trace(i);this.log(e,"@watch",n,"=>",o),this.watch(s,i)}}))}resolvePropAttributes(t,e){return r(this,void 0,void 0,(function*(){if(this.skipNodes.has(t))return;const i=t;for(const n of Array.from(i.attributes||[]))if(n.name.startsWith("$")&&!l.has(n.name)){this.log(e,n.name,"attribute found in:\n",t),i.removeAttribute(n.name);const o=(a[n.name]||n.name).slice(1),l=()=>this.eval(n.value,{$elem:t},e),[c,h]=yield this.trace(l);this.log(e,n.name,n.value,"=>",c,`[${h}]`);const d=(0,s.attributeNameToCamelCase)(o);this.watch(h,(()=>r(this,void 0,void 0,(function*(){return t[d]=yield l()})))),t[d]=c}}))}resolveAttrAttributes(t,e){return r(this,void 0,void 0,(function*(){if(this.skipNodes.has(t))return;const i=t;for(const n of Array.from(i.attributes||[]))if(n.name.startsWith(":")&&!l.has(n.name)){this.log(e,n.name,"attribute found in:\n",t),i.removeAttribute(n.name);const o=(a[n.name]||n.name).slice(1),s=()=>this.eval(n.value,{$elem:t},e),[l,c]=yield this.trace(s);this.log(e,n.name,n.value,"=>",l,`[${c}]`),this.watch(c,(()=>r(this,void 0,void 0,(function*(){return i.setAttribute(o,yield s())})))),i.setAttribute(o,l)}}))}resolveEventAttributes(t,e){return r(this,void 0,void 0,(function*(){var i;if(this.skipNodes.has(t))return;const r=t;for(const n of Array.from(r.attributes||[]))n.name.startsWith("@")&&!l.has(n.name)&&(this.log(e,n.name,"attribute found in:\n",t),r.removeAttribute(n.name),null===(i=t.addEventListener)||void 0===i||i.call(t,n.name.substring(1),(i=>this.eval(n.value,{$elem:t,$event:i},e))))}))}resolveForAttribute(t,e){return r(this,void 0,void 0,(function*(){var i;if(this.skipNodes.has(t))return;const n=t,o=null===(i=n.getAttribute)||void 0===i?void 0:i.call(n,":for");if(o){this.log(e,":for attribute found in:\n",t),n.removeAttribute(":for");for(const e of c(t,this.skipNodes))this.skipNodes.add(e);const i=t.parentNode,s=t.ownerDocument.createElement("template");i.insertBefore(s,t),s.append(t),this.log(e,":for template:\n",s);const l=o.split(" in ",2);if(2!==l.length)throw new Error(`Invalid :for format: \`${o}\`. Expected "{key} in {expression}".`);let a=[],h=[];const[d,u]=l;try{[a,h]=yield this.trace((()=>this.eval(u,{$elem:t},e))),this.log(e,u,"=>",a,`[${h}]`)}catch(t){return void console.error(t)}const f=[],v=n=>r(this,void 0,void 0,(function*(){if(this.log(e,":for list items:",n),Array.isArray(n))return this.lock=this.lock.then((()=>new Promise((o=>r(this,void 0,void 0,(function*(){f.splice(0,f.length).forEach((t=>{i.removeChild(t),this.skipNodes.delete(t)}));for(const r of n.slice(0).reverse()){const n=this.clone();yield n.set(d,r);const o=t.cloneNode(!0);i.insertBefore(o,s.nextSibling),f.push(o),this.skipNodes.add(o),yield n.mount(o,e),this.log(e,"Rendered list child:\n",o)}o()})))))),this.lock;console.error(`Expression did not yield a list: \`${u}\` => \`${n}\``)}));return this.watch(h,(()=>r(this,void 0,void 0,(function*(){return v(yield this.eval(u,{$elem:t},e))})))),v(a)}}))}resolveBindAttribute(t,e){return r(this,void 0,void 0,(function*(){var i,r,n;if(this.skipNodes.has(t))return;const o=t,s=null===(i=o.getAttribute)||void 0===i?void 0:i.call(o,":bind");if(s){this.log(e,":bind attribute found in:\n",t);const i=["change","input"],l=(null===(n=null===(r=o.getAttribute)||void 0===r?void 0:r.call(o,":bind-events"))||void 0===n?void 0:n.split(","))||i,a="checkbox"===o.getAttribute("type")?"checked":"value";this.store.has(s)||(yield this.set(s,o[a])),o[a]=this.get(s);for(const e of l)t.addEventListener(e,(()=>this.set(s,o[a])));this.watch([s],(()=>o[a]=this.get(s))),o.removeAttribute(":bind"),o.removeAttribute(":bind-events")}}))}resolveShowAttribute(t,e){return r(this,void 0,void 0,(function*(){var i;if(this.skipNodes.has(t))return;const n=t,o=null===(i=n.getAttribute)||void 0===i?void 0:i.call(n,":show");if(o){const i=()=>this.eval(o,{$elem:t},e),[s,l]=yield this.trace(i);this.log(e,":show",o,"=>",s,`[${l}]`);const a=n.style.display;s||(n.style.display="none"),this.watch(l,(()=>r(this,void 0,void 0,(function*(){(yield i())&&"none"===n.style.display?n.style.display=a:"none"!==n.style.display&&(n.style.display="none")})))),n.removeAttribute(":show")}}))}mount(t,e){return r(this,void 0,void 0,(function*(){yield this.resolveIncludes(t,e);for(const i of c(t,this.skipNodes))this.log(e,"Processing node:\n",i),yield this.resolveDataAttribute(i,e),yield this.resolveShowAttribute(i,e),yield this.resolveWatchAttribute(i,e),yield this.resolveForAttribute(i,e),yield this.resolveBindAttribute(i,e),yield this.resolvePropAttributes(i,e),yield this.resolveAttrAttributes(i,e),yield this.resolveEventAttributes(i,e),this.resolveTextNode(i,e);return this}))}renderString(t,e){return r(this,void 0,void 0,(function*(){const i=this.parseHTML(t,e);return yield this.mount(i,e),i}))}renderRemotePath(t,e){return r(this,void 0,void 0,(function*(){const i=(null==e?void 0:e.cache)||"default",r=yield fetch(t,{cache:i}).then((t=>t.text()));return this.renderString(r,Object.assign(Object.assign({},e),{fsroot:h(t),isRoot:(null==e?void 0:e.isRoot)||!t.endsWith(".tpl.html")}))}))}}e.IRenderer=v},63:function(t,e){var i=this&&this.__awaiter||function(t,e,i,r){return new(i||(i=Promise))((function(n,o){function s(t){try{a(r.next(t))}catch(t){o(t)}}function l(t){try{a(r.throw(t))}catch(t){o(t)}}function a(t){var e;t.done?n(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e)}))).then(s,l)}a((r=r.apply(t,e||[])).next())}))};function r(t,e,i=!0){if(null==t||function(t){return t instanceof n||t.__is_proxy__}(t))return t;if(i)for(const i in t)t.hasOwnProperty(i)&&"object"==typeof t[i]&&null!=t[i]&&(t[i]=r(t[i],e));return new Proxy(t,{deleteProperty:(t,i)=>i in t&&(delete t[i],e(),!0),set:(t,n,o,s)=>{i&&"object"==typeof o&&(o=r(o,e));const l=Reflect.set(t,n,o,s);return e(),l},get:(t,e,i)=>"__is_proxy__"===e||Reflect.get(t,e,i)})}Object.defineProperty(e,"__esModule",{value:!0}),e.proxify=e.ReactiveProxyStore=e.InertProxy=e.ReactiveProxy=e.proxifyObject=void 0,e.proxifyObject=r;class n{constructor(t=null,...e){this.value=null,this.listeners=[],this.set(t),e.forEach((t=>this.watch(t)))}static from(t,...e){return t instanceof n?(e.forEach(t.watch),t):new n(t,...e)}get(...t){return t.length?function(t,...e){let i=t;for(const t of e)i=i[t];return i}(this.value,...t):this.value}set(t){return i(this,void 0,void 0,(function*(){if(this.value!==t){const e=this.value;null!=t&&"object"==typeof t&&(t=r(t,(()=>this.trigger()))),this.value=t,yield this.trigger(e)}}))}watch(t){this.listeners.push(t)}unwatch(t){this.listeners=this.listeners.filter((e=>e!==t))}trigger(){return i(this,arguments,void 0,(function*(t=null){for(const e of this.listeners)yield e(this.value,t)}))}}e.ReactiveProxy=n;class o extends n{static from(t,...e){return t instanceof n?t:new o(t,...e)}watch(t){}trigger(t){return Promise.resolve()}}e.InertProxy=o,e.ReactiveProxyStore=class{constructor(t){this.store=new Map,this.tracing=!1,this.traced=new Set,this.lock=Promise.resolve();for(const[e,i]of Object.entries(t||{}))this.store.set(e,n.from(i))}entries(){return this.store.entries()}get(t,...e){var i;return this.tracing&&this.traced.add(t),null===(i=this.store.get(t))||void 0===i?void 0:i.get(...e)}set(t,e){return i(this,void 0,void 0,(function*(){this.store.has(t)?yield this.store.get(t).set(e):this.store.set(t,n.from(e))}))}del(t){return this.store.delete(t)}update(t){return i(this,void 0,void 0,(function*(){for(const[e,i]of Object.entries(t))yield this.set(e,i)}))}watch(t,e){(t=Array.isArray(t)?t:[t]).forEach((i=>this.store.get(i).watch((()=>e(...t.map((t=>this.store.get(t).get())))))))}trigger(t){return i(this,void 0,void 0,(function*(){for(const e of Array.isArray(t)?t:[t])yield this.store.get(e).trigger()}))}trace(t){return i(this,void 0,void 0,(function*(){yield this.lock;const e=new Promise(((e,r)=>i(this,void 0,void 0,(function*(){this.traced.clear(),this.tracing=!0;try{const i=yield t(),r=Array.from(this.traced);e([i,r])}catch(t){r(t)}finally{this.tracing=!1,this.traced.clear()}}))));return this.lock=e.then((()=>{})),e}))}computed(t,e){return i(this,void 0,void 0,(function*(){const[r,n]=yield this.trace((()=>e()));this.watch(n,(()=>i(this,void 0,void 0,(function*(){return this.set(t,yield e())})))),this.set(t,r)}))}},e.proxify=function(t){const e=Array.from(t.entries()).map((([t])=>t)),i=new Set(e);return new Proxy(Object.fromEntries(e.map((t=>[t,void 0]))),{get:(e,r,n)=>i.has(r)?t.get(r):Reflect.get(e,r,n),set:(e,r,n,o)=>(i.has(r)?t.set(r,n):Reflect.set(e,r,n,o),!0)})}},975:t=>{function e(t){if("string"!=typeof t)throw new TypeError("Path must be a string. Received "+JSON.stringify(t))}function i(t,e){for(var i,r="",n=0,o=-1,s=0,l=0;l<=t.length;++l){if(l<t.length)i=t.charCodeAt(l);else{if(47===i)break;i=47}if(47===i){if(o===l-1||1===s);else if(o!==l-1&&2===s){if(r.length<2||2!==n||46!==r.charCodeAt(r.length-1)||46!==r.charCodeAt(r.length-2))if(r.length>2){var a=r.lastIndexOf("/");if(a!==r.length-1){-1===a?(r="",n=0):n=(r=r.slice(0,a)).length-1-r.lastIndexOf("/"),o=l,s=0;continue}}else if(2===r.length||1===r.length){r="",n=0,o=l,s=0;continue}e&&(r.length>0?r+="/..":r="..",n=2)}else r.length>0?r+="/"+t.slice(o+1,l):r=t.slice(o+1,l),n=l-o-1;o=l,s=0}else 46===i&&-1!==s?++s:s=-1}return r}var r={resolve:function(){for(var t,r="",n=!1,o=arguments.length-1;o>=-1&&!n;o--){var s;o>=0?s=arguments[o]:(void 0===t&&(t=process.cwd()),s=t),e(s),0!==s.length&&(r=s+"/"+r,n=47===s.charCodeAt(0))}return r=i(r,!n),n?r.length>0?"/"+r:"/":r.length>0?r:"."},normalize:function(t){if(e(t),0===t.length)return".";var r=47===t.charCodeAt(0),n=47===t.charCodeAt(t.length-1);return 0!==(t=i(t,!r)).length||r||(t="."),t.length>0&&n&&(t+="/"),r?"/"+t:t},isAbsolute:function(t){return e(t),t.length>0&&47===t.charCodeAt(0)},join:function(){if(0===arguments.length)return".";for(var t,i=0;i<arguments.length;++i){var n=arguments[i];e(n),n.length>0&&(void 0===t?t=n:t+="/"+n)}return void 0===t?".":r.normalize(t)},relative:function(t,i){if(e(t),e(i),t===i)return"";if((t=r.resolve(t))===(i=r.resolve(i)))return"";for(var n=1;n<t.length&&47===t.charCodeAt(n);++n);for(var o=t.length,s=o-n,l=1;l<i.length&&47===i.charCodeAt(l);++l);for(var a=i.length-l,c=s<a?s:a,h=-1,d=0;d<=c;++d){if(d===c){if(a>c){if(47===i.charCodeAt(l+d))return i.slice(l+d+1);if(0===d)return i.slice(l+d)}else s>c&&(47===t.charCodeAt(n+d)?h=d:0===d&&(h=0));break}var u=t.charCodeAt(n+d);if(u!==i.charCodeAt(l+d))break;47===u&&(h=d)}var f="";for(d=n+h+1;d<=o;++d)d!==o&&47!==t.charCodeAt(d)||(0===f.length?f+="..":f+="/..");return f.length>0?f+i.slice(l+h):(l+=h,47===i.charCodeAt(l)&&++l,i.slice(l))},_makeLong:function(t){return t},dirname:function(t){if(e(t),0===t.length)return".";for(var i=t.charCodeAt(0),r=47===i,n=-1,o=!0,s=t.length-1;s>=1;--s)if(47===(i=t.charCodeAt(s))){if(!o){n=s;break}}else o=!1;return-1===n?r?"/":".":r&&1===n?"//":t.slice(0,n)},basename:function(t,i){if(void 0!==i&&"string"!=typeof i)throw new TypeError('"ext" argument must be a string');e(t);var r,n=0,o=-1,s=!0;if(void 0!==i&&i.length>0&&i.length<=t.length){if(i.length===t.length&&i===t)return"";var l=i.length-1,a=-1;for(r=t.length-1;r>=0;--r){var c=t.charCodeAt(r);if(47===c){if(!s){n=r+1;break}}else-1===a&&(s=!1,a=r+1),l>=0&&(c===i.charCodeAt(l)?-1==--l&&(o=r):(l=-1,o=a))}return n===o?o=a:-1===o&&(o=t.length),t.slice(n,o)}for(r=t.length-1;r>=0;--r)if(47===t.charCodeAt(r)){if(!s){n=r+1;break}}else-1===o&&(s=!1,o=r+1);return-1===o?"":t.slice(n,o)},extname:function(t){e(t);for(var i=-1,r=0,n=-1,o=!0,s=0,l=t.length-1;l>=0;--l){var a=t.charCodeAt(l);if(47!==a)-1===n&&(o=!1,n=l+1),46===a?-1===i?i=l:1!==s&&(s=1):-1!==i&&(s=-1);else if(!o){r=l+1;break}}return-1===i||-1===n||0===s||1===s&&i===n-1&&i===r+1?"":t.slice(i,n)},format:function(t){if(null===t||"object"!=typeof t)throw new TypeError('The "pathObject" argument must be of type Object. Received type '+typeof t);return function(t,e){var i=e.dir||e.root,r=e.base||(e.name||"")+(e.ext||"");return i?i===e.root?i+r:i+"/"+r:r}(0,t)},parse:function(t){e(t);var i={root:"",dir:"",base:"",ext:"",name:""};if(0===t.length)return i;var r,n=t.charCodeAt(0),o=47===n;o?(i.root="/",r=1):r=0;for(var s=-1,l=0,a=-1,c=!0,h=t.length-1,d=0;h>=r;--h)if(47!==(n=t.charCodeAt(h)))-1===a&&(c=!1,a=h+1),46===n?-1===s?s=h:1!==d&&(d=1):-1!==s&&(d=-1);else if(!c){l=h+1;break}return-1===s||-1===a||0===d||1===d&&s===a-1&&s===l+1?-1!==a&&(i.base=i.name=0===l&&o?t.slice(1,a):t.slice(l,a)):(0===l&&o?(i.name=t.slice(1,s),i.base=t.slice(1,a)):(i.name=t.slice(l,s),i.base=t.slice(l,a)),i.ext=t.slice(s,a)),l>0?i.dir=t.slice(0,l-1):o&&(i.dir="/"),i},sep:"/",delimiter:":",win32:null,posix:null};r.posix=r,t.exports=r}},e={};!function i(r){var n=e[r];if(void 0!==n)return n.exports;var o=e[r]={exports:{}};return t[r].call(o.exports,o,o.exports,i),o.exports}(246)})();