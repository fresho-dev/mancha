(()=>{"use strict";var t={654:(t,e,r)=>{r.d(e,{A:()=>a});var n=r(601),s=r.n(n),i=r(314),o=r.n(i)()(s());o.push([t.id,"html{max-width:70ch;padding:2em 1em;margin:auto;line-height:1.75;font-size:1.25em;font-family:sans-serif}h1,h2,h3,h4,h5,h6{margin:1em 0 .5em}ol,p,ul{margin-bottom:1em;color:#1d1d1d}",""]);const a=o},314:t=>{t.exports=function(t){var e=[];return e.toString=function(){return this.map((function(e){var r="",n=void 0!==e[5];return e[4]&&(r+="@supports (".concat(e[4],") {")),e[2]&&(r+="@media ".concat(e[2]," {")),n&&(r+="@layer".concat(e[5].length>0?" ".concat(e[5]):""," {")),r+=t(e),n&&(r+="}"),e[2]&&(r+="}"),e[4]&&(r+="}"),r})).join("")},e.i=function(t,r,n,s,i){"string"==typeof t&&(t=[[null,t,void 0]]);var o={};if(n)for(var a=0;a<this.length;a++){var c=this[a][0];null!=c&&(o[c]=!0)}for(var l=0;l<t.length;l++){var h=[].concat(t[l]);n&&o[h[0]]||(void 0!==i&&(void 0===h[5]||(h[1]="@layer".concat(h[5].length>0?" ".concat(h[5]):""," {").concat(h[1],"}")),h[5]=i),r&&(h[2]?(h[1]="@media ".concat(h[2]," {").concat(h[1],"}"),h[2]=r):h[2]=r),s&&(h[4]?(h[1]="@supports (".concat(h[4],") {").concat(h[1],"}"),h[4]=s):h[4]="".concat(s)),e.push(h))}},e}},601:t=>{t.exports=function(t){return t[1]}}},e={};function r(n){var s=e[n];if(void 0!==s)return s.exports;var i=e[n]={id:n,exports:{}};return t[n](i,i.exports,r),i.exports}r.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return r.d(e,{a:e}),e},r.d=(t,e)=>{for(var n in e)r.o(e,n)&&!r.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:e[n]})},r.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),(()=>{class t{timeouts=new Map;debounce(t,e){return new Promise(((r,n)=>{const s=this.timeouts.get(e);s&&clearTimeout(s),this.timeouts.set(e,setTimeout((()=>{try{r(e()),this.timeouts.delete(e)}catch(t){n(t)}}),t))}))}}function e(t,r){if(null==t||(s=t)instanceof n||s.__is_proxy__||t.constructor!==Object&&!Array.isArray(t))return t;var s;for(const n in t)t.hasOwnProperty(n)&&"object"==typeof t[n]&&null!=t[n]&&(t[n]=e(t[n],r));return new Proxy(t,{deleteProperty:(t,e)=>e in t&&(delete t[e],r(),!0),set:(t,n,s,i)=>{"object"==typeof s&&(s=e(s,r));const o=Reflect.set(t,n,s,i);return r(),o},get:(t,e,r)=>"__is_proxy__"===e||Reflect.get(t,e,r)})}class n extends t{value=null;listeners=[];constructor(t=null,...e){super(),this.value=this.wrapObjValue(t),e.forEach((t=>this.watch(t)))}static from(t,...e){return t instanceof n?(e.forEach(t.watch),t):new n(t,...e)}wrapObjValue(t){return null===t||"object"!=typeof t?t:e(t,(()=>this.trigger()))}get(){return this.value}async set(t){if(this.value!==t){const e=this.value;this.value=this.wrapObjValue(t),await this.trigger(e)}}watch(t){this.listeners.push(t)}unwatch(t){this.listeners=this.listeners.filter((e=>e!==t))}trigger(t=null){const e=this.listeners.slice();return this.debounce(10,(()=>Promise.all(e.map((e=>e(this.value,t)))).then((()=>{}))))}}class s extends t{store=new Map;debouncedListeners=new Map;lock=Promise.resolve();constructor(t){super();for(const[e,r]of Object.entries(t||{}))this.store.set(e,n.from(this.wrapFnValue(r)))}wrapFnValue(t){return t&&"function"==typeof t?(...e)=>t.call(i(this),...e):t}get $(){return i(this)}entries(){return this.store.entries()}get(t){return this.store.get(t)?.get()}async set(t,e){this.store.has(t)?await this.store.get(t).set(this.wrapFnValue(e)):this.store.set(t,n.from(this.wrapFnValue(e)))}del(t){return this.store.delete(t)}has(t){return this.store.has(t)}async update(t){await Promise.all(Object.entries(t).map((([t,e])=>this.set(t,e))))}watch(t,e){t=Array.isArray(t)?t:[t];const r=()=>e(...t.map((t=>this.store.get(t).get()))),n=()=>this.debounce(10,r);t.forEach((t=>this.store.get(t).watch(n))),this.debouncedListeners.set(e,n)}unwatch(t,e){(t=Array.isArray(t)?t:[t]).forEach((t=>this.store.get(t).unwatch(this.debouncedListeners.get(e)))),this.debouncedListeners.delete(e)}async trigger(t){t=Array.isArray(t)?t:[t],await Promise.all(t.map((t=>this.store.get(t).trigger())))}async trace(t){const e=new Set,r=i(this,((t,r)=>{"get"===t&&e.add(r)}));return[await t.call(r),Array.from(e)]}async computed(t,e){const[r,n]=await this.trace(e);this.watch(n,(async()=>this.set(t,await e.call(i(this))))),this.set(t,r)}}function i(t,e=(()=>{})){const r=Array.from(t.entries()).map((([t])=>t)),n=Object.fromEntries(r.map((t=>[t,void 0])));return new Proxy(Object.assign({},t,n),{get:(r,n,s)=>"string"==typeof n&&t.has(n)?(e("get",n),t.get(n)):"get"===n?r=>(e("get",r),t.get(r)):Reflect.get(t,n,s),set:(r,n,s,i)=>("string"!=typeof n||n in t?Reflect.set(t,n,s,i):(e("set",n,s),t.set(n,s)),!0)})}class o{iterable;constructor(t){this.iterable=t}filter(t){return new o(o.filterGenerator(t,this.iterable))}map(t){return new o(o.mapGenerator(t,this.iterable))}find(t){for(const e of this.iterable)if(t(e))return e}array(){return Array.from(this.iterable)}*generator(){for(const t of this.iterable)yield t}static*filterGenerator(t,e){for(const r of e)t(r)&&(yield r)}static*mapGenerator(t,e){for(const r of e)yield t(r)}static equals(t,e){const r=t[Symbol.iterator](),n=e[Symbol.iterator]();let s=r.next(),i=n.next();for(;!s.done&&!i.done;){if(s.value!==i.value)return!1;s=r.next(),i=n.next()}return s.done===i.done}}var a,c;(c=a||(a={})).Root="root",c.Text="text",c.Directive="directive",c.Comment="comment",c.Script="script",c.Style="style",c.Tag="tag",c.CDATA="cdata",c.Doctype="doctype",a.Root,a.Text,a.Directive,a.Comment,a.Script,a.Style,a.Tag,a.CDATA,a.Doctype;class l{constructor(){this.parent=null,this.prev=null,this.next=null,this.startIndex=null,this.endIndex=null}get parentNode(){return this.parent}set parentNode(t){this.parent=t}get previousSibling(){return this.prev}set previousSibling(t){this.prev=t}get nextSibling(){return this.next}set nextSibling(t){this.next=t}cloneNode(t=!1){return b(this,t)}}class h extends l{constructor(t){super(),this.data=t}get nodeValue(){return this.data}set nodeValue(t){this.data=t}}class u extends h{constructor(){super(...arguments),this.type=a.Text}get nodeType(){return 3}}class d extends h{constructor(){super(...arguments),this.type=a.Comment}get nodeType(){return 8}}class p extends h{constructor(t,e){super(e),this.name=t,this.type=a.Directive}get nodeType(){return 1}}class f extends l{constructor(t){super(),this.children=t}get firstChild(){var t;return null!==(t=this.children[0])&&void 0!==t?t:null}get lastChild(){return this.children.length>0?this.children[this.children.length-1]:null}get childNodes(){return this.children}set childNodes(t){this.children=t}}class m extends f{constructor(){super(...arguments),this.type=a.CDATA}get nodeType(){return 4}}class $ extends f{constructor(){super(...arguments),this.type=a.Root}get nodeType(){return 9}}class g extends f{constructor(t,e,r=[],n=("script"===t?a.Script:"style"===t?a.Style:a.Tag)){super(r),this.name=t,this.attribs=e,this.type=n}get nodeType(){return 1}get tagName(){return this.name}set tagName(t){this.name=t}get attributes(){return Object.keys(this.attribs).map((t=>{var e,r;return{name:t,value:this.attribs[t],namespace:null===(e=this["x-attribsNamespace"])||void 0===e?void 0:e[t],prefix:null===(r=this["x-attribsPrefix"])||void 0===r?void 0:r[t]}}))}}function b(t,e=!1){let r;if(function(t){return t.type===a.Text}(t))r=new u(t.data);else if(function(t){return t.type===a.Comment}(t))r=new d(t.data);else if(function(t){return(e=t).type===a.Tag||e.type===a.Script||e.type===a.Style;var e}(t)){const n=e?x(t.children):[],s=new g(t.name,{...t.attribs},n);n.forEach((t=>t.parent=s)),null!=t.namespace&&(s.namespace=t.namespace),t["x-attribsNamespace"]&&(s["x-attribsNamespace"]={...t["x-attribsNamespace"]}),t["x-attribsPrefix"]&&(s["x-attribsPrefix"]={...t["x-attribsPrefix"]}),r=s}else if(function(t){return t.type===a.CDATA}(t)){const n=e?x(t.children):[],s=new m(n);n.forEach((t=>t.parent=s)),r=s}else if(function(t){return t.type===a.Root}(t)){const n=e?x(t.children):[],s=new $(n);n.forEach((t=>t.parent=s)),t["x-mode"]&&(s["x-mode"]=t["x-mode"]),r=s}else{if(!function(t){return t.type===a.Directive}(t))throw new Error(`Not implemented yet: ${t.type}`);{const e=new p(t.name,t.data);null!=t["x-name"]&&(e["x-name"]=t["x-name"],e["x-publicId"]=t["x-publicId"],e["x-systemId"]=t["x-systemId"]),r=e}}return r.startIndex=t.startIndex,r.endIndex=t.endIndex,null!=t.sourceCodeLocation&&(r.sourceCodeLocation=t.sourceCodeLocation),r}function x(t){const e=t.map((t=>b(t,!0)));for(let t=1;t<e.length;t++)e[t].prev=e[t-1],e[t-1].next=e[t];return e}function*y(t,e=new Set){const r=new Set,n=Array.from(t.childNodes).filter((t=>!e.has(t)));for(yield t;n.length;){const t=n.shift();r.has(t)||(r.add(t),yield t),t.childNodes&&Array.from(t.childNodes).filter((t=>!e.has(t))).forEach((t=>n.push(t)))}}function w(t,e){return"function"==typeof t?.[e]}function v(t,e){return t instanceof g?t.attribs?.[e]:t.getAttribute?.(e)}function N(t,e,r){t instanceof g?t.attribs[e]=r:t.setAttribute?.(e,r)}function A(t,e){t instanceof g?delete t.attribs[e]:t.removeAttribute?.(e)}function k(t,e,r){if(t instanceof g&&e instanceof g)e.attribs[r]=t.attribs[r];else{const n=t?.getAttributeNode?.(r);e?.setAttributeNode?.(n?.cloneNode(!0))}}function j(t,...e){if(w(t,"replaceWith"))return t.replaceWith(...e);{const r=t,n=r.parentNode,s=Array.from(n.childNodes).indexOf(r);e.forEach((t=>t.parentNode=n)),n.childNodes=[].concat(Array.from(n.childNodes).slice(0,s)).concat(e).concat(Array.from(n.childNodes).slice(s+1))}}function E(t,e){return w(e,"appendChild")?t.appendChild(e):(t.childNodes.push(e),e.parentNode=t,e)}function C(t,e){if(w(e,"removeChild"))return t.removeChild(e);{const r=e;return t.childNodes=t.children.filter((t=>t!==r)),r}}function S(t,e,r){return r?w(t,"insertBefore")?t.insertBefore(e,r):(j(r,e,r),e):E(t,e)}window.htmlparser2;const _=new Set([":bind",":bind-events",":data",":for",":show","@watch","$html"]);var T;function L(t){return t.includes("/")?t.split("/").slice(0,-1).join("/"):""}function P(t){return!(t.includes("://")||t.startsWith("/")||t.startsWith("#")||t.startsWith("data:"))}!function(t){t.resolveIncludes=async function(t,e){const r=t;if("include"!==r.tagName?.toLocaleLowerCase())return;this.log("<include> tag found in:\n",t),this.log("<include> params:",e);const n=v(r,"src");if(!n)throw new Error(`"src" attribute missing from ${t}.`);const s=e=>{const n=e.firstChild;for(const t of Array.from(r.attributes))n&&"src"!==t.name&&k(r,n,t.name);j(t,...e.childNodes)},i={...e,rootDocument:!1,maxdepth:e?.maxdepth-1};if(0===i.maxdepth)throw new Error("Maximum recursion depth reached.");if(n.includes("://")||n.startsWith("//"))this.log("Including remote file from absolute path:",n),await this.preprocessRemote(n,i).then(s);else if(e?.dirpath?.includes("://")||e?.dirpath?.startsWith("//")){const t=n.startsWith("/")?n:`${e.dirpath}/${n}`;this.log("Including remote file from relative path:",t),await this.preprocessRemote(t,i).then(s)}else if("/"===n.charAt(0))this.log("Including local file from absolute path:",n),await this.preprocessLocal(n,i).then(s);else{const t=e?.dirpath&&"."!==e?.dirpath?`${e?.dirpath}/${n}`:n;this.log("Including local file from relative path:",t),await this.preprocessLocal(t,i).then(s)}},t.rebaseRelativePaths=async function(t,e){const r=t,n=r.tagName?.toLowerCase();if(!e?.dirpath)return;const s=v(r,"src"),i=v(r,"href"),o=v(r,"data"),a=s||i||o;a&&(a&&P(a)&&this.log("Rebasing relative path as:",e.dirpath,"/",a),"img"===n&&s&&P(s)?N(r,"src",`${e.dirpath}/${s}`):"a"===n&&i&&P(i)||"link"===n&&i&&P(i)?N(r,"href",`${e.dirpath}/${i}`):"script"===n&&s&&P(s)||"source"===n&&s&&P(s)||"audio"===n&&s&&P(s)||"video"===n&&s&&P(s)||"track"===n&&s&&P(s)||"iframe"===n&&s&&P(s)?N(r,"src",`${e.dirpath}/${s}`):"object"===n&&o&&P(o)?N(r,"data",`${e.dirpath}/${o}`):"input"===n&&s&&P(s)?N(r,"src",`${e.dirpath}/${s}`):("area"===n&&i&&P(i)||"base"===n&&i&&P(i))&&N(r,"href",`${e.dirpath}/${i}`))},t.registerCustomElements=async function(t,e){const r=t;if("template"===r.tagName?.toLowerCase()&&v(r,"is")){const t=v(r,"is")?.toLowerCase();this._customElements.has(t)||(this.log(`Registering custom element: ${t}\n`,r),this._customElements.set(t,r.cloneNode(!0)),C(r.parentNode,r))}},t.resolveCustomElements=async function(t,e){const r=t,n=r.tagName?.toLowerCase();if(this._customElements.has(n)){this.log(`Processing custom element: ${n}\n`,r);const e=this._customElements.get(n),s=(e.content||e).cloneNode(!0),i=function(t){return t instanceof g?t.children.find((t=>t instanceof g)):t.firstElementChild}(s);for(const t of Array.from(r.attributes))i&&k(r,i,t.name);const a=new o(y(s)).find((t=>"slot"===t.tagName?.toLowerCase()));a&&j(a,...r.childNodes),j(t,...s.childNodes)}},t.resolveTextNodeExpressions=async function(t,e){if(3!==t.nodeType)return;const r=function(t){return t instanceof l?t.data:t.nodeValue}(t)||"";this.log("Processing node content value:\n",r);const n=new RegExp(/{{ ([^}]+) }}/gm),s=Array.from(r.matchAll(n)).map((t=>t[1])),i=async()=>{let e=r;for(const r of s){const[n]=await this.eval(r,{$elem:t});e=e.replace(`{{ ${r} }}`,String(n))}!function(t,e){t instanceof l?t.data=e:t.nodeValue=e}(t,e)};await Promise.all(s.map((e=>this.watchExpr(e,{$elem:t},i))))},t.resolveDataAttribute=async function(t,e){if(this._skipNodes.has(t))return;const r=t,n=v(r,":data");if(n)if(this.log(":data attribute found in:\n",t),A(r,":data"),e?.rootNode===t){const[e]=await this.eval(n,{$elem:t});await this.update(e)}else{const r=this.clone();t.renderer=r;const[s]=await r.eval(n,{$elem:t});await r.update(s);for(const e of y(t,this._skipNodes))this._skipNodes.add(e);await r.mount(t,e)}},t.resolveWatchAttribute=async function(t,e){if(this._skipNodes.has(t))return;const r=t,n=v(r,"@watch");n&&(this.log("@watch attribute found in:\n",t),A(r,"@watch"),await this.watchExpr(n,{$elem:t},(()=>{})))},t.resolveTextAttributes=async function(t,e){if(this._skipNodes.has(t))return;const r=t,n=v(r,"$text");n&&(this.log("$text attribute found in:\n",t),A(r,"$text"),await this.watchExpr(n,{$elem:t},(e=>function(t,e){t instanceof g?t.children=[new u(e)]:t.textContent=e}(t,e))))},t.resolveHtmlAttribute=async function(t,e){if(this._skipNodes.has(t))return;const r=t,n=v(r,"$html");if(n){this.log("$html attribute found in:\n",t),A(r,"$html");const s=this.clone();await this.watchExpr(n,{$elem:t},(async t=>{const n=await s.preprocessString(t,e);await s.renderNode(n,e),function(t,...e){w(t,"replaceChildren")?t.replaceChildren(...e):(t.childNodes=e,e.forEach((e=>e.parentNode=t)))}(r,n)}))}},t.resolvePropAttributes=async function(t,e){if(this._skipNodes.has(t))return;const r=t;for(const e of Array.from(r.attributes||[]))if(e.name.startsWith("$")&&!_.has(e.name)){this.log(e.name,"attribute found in:\n",t),A(r,e.name);const n=e.name.slice(1).replace(/-./g,(t=>t[1].toUpperCase()));await this.watchExpr(e.value,{$elem:t},(e=>t[n]=e))}},t.resolveAttrAttributes=async function(t,e){if(this._skipNodes.has(t))return;const r=t;for(const e of Array.from(r.attributes||[]))if(e.name.startsWith(":")&&!_.has(e.name)){this.log(e.name,"attribute found in:\n",t),A(r,e.name);const n=e.name.slice(1);await this.watchExpr(e.value,{$elem:t},(t=>N(r,n,t)))}},t.resolveEventAttributes=async function(t,e){if(this._skipNodes.has(t))return;const r=t;for(const e of Array.from(r.attributes||[]))e.name.startsWith("@")&&!_.has(e.name)&&(this.log(e.name,"attribute found in:\n",t),A(r,e.name),t.addEventListener?.(e.name.substring(1),(r=>this.eval(e.value,{$elem:t,$event:r}))))},t.resolveForAttribute=async function(t,e){if(this._skipNodes.has(t))return;const r=t,n=v(r,":for")?.trim();if(n){this.log(":for attribute found in:\n",t),A(r,":for");for(const e of y(t,this._skipNodes))this._skipNodes.add(e);const s=t.parentNode,i=function(t,e){return e?e.createElement(t):new g(t,{})}("template",t.ownerDocument);S(s,i,t),C(s,t),E(i,t),this.log(":for template:\n",i);const o=n.split(" in ",2);if(2!==o.length)throw new Error(`Invalid :for format: \`${n}\`. Expected "{key} in {expression}".`);const a=[],[c,l]=o;await this.watchExpr(l,{$elem:t},(r=>(this.log(":for list items:",r),this.lock=this.lock.then((()=>new Promise((async n=>{if(a.splice(0,a.length).forEach((t=>{C(s,t),this._skipNodes.delete(t)})),!Array.isArray(r))return console.error(`Expression did not yield a list: \`${l}\` => \`${r}\``),n();for(const n of r){const r=this.clone();await r.set(c,n);const s=t.cloneNode(!0);a.push(s),this._skipNodes.add(s),await r.mount(s,e),this.log("Rendered list child:\n",s,s.outerHTML)}const o=i.nextSibling;for(const t of a)S(s,t,o);n()})))).catch((t=>{throw console.error(t),new Error(t)})).then(),this.lock)))}},t.resolveBindAttribute=async function(t,e){if(this._skipNodes.has(t))return;const r=t,n=v(r,":bind");if(n){this.log(":bind attribute found in:\n",t);const e=["change","input"],s=v(r,":bind-events")?.split(",")||e;A(r,":bind"),A(r,":bind-events");const i="checkbox"===v(r,"type")?"checked":"value",o=`$elem.${i} = ${n}`;await this.watchExpr(o,{$elem:t},(t=>r[i]=t));const a=`${n} = $elem.${i}`;for(const e of s)t.addEventListener(e,(()=>this.eval(a,{$elem:t})))}},t.resolveShowAttribute=async function(t,e){if(this._skipNodes.has(t))return;const r=t,n=v(r,":show");if(n){this.log(":show attribute found in:\n",t),A(r,":show");const e="none"===r.style?.display?"":r.style?.display??v(r,"style")?.split(";")?.find((t=>"display"===t.split(":")[0]))?.split(":")?.at(1)?.trim();await this.watchExpr(n,{$elem:t},(t=>{r.style?r.style.display=t?e:"none":N(r,"style",`display: ${t?e:"none"};`)}))}}}(T||(T={}));class M extends s{debugging=!1;dirpath="";evalkeys=["$elem","$event"];expressionCache=new Map;evalCallbacks=new Map;_skipNodes=new Set;_customElements=new Map;debug(t){return this.debugging=t,this}async fetchRemote(t,e){return fetch(t,{cache:e?.cache??"default"}).then((t=>t.text()))}async fetchLocal(t,e){return this.fetchRemote(t,e)}async preprocessString(t,e){this.log("Preprocessing string content with params:\n",e);const r=this.parseHTML(t,e);return await this.preprocessNode(r,e),r}async preprocessRemote(t,e){const r={};e?.cache&&(r.cache=e.cache);const n=await fetch(t,r).then((t=>t.text()));return this.preprocessString(n,{...e,dirpath:L(t),rootDocument:e?.rootDocument??!t.endsWith(".tpl.html")})}async preprocessLocal(t,e){const r=await this.fetchLocal(t,e);return this.preprocessString(r,{...e,dirpath:L(t),rootDocument:e?.rootDocument??!t.endsWith(".tpl.html")})}clone(){const t=new this.constructor(Object.fromEntries(this.store.entries()));return t._customElements=this._customElements,t.debug(this.debugging)}log(...t){this.debugging&&console.debug(...t)}cachedExpressionFunction(t){return this.expressionCache.has(t)||this.expressionCache.set(t,function(t,e=[]){return new Function(...e,`with (this) { return (async () => (${t}))(); }`)}(t,this.evalkeys)),this.expressionCache.get(t)}async eval(t,e={}){if(this.store.has(t))return[this.get(t),[t]];{const r=this.cachedExpressionFunction(t),n=this.evalkeys.map((t=>e[t]));if(Object.keys(e).some((t=>!this.evalkeys.includes(t))))throw new Error(`Invalid argument key, must be one of: ${this.evalkeys.join(", ")}`);const[s,i]=await this.trace((async function(){return r.call(this,...n)}));return this.log(`eval \`${t}\` => `,s,`[ ${i.join(", ")} ]`),[s,i]}}watchExpr(t,e,r){if(this.evalCallbacks.has(t))return this.evalCallbacks.get(t)?.push(r),this.eval(t,e).then((([t,e])=>r(t,e)));this.evalCallbacks.set(t,[r]);const n=[],s=async()=>{const[r,i]=await this.eval(t,e),o=this.evalCallbacks.get(t)||[];await Promise.all(o.map((t=>t(r,i)))),n.length>0&&this.unwatch(n,s),n.splice(0,n.length,...i),this.watch(i,s)};return s()}async preprocessNode(t,e){e={dirpath:this.dirpath,maxdepth:10,...e};const r=new o(y(t,this._skipNodes)).map((async t=>{this.log("Preprocessing node:\n",t),await T.resolveIncludes.call(this,t,e),await T.rebaseRelativePaths.call(this,t,e),await T.registerCustomElements.call(this,t,e),await T.resolveCustomElements.call(this,t,e)}));return await Promise.all(r.generator()),t}async renderNode(t,e){for(const r of y(t,this._skipNodes))this.log("Rendering node:\n",r),await T.resolveDataAttribute.call(this,r,e),await T.resolveForAttribute.call(this,r,e),await T.resolveTextAttributes.call(this,r,e),await T.resolveHtmlAttribute.call(this,r,e),await T.resolveShowAttribute.call(this,r,e),await T.resolveWatchAttribute.call(this,r,e),await T.resolveBindAttribute.call(this,r,e),await T.resolvePropAttributes.call(this,r,e),await T.resolveAttrAttributes.call(this,r,e),await T.resolveEventAttributes.call(this,r,e),await T.resolveTextNodeExpressions.call(this,r,e);return t}async mount(t,e){e={...e,rootNode:t},await this.preprocessNode(t,e),await this.renderNode(t,e),t.renderer=this}}var O=r(654);const z=.25,R=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],D=[...R,16,20,24,28,32,36,40,44,48,52,56,60,64,72,80,96,112,128,144,160,192,224,256,288,320,384,448,512],I=[1,2,5,10,20,25,30,40,50,60,70,75,80,90,95,98,99,100],W=["hover","focus","disabled","focus","active"],F={sm:640,md:768,lg:1024,xl:1280},V={margin:"m",padding:"p"},H={width:"w",height:"h"},B={top:"top",right:"right",bottom:"bottom",left:"left"},G={"min-width":"min-w","min-height":"min-h","max-width":"max-w","max-height":"max-h"},q={bold:{"font-weight":"bold"},semibold:{"font-weight":600},italic:{"font-style":"italic"},underline:{"text-decoration":"underline"},"no-underline":{"text-decoration":"none"},"decoration-none":{"text-decoration":"none"},"line-through":{"text-decoration":"line-through"},uppercase:{"text-transform":"uppercase"},lowercase:{"text-transform":"lowercase"},capitalize:{"text-transform":"capitalize"},"font-mono":{"font-family":"ui-monospace, monospace"},"font-sans":{"font-family":"ui-sans-serif, system-ui, sans-serif"},"font-serif":{"font-family":"ui-serif, serif"},"text-left":{"text-align":"left"},"text-right":{"text-align":"right"},"text-center":{"text-align":"center"},"text-justify":{"text-align":"justify"},"text-xs":{"font-size":".75rem"},"text-sm":{"font-size":".875rem"},"text-base":{"font-size":"1rem"},"text-lg":{"font-size":"1.125rem"},"text-xl":{"font-size":"1.25rem"},relative:{position:"relative"},fixed:{position:"fixed"},absolute:{position:"absolute"},sticky:{position:"sticky"},"object-contain":{"object-fit":"contain"},"object-cover":{"object-fit":"cover"},"object-fill":{"object-fit":"fill"},"object-none":{"object-fit":"none"},block:{display:"block"},contents:{display:"contents"},hidden:{display:"none"},inline:{display:"inline"},"inline-block":{display:"inline-block"},flex:{display:"flex"},"flex-1":{flex:"1 1 0%"},"flex-inline":{display:"inline-flex"},"flex-row":{"flex-direction":"row"},"flex-col":{"flex-direction":"column"},"flex-row-reverse":{"flex-direction":"row-reverse"},"flex-col-reverse":{"flex-direction":"column-reverse"},"flex-wrap":{"flex-wrap":"wrap"},"flex-wrap-reverse":{"flex-wrap":"wrap-reverse"},"flex-nowrap":{"flex-wrap":"nowrap"},"justify-start":{"justify-content":"flex-start"},"justify-end":{"justify-content":"flex-end"},"justify-center":{"justify-content":"center"},"justify-between":{"justify-content":"space-between"},"justify-around":{"justify-content":"space-around"},"justify-evenly":{"justify-content":"space-evenly"},"justify-stretch":{"justify-content":"stretch"},"items-start":{"align-items":"flex-start"},"items-end":{"align-items":"flex-end"},"items-center":{"align-items":"center"},"items-stretch":{"align-items":"stretch"},"flex-grow":{"flex-grow":1},"flex-shrink":{"flex-shrink":1},"overflow-auto":{overflow:"auto"},"overflow-x-auto":{"overflow-x":"auto"},"overflow-y-auto":{"overflow-y":"auto"},"overflow-hidden":{overflow:"hidden"},"overflow-visible":{overflow:"visible"},"cursor-pointer":{cursor:"pointer"},"cursor-wait":{cursor:"wait"},"cursor-not-allowed":{cursor:"not-allowed"},"select-none":{"user-select":"none"},"select-all":{"user-select":"all"},"pointer-events-auto":{"pointer-events":"auto"},"pointer-events-none":{"pointer-events":"none"},"box-border":{"box-sizing":"border-box"},"box-content":{"box-sizing":"content-box"},resize:{resize:"both"},"resize-x":{resize:"horizontal"},"resize-y":{resize:"vertical"},"resize-none":{resize:"none"},border:{border:"1px solid"},"border-none":{border:"none"},"border-solid":{"border-style":"solid"},"border-dashed":{"border-style":"dashed"},"border-dotted":{"border-style":"dotted"},"rounded-none":{"border-radius":"0"},rounded:{"border-radius":".25rem"},"rounded-sm":{"border-radius":".125rem"},"rounded-md":{"border-radius":".375rem"},"rounded-lg":{"border-radius":".5rem"},"rounded-xl":{"border-radius":".75rem"},"rounded-full":{"border-radius":"9999px"},"transition-none":{transition:"none"},transition:{transition:"all 150ms"},"animate-none":{animation:"none"},"animate-spin":{animation:"spin 1s linear infinite"},"animate-ping":{animation:"ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"},"animate-pulse":{animation:"pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"}},U=["@keyframes spin {\n    from { transform: rotate(0deg) }\n    to { transform: rotate(360deg) }\n  }","@keyframes ping {\n    75%, 100% {\n      transform: scale(2);\n      opacity: 0;\n    }\n  }","@keyframes pulse {\n    0%, 100% { opacity: 1 }\n    50% { opacity: .5 }\n  }"],X={red:{50:16772078,100:16764370,200:15702682,300:15037299,400:15684432,500:16007990,600:15022389,700:13840175,800:12986408,900:12000284},pink:{50:16573676,100:16301008,200:16027569,300:15753874,400:15483002,500:15277667,600:14162784,700:12720219,800:11342935,900:8916559},purple:{50:15984117,100:14794471,200:13538264,300:12216520,400:11225020,500:10233776,600:9315498,700:8069026,800:6953882,900:4854924},"deep-purple":{50:15591414,100:13747433,200:11771355,300:9795021,400:8280002,500:6765239,600:6174129,700:5320104,800:4532128,900:3218322},indigo:{50:15264502,100:12962537,200:10463450,300:7964363,400:6056896,500:4149685,600:3754411,700:3162015,800:2635155,900:1713022},blue:{50:14938877,100:12312315,200:9489145,300:6600182,400:4367861,500:2201331,600:2001125,700:1668818,800:1402304,900:870305},"light-blue":{50:14808574,100:11789820,200:8508666,300:5227511,400:2733814,500:240116,600:236517,700:166097,800:161725,900:87963},cyan:{50:14743546,100:11725810,200:8445674,300:5099745,400:2541274,500:48340,600:44225,700:38823,800:33679,900:24676},teal:{50:14742257,100:11722715,200:8440772,300:5093036,400:2533018,500:38536,600:35195,700:31083,800:26972,900:19776},green:{50:15267305,100:13166281,200:10868391,300:8505220,400:6732650,500:5025616,600:4431943,700:3706428,800:3046706,900:1793568},"light-green":{50:15857897,100:14478792,200:12968357,300:11457921,400:10275941,500:9159498,600:8172354,700:6856504,800:5606191,900:3369246},lime:{50:16382951,100:15791299,200:15134364,300:14477173,400:13951319,500:13491257,600:12634675,700:11514923,800:10394916,900:8550167},yellow:{50:16776679,100:16775620,200:16774557,300:16773494,400:16772696,500:16771899,600:16635957,700:16498733,800:16361509,900:16088855},amber:{50:16775393,100:16772275,200:16769154,300:16766287,400:16763432,500:16761095,600:16757504,700:16752640,800:16748288,900:16740096},orange:{50:16774112,100:16769202,200:16764032,300:16758605,400:16754470,500:16750592,600:16485376,700:16088064,800:15690752,900:15094016},"deep-orange":{50:16509415,100:16764092,200:16755601,300:16747109,400:16740419,500:16733986,600:16011550,700:15092249,800:14172949,900:12531212},brown:{50:15723497,100:14142664,200:12364452,300:10586239,400:9268835,500:7951688,600:7162945,700:6111287,800:5125166,900:4073251},gray:{50:16448250,100:16119285,200:15658734,300:14737632,400:12434877,500:10395294,600:7697781,700:6381921,800:4342338,900:2171169},"blue-gray":{50:15527921,100:13621468,200:11583173,300:9479342,400:7901340,500:6323595,600:5533306,700:4545124,800:3622735,900:2503224}};function J(t){return W.map((e=>`.${e}\\:${t}:${e}`))}function K(t,e){return Object.entries(F).map((([r,n])=>`@media (min-width: ${n}px) { .${r}\\:${t} { ${e} } }`))}function Q(t){return Object.entries(t).flatMap((([t,e])=>[[`${e}-0`,`${t}: 0`],[`${e}-screen`,`${t}: 100vw`],[`${e}-full`,`${t}: 100%`],...D.map((r=>[`${e}-${r}`,`${t}: ${r*z}rem`])),...D.map((r=>[`-${e}-${r}`,`${t}: -${r*z}rem`])),...D.map((r=>[`${e}-${r}px`,`${t}: ${r}px`])),...D.map((r=>[`-${e}-${r}px`,`${t}: -${r}px`])),...I.map((r=>[`${e}-${r}%`,`${t}: ${r}%`])),...I.map((r=>[`-${e}-${r}%`,` ${t}: -${r}%`]))])).flatMap((([t,e])=>[`.${t} { ${e} }`,`${J(t).join(",")} { ${e} }`,...K(t,e)]))}function Y(t){return Object.entries(t).flatMap((([t,e])=>[`.${e}-auto { ${t}: auto; }`,`.${e}x-auto { ${t}-left: auto; ${t}-right: auto; }`,`.${e}y-auto { ${t}-top: auto; ${t}-bottom: auto; }`,...D.map((t=>[t,t*z])).map((([r,n])=>`.${e}x-${r} { ${t}-left: ${n}rem; ${t}-right: ${n}rem; }`)),...D.map((t=>[t,t*z])).map((([r,n])=>`.${e}y-${r} { ${t}-top: ${n}rem; ${t}-bottom: ${n}rem; }`)),...D.map((r=>`.${e}x-${r}px { ${t}-left: ${r}px; ${t}-right: ${r}px; }`)),...D.map((r=>`.${e}y-${r}px { ${t}-top: ${r}px; ${t}-bottom: ${r}px; }`)),...I.map((r=>`.${e}x-${r}% { ${t}-left: ${r}%; ${t}-right: ${r}%; }`)),...I.map((r=>`.${e}y-${r}% { ${t}-top: ${r}%; ${t}-bottom: ${r}%; }`))]))}function Z(){const t=[["white","#fff"],["black","#000"],["transparent","transparent"]].flatMap((([t,e])=>[[`text-${t}`,`color: ${e}`],[`fill-${t}`,`fill: ${e}`],[`bg-${t}`,`background-color: ${e}`],[`border-${t}`,`border-color: ${e}`]])),e=Object.entries(X).flatMap((([t,e])=>[[`text-${t}`,`color: #${e[500].toString(16)}`],[`fill-${t}`,`fill: #${e[500].toString(16)}`],[`bg-${t}`,`background-color: #${e[500].toString(16)}`],[`border-${t}`,`border-color: #${e[500].toString(16)}`]])),r=Object.entries(X).flatMap((([t,e])=>Object.entries(e).flatMap((([e,r])=>[[`text-${t}-${e}`,`color: #${r.toString(16)}`],[`fill-${t}-${e}`,`fill: #${r.toString(16)}`],[`bg-${t}-${e}`,`background-color: #${r.toString(16)}`],[`border-${t}-${e}`,`border-color: #${r.toString(16)}`]]))));return[].concat(t).concat(e).concat(r).flatMap((([t,e])=>[`.${t} { ${e} }`,`${J(t).join(",")} { ${e} }`,...K(t,e)]))}const tt=new class extends M{dirpath=L(self.location.href);parseHTML(t,e={rootDocument:!1}){if(e.rootDocument)return(new DOMParser).parseFromString(t,"text/html");{const e=document.createRange();return e.selectNodeContents(document.body),e.createContextualFragment(t)}}serializeHTML(t){return(new XMLSerializer).serializeToString(t).replace(/\s?xmlns="[^"]+"/gm,"")}preprocessLocal(t,e){return this.preprocessRemote(t,e)}};self.Mancha=tt;const et=self.document?.currentScript;if(self.document?.currentScript?.hasAttribute("init")){const t=et?.hasAttribute("debug"),e=et?.getAttribute("cache"),r=et?.getAttribute("target")?.split("+")||["body"];window.addEventListener("load",(()=>{r.map((async r=>{const n=self.document.querySelector(r);await tt.debug(t).mount(n,{cache:e})}))}))}if(self.document?.currentScript?.hasAttribute("css")){const t=et?.getAttribute("css")?.split("+");for(const e of t){const t=document.createElement("style");switch(e){case"basic":t.textContent=O.A;break;case"utils":t.textContent=(void 0,[...U,...Object.entries(q).flatMap((([t,e])=>Object.entries(e).flatMap((([e,r])=>[`.${t} { ${e}: ${r} }`,`${J(t).join(",")} { ${e}: ${r} }`,...K(t,`${e}: ${r}`)])))),...Z(),...[".opacity-0 { opacity: 0; }",...I.map((t=>`.opacity-${t} { opacity: ${t/100}; }`))].flatMap((([t,e])=>[`.${t} { ${e} }`,`${J(t).join(",")} { ${e} }`,...K(t,e)])),...Q(H),...Y(H),...Q(B),...Y(B),...(rt=V,Object.entries(rt).flatMap((([t,e])=>[`.${e}t-auto { ${t}-top: auto }`,`.${e}b-auto { ${t}-bottom: auto }`,`.${e}l-auto { ${t}-left: auto }`,`.${e}r-auto { ${t}-right: auto }`,...D.map((t=>[t,t*z])).map((([r,n])=>`.${e}t-${r} { ${t}-top: ${n}rem }`)),...D.map((t=>[t,t*z])).map((([r,n])=>`.${e}b-${r} { ${t}-bottom: ${n}rem }`)),...D.map((t=>[t,t*z])).map((([r,n])=>`.${e}l-${r} { ${t}-left: ${n}rem }`)),...D.map((t=>[t,t*z])).map((([r,n])=>`.${e}r-${r} { ${t}-right: ${n}rem }`)),...D.map((r=>`.${e}t-${r}px { ${t}-top: ${r}px }`)),...D.map((r=>`.${e}t-${r}px { ${t}-bottom: ${r}px }`)),...D.map((r=>`.${e}t-${r}px { ${t}-left: ${r}px }`)),...D.map((r=>`.${e}t-${r}px { ${t}-right: ${r}px }`)),...I.map((r=>`.${e}y-${r}% { ${t}-top: ${r}% }`)),...I.map((r=>`.${e}y-${r}% { ${t}-bottom: ${r}%; }`)),...I.map((r=>`.${e}x-${r}% { ${t}-left: ${r}% }`)),...I.map((r=>`.${e}x-${r}% { ${t}-right: ${r}% }`))]))),...Q(V),...Y(V),".space-x-0 > * { margin-left: 0; }",".space-y-0 > * { margin-top: 0; }",...D.map((t=>`.space-x-${t} > :not(:first-child) { margin-left: ${t*z}rem; }`)),...D.map((t=>`.space-y-${t} > :not(:first-child) { margin-top: ${t*z}rem; }`)),...D.map((t=>`.space-x-${t}px > :not(:first-child) { margin-left: ${t}px; }`)),...D.map((t=>`.space-y-${t}px > :not(:first-child) { margin-top: ${t}px; }`)),".gap-0 { gap: 0; }",...D.map((t=>`.gap-${t} { gap: ${t*z}rem; }`)),...D.map((t=>`.gap-${t}px { gap: ${t}px; }`)),...D.map((t=>`.gap-x-${t} { column-gap: ${t*z}rem; }`)),...D.map((t=>`.gap-y-${t} { row-gap: ${t*z}rem; }`)),...D.map((t=>`.gap-x-${t}px { column-gap: ${t}px; }`)),...D.map((t=>`.gap-y-${t}px { row-gap: ${t}px; }`)),...Q(G),...R.map((t=>`.border-${t} { border-width: ${t}px; }`))].join("\n"));break;default:console.error(`Unknown style name: "${e}"`)}self.document.head.appendChild(t)}}var rt})()})();