(()=>{"use strict";var e={885:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.attributeNameToCamelCase=void 0,t.attributeNameToCamelCase=function(e){return e.replace(/-./g,(e=>e[1].toUpperCase()))}},283:(e,t,s)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.IRenderer=t.safeEval=t.makeEvalFunction=t.isRelativePath=t.dirname=t.traverse=void 0;const r=s(63),i=s(150),a=s(230);function*n(e,t=new Set){const s=new Set,r=Array.from(e.childNodes).filter((e=>!t.has(e)));for(yield e;r.length;){const e=r.pop();s.has(e)||(s.add(e),yield e),e.childNodes&&Array.from(e.childNodes).filter((e=>!t.has(e))).forEach((e=>r.push(e)))}}function o(e){return e.includes("/")?e.split("/").slice(0,-1).join("/"):""}function c(e,t=[]){return new Function(...t,`with (this) { return (async () => (${e}))(); }`)}t.traverse=n,t.dirname=o,t.isRelativePath=function(e){return!(e.includes("://")||e.startsWith("/")||e.startsWith("#")||e.startsWith("data:"))},t.makeEvalFunction=c,t.safeEval=function(e,t,s={}){const r=`with (this) { return (async () => (${t}))(); }`;return new Function(...Object.keys(s),r).call(e,...Object.values(s))};class l extends r.ReactiveProxyStore{debugging=!1;dirpath="";evalkeys=["$elem","$event"];expressionCache=new Map;evalCallbacks=new Map;skipNodes=new Set;debug(e){return this.debugging=e,this}async fetchRemote(e,t){return fetch(e,{cache:t?.cache??"default"}).then((e=>e.text()))}async fetchLocal(e,t){return this.fetchRemote(e,t)}async preprocessString(e,t){this.log("Preprocessing string content with params:\n",t);const s=this.parseHTML(e,t);return await this.preprocessNode(s,t),s}async preprocessLocal(e,t){const s=await this.fetchLocal(e,t);return this.preprocessString(s,{...t,dirpath:o(e),root:t?.root??!e.endsWith(".tpl.html")})}async preprocessRemote(e,t){const s=t?.cache||"default",r=await fetch(e,{cache:s}).then((e=>e.text()));return this.preprocessString(r,{...t,dirpath:o(e),root:t?.root??!e.endsWith(".tpl.html")})}clone(){return new this.constructor(Object.fromEntries(this.store.entries()))}log(...e){this.debugging&&console.debug(...e)}cachedExpressionFunction(e){return this.expressionCache.has(e)||this.expressionCache.set(e,c(e,this.evalkeys)),this.expressionCache.get(e)}async eval(e,t={}){const s=this.cachedExpressionFunction(e),r=this.evalkeys.map((e=>t[e]));if(Object.keys(t).some((e=>!this.evalkeys.includes(e))))throw new Error(`Invalid argument key, must be one of: ${this.evalkeys.join(", ")}`);const[i,a]=await this.trace((async function(){return s.call(this,...r)}));return this.log(`eval \`${e}\` => `,i,`[ ${a.join(", ")} ]`),[i,a]}watchExpr(e,t,s){if(this.evalCallbacks.has(e))return this.evalCallbacks.get(e)?.push(s),this.eval(e,t).then((([e,t])=>s(e,t)));this.evalCallbacks.set(e,[s]);const r=[],i=async()=>{const[s,a]=await this.eval(e,t),n=this.evalCallbacks.get(e)||[];await Promise.all(n.map((e=>e(s,a)))),r.length>0&&this.unwatch(r,i),r.splice(0,r.length,...a),this.watch(a,i)};return i()}async preprocessNode(e,t){t=Object.assign({dirpath:this.dirpath,maxdepth:10},t);const s=new i.Iterator(n(e,this.skipNodes)).map((async e=>{this.log("Preprocessing node:\n",e),await a.RendererPlugins.resolveIncludes.call(this,e,t),await a.RendererPlugins.rebaseRelativePaths.call(this,e,t)}));await Promise.all(s.generator())}async renderNode(e,t){for(const s of n(e,this.skipNodes))this.log("Rendering node:\n",s),await a.RendererPlugins.resolveDataAttribute.call(this,s,t),await a.RendererPlugins.resolveForAttribute.call(this,s,t),await a.RendererPlugins.resolveHtmlAttribute.call(this,s,t),await a.RendererPlugins.resolveShowAttribute.call(this,s,t),await a.RendererPlugins.resolveWatchAttribute.call(this,s,t),await a.RendererPlugins.resolveBindAttribute.call(this,s,t),await a.RendererPlugins.resolvePropAttributes.call(this,s,t),await a.RendererPlugins.resolveAttrAttributes.call(this,s,t),await a.RendererPlugins.resolveEventAttributes.call(this,s,t),await a.RendererPlugins.resolveTextNodeExpressions.call(this,s,t)}async mount(e,t){await this.preprocessNode(e,t),await this.renderNode(e,t)}}t.IRenderer=l},150:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.Iterator=void 0;class s{iterable;constructor(e){this.iterable=e}filter(e){return new s(s.filterGenerator(e,this.iterable))}map(e){return new s(s.mapGenerator(e,this.iterable))}array(){return Array.from(this.iterable)}*generator(){for(const e of this.iterable)yield e}static*filterGenerator(e,t){for(const s of t)e(s)&&(yield s)}static*mapGenerator(e,t){for(const s of t)yield e(s)}static equals(e,t){const s=e[Symbol.iterator](),r=t[Symbol.iterator]();let i=s.next(),a=r.next();for(;!i.done&&!a.done;){if(i.value!==a.value)return!1;i=s.next(),a=r.next()}return i.done===a.done}}t.Iterator=s},230:(e,t,s)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.RendererPlugins=void 0;const r=s(885),i=s(283),a=new Set([":bind",":bind-events",":data",":for",":show","@watch","$html"]),n={$text:"$text-content"};var o;!function(e){e.resolveIncludes=async function(e,t){const s=e;if("include"!==s.tagName?.toLocaleLowerCase())return;this.log("<include> tag found in:\n",e),this.log("<include> params:",t);const r=s.getAttribute?.("src");if(!r)throw new Error(`"src" attribute missing from ${e}.`);const i=t=>{e.replaceWith(...Array.from(t.childNodes))},a={...t,root:!1,maxdepth:t?.maxdepth-1};if(0===a.maxdepth)throw new Error("Maximum recursion depth reached.");if(r.includes("://")||r.startsWith("//"))this.log("Including remote file from absolute path:",r),await this.preprocessRemote(r,a).then(i);else if(t?.dirpath?.includes("://")||t?.dirpath?.startsWith("//")){const e=t.dirpath&&"."!==t.dirpath?`${t.dirpath}/${r}`:r;this.log("Including remote file from relative path:",e),await this.preprocessRemote(e,a).then(i)}else if("/"===r.charAt(0))this.log("Including local file from absolute path:",r),await this.preprocessLocal(r,a).then(i);else{const e=t?.dirpath&&"."!==t?.dirpath?`${t?.dirpath}/${r}`:r;this.log("Including local file from relative path:",e),await this.preprocessLocal(e,a).then(i)}},e.rebaseRelativePaths=async function(e,t){const s=e,r=s.tagName?.toLowerCase();if(!t?.dirpath)return;const a=e.getAttribute?.("src"),n=e.getAttribute?.("href"),o=e.getAttribute?.("data"),c=a||n||o;c&&(c&&(0,i.isRelativePath)(c)&&this.log("Rebasing relative path as:",t.dirpath,"/",c),"img"===r&&a&&(0,i.isRelativePath)(a)?s.src=`${t.dirpath}/${a}`:"a"===r&&n&&(0,i.isRelativePath)(n)||"link"===r&&n&&(0,i.isRelativePath)(n)?s.href=`${t.dirpath}/${n}`:"script"===r&&a&&(0,i.isRelativePath)(a)||"source"===r&&a&&(0,i.isRelativePath)(a)||"audio"===r&&a&&(0,i.isRelativePath)(a)||"video"===r&&a&&(0,i.isRelativePath)(a)||"track"===r&&a&&(0,i.isRelativePath)(a)||"iframe"===r&&a&&(0,i.isRelativePath)(a)?s.src=`${t.dirpath}/${a}`:"object"===r&&o&&(0,i.isRelativePath)(o)?s.data=`${t.dirpath}/${o}`:"input"===r&&a&&(0,i.isRelativePath)(a)?s.src=`${t.dirpath}/${a}`:("area"===r&&n&&(0,i.isRelativePath)(n)||"base"===r&&n&&(0,i.isRelativePath)(n))&&(s.href=`${t.dirpath}/${n}`))},e.resolveTextNodeExpressions=async function(e,t){if(3!==e.nodeType)return;const s=e.nodeValue||"";this.log("Processing node content value:\n",s);const r=new RegExp(/{{ ([^}]+) }}/gm),i=Array.from(s.matchAll(r)).map((e=>e[1])),a=async()=>{let t=s;for(const s of i){const[r]=await this.eval(s,{$elem:e});t=t.replace(`{{ ${s} }}`,String(r))}e.nodeValue=t};await Promise.all(i.map((t=>this.watchExpr(t,{$elem:e},a))))},e.resolveDataAttribute=async function(e,t){if(this.skipNodes.has(e))return;const s=e,r=s.getAttribute?.(":data");if(r){this.log(":data attribute found in:\n",e),s.removeAttribute(":data");const[t]=await this.eval(r,{$elem:e});await this.update(t)}},e.resolveWatchAttribute=async function(e,t){if(this.skipNodes.has(e))return;const s=e,r=s.getAttribute?.("@watch");r&&(this.log("@watch attribute found in:\n",e),s.removeAttribute("@watch"),await this.watchExpr(r,{$elem:e},(()=>{})))},e.resolveHtmlAttribute=async function(e,t){if(this.skipNodes.has(e))return;const s=e,r=s.getAttribute?.("$html");if(r){this.log("$html attribute found in:\n",e),s.removeAttribute("$html");const i=this.clone();await this.watchExpr(r,{$elem:e},(async e=>{const r=await i.preprocessString(e,t);await i.renderNode(r,t),s.replaceChildren(r)}))}},e.resolvePropAttributes=async function(e,t){if(this.skipNodes.has(e))return;const s=e;for(const t of Array.from(s.attributes||[]))if(t.name.startsWith("$")&&!a.has(t.name)){this.log(t.name,"attribute found in:\n",e),s.removeAttribute(t.name);const i=(n[t.name]||t.name).slice(1),a=(0,r.attributeNameToCamelCase)(i);await this.watchExpr(t.value,{$elem:e},(t=>e[a]=t))}},e.resolveAttrAttributes=async function(e,t){if(this.skipNodes.has(e))return;const s=e;for(const t of Array.from(s.attributes||[]))if(t.name.startsWith(":")&&!a.has(t.name)){this.log(t.name,"attribute found in:\n",e),s.removeAttribute(t.name);const r=(n[t.name]||t.name).slice(1);await this.watchExpr(t.value,{$elem:e},(e=>s.setAttribute(r,e)))}},e.resolveEventAttributes=async function(e,t){if(this.skipNodes.has(e))return;const s=e;for(const t of Array.from(s.attributes||[]))t.name.startsWith("@")&&!a.has(t.name)&&(this.log(t.name,"attribute found in:\n",e),s.removeAttribute(t.name),e.addEventListener?.(t.name.substring(1),(s=>{this.eval(t.value,{$elem:e,$event:s})})))},e.resolveForAttribute=async function(e,t){if(this.skipNodes.has(e))return;const s=e,r=s.getAttribute?.(":for")?.trim();if(r){this.log(":for attribute found in:\n",e),s.removeAttribute(":for");for(const t of(0,i.traverse)(e,this.skipNodes))this.skipNodes.add(t);const a=e.parentNode,n=e.ownerDocument.createElement("template");a.insertBefore(n,e),n.append(e),this.log(":for template:\n",n);const o=r.split(" in ",2);if(2!==o.length)throw new Error(`Invalid :for format: \`${r}\`. Expected "{key} in {expression}".`);const c=[],[l,h]=o;await this.watchExpr(h,{$elem:e},(s=>(this.log(":for list items:",s),this.lock=this.lock.then((()=>new Promise((async r=>{if(c.splice(0,c.length).forEach((e=>{a.removeChild(e),this.skipNodes.delete(e)})),!Array.isArray(s))return console.error(`Expression did not yield a list: \`${h}\` => \`${s}\``),r();for(const r of s.slice(0).reverse()){const s=this.clone();await s.set(l,r);const i=e.cloneNode(!0);a.insertBefore(i,n.nextSibling),c.push(i),this.skipNodes.add(i),await s.mount(i,t),this.log("Rendered list child:\n",i,i.outerHTML)}r()})))),this.lock)))}},e.resolveBindAttribute=async function(e,t){if(this.skipNodes.has(e))return;const s=e,r=s.getAttribute?.(":bind");if(r){this.log(":bind attribute found in:\n",e);const t=["change","input"],i=s.getAttribute?.(":bind-events")?.split(",")||t;s.removeAttribute(":bind"),s.removeAttribute(":bind-events");const a="checkbox"===s.getAttribute("type")?"checked":"value",n=`$elem.${a} = ${r}`;await this.watchExpr(n,{$elem:e},(e=>s[a]=e));for(const t of i){const s=`${r} = $elem.${a}`;e.addEventListener(t,(()=>this.eval(s,{$elem:e})))}}},e.resolveShowAttribute=async function(e,t){if(this.skipNodes.has(e))return;const s=e,r=s.getAttribute?.(":show");if(r){this.log(":show attribute found in:\n",e),s.removeAttribute(":show");const t="none"===s.style.display?"":s.style.display;await this.watchExpr(r,{$elem:e},(e=>{s.style.display=e?t:"none"}))}}}(o||(t.RendererPlugins=o={}))},63:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.proxifyStore=t.ReactiveProxyStore=t.InertProxy=t.ReactiveProxy=t.proxifyObject=t.REACTIVE_DEBOUNCE_MILLIS=void 0;class s{timeouts=new Map;debounce(e,t){return new Promise(((s,r)=>{const i=this.timeouts.get(t);i&&clearTimeout(i),this.timeouts.set(t,setTimeout((()=>{try{s(t()),this.timeouts.delete(t)}catch(e){r(e)}}),e))}))}}function r(e,t,s=!0){if(null==e||function(e){return e instanceof i||e.__is_proxy__}(e))return e;if(s)for(const s in e)e.hasOwnProperty(s)&&"object"==typeof e[s]&&null!=e[s]&&(e[s]=r(e[s],t));return new Proxy(e,{deleteProperty:(e,s)=>s in e&&(delete e[s],t(),!0),set:(e,i,a,n)=>{s&&"object"==typeof a&&(a=r(a,t));const o=Reflect.set(e,i,a,n);return t(),o},get:(e,t,s)=>"__is_proxy__"===t||Reflect.get(e,t,s)})}t.REACTIVE_DEBOUNCE_MILLIS=25,t.proxifyObject=r;class i extends s{value=null;listeners=[];constructor(e=null,...t){super(),this.value=this.wrapObjValue(e),t.forEach((e=>this.watch(e)))}static from(e,...t){return e instanceof i?(t.forEach(e.watch),e):new i(e,...t)}wrapObjValue(e){return null===e||"object"!=typeof e?e:r(e,(()=>this.trigger()))}get(){return this.value}async set(e){if(this.value!==e){const t=this.value;this.value=this.wrapObjValue(e),await this.trigger(t)}}watch(e){this.listeners.push(e)}unwatch(e){this.listeners=this.listeners.filter((t=>t!==e))}trigger(e=null){const s=this.listeners.slice();return this.debounce(t.REACTIVE_DEBOUNCE_MILLIS,(()=>Promise.all(s.map((t=>t(this.value,e)))).then((()=>{}))))}}t.ReactiveProxy=i;class a extends i{static from(e,...t){return e instanceof i?e:new a(e,...t)}watch(e){}trigger(e){return Promise.resolve()}}function n(e,t=(()=>{})){const s=Array.from(e.entries()).map((([e])=>e)),r=Object.fromEntries(s.map((e=>[e,void 0])));return new Proxy(Object.assign({},e,r),{get:(s,r,i)=>"string"==typeof r&&e.has(r)?(t("get",r),e.get(r)):"get"===r?s=>(t("get",s),e.get(s)):Reflect.get(e,r,i),set:(s,r,i,a)=>("string"!=typeof r||r in e?Reflect.set(e,r,i,a):(t("set",r,i),e.set(r,i)),!0)})}t.InertProxy=a,t.ReactiveProxyStore=class extends s{store=new Map;debouncedListeners=new Map;lock=Promise.resolve();constructor(e){super();for(const[t,s]of Object.entries(e||{}))this.store.set(t,i.from(this.wrapFnValue(s)))}wrapFnValue(e){return e&&"function"==typeof e?(...t)=>e.call(n(this),...t):e}get $(){return n(this)}entries(){return this.store.entries()}get(e){return this.store.get(e)?.get()}async set(e,t){this.store.has(e)?await this.store.get(e).set(this.wrapFnValue(t)):this.store.set(e,i.from(this.wrapFnValue(t)))}del(e){return this.store.delete(e)}has(e){return this.store.has(e)}async update(e){await Promise.all(Object.entries(e).map((([e,t])=>this.set(e,t))))}watch(e,s){e=Array.isArray(e)?e:[e];const r=()=>s(...e.map((e=>this.store.get(e).get()))),i=()=>this.debounce(t.REACTIVE_DEBOUNCE_MILLIS,r);e.forEach((e=>this.store.get(e).watch(i))),this.debouncedListeners.set(s,i)}unwatch(e,t){(e=Array.isArray(e)?e:[e]).forEach((e=>this.store.get(e).unwatch(this.debouncedListeners.get(t)))),this.debouncedListeners.delete(t)}async trigger(e){e=Array.isArray(e)?e:[e],await Promise.all(e.map((e=>this.store.get(e).trigger())))}async trace(e){const t=new Set,s=n(this,((e,s)=>{"get"===e&&t.add(s)}));return[await e.call(s),Array.from(t)]}async computed(e,t){const[s,r]=await this.trace(t);this.watch(r,(async()=>this.set(e,await t.call(n(this))))),this.set(e,s)}},t.proxifyStore=n}},t={};function s(r){var i=t[r];if(void 0!==i)return i.exports;var a=t[r]={exports:{}};return e[r](a,a.exports,s),a.exports}(()=>{const e=s(283);class t extends e.IRenderer{dirpath=(0,e.dirname)(self.location.href);parseHTML(e,t={root:!1}){if(t.root)return(new DOMParser).parseFromString(e,"text/html");{const t=document.createRange();return t.selectNodeContents(document.body),t.createContextualFragment(e)}}serializeHTML(e){return(new XMLSerializer).serializeToString(e).replace(/\s?xmlns="[^"]+"/gm,"")}preprocessLocal(e,t){return this.preprocessRemote(e,t)}}const r=new t;self.Mancha=r;const i=self.document?.currentScript;if(self.document?.currentScript?.hasAttribute("init")){r.update({...i?.dataset});const e=i?.hasAttribute("debug"),t=i?.getAttribute("cache");(i?.getAttribute("target")?.split(",")||["body"]).map((async s=>{const i=self.document.querySelector(s);await r.debug(e).mount(i,{cache:t})}))}})()})();