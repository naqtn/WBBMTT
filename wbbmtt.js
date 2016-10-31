/**
 * Web Browser Based Multi-Touch Test
 * 
 * by naqtn (https://github.com/naqtn)
 */

// using WebModule pattern:
// https://github.com/uupaa/WebModule
// http://qiita.com/kaiinui/items/22a75d2adc56a40da7b7
(function(global) {
    "use strict;"

    // Function ------------------------------------------------

    // Make bridging function to use "this" instance from system callback.
    // original "this" will placed as 1st argument for callbackMethod
    function methodAdapter(thisForCallback, callbackMethod) {
        var _thisForCallback = thisForCallback;
        var _callbackMethod = callbackMethod;
        return function() {
            var args = [this];
            for (var i = 0; i < arguments.length; ++i) {
                args[i + 1] = arguments[i];
            }
            _callbackMethod.apply(_thisForCallback, args);
        }
    };

    // Optimize (or limit) frequent function call.
    function debounce(func, wait) {
        var timeout;
        var orgThis;
        var args;
        function later() {
            timeout = 0;
            func.apply(orgThis, args);
        };
        return function() {
            orgThis = this;
            args = arguments;
            if (timeout != 0) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(later, wait);
        };
    };

    // Exports ----------------------------------------------
    if ("process" in global) {
        module["exports"] = methodAdapter;
        module["exports"] = debounce;
    }
    global["methodAdapter"] = methodAdapter;
    global["debounce"] = debounce;

})((this || 0).self || global);


(function(global) {
    "use strict;"

    // Class ------------------------------------------------
    function Divlog(id, startImmediate) {
        this.elementId = id || "Divlog_div";
        if ((startImmediate == undefined) || (startImmediate == true)) {
            this.start();
        }
    };

    // Header -----------------------------------------------
    Divlog["prototype"]["printHTML"] = Divlog_printHTML; // Divlog#printHTML(s:String):void
    Divlog["prototype"]["consoleLog"] = Divlog_consoleLog; // Divlog#consoleLog(s:String):void
    Divlog["prototype"]["log"] = Divlog_log; // Divlog#log(s:String):void
    Divlog["prototype"]["start"] = Divlog_start; // Divlog#start():void
    Divlog["prototype"]["stop"] = Divlog_stop; // Divlog#stop():void
    // property:
    // elementId
    // _consoleObjOrig
    // _consoleLogOrig

    // Implementation ---------------------------------------
    function Divlog_printHTML(s) {
        var element = document.getElementById(this.elementId);
        if (element == null) {
            element = document.createElement("div");
            document.body.insertBefore(element, document.body.firstChild);
            element.id = this.elementId;
        }
        element.insertAdjacentHTML("beforeend", s);
        if (element.scrollTopMax) {
            element.scrollTop = element.scrollTopMax;
        }
    }

    function Divlog_consoleLog(s) {
        if (this._consoleObjOrig && this._consoleLogOrig) {
            this._consoleLogOrig.call(this._consoleObjOrig, s);
        }
    }

    var escapeHtml_replacementTbl = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
    };
    
    function escapeHtml_replacementFunc(match) {
        return escapeHtml_replacementTbl[match] || match;
    }
    
    function escapeHtml(s) {
        return s.replace(/[&<>]/g, escapeHtml_replacementFunc);
    }
    
    function Divlog_log(s) {
        this.consoleLog(s);
        this.printHTML("<p>" + escapeHtml(s));
    }

    function Divlog_start() {
        this._consoleObjOrig = console;
        this._consoleLogOrig = console ? console.log : undefined;
        if (!console) {
            console = {};
        }
        var self = this;
        console.log = function(s) {
            self.log(s);
        };
    }

    function Divlog_stop() {
        if (console) {
            console.log = this._consoleLogOrig;
        }
    }

    // Exports ----------------------------------------------
    if ("process" in global) {
        module["exports"] = Divlog;
    }
    global["Divlog"] = Divlog;

})((this || 0).self || global);


(function(global) {
    "use strict;"

    var IN_BROWSER = "document" in global;
    var PC_DEBUG = false;

    // Class ------------------------------------------------
    function Wbbmtt() { // constructor
        this.query = decodeQueryString();

        var markSizeScale = Number(queryValue(this.query, "markSizeScale", 1.0));
        this.markRadius1 = 22 * markSizeScale;
        this.markRadius2 = 14 * markSizeScale;
        this.mark2Width = 6 * markSizeScale;

        this.gridSpan = Number(queryValue(this.query, "gridSpan", -1));
        this.backGroundColor = queryValue(this.query, "backGroundColor", "black");
        this.preventDefault = !queryValueCheckbox(this.query, "noPreventDefault", false);

        this.manualClearMode = queryValueCheckbox(this.query, "shakeClearMode", false);
        this.useShakeOperation = this.manualClearMode;

        this.showTouchProperties = !queryValueCheckbox(this.query, "hideTouchProperties", false);
        this.showTouchRadius = queryValueCheckbox(this.query, "showTouchRadius", false);

        this.idleMessage = "Touch Screen Tester (WBBMTT)";
        this.displayCanvasId = "touchDisplayCanvas";
        this.touchListenElementId = this.displayCanvasId;
        this._trackingTouches = [];
        if (PC_DEBUG) {
            this.keyFuncMap = {};
        }
    };

    // Header -----------------------------------------------
    Wbbmtt["prototype"]["startAfterLoad"] = Wbbmtt_startAfterLoad;
    Wbbmtt["prototype"]["start"] = Wbbmtt_start;
    // private
    Wbbmtt["prototype"]["_touchHandler"] = Wbbmtt__touchHandler;
    Wbbmtt["prototype"]["_drawTouches"] = Wbbmtt__drawTouches;
    Wbbmtt["prototype"]["_drawTouchPoint"] = Wbbmtt__drawTouchPoint;
    Wbbmtt["prototype"]["_devicemotionHandler"] = Wbbmtt__devicemotionHandler;
    Wbbmtt["prototype"]["_resizeCanvasHandler"] = Wbbmtt__resizeCanvasHandler;
    Wbbmtt["prototype"]["_resizeCanvas"] = Wbbmtt__resizeCanvas;
    if (PC_DEBUG) {
        Wbbmtt["prototype"]["_clickHandler"] = Wbbmtt__clickHandler;
        Wbbmtt["prototype"]["_keydownHandler"] = Wbbmtt__keydownHandler;
    }

    // Implementation ---------------------------------------
    function decodeQueryString() {
        var obj = {};
        var keyvals = window.location.search.substring(1).split('&');
        for (var i = 0; i < keyvals.length; ++i) {
            var kv = keyvals[i].split('=');
            obj[kv[0]] = decodeURIComponent(kv[1]);
        }
        return obj;
    }

    function queryValueCheckbox(obj, key, defaultVal) {
        return ((key in obj) && ((obj[key] == undefined) || obj[key] == "on")) || defaultVal;
    }

    function queryValue(obj, key, defaultVal) {
        return (key in obj) ? obj[key] : defaultVal;
    }

    function storeTouch(array, touch) {
        for (var i = 0; i < array.length; ++i) {
            if (array[i] == null) { // if there's a room
                array[i] = touch;
                return i;
            }
        }
        // append to tail if no room
        array[i] = touch;
        return i;
    }

    function findTouch(array, touch) {
        for (var i = 0; i < array.length; ++i) {
            if ((array[i] != undefined) && (array[i].identifier == touch.identifier)) {
                return i;
            }
        }
        return -1;
    }

    function copyTouch(touch) {
        return {
            identifier : touch.identifier,
            radiusX : touch.radiusX,
            radiusY : touch.radiusY,
            pageX : touch.pageX,
            pageY : touch.pageY,
            screenX : touch.screenX,
            screenY : touch.screenY
        };
    }

    function ordinalStr(ordinal) {
        switch (ordinal) {
            case 0 :
                return "1st";
            case 1 :
                return "2nd";
            case 2 :
                return "3rd";
            default :
                return (ordinal + 1) + "th";
        }
    }

    function numberToPadedFixed(number, width, precision) {
        var s = number.toFixed(precision);
        while (s.length < width) {
            s = " " + s;
        }
        return s;
    }

    function formatTouch(touch, ordinal, showRadius) {
        var s = ordinalStr(ordinal) + " X:" //
                + numberToPadedFixed(touch.pageX, 7, 2) + " Y:" //
                + numberToPadedFixed(touch.pageY, 7, 2);
        // + " ID:" + touch.identifier.toString();
        if (showRadius) {
            s += " rX:" + ((touch.radiusX) ? numberToPadedFixed(touch.radiusX, 3, 1) : "N/A");
            s += " rY:" + ((touch.radiusY) ? numberToPadedFixed(touch.radiusY, 3, 1) : "N/A");
        }
        return s;
    }

    var COLORS = ["red", "lime", "orange", "aqua", "fuchsia"];
    function touchColor(i) {
        return COLORS[i % COLORS.length];
    }

    function drawGrid(ctx, span) {
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x = 0; x < ctx.canvas.width; x += span) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ctx.canvas.height);
        }
        for (var y = 0; y < ctx.canvas.height; y += span) {
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
        }
        ctx.stroke();
    }

    function Wbbmtt__drawTouchPoint(ctx, touch, touchColor) {
        var px = touch.pageX;
        var py = touch.pageY;

        // draw x-y lines
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, ctx.canvas.height);
        ctx.moveTo(0, py);
        ctx.lineTo(ctx.canvas.width, py);
        ctx.strokeStyle = touchColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // draw mark (circles)
        ctx.beginPath();
        ctx.arc(px, py, this.markRadius1, 0, Math.PI * 2, true);
        ctx.fillStyle = touchColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, this.markRadius2, 0, Math.PI * 2, true);
        ctx.lineWidth = this.mark2Width;
        ctx.strokeStyle = 'rgb(0,0,0)';
        ctx.stroke();

    }

    function drawTouchString(ctx, touch, touchColor, ordinal, showRadius) {
        ctx.font = "16px monospace";
        ctx.fillStyle = touchColor;
        ctx.fillText(formatTouch(touch, ordinal, showRadius), 0, 18 * ordinal + 30);
    }

    function drawIdleMessage(ctx, message, color) {
        ctx.font = "18px monospace";
        ctx.fillStyle = color;
        var metrix = ctx.measureText(message);
        ctx.fillText(message, (ctx.canvas.width - metrix.width) / 2, ctx.canvas.height / 2);
    }

    var RESIZE_DELAY = 300;
    function Wbbmtt__resizeCanvasHandler(orgThis) {
        this._resizeCanvasHandler2 = this._resizeCanvasHandler2
                || debounce(this._resizeCanvas, RESIZE_DELAY);
        this._resizeCanvasHandler2();
    }

    function Wbbmtt__resizeCanvas() {
        var canvas = document.getElementById("touchDisplayCanvas");
        if ((canvas.width != window.innerWidth) || (canvas.height != window.innerHeight)) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            this._drawTouches(); // draw axis etc.
        }
    }

    function Wbbmtt__drawTouches() {
        var canvas = document.getElementById(this.displayCanvasId);
        if (!canvas.getContext) {
            return; // fallback for canvas-unsupported browser
        }

        var ctx = canvas.getContext('2d');

        if (this.backGroundColor) {
            ctx.fillStyle = this.backGroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (0 < this.gridSpan) {
            drawGrid(ctx, this.gridSpan);
        }

        for (var i = 0; i < this._trackingTouches.length; ++i) {
            var touch = this._trackingTouches[i];
            if (touch != undefined) {
                this._drawTouchPoint(ctx, touch, touchColor(i));
            }
        }

        var entryExists = false;
        for (var i = 0; i < this._trackingTouches.length; ++i) {
            var touch = this._trackingTouches[i];
            if (touch != undefined) {
                if (this.showTouchProperties) {
                    drawTouchString(ctx, touch, touchColor(i), i, this.showTouchRadius);
                }
                entryExists = true;
            }
        }
        if (!entryExists) {
            drawIdleMessage(ctx, this.idleMessage, touchColor(2));
        }

    }

    function Wbbmtt__touchHandler(orgThis, event) {
        this.currentEvent = event; // for extensibility

        if (this.preventDefault) {
            event.preventDefault();
        }

        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];

            // It's little bit foolish to dispatch again here
            // though callback function from browser knows what happens.
            // But pre and post process is same and this makes simple code.
            switch (event.type) {
                case "touchstart" :
                    storeTouch(this._trackingTouches, copyTouch(touch));
                    break;
                case "touchmove" :
                    var idx = findTouch(this._trackingTouches, touch);
                    if (idx < 0) {
                        throw new Error("Not found that identifier for move event.");
                        return false;
                    } else {
                        this._trackingTouches[idx] = copyTouch(touch);
                    }
                    break;
                case "touchend" : // fall through
                case "touchcancel" :
                    var idx = findTouch(this._trackingTouches, touch);
                    if (idx < 0) {
                        throw new Error("Not found that identifier for end or cancel event.");
                    } else if (this.manualClearMode) {
                        // Modify identifier to prepare for reusing identifier by the OS.
                        this._trackingTouches[idx].identifier = null;
                    } else {
                        this._trackingTouches[idx] = null;
                    }
                    break;
                default :
                    throw new Error("unknown event.type");
                    break;
            }
        }

        this._drawTouches();

        this.currentEvent = null;
        return true;
    }

    // //////////////////
    // for debug
    function TouchEventSym(type) {
        this.preventDefault = TouchEventSym_nullFunc;
        this.type = type;
    }

    function TouchEventSym_nullFunc() {
    }

    function Wbbmtt__clickHandler(orgThis, event) {
        var touches = [{
            "identifier" : 0,
            "pageX" : 200,
            "pageY" : 220,
            "screenX" : 100,
            "screenY" : 120
        }, {
            "identifier" : 1,
            "pageX" : event.pageX,
            "pageY" : event.pageY,
            "screenX" : event.screenX,
            "screenY" : event.screenY
        }];

        var sev = new TouchEventSym("touchstart");
        sev.touches = touches;
        sev.changedTouches = touches;
        this._touchHandler(orgThis, sev);
    }

    function Wbbmtt__keydownHandler(orgThis, event) {
        var func = this.keyFuncMap[event.key];
        if (func) {
            func.apply(this, event);
        }
    }
    // end for debug
    // //////////////////

    // var acc2Max = 0;
    var ACCEL_SQ_THRESHOLD = 300;
    function Wbbmtt__devicemotionHandler(orgThis, event) {
        var x = event.acceleration.x;
        var y = event.acceleration.y;
        var z = event.acceleration.z;

        var sq = x * x + y * y + z * z;
        // if (acc2Max < sq) {
        // acc2Max = sq;
        // console.log("acc2Max = " + sq);
        // }
        if (this.useShakeOperation && (ACCEL_SQ_THRESHOLD < sq)) {
            this._devicemotionHandler2 = this._devicemotionHandler2
                    || debounce(Wbbmtt__clearTouches, 100);
            this._devicemotionHandler2();
        }
    }

    function Wbbmtt__clearTouches() {
        this._trackingTouches = [];
        this._drawTouches();
    }

    function Wbbmtt_start() {
        var touchElement;
        if (this.touchListenElementId) {
            touchElement = document.getElementById(this.touchListenElementId);
            if (!touchElement) {
                throw new Error("touchElement not found. id='" + this.touchListenElementId + "'");
            }
        } else {
            touchElement = document;
        }

        this._touchHandlerFunc = this._touchHandlerFunc || methodAdapter(this, this._touchHandler);
        touchElement.addEventListener("touchstart", this._touchHandlerFunc, false);
        touchElement.addEventListener("touchend", this._touchHandlerFunc, false);
        touchElement.addEventListener("touchcancel", this._touchHandlerFunc, false);
        touchElement.addEventListener("touchmove", this._touchHandlerFunc, false);

        if (this.useShakeOperation) {
            this._devicemotionHandlerFunc = this._devicemotionHandlerFunc
                    || methodAdapter(this, this._devicemotionHandler);
            window.addEventListener("devicemotion", this._devicemotionHandlerFunc);
        }

        this._resizeCanvasHandlerFunc = this._resizeCanvasHandlerFunc
                || methodAdapter(this, this._resizeCanvasHandler);
        window.addEventListener("resize", this._resizeCanvasHandlerFunc);
        // Adjust canvas for now
        this._resizeCanvasHandler(this);

        if (this.backGroundColor) {
            // overwrite body background dynamically for smooth transition when device orientation
            // is changed
            document.body.style.background = this.backGroundColor;
        }

        if (PC_DEBUG) {
            this._clickHandlerFunc = this._clickHandlerFunc
                    || methodAdapter(this, this._clickHandler);
            document.addEventListener("click", this._clickHandlerFunc, false);
            this._keydownHandlerFunc = this._keydownHandlerFunc
                    || methodAdapter(this, this._keydownHandler);
            document.addEventListener("keydown", this._keydownHandlerFunc, false);
        }
    }

    function Wbbmtt_startAfterLoad() {
        var self = this;
        if (IN_BROWSER) {
            window.addEventListener("load", function() {
                self.start();
            }, false);
        }
    }

    // Exports ----------------------------------------------
    if ("process" in global) {
        module["exports"] = Wbbmtt;
    }
    global["Wbbmtt"] = Wbbmtt;

})((this || 0).self || global);
