'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
    POLYFILLS
**/

(function () {

    // Element.closest() Polyfill

    if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

    if (!Element.prototype.closest) Element.prototype.closest = function (s) {
        var el = this;
        if (!document.documentElement.contains(el)) return null;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };

    // object.forEach() Polyfill

    if (typeof NodeList.prototype.forEach === "function") return false;
    NodeList.prototype.forEach = Array.prototype.forEach;

    // Number.isFinite.() Polyfill

    Number.isFinite = Number.isFinite || function (value) {
        return typeof value === 'number' && isFinite(value);
    };
})();

/**
    SET ACTIVE NAV STYLES BASED ON URL
**/

(function () {
    var nav = document.querySelector('.calculator-nav'),
        anchor = nav.getElementsByTagName('a'),
        current = window.location.hash,
        other = window.location.pathname.split('/').pop();

    // console.log("current", current);
    // console.log("other", other);

    for (var i = 0; i < anchor.length; i++) {
        var regularAnchor = anchor[i].href.split("/").pop();
        var splitAnchor = '#' + anchor[i].href.split("#").pop();

        // console.log("regularAnchor", regularAnchor);
        // console.log("splitAnchor", splitAnchor);

        if (splitAnchor == current) {
            anchor[i].classList.add("active");
        }

        if (regularAnchor == other) {
            anchor[i].classList.add("active");
        }
    }
})();

/**
    CONFIGURE INPUT MASKS
**/

SimpleMaskMoney.args = {
    preffix: '$',
    suffix: '',
    fixed: true,
    fractionDigits: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    autoCompleteDecimal: false
};

SimpleMaskPercent.args = {
    preffix: '',
    suffix: '%',
    fixed: true,
    fractionDigits: 0,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    autoCompleteDecimal: false
};

/**
    ON DOCUMENT READY CALCULATOR INIT
**/
var calculator = null;

document.onreadystatechange = function () {

    if (document.readyState == "interactive") {

        var guid = getUrlParameter("r");

        if (checkUUID(guid)) {
            console.log("has valid gui");
            getData(guid).then(function () {
                calculator = new Calculator();
                init(calculator);
                // console.log("calculator", calculator);
            });
        } else {
            console.log("not valid gui");
            calculator = new Calculator();

            init(calculator);
        }
    }
};

function init(calculator) {

    var pathName = '/' + window.location.pathname.split("/").pop();

    if (!(pathName === "/results.html" || pathName === "/share.html" || pathName === "/invite.html")) {
        initialRangeValues();
        tooltipFlashSetup();
    }

    modifyInputs();

    calculator.bizdev();
    calculator.utilization();
    calculator.projectProfitability();

    switch (window.location.hash) {

        case "#business-development":
            document.querySelector(".bizdev-section").setAttribute("style", "opacity: 1; display: block; transform: translateX(0)");
            break;

        case "#utilization":
            document.querySelector(".utilization-section").setAttribute("style", "opacity: 1; display: block; transform: translateX(0)");
            break;

        case "#project-profitability":
            document.querySelector(".profitability-section").setAttribute("style", "opacity: 1; display: block; transform: translateX(0)");
            break;

        default:
            break;
    }

    if (pathName === "/results.html") {
        calculator.setResultsPageDisplay();
        calculator.setCalculatorCompleted("bizdevCompleted", ".calculator.bizdev-section[data-completed='false']", ".bizdev-roi", calculator.inputs.bizdevRoi);
        calculator.setCalculatorCompleted("utilizationCompleted", ".calculator.utilization-section[data-completed='false']", ".utilization-roi", calculator.inputs.utilizationRoi);
        calculator.setCalculatorCompleted("profitabilityCompleted", ".calculator.profitability-section[data-completed='false']", ".profitability-roi", calculator.inputs.profitabilityRoi);
    }
}

/**
    UTILITIES
**/

var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

function tooltipFlashSetup(bizdevFlash, utilizationFlash, profitabilityFlash) {
    bizdevFlash = localStorage.getItem("bizdevFlash") ? localStorage.getItem("bizdevFlash") : localStorage.setItem("bizdevFlash", true);
    utilizationFlash = localStorage.getItem("utilizationFlash") ? localStorage.getItem("utilizationFlash") : localStorage.setItem("utilizationFlash", true);
    profitabilityFlash = localStorage.getItem("profitabilityFlash") ? localStorage.getItem("profitabilityFlash") : localStorage.setItem("profitabilityFlash", true);

    console.log("bizdevFlash", bizdevFlash);
    console.log("utilizationFlash", utilizationFlash);
    console.log("profitabilityFlash", profitabilityFlash);

    bizdevFlash === "false" ? document.querySelector(".close-flash-btn.bizdev").closest(".flash-message").classList.add("js-close") : "";
    utilizationFlash === "false" ? document.querySelector(".close-flash-btn.utilization").closest(".flash-message").classList.add("js-close") : "";
    profitabilityFlash === "false" ? document.querySelector(".close-flash-btn.profitability").closest(".flash-message").classList.add("js-close") : "";
}

function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}

function convertToDash(str) {
    return !str ? null : str.replace(/([A-Z])/g, function (g) {
        return '-' + g[0].toLowerCase();
    });
}

function convertToCamel(str) {
    // Lower cases the str
    return str.toLowerCase()
    // Replaces any - or _ characters with a space
    .replace(/[-_]+/g, ' ')
    // Removes any non alphanumeric characters
    .replace(/[^\w\s]/g, '')
    // Uppercases the first character in each group immediately following a space
    // (delimited by spaces)
    .replace(/ (.)/g, function ($1) {
        return $1.toUpperCase();
    })
    // Removes spaces
    .replace(/ /g, '');
}

function formatCurrency(amount, noTrails) {

    // Bounce early if empty
    if (undefined === amount || null === amount || '' === amount) {
        return '';
    }

    // Code from this solution on SO http://stackoverflow.com/a/14428340

    var newAmount = void 0;

    if (!noTrails) {
        newAmount = parseFloat(amount).toFixed(2).replace(/./g, function (c, i, a) {
            return i && c !== '.' && (a.length - i) % 3 === 0 ? ',' + c : c;
        });
    } else {
        newAmount = parseFloat(amount).toFixed(0).replace(/./g, function (c, i, a) {
            return i && c !== '.' && (a.length - i) % 3 === 0 ? ',' + c : c;
        });
    }

    return '$ ' + newAmount;
}

function parseCurrency(str) {

    if (undefined === str || null === str || '' === str) {
        return '';
    }

    // console.log("parsedCurrency", Number(str.replace(/[^0-9\.-]+/g,"")))
    return Number(str.replace(/[^0-9\.-]+/g, ""));
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    console.log("Testing email", re.test(String(email).toLowerCase()));
    return re.test(String(email).toLowerCase());
}

function validateName(name) {
    var re = /[a-zA-Z\-'\s]+/;
    console.log("Testing name", re.test(String(name)));
    return re.test(String(name));
}

function debounce(func, wait, immediate) {
    console.log('Utility debounce() running', typeof func === 'undefined' ? 'undefined' : _typeof(func), wait, immediate);
    var timeout = void 0;

    return function () {
        console.log('Utility debounce() anon func');
        var _this = this,
            args = arguments;
        var later = function later() {
            timeout = null;
            if (!immediate) func.apply(_this, args);
        };
        var callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(_this, args);
    };
}

function modifyOffset() {
    var el = void 0,
        newPoint = void 0,
        newPlace = void 0,
        offset = void 0,
        inputSibling = void 0,
        k = void 0,
        inputWidth = void 0,
        sibling = void 0,
        outputTag = void 0,
        outputTagType = void 0;

    inputWidth = 724; // Should be this.offsetWidth but getting set to 0 for some reason

    newPoint = (this.value - this.getAttribute("min")) / (this.getAttribute("max") - this.getAttribute("min"));

    offset = -1;

    if (newPoint < 0) {
        newPlace = 0;
    } else if (newPoint > 1) {
        newPlace = inputWidth;
    } else {
        newPlace = inputWidth * newPoint + offset;offset -= newPoint;
    }

    inputSibling = this.parentNode.childNodes;

    for (var i = 0; i < inputSibling.length; i++) {
        sibling = inputSibling[i];
        if (sibling.id == this.id) {
            k = true;
        }
        if (k == true && sibling.nodeName == "OUTPUT") {
            outputTag = sibling;
        }
    }

    if (outputTag.classList.contains('right-output')) {
        outputTag.style.right = newPlace + 'px';
        outputTag.style.marginRight = offset + '%';
    } else {
        outputTag.style.left = newPlace + 'px';
        outputTag.style.marginLeft = offset + '%';
    }

    this.classList.contains("field-range-percentage") ? outputTag.innerHTML = this.value + '%' : outputTag.innerHTML = '' + this.value;
    // outputTag.innerHTML = this.value;
}

function modifyInputs() {

    var inputs = document.getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].getAttribute("type") == "range") {
            inputs[i].onchange = modifyOffset;

            // the following taken from http://stackoverflow.com/questions/2856513/trigger-onchange-event-manually
            if ("fireEvent" in inputs[i]) {
                inputs[i].fireEvent("onchange");
            } else {
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent("change", false, true);
                inputs[i].dispatchEvent(evt);
            }
        }
    }
}

/**
    LOAD WITH JSON VALUES IF EXISTS
**/

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    var passedResult = results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));

    console.log("hasRecallParam", passedResult);

    return passedResult;
}

function checkUUID(uuid) {
    var regexTest = new RegExp('^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$').test(uuid);
    console.log('isUUID', regexTest);

    if (regexTest) {
        getData(uuid);
    } else {
        return false;
    }

    return regexTest;
}

function getData(uuid) {
    var formData = new FormData();
    formData.append("roiguid", uuid);

    var options = {
        method: "POST",
        headers: {
            "Accept": "application/json"
        },
        body: formData
    };

    return fetch("http://deltek-roi.cstraightdev.com/roi.aspx", options).then(function (res) {
        return res.json();
    }).then(function (res) {
        Object.keys(localStorage).forEach(function (key) {
            localStorage.removeItem(key);
        });

        Object.keys(res).forEach(function (key) {
            localStorage.setItem(key, res[key]);
        });
    });
}

/**
    LOAD INITIAL SLIDER VALUES
**/

function initialRangeValues() {

    var minPercent = 0;
    var maxPercent = 100;

    var increaseInOpps = localStorage.getItem("increaseInOpps") || 10;

    var currWinRate = parseCurrency(localStorage.getItem("currWinRate")) || 35;

    var currentUtilization = parseCurrency(localStorage.getItem("currentUtilization")) || 65;

    var avgOverBudget = parseCurrency(localStorage.getItem("averagePercentProjectsOverBudget")) || 20;
    var projectsOverBudget = parseCurrency(localStorage.getItem("averagePercentBudgetOverCost")) || 10;

    var staticRangeInputs = ['increaseInOpps'];
    var dynamicRangeInputs = ['increaseInWinPercent', 'desiredUtilization', 'desiredDecreaseProjectsPercent', 'desiredDecreaseOverBudgetPercent'];

    staticRangeInputs.forEach(function (range) {
        document.querySelector('[name=\'' + range + '\']').setAttribute("min", minPercent);
        document.querySelector('[name=\'' + range + '\']').setAttribute("max", maxPercent);

        document.querySelector('.' + convertToDash(range) + '-left').textContent = '' + minPercent;
        document.querySelector('.' + convertToDash(range) + '-right').textContent = '' + maxPercent;
    });

    dynamicRangeInputs.forEach(function (range) {

        switch (range) {

            case 'increaseInWinPercent':
                document.querySelector('[name=\'' + range + '\']').setAttribute("min", currWinRate);
                document.querySelector('[name=\'' + range + '\']').setAttribute("max", maxPercent);

                document.querySelector('.' + convertToDash(range) + '-left').textContent = currWinRate + '%';
                document.querySelector('.' + convertToDash(range) + '-right').textContent = maxPercent + '%';

                break;

            case 'desiredUtilization':
                document.querySelector('[name=\'' + range + '\']').setAttribute("min", currentUtilization);
                document.querySelector('[name=\'' + range + '\']').setAttribute("max", maxPercent);

                document.querySelector('.' + convertToDash(range) + '-left').textContent = currentUtilization + '%';
                document.querySelector('.' + convertToDash(range) + '-right').textContent = maxPercent + '%';

                break;

            case 'desiredDecreaseProjectsPercent':
                document.querySelector('[name=\'' + range + '\']').setAttribute("max", avgOverBudget);
                document.querySelector('[name=\'' + range + '\']').setAttribute("min", 0);

                document.querySelector('.' + convertToDash(range) + '-left').textContent = avgOverBudget + '%';
                document.querySelector('.' + convertToDash(range) + '-right').textContent = '0%';

                break;

            case 'desiredDecreaseOverBudgetPercent':
                document.querySelector('[name=\'' + range + '\']').setAttribute("max", projectsOverBudget);
                document.querySelector('[name=\'' + range + '\']').setAttribute("min", 0);

                document.querySelector('.' + convertToDash(range) + '-left').textContent = projectsOverBudget + '%';
                document.querySelector('.' + convertToDash(range) + '-right').textContent = '0%';

                break;

            default:
                return;
        }
    });
}

/**
    CALCULATOR CLASS
**/

var Calculator = function () {
    function Calculator() {
        var _this2 = this;

        var defaultInputs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, Calculator);

        console.log("first");

        // Bizdev
        this.revenueTotalEl = document.querySelector(".revenueTotalEl");
        this.totalOpportunitiesEl = document.querySelector(".totalOpportunitiesEl");
        this.increaseInOppsResult = document.querySelector(".increaseInOppsResult");
        this.totalWinRateEl = document.querySelector(".totalWinRateEl");
        this.increaseInWinPercentResult = document.querySelector(".increaseInWinPercentResult");
        this.newRevenueDeltaEl = document.querySelector(".newRevenueDeltaEl");
        this.newRevenueTotalEl = document.querySelector(".newRevenueTotalEl");

        // Utilization
        this.desiredUtilizationResult = document.querySelector(".desiredUtilizationResult");
        this.additionalBillableHoursEl = document.querySelector(".additionalBillableHoursEl");
        this.billableRevenueCurrentUtilTable = document.querySelector("[data-table='billableRevenueCurrentUtilTable']");
        this.billableRevenueDesiredUtilTable = document.querySelector("[data-table='billableRevenueDesiredUtilTable']");
        this.profitUtilizationCurrentTable = document.querySelector("[data-table='profitUtilizationCurrentTable']");
        this.profitUtilizationDesiredTable = document.querySelector("[data-table='profitUtilizationDesiredTable']");
        this.increasedRevenueImprovementsTable = document.querySelector("[data-table='increasedRevenueImprovementsTable']");
        this.increasedProfitImprovementsTable = document.querySelector("[data-table='increasedProfitImprovementsTable']");

        // Project Profitability
        this.projectMarginEl = document.querySelector(".projectMarginEl");
        this.desiredDecreaseProjectsPercentEl = document.querySelector(".desiredDecreaseProjectsPercentEl");
        this.desiredDecreaseProjectsPercentResult = document.querySelector(".desiredDecreaseProjectsPercentResult");
        this.desiredDecreaseOverBudgetPercentEl = document.querySelector(".desiredDecreaseOverBudgetPercentEl");
        this.desiredDecreaseOverBudgetPercentResult = document.querySelector(".desiredDecreaseOverBudgetPercentResult");
        this.totalProjectRevenuePerYearEl = document.querySelector(".totalProjectRevenuePerYearEl");
        this.totalProjectCostsPerYearEl = document.querySelector(".totalProjectCostsPerYearEl");
        this.totalProfitPerYearEl = document.querySelector(".totalProfitPerYearEl");
        this.projectOverrunsPerYearEl = document.querySelector(".projectOverrunsPerYearEl");
        this.projectsOverBudgetEl = document.querySelector(".projectsOverBudgetEl");
        this.savedOverrunCostsEl = document.querySelector(".savedOverrunCostsEl");
        this.overBudgetPerYearEl = document.querySelector(".overBudgetPerYearEl");

        this.inputs = {
            numOpps: localStorage.getItem("numOpps") ? defaultInputs.numOpps = localStorage.getItem("numOpps") : 50,
            avgOpp: localStorage.getItem("avgOpp") ? defaultInputs.agOpp = localStorage.getItem("avgOpp") : "$100,000.00",
            currWinRate: localStorage.getItem("currWinRate") ? defaultInputs.currWinRate = localStorage.getItem("currWinRate") : "35%",
            increaseInOpps: localStorage.getItem("increaseInOpps") ? defaultInputs.increaseInOpps = localStorage.getItem("increaseInOpps") : 0,
            increaseInWinPercent: localStorage.getItem("increaseInWinPercent") ? defaultInputs.increaseInWinPercent = localStorage.getItem("increaseInWinPercent") : 35,
            numBillableResources: localStorage.getItem("numBillableResources") ? defaultInputs.numBillableResources = localStorage.getItem("numBillableResources") : 50,
            avgBillableRatePerHour: localStorage.getItem("avgBillableRatePerHour") ? defaultInputs.avgBillableRatePerHour = localStorage.getItem("avgBillableRatePerHour") : "$120.00",
            avgResourceCostPerHour: localStorage.getItem("avgResourceCostPerHour") ? defaultInputs.avgResourceCostPerHour = localStorage.getItem("avgResourceCostPerHour") : "$60.00",
            currentUtilization: localStorage.getItem("currentUtilization") ? defaultInputs.currentUtilization = localStorage.getItem("currentUtilization") : "65%",
            desiredUtilization: localStorage.getItem("desiredUtilization") ? defaultInputs.desiredUtilization = localStorage.getItem("desiredUtilization") : 65,
            numProjectsPerYear: localStorage.getItem("numProjectsPerYear") ? defaultInputs.numProjectsPerYear = localStorage.getItem("numProjectsPerYear") : 50,
            averageRevenuePerProject: localStorage.getItem("averageRevenuePerProject") ? defaultInputs.averageRevenuePerProject = localStorage.getItem("averageRevenuePerProject") : "$100,000.00",
            averageCostPerProject: localStorage.getItem("averageCostPerProject") ? defaultInputs.averageCostPerProject = localStorage.getItem("averageCostPerProject") : "$75,000.00",
            averagePercentProjectsOverBudget: localStorage.getItem("averagePercentProjectsOverBudget") ? defaultInputs.averagePercentProjectsOverBudget = localStorage.getItem("averagePercentProjectsOverBudget") : "20%",
            averagePercentBudgetOverCost: localStorage.getItem("averagePercentBudgetOverCost") ? defaultInputs.averagePercentBudgetOverCost = localStorage.getItem("averagePercentBudgetOverCost") : "10%",
            desiredDecreaseProjectsPercent: localStorage.getItem("desiredDecreaseProjectsPercent") ? defaultInputs.desiredDecreaseProjectsPercent = localStorage.getItem("desiredDecreaseProjectsPercent") : 20,
            desiredDecreaseOverBudgetPercent: localStorage.getItem("desiredDecreaseOverBudgetPercent") ? defaultInputs.desiredDecreaseOverBudgetPercent = localStorage.getItem("desiredDecreaseOverBudgetPercent") : 10,
            bizdevRoi: localStorage.getItem("bizdevRoi") ? defaultInputs.bizdevRoi = localStorage.getItem("bizdevRoi") : 0,
            utilizationRoi: localStorage.getItem("utilizationRoi") ? defaultInputs.utilizationRoi = localStorage.getItem("utilizationRoi") : 0,
            profitabilityRoi: localStorage.getItem("profitabilityRoi") ? defaultInputs.profitabilityRoi = localStorage.getItem("profitabilityRoi") : 0,
            totalRoi: localStorage.getItem("totalRoi") ? defaultInputs.totalRoi = localStorage.getItem("totalRoi") : "",
            hoursPerWeek: "40"
        };

        Object.keys(this.inputs).map(function (key, index) {
            var elementName = document.querySelector('input[name=' + key + ']');

            if (elementName) {
                elementName.value = _this2.inputs[key];
                localStorage.setItem(key, _this2.inputs[key]);
            }
        });
    }

    _createClass(Calculator, [{
        key: 'calculateRevenuePerYear',
        value: function calculateRevenuePerYear() {
            var result = parseInt(this.inputs.numOpps) * parseCurrency(this.inputs.avgOpp) * parseInt(this.inputs.currWinRate) / 100;

            localStorage.setItem("revenuePerYear", result);

            this.maybeUpdateField(this.revenueTotalEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'calculateTotalOpportunitiesPerYear',
        value: function calculateTotalOpportunitiesPerYear() {
            var result = parseInt(this.inputs.numOpps) + parseInt(this.inputs.increaseInOpps);

            if (this.increaseInOppsResult) {
                this.increaseInOppsResult.textContent = parseInt(this.inputs.increaseInOpps);
            }

            localStorage.setItem("totalOpportunitiesPerYear", result);

            this.maybeUpdateField(this.totalOpportunitiesEl, result);

            return result;
        }
    }, {
        key: 'calculateTotalWinRate',
        value: function calculateTotalWinRate() {
            var result = parseInt(this.inputs.currWinRate) + parseInt(this.inputs.increaseInWinPercent) - parseInt(this.inputs.currWinRate);
            var additionalWinRateDifference = parseInt(this.inputs.increaseInWinPercent) - parseInt(this.inputs.currWinRate);

            if (this.increaseInWinPercentResult) {
                this.increaseInWinPercentResult.textContent = additionalWinRateDifference + '%';
            }

            localStorage.setItem("totalWinRateEl", result);

            this.maybeUpdateField(this.totalWinRateEl, result.toFixed(0) + '%');

            return result;
        }
    }, {
        key: 'calculateNewRevenueDelta',
        value: function calculateNewRevenueDelta() {
            var prevRevenueTotal = this.calculateRevenuePerYear();
            var additionalOpps = parseInt(this.inputs.numOpps) + parseInt(this.inputs.increaseInOpps);
            var additionalWinRateDifference = parseInt(this.inputs.increaseInWinPercent) - parseInt(this.inputs.currWinRate);
            var additionalWinRate = parseInt(this.inputs.currWinRate) + parseInt(additionalWinRateDifference);
            var newRevenue = parseInt(additionalOpps) * parseCurrency(this.inputs.avgOpp) * parseInt(additionalWinRate) / 100;
            var deltaRevenue = parseInt(newRevenue) - parseInt(prevRevenueTotal);

            localStorage.setItem("increaseInRevenuePerYear", deltaRevenue);
            localStorage.setItem("totalNewRevenuePerYearWithImprovements", newRevenue);

            this.maybeUpdateField(this.newRevenueDeltaEl, formatCurrency(deltaRevenue));
            this.maybeUpdateField(this.newRevenueTotalEl, formatCurrency(newRevenue));

            return deltaRevenue;
        }
    }, {
        key: 'calculatecurrentUtilization',
        value: function calculatecurrentUtilization() {
            return this.inputs.numBillableResources * this.inputs.hoursPerWeek * parseCurrency(this.inputs.currentUtilization) / 100;
        }
    }, {
        key: 'calculatedesiredUtilization',
        value: function calculatedesiredUtilization() {
            var desiredUtilizationDifference = parseInt(this.inputs.desiredUtilization) - parseCurrency(this.inputs.currentUtilization);
            var desiredUtilizationTotal = parseCurrency(this.inputs.currentUtilization) + desiredUtilizationDifference;

            if (this.desiredUtilizationResult) {
                this.desiredUtilizationResult.textContent = desiredUtilizationDifference + '%';
            }

            return desiredUtilizationTotal * (this.inputs.numBillableResources * this.inputs.hoursPerWeek) / 100;
        }
    }, {
        key: 'calculateAdditionalBillableHoursPerResource',
        value: function calculateAdditionalBillableHoursPerResource() {
            var desiredUtilizationHours = this.calculatedesiredUtilization();
            var currentUtilizationHours = this.calculatecurrentUtilization();
            var result = (desiredUtilizationHours - currentUtilizationHours) / this.inputs.numBillableResources;

            localStorage.setItem("additionalBillableHours", result);

            this.maybeUpdateField(this.additionalBillableHoursEl, result.toFixed(2));
        }
    }, {
        key: 'calculateBillableRevenue',
        value: function calculateBillableRevenue() {
            var desiredUtilizationTotal = parseInt(this.inputs.desiredUtilization) - parseCurrency(this.inputs.currentUtilization) + parseCurrency(this.inputs.currentUtilization);

            var currentResult = this.inputs.hoursPerWeek * (parseCurrency(this.inputs.currentUtilization) / 100) * parseCurrency(this.inputs.avgBillableRatePerHour) * this.inputs.numBillableResources;
            var desiredResult = this.inputs.hoursPerWeek * (desiredUtilizationTotal / 100) * parseCurrency(this.inputs.avgBillableRatePerHour) * this.inputs.numBillableResources;

            this.updateTable(this.billableRevenueCurrentUtilTable, currentResult, "billableRevenueCurrentUtilization");
            this.updateTable(this.billableRevenueDesiredUtilTable, desiredResult, "billableRevenueDesiredUtilization");

            return desiredResult - currentResult;
        }
    }, {
        key: 'calculateProfit',
        value: function calculateProfit() {
            var desiredUtilizationTotal = parseInt(this.inputs.desiredUtilization) - parseCurrency(this.inputs.currentUtilization) + parseCurrency(this.inputs.currentUtilization);

            var currentResult = this.inputs.hoursPerWeek * (parseCurrency(this.inputs.currentUtilization) / 100) * (parseCurrency(this.inputs.avgBillableRatePerHour) - parseCurrency(this.inputs.avgResourceCostPerHour)) * this.inputs.numBillableResources;
            var desiredResult = this.inputs.hoursPerWeek * (desiredUtilizationTotal / 100) * (parseCurrency(this.inputs.avgBillableRatePerHour) - parseCurrency(this.inputs.avgResourceCostPerHour)) * this.inputs.numBillableResources;

            this.updateTable(this.profitUtilizationCurrentTable, currentResult, "profitCurrentUtilization");
            this.updateTable(this.profitUtilizationDesiredTable, desiredResult, "profitDesiredUtilization");

            return desiredResult - currentResult;
        }
    }, {
        key: 'calculateIncreasedRevenueAndProfitWithImprovements',
        value: function calculateIncreasedRevenueAndProfitWithImprovements() {
            var currentResult = this.calculateBillableRevenue();
            var desiredResult = this.calculateProfit();
            var profit = this.updateTable(this.increasedProfitImprovementsTable, desiredResult, "increasedProfitWithDesiredImprovements");

            this.updateTable(this.increasedRevenueImprovementsTable, currentResult, "increasedRevenueWithDesiredImprovements");
            this.updateTable(this.increasedProfitImprovementsTable, desiredResult, "increasedProfitWithDesiredImprovements");

            return profit;
        }
    }, {
        key: 'calculateAverageProjectMargin',
        value: function calculateAverageProjectMargin() {
            var result = (parseCurrency(this.inputs.averageRevenuePerProject) - parseCurrency(this.inputs.averageCostPerProject)) / parseCurrency(this.inputs.averageRevenuePerProject) * 100;

            localStorage.setItem("averageProjectMargin", result);

            this.maybeUpdateField(this.projectMarginEl, result.toFixed(0) + '%');

            return result;
        }
    }, {
        key: 'calculateProjectsOverBudet',
        value: function calculateProjectsOverBudet() {
            var result = this.inputs.numProjectsPerYear * (parseCurrency(this.inputs.averagePercentProjectsOverBudget) / 100);

            this.maybeUpdateField(this.projectsOverBudgetEl, result.toFixed(0));

            return result;
        }
    }, {
        key: 'calculateOverBudgetPerYearUnbillable',
        value: function calculateOverBudgetPerYearUnbillable() {
            var result = parseCurrency(this.inputs.averageCostPerProject) * (parseCurrency(this.inputs.averagePercentBudgetOverCost) / 100) * this.calculateProjectsOverBudet();

            this.maybeUpdateField(this.overBudgetPerYearEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'calculateDesiredDecreasePercentageOfProjects',
        value: function calculateDesiredDecreasePercentageOfProjects() {
            var result = this.inputs.desiredDecreaseProjectsPercent / 100 * this.inputs.numProjectsPerYear;

            if (this.desiredDecreaseProjectsPercentResult) {
                this.desiredDecreaseProjectsPercentResult.textContent = this.inputs.desiredDecreaseProjectsPercent + '%';
            }

            this.maybeUpdateField(this.desiredDecreaseProjectsPercentEl, Math.round(result.toFixed(2)));

            return Math.round(result.toFixed(2));
        }
    }, {
        key: 'calculatedesiredDecreaseOverBudgetPercent',
        value: function calculatedesiredDecreaseOverBudgetPercent() {
            var result = this.inputs.desiredDecreaseOverBudgetPercent / 100 * parseCurrency(this.inputs.averageCostPerProject) * this.calculateDesiredDecreasePercentageOfProjects();

            if (this.desiredDecreaseOverBudgetPercentResult) {
                this.desiredDecreaseOverBudgetPercentResult.textContent = this.inputs.desiredDecreaseOverBudgetPercent + '%';
            }

            this.maybeUpdateField(this.desiredDecreaseOverBudgetPercentEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'calculateProjectRevenuePerYear',
        value: function calculateProjectRevenuePerYear() {
            var result = parseCurrency(this.inputs.averageRevenuePerProject) * this.inputs.numProjectsPerYear;

            localStorage.setItem("totalProjectRevenuePerYear", result);

            this.maybeUpdateField(this.totalProjectRevenuePerYearEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'calculateProjectCostsPerYear',
        value: function calculateProjectCostsPerYear() {
            var result = parseCurrency(this.inputs.averageCostPerProject) * this.inputs.numProjectsPerYear;

            localStorage.setItem("totalProjectCostsPerYear", result);

            this.maybeUpdateField(this.totalProjectCostsPerYearEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'calculateTotalProfitPerYear',
        value: function calculateTotalProfitPerYear() {
            var result = parseInt(this.calculateProjectRevenuePerYear()) - parseInt(this.calculateProjectCostsPerYear());

            localStorage.setItem("totalProfitPerYear", result);

            this.maybeUpdateField(this.totalProfitPerYearEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'calculateProjectOverrunsPerYear',
        value: function calculateProjectOverrunsPerYear() {
            var result = this.inputs.numProjectsPerYear * (parseCurrency(this.inputs.averagePercentProjectsOverBudget) / 100) * (parseCurrency(this.inputs.averageCostPerProject) * (parseCurrency(this.inputs.averagePercentBudgetOverCost) / 100));

            localStorage.setItem("projectOverrunsPerYear", result);

            this.maybeUpdateField(this.projectOverrunsPerYearEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'calculateSavedOverrunCosts',
        value: function calculateSavedOverrunCosts() {
            var result = parseInt(this.calculateOverBudgetPerYearUnbillable()) - parseInt(this.calculatedesiredDecreaseOverBudgetPercent());

            localStorage.setItem("savedOverrunCosts", result);

            this.maybeUpdateField(this.savedOverrunCostsEl, formatCurrency(result));

            return result;
        }
    }, {
        key: 'maybeUpdateField',
        value: function maybeUpdateField(field, newValue) {
            if (newValue != field.textContent) {
                this.colorSplash(field, "#444");
                field.textContent = newValue;
            }
        }
    }, {
        key: 'colorSplash',
        value: function colorSplash(input, color) {
            if (input.closest(".field").classList.contains("row-field.no-flash") || input.closest(".field").classList.contains("no-flash")) {
                return;
            } else if (input.closest(".field").classList.contains("range-field")) {
                input.closest(".field").style.backgroundColor = "rgba(0,183,237,0.15)";
                input.closest(".field").style.borderTopColor = "#C3DEE7";
                input.closest(".field").style.color = "#000";

                setTimeout(function () {
                    input.closest(".field").style.backgroundColor = "transparent";
                    input.closest(".field").style.borderTopColor = "#E5E5E5";
                    input.closest(".field").style.color = "color";
                }, 750);
            } else if (input.closest(".field").classList.contains("main-result")) {
                input.closest(".field").style.backgroundColor = "rgba(0,183,237,.45)";
                input.closest(".field").style.borderTopColor = "#C3DEE7";
                input.closest(".field").style.color = "#000";

                setTimeout(function () {
                    input.closest(".field").style.backgroundColor = "transparent";
                    input.closest(".field").style.borderTopColor = "#E5E5E5";
                    input.closest(".field").style.color = color;
                }, 750);
            } else {
                input.closest(".field").style.backgroundColor = "rgba(0,183,237,.15)";
                input.closest(".field").style.borderTopColor = "#C3DEE7";
                input.closest(".field").style.color = "#000";

                setTimeout(function () {
                    input.closest(".field").style.backgroundColor = "transparent";
                    input.closest(".field").style.borderTopColor = "#E5E5E5";
                    input.closest(".field").style.color = color;
                }, 750);
            }
        }
    }, {
        key: 'updateTable',
        value: function updateTable(table, value, name) {
            this.maybeUpdateField(table.querySelector('.week'), formatCurrency(value));
            this.maybeUpdateField(table.querySelector('.month'), formatCurrency(value * 4));
            this.maybeUpdateField(table.querySelector('.year'), formatCurrency(value * 52));

            localStorage.setItem(name + 'Week', value);
            localStorage.setItem(name + 'Month', value * 4);
            localStorage.setItem(name + 'Year', value * 52);

            var currency = table.querySelector('.year').textContent;
            var parsedCurrency = currency.replace(/\$|,/g, "");

            return parseInt(parsedCurrency);
        }
    }, {
        key: 'bizdev',
        value: function bizdev() {
            this.calculateTotalOpportunitiesPerYear();
            this.calculateTotalWinRate();
            this.calculateRevenuePerYear();
            this.calculateNewRevenueDelta();
        }
    }, {
        key: 'utilization',
        value: function utilization() {
            this.calculateAdditionalBillableHoursPerResource();
            this.calculateBillableRevenue();
            this.calculateProfit();
            this.calculateIncreasedRevenueAndProfitWithImprovements();
        }
    }, {
        key: 'projectProfitability',
        value: function projectProfitability() {
            this.calculateAverageProjectMargin();
            this.calculateProjectsOverBudet();
            this.calculateOverBudgetPerYearUnbillable();
            this.calculateDesiredDecreasePercentageOfProjects();
            this.calculatedesiredDecreaseOverBudgetPercent();
            this.calculateProjectRevenuePerYear();
            this.calculateProjectCostsPerYear();
            this.calculateTotalProfitPerYear();
            this.calculateProjectOverrunsPerYear();
            this.calculateSavedOverrunCosts();
        }
    }, {
        key: 'setRangeFields',
        value: function setRangeFields(name, attribute, fieldValue) {

            localStorage.setItem(attribute, fieldValue);
            localStorage.setItem(name, fieldValue);

            fieldValue = localStorage.getItem(name) || fieldValue;

            document.querySelector('[name=' + name + ']').setAttribute(attribute, fieldValue);
            document.querySelector('[name=' + name + ']').closest('.wrap').querySelector('output').textContent = fieldValue + '%';
            document.querySelector('[name=' + name + ']').value = fieldValue;

            this.inputs[name] = localStorage.getItem(name) || fieldValue;

            var camelName = convertToDash('.' + name + '-left');
            document.querySelector(camelName).textContent = fieldValue + '%';
        }
    }, {
        key: 'setResultsPageDisplay',
        value: function setResultsPageDisplay() {
            document.querySelector(".profitability-section").setAttribute("style", "opacity: 1; display: block; transform: translateX(0)");
            document.querySelector(".utilization-section").setAttribute("style", "opacity: 1; display: block; transform: translateX(0)");
            document.querySelector(".bizdev-section").setAttribute("style", "opacity: 1; display: block; transform: translateX(0)");
        }
    }, {
        key: 'setCalculatorDisplay',
        value: function setCalculatorDisplay(urlHash, calculatorSection) {
            window.location.hash = urlHash;

            document.querySelector(calculatorSection).setAttribute("style", "opacity: 1; display: block");

            setTimeout(function () {
                document.querySelector(calculatorSection).style.transform = "translateX(0)";
            }, 350);
        }
    }, {
        key: 'calculateRoi',
        value: function calculateRoi(query, localStorageName, roi) {
            var roiEl = document.querySelector(query);
            var roiCalc = roi;

            if (roiEl) {
                roiEl.textContent = formatCurrency(roiCalc);
            }

            localStorage.setItem(localStorageName, roiCalc);

            this.inputs[localStorageName] = roiCalc;

            var totalRoi = parseInt(this.inputs.bizdevRoi) + parseInt(this.inputs.utilizationRoi) + parseInt(this.inputs.profitabilityRoi);

            localStorage.setItem("totalRoi", totalRoi);

            this.inputs["totalRoi"] = totalRoi;

            console.log(this.inputs);

            return roiCalc;
        }
    }, {
        key: 'setCalculatorCompleted',
        value: function setCalculatorCompleted(calculatorCompleted, query, roiQuery, roiResult) {
            if (localStorage.getItem(calculatorCompleted)) {
                document.querySelector(query).setAttribute("data-completed", "true");
                document.querySelector(roiQuery).textContent = formatCurrency(roiResult);
                document.querySelector(roiQuery).classList.add("calculated");
                document.querySelector(".total-roi").textContent = formatCurrency(this.inputs.totalRoi);
            }
        }
    }, {
        key: 'bundleData',
        value: function bundleData(form) {
            var formFieldsList = [];
            var calcJSON = {};
            calcJSON.values = {};

            var formType = document.querySelector(".submit-wrap button").closest("form").className;
            var formFields = document.querySelector(".submit-wrap button").closest("form").querySelectorAll(".form-input");

            formFields.forEach(function (input) {
                formFieldsList.push(input.getAttribute("name"));
            });

            var formData = new FormData();

            Object.keys(localStorage).forEach(function (key) {
                if (formFieldsList.includes(key)) {
                    formData.append(key, localStorage.getItem(key));
                } else {
                    calcJSON.values[key] = localStorage.getItem(key);
                }
            });

            if (formType == "share-form") {
                formData.append("shareValue", JSON.stringify(calcJSON.values));
            }

            if (formType == "invite-form") {
                formData.append("inviteValue", JSON.stringify(calcJSON.values));
            }

            fetch("http://deltek-roi.cstraightdev.com/roi.aspx", {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                },
                body: formData
            }).then(function (res) {
                return res.json();
            }).then(function (res) {
                return console.log("receivedUUID", res);
            });
        }
    }]);

    return Calculator;
}();

/** EVENT LISTENERS **/

/**
    CONDITIONAL LOGIC BASED ON IF IE11 BROWSER
**/


var isIE11 = /Trident.*rv[ :]*11\./.test(navigator.userAgent);

function bizDevEventListener(isIE11, field) {

    if (!isIE11) {
        modifyInputs();
    }

    if (field.classList.contains("dollar-value")) {
        field.value = SimpleMaskMoney.format(field.value);
        calculator.inputs[field.getAttribute("name")] = SimpleMaskMoney.formatToNumber(field.value);
    }

    if (field.getAttribute("name") == 'currWinRate') {

        field.value = SimpleMaskPercent.format(field.value);
        calculator.inputs[field.getAttribute("name")] = SimpleMaskPercent.formatToNumber(field.value);
        calculator.setRangeFields("increaseInWinPercent", "min", SimpleMaskPercent.formatToNumber(field.value));

        console.log("fieldCurrWin", field.value);
        console.log("currWin", calculator.inputs[field.getAttribute("name")]);
    }

    calculator.inputs[field.getAttribute("name")] = field.value;

    localStorage.setItem(field.getAttribute("name"), field.value);
    localStorage.setItem("bizdevCompleted", "true");

    calculator.bizdev();
    calculator.calculateRoi(".bizdevRoiEl", "bizdevRoi", calculator.calculateNewRevenueDelta());
}

function utilizationEventListener(isIE11, field) {

    if (!isIE11) {
        modifyInputs();
    }

    if (field.classList.contains("dollar-value")) {
        field.value = SimpleMaskMoney.format(field.value);
        calculator.inputs[field.getAttribute("name")] = SimpleMaskMoney.formatToNumber(field.value);
    }

    if (field.getAttribute("name") == 'currentUtilization') {

        field.value = SimpleMaskPercent.format(field.value);
        calculator.inputs[field.getAttribute("name")] = SimpleMaskPercent.formatToNumber(field.value);
        calculator.setRangeFields("desiredUtilization", "min", SimpleMaskPercent.formatToNumber(field.value));
    }

    calculator.inputs[field.getAttribute("name")] = field.value;
    localStorage.setItem(field.getAttribute("name"), field.value);
    localStorage.setItem("utilizationCompleted", "true");

    calculator.utilization();
    calculator.calculateRoi(".utilizationRoiEl", "utilizationRoi", calculator.calculateIncreasedRevenueAndProfitWithImprovements());
}

function profitabilityEventListener(isIE11, field) {

    if (!isIE11) {
        modifyInputs();
    }

    if (field.classList.contains("dollar-value")) {
        field.value = SimpleMaskMoney.format(field.value);
        calculator.inputs[field.getAttribute("name")] = SimpleMaskMoney.formatToNumber(field.value);
    }

    if (field.getAttribute("name") == 'averagePercentProjectsOverBudget') {

        field.value = SimpleMaskPercent.format(field.value);
        calculator.inputs[field.getAttribute("name")] = SimpleMaskPercent.formatToNumber(field.value);
        calculator.setRangeFields("desiredDecreaseProjectsPercent", "max", SimpleMaskPercent.formatToNumber(field.value));
    }

    if (field.getAttribute("name") == 'averagePercentBudgetOverCost') {

        field.value = SimpleMaskPercent.format(field.value);
        calculator.inputs[field.getAttribute("name")] = SimpleMaskPercent.formatToNumber(field.value);
        calculator.setRangeFields("desiredDecreaseOverBudgetPercent", "max", SimpleMaskPercent.formatToNumber(field.value));
    }

    calculator.inputs[field.getAttribute("name")] = field.value;
    localStorage.setItem(field.getAttribute("name"), field.value);
    localStorage.setItem("profitabilityCompleted", "true");

    calculator.projectProfitability();
    calculator.calculateRoi(".profitabilityRoiEl", "profitabilityRoi", calculator.calculateSavedOverrunCosts());
}

console.log("isIE11", isIE11);

/**
    BIZDEV
**/

document.querySelectorAll("input.bizdev-question").forEach(function (field) {
    if (isIE11) {
        field.addEventListener("change", function () {
            bizDevEventListener(true, field);
        });
    } else {
        field.addEventListener("input", function () {
            bizDevEventListener(false, field);
        });
    }
});

/**
    UTILIZATION
**/

document.querySelectorAll("input.utilization-question").forEach(function (field) {
    if (isIE11) {
        field.addEventListener("change", function () {
            utilizationEventListener(true, field);
        });
    } else {
        field.addEventListener("input", function () {
            utilizationEventListener(false, field);
        });
    }
});

/**
    PROJECT PROFITABILITY
**/

document.querySelectorAll("input.project-profitability-question").forEach(function (field) {
    if (isIE11) {
        field.addEventListener("change", function () {
            profitabilityEventListener(true, field);
        });
    } else {
        field.addEventListener("input", function () {
            profitabilityEventListener(false, field);
        });
    }
});

/**
    OPEN CURRENT CALCULATOR
**/

var lastNav = window.location.hash; // Make sure we don't trigger calculator animation again on current calculator

document.querySelectorAll(".js-open").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
        e.preventDefault();

        var currentNav = '#' + e.target.href.split("#").pop();

        if (currentNav === lastNav) {
            return;
        }

        document.querySelectorAll(".inner-app").forEach(function (e) {
            return e.setAttribute("style", "opacity: 0; transform: translateX(-300%); display: none;");
        });

        if (e.target.classList.contains("bizdev-cta")) {
            calculator.setCalculatorDisplay("business-development", ".bizdev-section");
        }

        if (e.target.classList.contains("utilization-cta")) {
            calculator.setCalculatorDisplay("utilization", ".utilization-section");
        }

        if (e.target.classList.contains("profitability-cta")) {
            calculator.setCalculatorDisplay("project-profitability", ".profitability-section");
        }

        lastNav = '#' + e.target.href.split("#").pop();
    });
});

/**
    SET ACTIVE CALCULATOR NAV (mainly for calculator page w/ dynamic calculators)
**/

document.querySelectorAll(".nav-item").forEach(function (navItem) {

    var navs = document.querySelectorAll(".nav-item");

    navItem.addEventListener("click", function (e) {

        navs.forEach(function (nav) {
            nav.classList.remove("active");
        });

        e.target.classList.add("active");
    });
});

/**
    CLOSE TOOLTIP FLASH MESSAGE
**/

document.querySelectorAll(".close-flash-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
        e.preventDefault();

        var flashMessage = e.target.dataset.flash;

        localStorage.setItem(flashMessage, false);
        console.log(flashMessage);

        e.target.closest(".flash-message").style.opacity = "0";

        setTimeout(function () {
            e.target.closest(".flash-message").style.height = "0";
        }, 300);
    });
});

var pathName = '/' + window.location.pathname.split("/").pop();

if (pathName === "/share.html" || pathName === "/invite.html") {

    /**
        CAPTURE SHARE/INVITE FORM INPUTS
    **/

    document.querySelectorAll(".form-input").forEach(function (field) {
        field.addEventListener("input", function (e) {
            console.log("escapedHTML", escapeHtml(e.target.value));
            localStorage.setItem(e.target.getAttribute("name"), escapeHtml(e.target.value));
        });
    });

    /**
        BUNDLE AND SET JSON
    **/

    document.querySelector(".submit-wrap button").addEventListener("click", function (e) {
        e.preventDefault();

        var scrollToError = document.body.scrollTop = document.documentElement.scrollTop = 500;

        document.querySelectorAll(".req-field").forEach(function (field) {

            if (field.classList.contains("email")) {
                if (!validateEmail(field.value)) {
                    field.nextElementSibling.style.display = "block";
                    scrollToError;
                    throw "Not a valid email address";
                } else {
                    field.nextElementSibling.style.display = "none";
                }
            } else if (field.classList.contains("name")) {
                if (!validateName(field.value)) {
                    field.nextElementSibling.style.display = "block";
                    scrollToError;
                    throw "Not a valid name";
                } else {
                    field.nextElementSibling.style.display = "none";
                }
            }
        });

        document.querySelector(".share-inner").style.opacity = "0";

        setTimeout(function () {
            document.querySelector(".share-inner").style.display = "none";

            document.body.scrollTop = document.documentElement.scrollTop = 0;
            document.querySelector(".report-submit-success").style.opacity = "1";
        }, 300);

        setTimeout(function () {
            document.querySelector(".report-submit-success").style.display = "block";
        });

        calculator.bundleData();
    });

    /**
        CLOSE REPORT SUBMIT FLASH MESSAGE
    **/

    document.querySelector(".close-flash-btn").addEventListener("click", function (e) {
        e.preventDefault();

        e.target.closest(".flash-message").style.opacity = "0";

        setTimeout(function () {
            e.target.closest(".flash-message").style.height = "0";
        }, 300);
    });
}
