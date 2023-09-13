//Sync with contentscript.js.h
var cTestCompleteChromeBrowserAgentMimeType = "application/x-testcomplete12-0-chrome-browser-agent";
var cTestCompleteChromeBrowserAgentScriptHelper = "g_TestCompleteChromeBrowserAgentScriptHelper12_0";
var cTestCompleteBeginHiddenNodes = "TestCompleteHiddenNodes{{"
var cTestCompleteEndHiddenNodes = "}}TestCompleteHiddenNodes"
var cTestCompleteHiddenNodeAttributeName = "isTestCompleteHiddenNode";
var cTestCompleteTabIdAttributeName = "tabId";
var cTestCompleteChromeBrowserAgent = "NATIVE_" + cTestCompleteChromeBrowserAgentScriptHelper;
var cTestCompleteChromeBrowserScript = "SCRIPT_" + cTestCompleteChromeBrowserAgentScriptHelper;

var _tcIocmName = "$iocm12";
function getIocm() { return window[_tcIocmName]; };
getIocm().port = null;

function getIsChromeBrowser() {
	let isChrome = (typeof chrome === "object") && !(chrome.cef === true) && 
		((typeof chrome.runtime === "object") || (typeof chrome.extension === "object"));
	
	return isChrome && !checkElectronUserAgent();
}

function checkElectronUserAgent() {
	let userAgent = navigator.userAgent.toLowerCase();
	return userAgent.indexOf(' electron/') > -1;
}

function addHiddenNodeAttribute(node) {
	var attr = document.createAttribute(cTestCompleteHiddenNodeAttributeName);
	attr.value = "1";
	node.attributes.setNamedItem(attr);
}

function setContextProto(proto) {
	if ((typeof (proto) != "object") || (proto == null))
		return;

	for (var i = 0; i < proto.length; i++) {
		var funcName = proto[i];
		getIocm().context[funcName] = new Function(

			'var params = new Array();' +
			'for (var i = 0; i < arguments.length; i++)' +
			'	params[i] = arguments[i];' +

			'window["' + _tcIocmName + '"].port.postMessage({' +
			'	"callType": "invoke",' +
			'	"requestId": "",' +
			'	"objectId": this.tabId,' +
			'	"name": "' + funcName + '",' +
			'	"flags": 2,' +
			'	"params": params' +
			'});'
		);
	}

}

(function () {

"use strict";

function stringifyObjectFull(vContent) {
	if (typeof vContent === "function")
		return vContent.toString();

	if (vContent instanceof Object) {
		var sOutput = "";
		if (vContent.constructor === Array) {
			for (var nId = 0; nId < vContent.length; sOutput += stringifyObjectFull(vContent[nId]) + ",", nId++);
			return "[" + sOutput.substr(0, sOutput.length - 1) + "]";
		}

		if (vContent.toString !== Object.prototype.toString) {
			return "\"" + vContent.toString().replace(/[\\"]/g, "\\$&") + "\"";
		}

		for (var sProp in vContent) {
			sOutput += "\"" + sProp.replace(/[\\"]/g, "\\$&") + "\":" + stringifyObjectFull(vContent[sProp]) + ",";
		}
		return "{" + sOutput.substr(0, sOutput.length - 1) + "}";
	}

	return typeof vContent === "string" ? "\"" + vContent.replace(/[\\"]/g, "\\$&") + "\"" : String(vContent);
}

let callIndex = 1;
let retValElem = null;
let retValId = "_retVal12";
let endComment = null;
let injectorScript = "";

function getInjectorScript() {
	if (injectorScript == "")
		injectorScript = "window[\"" + iocmName + "\"] = " + stringifyObjectFull(window[iocmName]) + ";\n";

	return "var " + cTestCompleteChromeBrowserAgentScriptHelper + " = " + stringifyObjectFull(window[cTestCompleteChromeBrowserAgentScriptHelper]) + ";\n" +
		injectorScript;
}

function injectObjectsOnPage() {
	var root = document.documentElement;
	if (!root)
		return;

	var beginComment = document.createComment(cTestCompleteBeginHiddenNodes);
	endComment = document.createComment(cTestCompleteEndHiddenNodes);

	var scriptText = getInjectorScript();

	var scriptElement = document.createElement("SCRIPT");
	scriptElement.text = scriptText;
	addHiddenNodeAttribute(scriptElement);

	retValElem = document.createElement("INPUT");
	retValElem.id = retValId;
	retValElem.value = "";
	retValElem.style.display = "none";
	addHiddenNodeAttribute(retValElem);

	root.appendChild(beginComment);
	root.appendChild(endComment);
	root.insertBefore(scriptElement, endComment);
	root.insertBefore(retValElem, endComment);
}

function evalOutFromSandbox(value) {
	var root = document.documentElement;
	if (!root)
		return '{"error": "unavalible"}';
	if (!root.contains(endComment))
		injectObjectsOnPage();

	var scriptText = "{ let r = document.getElementById('" + retValId + "'); if (r) { try { r.value = eval(\"" + value.replace(/[\\"]/g, "\\$&") + "\"); } catch(e) { r.value = JSON.stringify({\"error\": e.toString()}); }}}";

	var scriptElement = document.createElement("SCRIPT");
	scriptElement.text = scriptText;
	addHiddenNodeAttribute(scriptElement);
	root.insertBefore(scriptElement, endComment);
	root.removeChild(scriptElement);

	return retValElem.value;
}

window[cTestCompleteChromeBrowserAgentScriptHelper] =
	{
		addScriptToAgent: function () { },

		removeScriptFromAgent: function () { },

		addCustomScript: function (text) {
			try {
				eval(text);
			} catch (e) {
				//console.trace(e);
			}
			return true;
		}
	};

function injectIocmOnPage() {
	if (!getIsChromeBrowser())
		return;

	injectObjectsOnPage();

	window[iocmName].nextCacheId = window[iocmName].OBJECTID_IOCM - 1;
	window[iocmName].nextCacheIdStep = -1;

	window[iocmName].prevGetObjectFromCache = window[iocmName].getObjectFromCache;
	window[iocmName].getObjectFromCache = function (objectId) {

		if (objectId === 0)
			return null;

		var obj = this.prevGetObjectFromCache(objectId);
		if ((obj !== null) || (objectId < this.OBJECTID_IOCM))
			return obj;

		var moniker = this.objectMonikerCache[objectId];
		if (moniker == "")
			return null;

		try {
			obj = eval(moniker);
		} catch (e) {
			//console.trace(e);
			//console.log("can't get " + moniker);
		}

		this.objectCache[objectId] = obj;
		this.objectMonikerCache[objectId] = moniker;

		return obj;
	};

	window[iocmName].prevInvoke = window[iocmName].invoke;
	window[iocmName].invoke = function (callData) {

		try {

			if (!callData || (typeof (callData) != "object"))
				return this.createError(callData, "invalid callData");

			var methodName = callData["method"] + "";
			var objectId = callData["objectId"] || 0;
			var flags = callData["flags"] || 0;
			var params = callData["params"];
			var moniker = this.getObjectMoniker(objectId);

			if ((flags == 2) && (methodName == "#batchRelease")) {
				var outerIds = [];
				for (var i = 0; i < params.length; i++) {
					this.revokeObject(params[i]);
					if (params[i] > this.OBJECTID_NULL)
						outerIds.push(params[i]);
				}
				if (outerIds.length == 0)
					return null;
				params = outerIds;
				callData["params"] = params;
			}

			var marshalToPage = ((objectId == this.OBJECTID_WINDOW) && ((methodName == "Array") || (methodName == "eval"))) ||
				((flags == 2) && ((methodName.indexOf("tcaInvokeObjectMethod") == 0) || (methodName.indexOf("isCustomElement") == 0)));

			if (!marshalToPage && (typeof (params) == "object") && (params.length > 0)) {
				for (var i = 0; i < params.length; i++) {
					if ((typeof (params[i]) == "object") && (params[i] != null)
						&& (typeof (params[i]["objectId"]) == "number")
						&& (params[i]["objectId"] > this.OBJECTID_NULL)) {
						var paramValue = this.getObjectFromCache(params[i]["objectId"]);
						if (paramValue == null) {
							marshalToPage = true;
							break;
						}
					}
				}
			}

			var obj = marshalToPage ? null : this.getObjectFromCache(objectId);

			if (!marshalToPage &&
				((typeof (obj) == "function") ||
					(this.isObject(obj) && (obj !== null) && (
						(objectId == this.OBJECTID_CONTEXT) ||
						(objectId == this.OBJECTID_AGENT) ||
						(objectId == this.OBJECTID_IOCM) ||
						(moniker == "") ||
						(methodName == "#has") ||
						(methodName == "#getbounds") ||
						(this.hasProperty.apply(obj, [methodName, this]) > 0)
					)))) {
				var retVal = this.prevInvoke(callData);
				if ((methodName != "#has") || (retVal["retVal"] > 0))
					return retVal;
			}

			if (objectId < this.OBJECTID_IOCM) {
				callData["objectId"] = moniker;
			}

			if (typeof (params) == "object") {
				for (var i = 0; i < params.length; i++) {
					if ((typeof (params[i]) == "object") && (params[i] != null)
						&& (typeof (params[i]["objectId"]) == "number")
						&& (params[i]["objectId"] < this.OBJECTID_IOCM)) {
						callData["params"][i]["objectId"] = this.getObjectMoniker(params[i]["objectId"]);
					}
				}

			}


			var scriptText = "JSON.stringify(window[\"" + iocmName + "\"].invoke(" + JSON.stringify(callData) + "))";
			var retVal = JSON.parse(evalOutFromSandbox(scriptText));
			if ((flags != 1) && (methodName != "#batchRelease")) {
				if ((retVal == null) || (typeof (retVal["retVal"]) == "undefined")) {
					if (retVal == null) retVal = {};
					retVal["errorScript"] = scriptText;
				}
			}
			return this.injectObjects(retVal);

		} catch (e) {
			//console.trace(e);
			return this.createError(callData, "local exception: " + e);
		}

	};
}

injectIocmOnPage(); // Attention! Not later!

window[cTestCompleteChromeBrowserAgentScriptHelper].addScriptToAgent = function () {
	getIocm().context.setRemoteProperty("createCallback0", function (cookie0, cookie1) {
		var callback = function () {
			getIocm().context.callback0(cookie0, cookie1);
		};

		return callback;
	});
};

window[cTestCompleteChromeBrowserAgentScriptHelper].removeScriptFromAgent = function (agent) {
	getIocm().context.setRemoteProperty("createCallback0", null);
};

if (window[iocmName]) {
	window[iocmName].stateCheckTimeout = 100;
	window[iocmName].stateCheckTimer = null;
	window[iocmName].lastStateCheckTime = null;
	window[iocmName].savedContentState = null;
	window[iocmName].lastMouseOverTime = null;
	window[iocmName].lastMouseClickTime = null;

	window[iocmName].getVisibleObjects = function (doc) {
		var result = [];
		if (!doc) doc = document;
		var all = doc.getElementsByTagName("*");
		var count = all.length;
		for (var i = 0; i < count; i++) {
			var obj = all[i];
			var style = window.getComputedStyle(obj);
			if (!style ||
				style.display == "none" ||
				style.visibility == "hidden")
				continue;
			var rect = obj.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0 && (rect.left + rect.width) > 0 && (rect.top + rect.height) > 0)
				result.push(obj);
			try {
				if (obj.contentDocument)
					result = result.concat(window[iocmName].getVisibleObjects(obj.contentDocument));
			} catch (e) { }
		}
		return result;
	}

	window[iocmName].checkPageChanged = function () {
		var t1 = Date.now();
		var iocm = getIocm();
		if ((t1 - iocm.lastMouseClickTime) < 500)
			iocm.lastMouseOverTime = null;
		if (iocm.lastMouseOverTime && (t1 - iocm.lastMouseOverTime) > 500)
			iocm.lastMouseOverTime = null;

		try { var currentContentState = iocm.getVisibleObjects(); } catch (e) { }
		if (iocm.lastMouseOverTime && iocm.savedContentState && iocm.savedContentState.length) {
			var changed = iocm.savedContentState.length < currentContentState.length;
			for (var i = 0; !changed && i < currentContentState.length; i++)
				if (iocm.savedContentState.indexOf(currentContentState[i]) < 0)
					changed = true;

			if (changed && getIocm().port)
				getIocm().port.postMessage({ "callType": "tabContentStateChanged" });
		}
		iocm.savedContentState = currentContentState;

		var t2 = Date.now();
		iocm.lastStateCheckTime = t2;

		if (iocm.lastMouseOverTime)
			iocm.stateCheckTimer = window.setTimeout(iocm.checkPageChanged, (t2 - t1) > iocm.stateCheckTimeout ? (t2 - t1) : iocm.stateCheckTimeout);
		else
			iocm.stateCheckTimer = null;
	}

	window[iocmName].documentMouseMove = function (e) {
		if (window[iocmName].stateCheckTimer)
			return;
		if (!window[iocmName].lastStateCheckTime || (Date.now() - window[iocmName].lastStateCheckTime) > window[iocmName].stateCheckTimeout) {
			window[iocmName].savedContentState = null;
			window[iocmName].checkPageChanged();
		}
	}

	window[iocmName].documentMouseOver = function (e) {
		window[iocmName].lastMouseOverTime = Date.now();
	}

	window[iocmName].documentMouseClick = function (e) {
		window[iocmName].lastMouseClickTime = Date.now();
	}

	//	document.addEventListener("mousemove", window[iocmName].documentMouseMove);
	//	document.addEventListener("mouseover", window[iocmName].documentMouseOver);
	//	document.addEventListener("click",     window[iocmName].documentMouseClick, true);

	//	window[iocmName].stateCheckTimer = window.setTimeout(window[iocmName].checkPageChanged, 500);
}

getIocm().context =
	{
		tabId: 0,

		deviceScaleFactor: 1.0,

		setRemoteProperty: function (name, value) {
			if ((typeof (getIocm().port) != "object") || (getIocm().port == null))
				return false;

			if (typeof (value) == "object" || typeof (value) == "function")
				value = getIocm().cacheObject(value);

			getIocm().port.postMessage({
				"callType": "invoke",
				"requestId": "",
				"objectId": getIocm().context.tabId,
				"name": name,
				"flags": 1,
				"params": value
			});
			return true;
		},

		attributes:
		{
			getNamedItem: function (attrName) {
				if (attrName == "tabId")
					return { value: getIocm().context.tabId + "" };
				return null;
			}
		}
	};


(function () {

	if (!getIsChromeBrowser())
		return;
		
	var initializePort = function () {
		getIocm().port = null;
		getIocm().port = ((typeof chrome.runtime === "object") ? chrome.runtime : chrome.extension).connect({});
		getIocm().port.onMessage.addListener(

			function (msg) {
				if (msg["setobject"]) {
					getIocm().context.tabId = msg["tabId"];
					getIocm().context.deviceScaleFactor = msg["deviceScaleFactor"] || 1.0;
					setContextProto(msg["proto"]);
					return;
				}

				var retVal = getIocm().invoke(msg["request"]);
				if (retVal == null)
					return;

				var response = { responseId: msg["requestId"], "response": retVal };
				getIocm().port.postMessage(response);
			}
		);
	};

	initializePort();

	var initInterval = 0;
	var initCount = 0;

	var tryInitializePort = function () {
		if ((initCount >= 15) ||
			((getIocm().port != null) && (getIocm().context.tabId != 0))) {
			clearInterval(initInterval);
			initInterval = 0;
			return;
		}
		initializePort();
		initCount++;
	}

	initInterval = setInterval(tryInitializePort, 150);
})();

})();