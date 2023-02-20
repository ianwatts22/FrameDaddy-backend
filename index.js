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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sendblue_1 = __importDefault(require("sendblue"));
const axios_1 = __importDefault(require("axios"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
const sendblue = new sendblue_1.default(process.env.SENDBLUE_API_KEY, process.env.SENDBLUE_API_SECRET);
const sendblue_test = new sendblue_1.default(process.env.SENDBLUE_TEST_API_KEY, process.env.SENDBLUE_TEST_API_SECRET);
const admin_numbers = ['+13104974985', '+19165919394', '+19498702865']; // Ian, Adam, Corn
// Configure hostname & port
const hostname = '127.0.0.1';
const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, hostname, () => { console.log(`Server running at http://${hostname}:${PORT}/`); });
// middleware & static files, comes with express
app.use(express_1.default.static('public'));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use((0, morgan_1.default)('dev'));
// ======================================================================================
// ========================================TESTING=======================================
// ======================================================================================
// ======================================================================================
// ========================================ROUTES========================================
// ======================================================================================
app.post('/order', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const items = req.body.line_items;
    console.log(new Date().toLocaleTimeString());
    send_message({});
    res.status(200).end();
}));
app.post('/message', (req, res) => {
    const message = { content: req.body.content, media_url: req.body.media_url, number: req.body.number, was_downgraded: req.body.was_downgraded, is_outbound: false, date: req.body.date_sent, group_id: req.body.group_id };
    if (req.body.error_code) {
        send_message({ content: `ERROR: ${req.body.error_code} ${req.body.error_message}`, number: admin_numbers.toString() });
    }
    analyze_message(message, req.body.accountEmail);
    res.status(200).end();
    console.log('message received ' + message.number + ': ' + message.content);
});
function send_message(message, test) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log(` ! message to ${message.number}: ${message.content}`)
        message.date = new Date();
        message.is_outbound = true;
        let response;
        if (test) {
            response = yield sendblue_test.sendMessage({ content: message.content, number: message.number, send_style: message.send_style, media_url: message.media_url });
        }
        else {
            response = yield sendblue.sendMessage({ content: message.content, number: message.number, send_style: message.send_style, media_url: message.media_url }); // ! do we need status_callback? 
        }
    });
}
// ==========================ANALYZE MESSAGE=========================
function analyze_message(message, accountEmail) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
let send_style_options = new Set(["celebration", "shooting_star", "fireworks", "lasers", "love", "confetti", "balloons", "spotlight", "echo", "invisible", "gentle", "loud", "slam"]);
function layerImage(media_url) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = {
            params: [
                {
                    url: media_url,
                }
            ]
        };
        const config = {
            headers: {
                Authorization: `Bearer ${process.env.DYNAPICTURES_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };
        let DYNAPICTURES_UID = "1716a84db6";
        axios_1.default.post(`https://api.dynapictures.com/designs/${DYNAPICTURES_UID}`, data, config)
            .then(response => { console.log(response.data); })
            .catch(error => { console.error(error); });
    });
}
// https://rapidapi.com/mallabe1/api/mallabe
function getMetadata(image) {
    return __awaiter(this, void 0, void 0, function* () {
        const options = {
            method: 'POST',
            url: 'https://mallabe.p.rapidapi.com/v1/images/metadata',
            headers: {
                'content-type': 'application/json',
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': 'f77d3a4d3fmsh1bff3321e76babcp121367jsn15d1a29a159b',
                'X-RapidAPI-Host': 'mallabe.p.rapidapi.com'
            },
            data: `{"url": ${image} }`
        };
        yield axios_1.default.request(options)
            .then(function (response) {
            console.log(response.data);
            return;
        }).catch(function (error) {
            console.error(error);
        });
    });
}
// ====================================TESTING==================================
