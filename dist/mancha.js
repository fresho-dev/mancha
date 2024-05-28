(()=>{"use strict";class t{timeouts=new Map;debounce(t,e){return new Promise(((s,r)=>{const n=this.timeouts.get(e);n&&clearTimeout(n),this.timeouts.set(e,setTimeout((()=>{try{s(e()),this.timeouts.delete(e)}catch(t){r(t)}}),t))}))}}function e(t,r,n=!0){if(null==t||function(t){return t instanceof s||t.__is_proxy__}(t))return t;if(n)for(const s in t)t.hasOwnProperty(s)&&"object"==typeof t[s]&&null!=t[s]&&(t[s]=e(t[s],r));return new Proxy(t,{deleteProperty:(t,e)=>e in t&&(delete t[e],r(),!0),set:(t,s,i,a)=>{n&&"object"==typeof i&&(i=e(i,r));const o=Reflect.set(t,s,i,a);return r(),o},get:(t,e,s)=>"__is_proxy__"===e||Reflect.get(t,e,s)})}class s extends t{value=null;listeners=[];constructor(t=null,...e){super(),this.value=this.wrapObjValue(t),e.forEach((t=>this.watch(t)))}static from(t,...e){return t instanceof s?(e.forEach(t.watch),t):new s(t,...e)}wrapObjValue(t){return null===t||"object"!=typeof t?t:e(t,(()=>this.trigger()))}get(){return this.value}async set(t){if(this.value!==t){const e=this.value;this.value=this.wrapObjValue(t),await this.trigger(e)}}watch(t){this.listeners.push(t)}unwatch(t){this.listeners=this.listeners.filter((e=>e!==t))}trigger(t=null){const e=this.listeners.slice();return this.debounce(10,(()=>Promise.all(e.map((e=>e(this.value,t)))).then((()=>{}))))}}class r extends t{store=new Map;debouncedListeners=new Map;lock=Promise.resolve();constructor(t){super();for(const[e,r]of Object.entries(t||{}))this.store.set(e,s.from(this.wrapFnValue(r)))}wrapFnValue(t){return t&&"function"==typeof t?(...e)=>t.call(n(this),...e):t}get $(){return n(this)}entries(){return this.store.entries()}get(t){return this.store.get(t)?.get()}async set(t,e){this.store.has(t)?await this.store.get(t).set(this.wrapFnValue(e)):this.store.set(t,s.from(this.wrapFnValue(e)))}del(t){return this.store.delete(t)}has(t){return this.store.has(t)}async update(t){await Promise.all(Object.entries(t).map((([t,e])=>this.set(t,e))))}watch(t,e){t=Array.isArray(t)?t:[t];const s=()=>e(...t.map((t=>this.store.get(t).get()))),r=()=>this.debounce(10,s);t.forEach((t=>this.store.get(t).watch(r))),this.debouncedListeners.set(e,r)}unwatch(t,e){(t=Array.isArray(t)?t:[t]).forEach((t=>this.store.get(t).unwatch(this.debouncedListeners.get(e)))),this.debouncedListeners.delete(e)}async trigger(t){t=Array.isArray(t)?t:[t],await Promise.all(t.map((t=>this.store.get(t).trigger())))}async trace(t){const e=new Set,s=n(this,((t,s)=>{"get"===t&&e.add(s)}));return[await t.call(s),Array.from(e)]}async computed(t,e){const[s,r]=await this.trace(e);this.watch(r,(async()=>this.set(t,await e.call(n(this))))),this.set(t,s)}}function n(t,e=(()=>{})){const s=Array.from(t.entries()).map((([t])=>t)),r=Object.fromEntries(s.map((t=>[t,void 0])));return new Proxy(Object.assign({},t,r),{get:(s,r,n)=>"string"==typeof r&&t.has(r)?(e("get",r),t.get(r)):"get"===r?s=>(e("get",s),t.get(s)):Reflect.get(t,r,n),set:(s,r,n,i)=>("string"!=typeof r||r in t?Reflect.set(t,r,n,i):(e("set",r,n),t.set(r,n)),!0)})}class i{iterable;constructor(t){this.iterable=t}filter(t){return new i(i.filterGenerator(t,this.iterable))}map(t){return new i(i.mapGenerator(t,this.iterable))}array(){return Array.from(this.iterable)}*generator(){for(const t of this.iterable)yield t}static*filterGenerator(t,e){for(const s of e)t(s)&&(yield s)}static*mapGenerator(t,e){for(const s of e)yield t(s)}static equals(t,e){const s=t[Symbol.iterator](),r=e[Symbol.iterator]();let n=s.next(),i=r.next();for(;!n.done&&!i.done;){if(n.value!==i.value)return!1;n=s.next(),i=r.next()}return n.done===i.done}}var a,o;(o=a||(a={})).Root="root",o.Text="text",o.Directive="directive",o.Comment="comment",o.Script="script",o.Style="style",o.Tag="tag",o.CDATA="cdata",o.Doctype="doctype",a.Root,a.Text,a.Directive,a.Comment,a.Script,a.Style,a.Tag,a.CDATA,a.Doctype;class c{constructor(){this.parent=null,this.prev=null,this.next=null,this.startIndex=null,this.endIndex=null}get parentNode(){return this.parent}set parentNode(t){this.parent=t}get previousSibling(){return this.prev}set previousSibling(t){this.prev=t}get nextSibling(){return this.next}set nextSibling(t){this.next=t}cloneNode(t=!1){return w(this,t)}}class l extends c{constructor(t){super(),this.data=t}get nodeValue(){return this.data}set nodeValue(t){this.data=t}}class h extends l{constructor(){super(...arguments),this.type=a.Text}get nodeType(){return 3}}class u extends l{constructor(){super(...arguments),this.type=a.Comment}get nodeType(){return 8}}class d extends l{constructor(t,e){super(e),this.name=t,this.type=a.Directive}get nodeType(){return 1}}class p extends c{constructor(t){super(),this.children=t}get firstChild(){var t;return null!==(t=this.children[0])&&void 0!==t?t:null}get lastChild(){return this.children.length>0?this.children[this.children.length-1]:null}get childNodes(){return this.children}set childNodes(t){this.children=t}}class f extends p{constructor(){super(...arguments),this.type=a.CDATA}get nodeType(){return 4}}class m extends p{constructor(){super(...arguments),this.type=a.Root}get nodeType(){return 9}}class g extends p{constructor(t,e,s=[],r=("script"===t?a.Script:"style"===t?a.Style:a.Tag)){super(s),this.name=t,this.attribs=e,this.type=r}get nodeType(){return 1}get tagName(){return this.name}set tagName(t){this.name=t}get attributes(){return Object.keys(this.attribs).map((t=>{var e,s;return{name:t,value:this.attribs[t],namespace:null===(e=this["x-attribsNamespace"])||void 0===e?void 0:e[t],prefix:null===(s=this["x-attribsPrefix"])||void 0===s?void 0:s[t]}}))}}function w(t,e=!1){let s;if(function(t){return t.type===a.Text}(t))s=new h(t.data);else if(function(t){return t.type===a.Comment}(t))s=new u(t.data);else if(function(t){return(e=t).type===a.Tag||e.type===a.Script||e.type===a.Style;var e}(t)){const r=e?y(t.children):[],n=new g(t.name,{...t.attribs},r);r.forEach((t=>t.parent=n)),null!=t.namespace&&(n.namespace=t.namespace),t["x-attribsNamespace"]&&(n["x-attribsNamespace"]={...t["x-attribsNamespace"]}),t["x-attribsPrefix"]&&(n["x-attribsPrefix"]={...t["x-attribsPrefix"]}),s=n}else if(function(t){return t.type===a.CDATA}(t)){const r=e?y(t.children):[],n=new f(r);r.forEach((t=>t.parent=n)),s=n}else if(function(t){return t.type===a.Root}(t)){const r=e?y(t.children):[],n=new m(r);r.forEach((t=>t.parent=n)),t["x-mode"]&&(n["x-mode"]=t["x-mode"]),s=n}else{if(!function(t){return t.type===a.Directive}(t))throw new Error(`Not implemented yet: ${t.type}`);{const e=new d(t.name,t.data);null!=t["x-name"]&&(e["x-name"]=t["x-name"],e["x-publicId"]=t["x-publicId"],e["x-systemId"]=t["x-systemId"]),s=e}}return s.startIndex=t.startIndex,s.endIndex=t.endIndex,null!=t.sourceCodeLocation&&(s.sourceCodeLocation=t.sourceCodeLocation),s}function y(t){const e=t.map((t=>w(t,!0)));for(let t=1;t<e.length;t++)e[t].prev=e[t-1],e[t-1].next=e[t];return e}function b(t,e){return"function"==typeof t?.[e]}function v(t,e){return t instanceof g?t.attribs?.[e]:t.getAttribute?.(e)}function x(t,e,s){t instanceof g?t.attribs[e]=s:t.setAttribute?.(e,s)}function N(t,e){t instanceof g?delete t.attribs[e]:t.removeAttribute?.(e)}function A(t,e,s){if(t instanceof g&&e instanceof g)e.attribs[s]=t.attribs[s];else{const r=t.getAttributeNode(s);e.setAttributeNode(r?.cloneNode(!0))}}function $(t,...e){if(b(t,"replaceWith"))return t.replaceWith(...e);{const s=t,r=s.parentNode,n=Array.from(r.childNodes).indexOf(s);e.forEach((t=>t.parentNode=r)),r.childNodes=[].concat(Array.from(r.childNodes).slice(0,n)).concat(e).concat(Array.from(r.childNodes).slice(n+1))}}function E(t,e){return b(e,"appendChild")?t.appendChild(e):(t.childNodes.push(e),e.parentNode=t,e)}function C(t,e){if(b(e,"removeChild"))return t.removeChild(e);{const s=e;return t.childNodes=t.children.filter((t=>t!==s)),s}}function k(t,e,s){return s?b(t,"insertBefore")?t.insertBefore(e,s):($(s,e,s),e):E(t,e)}window.htmlparser2;const _=new Set([":bind",":bind-events",":data",":for",":show","@watch","$html"]);var S;function*T(t,e=new Set){const s=new Set,r=Array.from(t.childNodes).filter((t=>!e.has(t)));for(yield t;r.length;){const t=r.pop();s.has(t)||(s.add(t),yield t),t.childNodes&&Array.from(t.childNodes).filter((t=>!e.has(t))).forEach((t=>r.push(t)))}}function L(t){return t.includes("/")?t.split("/").slice(0,-1).join("/"):""}function P(t){return!(t.includes("://")||t.startsWith("/")||t.startsWith("#")||t.startsWith("data:"))}!function(t){t.resolveIncludes=async function(t,e){const s=t;if("include"!==s.tagName?.toLocaleLowerCase())return;this.log("<include> tag found in:\n",t),this.log("<include> params:",e);const r=v(s,"src");if(!r)throw new Error(`"src" attribute missing from ${t}.`);const n=e=>{const r=e.firstChild;for(const t of Array.from(s.attributes))r&&"src"!==t.name&&A(s,r,t.name);$(t,...e.childNodes)},i={...e,root:!1,maxdepth:e?.maxdepth-1};if(0===i.maxdepth)throw new Error("Maximum recursion depth reached.");if(r.includes("://")||r.startsWith("//"))this.log("Including remote file from absolute path:",r),await this.preprocessRemote(r,i).then(n);else if(e?.dirpath?.includes("://")||e?.dirpath?.startsWith("//")){const t=e.dirpath&&"."!==e.dirpath?`${e.dirpath}/${r}`:r;this.log("Including remote file from relative path:",t),await this.preprocessRemote(t,i).then(n)}else if("/"===r.charAt(0))this.log("Including local file from absolute path:",r),await this.preprocessLocal(r,i).then(n);else{const t=e?.dirpath&&"."!==e?.dirpath?`${e?.dirpath}/${r}`:r;this.log("Including local file from relative path:",t),await this.preprocessLocal(t,i).then(n)}},t.rebaseRelativePaths=async function(t,e){const s=t,r=s.tagName?.toLowerCase();if(!e?.dirpath)return;const n=v(s,"src"),i=v(s,"href"),a=v(s,"data"),o=n||i||a;o&&(o&&P(o)&&this.log("Rebasing relative path as:",e.dirpath,"/",o),"img"===r&&n&&P(n)?x(s,"src",`${e.dirpath}/${n}`):"a"===r&&i&&P(i)||"link"===r&&i&&P(i)?x(s,"href",`${e.dirpath}/${i}`):"script"===r&&n&&P(n)||"source"===r&&n&&P(n)||"audio"===r&&n&&P(n)||"video"===r&&n&&P(n)||"track"===r&&n&&P(n)||"iframe"===r&&n&&P(n)?x(s,"src",`${e.dirpath}/${n}`):"object"===r&&a&&P(a)?x(s,"data",`${e.dirpath}/${a}`):"input"===r&&n&&P(n)?x(s,"src",`${e.dirpath}/${n}`):("area"===r&&i&&P(i)||"base"===r&&i&&P(i))&&x(s,"href",`${e.dirpath}/${i}`))},t.registerCustomElements=async function(t,e){const s=t;if("template"===s.tagName?.toLowerCase()&&v(s,"is")){const t=v(s,"is");this.log(`Registering custom element: ${t}\n`,s),this._customElements.has(t)||this._customElements.set(t,s),C(s.parentNode,s)}},t.resolveCustomElements=async function(t,e){const s=t,r=s.tagName?.toLowerCase();if(this._customElements.has(r)){this.log(`Processing custom element: ${r}\n`,s);const e=this._customElements.get(r),n=(e.content||e).cloneNode(!0),i=n.firstChild;for(const t of Array.from(s.attributes))i&&A(s,i,t.name);$(t,...n.childNodes)}},t.resolveTextNodeExpressions=async function(t,e){if(3!==t.nodeType)return;const s=function(t){return t instanceof c?t.data:t.nodeValue}(t)||"";this.log("Processing node content value:\n",s);const r=new RegExp(/{{ ([^}]+) }}/gm),n=Array.from(s.matchAll(r)).map((t=>t[1])),i=async()=>{let e=s;for(const s of n){const[r]=await this.eval(s,{$elem:t});e=e.replace(`{{ ${s} }}`,String(r))}!function(t,e){t instanceof c?t.data=e:t.nodeValue=e}(t,e)};await Promise.all(n.map((e=>this.watchExpr(e,{$elem:t},i))))},t.resolveDataAttribute=async function(t,e){if(this._skipNodes.has(t))return;const s=t,r=v(s,":data");if(r){this.log(":data attribute found in:\n",t),N(s,":data");const n=this.clone();t.renderer=n;const[i]=await n.eval(r,{$elem:t});await n.update(i);for(const e of T(t,this._skipNodes))this._skipNodes.add(e);await n.mount(t,e)}},t.resolveWatchAttribute=async function(t,e){if(this._skipNodes.has(t))return;const s=t,r=v(s,"@watch");r&&(this.log("@watch attribute found in:\n",t),N(s,"@watch"),await this.watchExpr(r,{$elem:t},(()=>{})))},t.resolveTextAttributes=async function(t,e){if(this._skipNodes.has(t))return;const s=t,r=v(s,"$text");r&&(this.log("$text attribute found in:\n",t),N(s,"$text"),await this.watchExpr(r,{$elem:t},(e=>function(t,e){t instanceof g?t.children=[new h(e)]:t.textContent=e}(t,e))))},t.resolveHtmlAttribute=async function(t,e){if(this._skipNodes.has(t))return;const s=t,r=v(s,"$html");if(r){this.log("$html attribute found in:\n",t),N(s,"$html");const n=this.clone();await this.watchExpr(r,{$elem:t},(async t=>{const r=await n.preprocessString(t,e);await n.renderNode(r,e),function(t,...e){b(t,"replaceChildren")?t.replaceChildren(...e):(t.childNodes=e,e.forEach((e=>e.parentNode=t)))}(s,r)}))}},t.resolvePropAttributes=async function(t,e){if(this._skipNodes.has(t))return;const s=t;for(const e of Array.from(s.attributes||[]))if(e.name.startsWith("$")&&!_.has(e.name)){this.log(e.name,"attribute found in:\n",t),N(s,e.name);const r=e.name.slice(1).replace(/-./g,(t=>t[1].toUpperCase()));await this.watchExpr(e.value,{$elem:t},(e=>t[r]=e))}},t.resolveAttrAttributes=async function(t,e){if(this._skipNodes.has(t))return;const s=t;for(const e of Array.from(s.attributes||[]))if(e.name.startsWith(":")&&!_.has(e.name)){this.log(e.name,"attribute found in:\n",t),N(s,e.name);const r=e.name.slice(1);await this.watchExpr(e.value,{$elem:t},(t=>x(s,r,t)))}},t.resolveEventAttributes=async function(t,e){if(this._skipNodes.has(t))return;const s=t;for(const e of Array.from(s.attributes||[]))e.name.startsWith("@")&&!_.has(e.name)&&(this.log(e.name,"attribute found in:\n",t),N(s,e.name),t.addEventListener?.(e.name.substring(1),(s=>{this.eval(e.value,{$elem:t,$event:s})})))},t.resolveForAttribute=async function(t,e){if(this._skipNodes.has(t))return;const s=t,r=v(s,":for")?.trim();if(r){this.log(":for attribute found in:\n",t),N(s,":for");for(const e of T(t,this._skipNodes))this._skipNodes.add(e);const n=t.parentNode,i=function(t,e){return e?e.createElement(t):new g(t,{})}("template",t.ownerDocument);k(n,i,t),C(n,t),E(i,t),this.log(":for template:\n",i);const a=r.split(" in ",2);if(2!==a.length)throw new Error(`Invalid :for format: \`${r}\`. Expected "{key} in {expression}".`);const o=[],[c,l]=a;await this.watchExpr(l,{$elem:t},(s=>(this.log(":for list items:",s),this.lock=this.lock.then((()=>new Promise((async r=>{if(o.splice(0,o.length).forEach((t=>{C(n,t),this._skipNodes.delete(t)})),!Array.isArray(s))return console.error(`Expression did not yield a list: \`${l}\` => \`${s}\``),r();for(const r of s){const s=this.clone();await s.set(c,r);const n=t.cloneNode(!0);o.push(n),this._skipNodes.add(n),await s.mount(n,e),this.log("Rendered list child:\n",n,n.outerHTML)}const a=i.nextSibling;for(const t of o)k(n,t,a);r()})))).catch((t=>{throw console.error(t),new Error(t)})).then(),this.lock)))}},t.resolveBindAttribute=async function(t,e){if(this._skipNodes.has(t))return;const s=t,r=v(s,":bind");if(r){this.log(":bind attribute found in:\n",t);const e=["change","input"],n=v(s,":bind-events")?.split(",")||e;N(s,":bind"),N(s,":bind-events");const i="checkbox"===v(s,"type")?"checked":"value",a=`$elem.${i} = ${r}`;await this.watchExpr(a,{$elem:t},(t=>s[i]=t));const o=`${r} = $elem.${i}`;for(const e of n)t.addEventListener(e,(()=>this.eval(o,{$elem:t})))}},t.resolveShowAttribute=async function(t,e){if(this._skipNodes.has(t))return;const s=t,r=v(s,":show");if(r){this.log(":show attribute found in:\n",t),N(s,":show");const e="none"===s.style?.display?"":s.style?.display??v(s,"style")?.split(";")?.find((t=>"display"===t.split(":")[0]))?.split(":")?.at(1)?.trim();await this.watchExpr(r,{$elem:t},(t=>{s.style?s.style.display=t?e:"none":x(s,"style",`display: ${t?e:"none"};`)}))}}}(S||(S={}));class R extends r{debugging=!1;dirpath="";evalkeys=["$elem","$event"];expressionCache=new Map;evalCallbacks=new Map;_skipNodes=new Set;_customElements=new Map;debug(t){return this.debugging=t,this}async fetchRemote(t,e){return fetch(t,{cache:e?.cache??"default"}).then((t=>t.text()))}async fetchLocal(t,e){return this.fetchRemote(t,e)}async preprocessString(t,e){this.log("Preprocessing string content with params:\n",e);const s=this.parseHTML(t,e);return await this.preprocessNode(s,e),s}async preprocessLocal(t,e){const s=await this.fetchLocal(t,e);return this.preprocessString(s,{...e,dirpath:L(t),root:e?.root??!t.endsWith(".tpl.html")})}async preprocessRemote(t,e){const s={};e?.cache&&(s.cache=e.cache);const r=await fetch(t,s).then((t=>t.text()));return this.preprocessString(r,{...e,dirpath:L(t),root:e?.root??!t.endsWith(".tpl.html")})}clone(){const t=new this.constructor(Object.fromEntries(this.store.entries()));return t._customElements=this._customElements,t.debug(this.debugging)}log(...t){this.debugging&&console.debug(...t)}cachedExpressionFunction(t){return this.expressionCache.has(t)||this.expressionCache.set(t,function(t,e=[]){return new Function(...e,`with (this) { return (async () => (${t}))(); }`)}(t,this.evalkeys)),this.expressionCache.get(t)}async eval(t,e={}){if(this.store.has(t))return[this.get(t),[t]];{const s=this.cachedExpressionFunction(t),r=this.evalkeys.map((t=>e[t]));if(Object.keys(e).some((t=>!this.evalkeys.includes(t))))throw new Error(`Invalid argument key, must be one of: ${this.evalkeys.join(", ")}`);const[n,i]=await this.trace((async function(){return s.call(this,...r)}));return this.log(`eval \`${t}\` => `,n,`[ ${i.join(", ")} ]`),[n,i]}}watchExpr(t,e,s){if(this.evalCallbacks.has(t))return this.evalCallbacks.get(t)?.push(s),this.eval(t,e).then((([t,e])=>s(t,e)));this.evalCallbacks.set(t,[s]);const r=[],n=async()=>{const[s,i]=await this.eval(t,e),a=this.evalCallbacks.get(t)||[];await Promise.all(a.map((t=>t(s,i)))),r.length>0&&this.unwatch(r,n),r.splice(0,r.length,...i),this.watch(i,n)};return n()}async preprocessNode(t,e){e=Object.assign({dirpath:this.dirpath,maxdepth:10},e);const s=new i(T(t,this._skipNodes)).map((async t=>{this.log("Preprocessing node:\n",t),await S.resolveIncludes.call(this,t,e),await S.registerCustomElements.call(this,t,e),await S.resolveCustomElements.call(this,t,e),await S.rebaseRelativePaths.call(this,t,e)}));await Promise.all(s.generator())}async renderNode(t,e){for(const s of T(t,this._skipNodes))this.log("Rendering node:\n",s),await S.resolveDataAttribute.call(this,s,e),await S.resolveForAttribute.call(this,s,e),await S.resolveTextAttributes.call(this,s,e),await S.resolveHtmlAttribute.call(this,s,e),await S.resolveShowAttribute.call(this,s,e),await S.resolveWatchAttribute.call(this,s,e),await S.resolveBindAttribute.call(this,s,e),await S.resolvePropAttributes.call(this,s,e),await S.resolveAttrAttributes.call(this,s,e),await S.resolveEventAttributes.call(this,s,e),await S.resolveTextNodeExpressions.call(this,s,e);return t}async mount(t,e){await this.preprocessNode(t,e),await this.renderNode(t,e)}}const j=new class extends R{dirpath=L(self.location.href);parseHTML(t,e={root:!1}){if(e.root)return(new DOMParser).parseFromString(t,"text/html");{const e=document.createRange();return e.selectNodeContents(document.body),e.createContextualFragment(t)}}serializeHTML(t){return(new XMLSerializer).serializeToString(t).replace(/\s?xmlns="[^"]+"/gm,"")}preprocessLocal(t,e){return this.preprocessRemote(t,e)}};self.Mancha=j;const I=self.document?.currentScript;if(self.document?.currentScript?.hasAttribute("init")){const t=I?.hasAttribute("debug"),e=I?.getAttribute("cache"),s=I?.getAttribute("target")?.split(",")||["body"];window.addEventListener("load",(()=>{s.map((async s=>{const r=self.document.querySelector(s);await j.debug(t).mount(r,{cache:e})}))}))}})();