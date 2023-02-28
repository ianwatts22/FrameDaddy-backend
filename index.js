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
require('dotenv').config();
const sendblue_1 = __importDefault(require("sendblue"));
const axios_1 = __importDefault(require("axios"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const phone_1 = __importDefault(require("phone"));
const openai_1 = require("openai");
const coda_js_1 = require("coda-js");
const os_1 = __importDefault(require("os"));
const cron_1 = __importDefault(require("cron"));
require("@shopify/shopify-api/adapters/node");
const app = (0, express_1.default)();
// configure hostname & port, middleware & static files (comes with express)
let hostname, link;
if (os_1.default.hostname().split('.').pop() === 'local') {
    hostname = '127.0.0.1', link = process.env.NGROK;
}
else {
    hostname = '0.0.0.0', link = 'https://framedaddy-backend.onrender.com';
}
const PORT = Number(process.env.PORT);
app.listen(PORT, hostname, () => { console.log(`server at - http://${hostname}:${PORT}/`); });
app.use(express_1.default.static('public'));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use((0, morgan_1.default)('dev'));
const sendblue = new sendblue_1.default(process.env.SENDBLUE_API_KEY, process.env.SENDBLUE_API_SECRET);
const coda = new coda_js_1.Coda(process.env.CODA_API_KEY);
const configuration = new openai_1.Configuration({ organization: process.env.OPENAI_ORGANIZATION, apiKey: process.env.OPENAI_API_KEY });
const openai = new openai_1.OpenAIApi(configuration);
// const shopify = shopifyApi({
//   apiKey: process.env.SHOPIFY_API_KEY!, apiSecretKey: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!, apiVersion: LATEST_API_VERSION, isCustomStoreApp: true, scopes: ['read_products', 'read_orders', 'read_customers', 'read_order_edits',], isEmbeddedApp: true, hostName: hostname,
// })
// const session = shopify.session.customAppSession(process.env.SHOPIFY_SHOP_LINK!)
// const client = new shopify.clients.Graphql({ session })
// ========================================================================================
// ========================================VARIABLES=======================================
// ========================================================================================
const admin_numbers = ['+13104974985', '+19165919394', '+19498702865']; // Ian, Adam, Corn
const coda_doc = 'Wkshedo2Sb', coda_table = 'grid-_v0sM6s7e1';
// const Coda_messages_table = coda.getTable(coda_doc, coda_table)
let send_style_options = new Set(["celebration", "shooting_star", "fireworks", "lasers", "love", "confetti", "balloons", "spotlight", "echo", "invisible", "gentle", "loud", "slam"]);
// ======================================================================================
// ========================================ROUTES========================================
// ======================================================================================
app.post('/fdorder', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const t0 = Date.now();
        const customer = { name: req.body.customer.first_name, email: req.body.customer.email, phone: (0, phone_1.default)(req.body.shipping_address.phone).phoneNumber, order_number: req.body.order_number };
        res.status(200).end();
        yield send_message({ content: `you've been framed 😎 here's your order status (#${req.body.order_number}) ${req.body.order_status_url}`, number: customer.phone });
        yield send_message({ content: "don’t forget to save my contact card for easy ordering", number: customer.phone });
        console.log(`${Date.now() - t0}ms - /fdorder`);
    }
    catch (e) {
        res.status(500).end();
        error_alert(e);
    }
}));
app.post('/fdshipped', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // ? do we need this
}));
app.post('/message', (req, res) => {
    try {
        const t0 = Date.now();
        const message = { content: req.body.content, media_url: req.body.media_url, number: req.body.number, was_downgraded: req.body.was_downgraded, is_outbound: false, date: req.body.date_sent };
        res.status(200).end();
        analyze_message(message);
        console.log(`${Date.now() - t0}ms - /message: (${message.number}) ${message.content}`);
    }
    catch (e) {
        res.status(500).end();
        error_alert(e);
    }
});
app.post('/message-status', (req, res) => {
    try {
        const t0 = Date.now();
        const message_status = req.body;
        res.status(200).end();
        console.log(`${Date.now() - t0}ms - /message-status`);
    }
    catch (e) {
        res.status(500).end();
        error_alert(e);
    }
});
// ======================================================================================
// ========================================TESTING=======================================
// ======================================================================================
let abe = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg';
let test_message = { content: 'test_message', media_url: abe, number: '+13104974985', date: new Date() };
let users;
local_data();
function local_data() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const t0 = Date.now();
            const Coda_doc = yield coda.getDoc(coda_doc), Coda_users_table = yield Coda_doc.getTable('grid-VBi-mmgrKi');
            const columns = yield Coda_users_table.listColumns(null);
            const rows = yield Coda_users_table.listRows({
                useColumnNames: true, // param to display column names rather than key
            });
            users = rows.map((row) => (row.values).phone);
            console.log(users);
            /* let add_message = await Coda_messages_table.insertRows([
              { content: message.content, picture: message.media_url, phone: message.number, "received (PST)": message.date }
            ]) */
            // console.log(JSON.stringify(add_message))
            console.log(`${Date.now() - t0}ms - local_data`);
        }
        catch (e) {
            console.log(e);
        }
    });
}
// Shopify product info
let Sunday_products;
// product_update()
/* async function product_update() {
  const startTime = Date.now()
  const products: any = await client.query({ data: `query { products(first: 100, query: "tag:Sunday") { edges { node { id } } } }`, })
  Sunday_products = await products.body.data.products.edges.map((datum: any) => Number(datum.node.id.split("/").pop()))
  const endTime = Date.now()
  console.log(`product_update: ${Math.round(endTime - startTime)}ms`)
  console.log(`Sunday_products: ${Sunday_products}`)
} */
// ======================================================================================
// ========================================FUNCTIONS=====================================
// ======================================================================================
const job = new cron_1.default.CronJob('0 0 */1 * *', () => __awaiter(void 0, void 0, void 0, function* () {
    local_data();
    yield send_message({ content: `FrameDaddy CRON run`, number: '+13104974985' });
}));
job.start();
function analyze_message(message) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        add_row(message);
        if (!users.includes(message.number)) { // check for new user
            console.log('new user');
            yield send_message({ content: `hey I'm TextFrameDaddy.com! the easiest way to put a 5x7 photo in a frame. this is an AI chatbot so feel free to speak naturally. my capabilities are limited now but I'm always adding more! add my contact below`, number: message.number, media_url: 'http://message.textframedaddy.com/assets/FrameDaddy.vcf' });
            yield send_message({ content: 'send a photo to get started!', number: message.number });
            return;
        }
        users.push(message.number);
        console.log('existing user');
        if (message.media_url) {
            console.log('media message');
            // ? unsure if we still need this
            if (message.media_url.includes('heic')) {
                yield send_message({ content: `looks like your photo's in the ☁️, follow the video below to save it to your phone and then resend. if that doesn't work use this converter! https://www.freeconvert.com/heic-to-jpg`, number: message.number, media_url: 'http://message.textframedaddy.com/assets/heic_photo.mov' });
            }
            else {
                const layered_image = yield layerImage(message, message.media_url);
                yield send_message({ content: `here ya go ${layered_image}`, number: message.number, media_url: layered_image });
                yield send_message({ content: `white or black? how many? (e.g., "1 black 1 white")`, number: message.number });
            }
        }
        if (!message.content) {
            return;
        }
        /* let content_parsed = message.content.replace(/[^\w\s]/g, "").split(/ /g)
        let white = message.content.includes('white')
        let black = message.content.includes('black')
        let whiteQuantity = Number(content_parsed[content_parsed.indexOf('white') - 1])
        let blackQuantity = Number(content_parsed[content_parsed.indexOf('black') - 1])
        if (message.content.match(/\d/g) || white || black) { */
        /* try {
          await retryAsync(
            async () => {
      
            },
            { delay: 100, maxTry: 3, }
          );
        } catch (err) {
          if (isTooManyTries(err)) {
            error_alert(err)
          } else { error_alert(err) }
        } */
        // TODO implement retry feature if response isn't one of two?
        // if (await category()) { }
        const category = () => __awaiter(this, void 0, void 0, function* () {
            var _b;
            try {
                const category = yield openai.createCompletion({
                    model: 'text-davinci-003',
                    prompt: `Categorize the following text into one of the following: ["help", "order quantity"]\nText: ${message.content}\nCategory:`
                });
                return (_b = category.data.choices[0].text) === null || _b === void 0 ? void 0 : _b.toLowerCase();
            }
            catch (e) {
                return null;
            }
        });
        const category_lc = yield category();
        console.log(`category_lc: ${category_lc}`);
        if (category_lc.includes('order')) {
            let openAIResponse = yield openai.createCompletion({
                model: 'text-davinci-003',
                prompt: `Extract the quantity of "black" and "white" desired from the text below. Return the quantities in the following format: <black quantities>,<white quantities>\nText: ${message.content}\nValues:`
            });
            const quantities = (_a = openAIResponse.data.choices[0].text) === null || _a === void 0 ? void 0 : _a.toString().replace(/[^0-9,]/g, '').split(',');
            yield send_message({ content: `nice choice. i’ll get this shipped out ASAP. click the link to checkout: https://textframedaddy.com/cart/43286555033836:${quantities[0]},43480829198572:${quantities[1]}`, number: message.number });
        }
        else if (category_lc.includes('help')) {
            let openAIResponse = yield openai.createCompletion({
                model: 'text-davinci-003', max_tokens: 128,
                prompt: `You are a superintelligent customer support chatbot. Guide the customer along and answer any questions. You operate over text message so keep responses brief and casual. The following is a description of our product/service\n - users text a photo (portrait or landscape) they want framed to get started\n - photos are printed 5"x7" in black or white frames for $24.99\n - Adam and Alex lovingly handframe, package, and ship your photo from New York\n - frames have a wall-hook and easel-back to hang or stand up\n - if you prefer, or are having troubles with the texting service, you can upload your photo to textframedaddy.com\nIf you cannot help the customer or they want to speak to a representative, put "SUPPORT" as the response.\nThe customer has sent the following message:\n
      Text: ${message.content}\nResponse:`
            });
            yield send_message({ content: openAIResponse.data.choices[0].text, number: message.number });
        }
        else {
            yield send_message({ content: `¿yo no comprendo 🤷‍♂️? Somebody will reach out shortly`, number: message.number });
            yield send_message({ content: `SUPPORT (${message.number})\n${message.content}`, number: message.number });
        }
    });
}
// layerImage()
function layerImage(message, media_url) {
    return __awaiter(this, void 0, void 0, function* () {
        // get metadata from Mallabe
        const options = {
            method: 'POST', url: 'https://mallabe.p.rapidapi.com/v1/images/metadata',
            headers: { 'content-type': 'application/json', 'Content-Type': 'application/json', 'X-RapidAPI-Key': process.env.MALLABE_API_KEY, 'X-RapidAPI-Host': 'mallabe.p.rapidapi.com' },
            data: `{"url": "${message.media_url}" }`
        };
        let metadata = yield axios_1.default.request(options);
        if (metadata.data.error) {
            console.log(metadata.data.error);
        }
        const height = metadata.data.height, width = metadata.data.width, ratio = metadata.data.width / metadata.data.height, orientation = metadata.data.orientation;
        let DYNAPICTURES_UID;
        const horizontalUID = '7c60ad7674', verticalUID = '8d587bae26';
        if ((width / height > 0.77 || width / height < 0.66) && (height / width > 0.77 || height / width < .66)) {
            send_message({ content: `looks like your photo's the wrong aspect ratio, follow the picture below (5:7 or 7:5 ratio) and send again`, number: message.number, media_url: 'http://message.textframedaddy.com/assets/aspect_ratio_tutorial.png' });
        }
        else if (width < height) { // photo has been rotated
            orientation > 4 ? DYNAPICTURES_UID = horizontalUID : DYNAPICTURES_UID = verticalUID;
        }
        else {
            orientation > 4 ? DYNAPICTURES_UID = verticalUID : DYNAPICTURES_UID = horizontalUID;
        }
        // layer image with Dynapictures
        axios_1.default.post(`https://api.dynapictures.com/designs/${DYNAPICTURES_UID}`, { params: [{ url: abe }] }, { headers: { 'Authorization': `Bearer ${process.env.DYNAPICTURES_API_KEY}`, 'Content-Type': 'application/json' } })
            .then(response => {
            console.log(response.data);
            return response.data.url;
        })
            .catch(error => { console.error(error); });
    });
}
function send_message(message, test) {
    return __awaiter(this, void 0, void 0, function* () {
        const t0 = Date.now();
        message.date = new Date(), message.is_outbound = true;
        yield sendblue.sendMessage({ content: message.content, number: message.number, send_style: message.send_style, media_url: message.media_url, status_callback: `${link}/message-status` });
        console.log(`${Date.now() - t0}ms - send_message: (${message.number}${message.content})`);
        yield add_row(message);
    });
}
function add_row(message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const t0 = Date.now();
            if (!message) {
                return;
            }
            const Coda_doc = yield coda.getDoc(coda_doc), Coda_messages_table = yield Coda_doc.getTable(coda_table); // const Coda_messages_table = await coda.getTable('O7d9JvX0GY', 'grid-_14oaR8gdM')
            const columns = yield Coda_messages_table.listColumns(null);
            // console.log(columns.map((column) => (column as {name: string}).name))
            let add_message = yield Coda_messages_table.insertRows([
                { content: message.content, picture: message.media_url, phone: message.number, "received (PST)": message.date }
            ]);
            // console.log(JSON.stringify(add_message))
            console.log(`${Date.now() - t0}ms - add_row`);
        }
        catch (e) {
            console.log(e);
        }
    });
}
function error_alert(error, message) {
    return __awaiter(this, void 0, void 0, function* () {
        // await send_message({ content: `ERROR: ${error}`, number: admin_numbers.toString() })
        console.error(`ERROR: ${error}`);
    });
}
