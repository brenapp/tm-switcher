"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var inquirer_1 = __importDefault(require("inquirer"));
var authenticate_1 = require("./authenticate");
(function () {
    return __awaiter(this, void 0, void 0, function () {
        var creds, tm, obs, response, fieldset, fields, scenes, associations, _i, fields_1, field, response_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, authenticate_1.getCredentials()];
                case 1:
                    creds = _a.sent();
                    console.log("\nConnecting to servers...");
                    return [4 /*yield*/, authenticate_1.connectTM(creds.tm)];
                case 2:
                    tm = _a.sent();
                    console.log("✅ Tournament Manager");
                    return [4 /*yield*/, authenticate_1.connectOBS(creds.obs)];
                case 3:
                    obs = _a.sent();
                    console.log("✅ Open Broadcaster Studio");
                    console.log("");
                    return [4 /*yield*/, inquirer_1.default.prompt([
                            {
                                name: "fieldset",
                                type: "list",
                                message: "Select Fieldset to Control",
                                choices: tm.fieldsets.map(function (d) { return d.name; }),
                            },
                        ])];
                case 4:
                    response = _a.sent();
                    fieldset = tm.fieldsets.find(function (set) { return set.name === response.fieldset; });
                    fields = fieldset.fields;
                    return [4 /*yield*/, obs.send("GetSceneList")];
                case 5:
                    scenes = _a.sent();
                    associations = [];
                    _i = 0, fields_1 = fields;
                    _a.label = 6;
                case 6:
                    if (!(_i < fields_1.length)) return [3 /*break*/, 9];
                    field = fields_1[_i];
                    return [4 /*yield*/, inquirer_1.default.prompt([
                            {
                                name: "scene",
                                type: "list",
                                message: "What scene do you want to associate with " + field.name + "? ",
                                choices: scenes.scenes.map(function (s) { return s.name; }),
                            },
                        ])];
                case 7:
                    response_1 = _a.sent();
                    associations[field.id] = response_1.scene;
                    _a.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 6];
                case 9:
                    console.log("Done!");
                    fieldset.ws.on("message", function (data) { return __awaiter(_this, void 0, void 0, function () {
                        var message, id;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    message = JSON.parse(data.toString());
                                    if (!(message.type === "fieldMatchAssigned")) return [3 /*break*/, 2];
                                    id = message.fieldId;
                                    console.log(message.name + " queued on " + fields[id - 1].name + ", switching to scene " + associations[id]);
                                    return [4 /*yield*/, obs.send("SetCurrentScene", { "scene-name": associations[id] })];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    });
})();
