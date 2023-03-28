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
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const phone_1 = __importDefault(require("phone"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const cron_1 = __importDefault(require("cron"));
const sendblue_1 = __importDefault(require("sendblue"));
const cloudinary_1 = require("cloudinary");
const openai_1 = require("openai");
const coda_js_1 = require("coda-js");
const pg_1 = require("pg");
const client_1 = require("@prisma/client");
require("@shopify/shopify-api/adapters/node");
let hostname = '0.0.0.0', link = 'https://framedaddy-backend.onrender.com', local = false;
if (os_1.default.hostname().split('.').pop() === 'local')
    hostname = '127.0.0.1', link = process.env.NGROK, local = true;
const PORT = Number(process.env.PORT), app = (0, express_1.default)();
app.use(express_1.default.static('public')), app.use(express_1.default.urlencoded({ extended: true })), app.use(body_parser_1.default.json()), app.use((0, morgan_1.default)('dev')), app.use('/assets', express_1.default.static('assets'));
app.listen(PORT, hostname, () => { console.log(`server at - http://${hostname}:${PORT}/`); });
const sendblue = new sendblue_1.default(process.env.SENDBLUE_API_KEY, process.env.SENDBLUE_API_SECRET), coda = new coda_js_1.Coda(process.env.CODA_API_KEY), configuration = new openai_1.Configuration({ organization: process.env.OPENAI_ORGANIZATION, apiKey: process.env.OPENAI_API_KEY });
const openai = new openai_1.OpenAIApi(configuration);
cloudinary_1.v2.config({ cloud_name: 'dpxdjc7qy', api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
let clientConfig; // need to pass ssl: true for external access
process.env.PGHOST.includes('render') ? clientConfig = { user: process.env.PGUSER, host: process.env.PGHOST, database: process.env.PGDATABASE, password: process.env.PGPASSWORD, port: Number(process.env.PGPORT), ssl: true } : clientConfig = { user: process.env.PGUSER, host: process.env.PGHOST, database: process.env.PGDATABASE, password: process.env.PGPASSWORD, port: Number(process.env.PGPORT) };
const client = new pg_1.Client(clientConfig), prisma = new client_1.PrismaClient();
client.connect();
// ========================================================================================
// ========================================VARIABLES=======================================
// ========================================================================================
var AdminNumbers;
(function (AdminNumbers) {
    AdminNumbers["Ian"] = "+13104974985";
    AdminNumbers["Adam"] = "+19165919394";
    AdminNumbers["Corn"] = "+19498702865";
    AdminNumbers["Lubin"] = "+16143019108";
    AdminNumbers["Boser"] = "+17324035224";
})(AdminNumbers || (AdminNumbers = {}));
const admin_numbers = Object.values(AdminNumbers), sendblue_callback = `${link}/message-status`, coda_doc_key = 'Wkshedo2Sb', coda_messages_key = 'grid-_v0sM6s7e1', coda_users_key = 'grid-VBi-mmgrKi';
const default_message = { content: null, number: '', type: null, is_outbound: null, date: new Date(), was_downgraded: null, media_url: null, send_style: null, response_time: null };
const default_user = { number: '', name: null, email: null, order: null };
let users, users_test = ['+13104974985', '+19165919394'];
// send_message({ ...default_message, content: 'FrameDaddy admin: test !' }, users_test)
local_data();
function local_data() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Coda_doc = yield coda.getDoc(coda_doc_key); // const Coda_tables = await Coda_doc.listTables()
            const Coda_users_table = yield Coda_doc.getTable(coda_users_key);
            const Coda_user_rows = yield Coda_users_table.listRows({ useColumnNames: true });
            users = Coda_user_rows.map((row) => (row.values).number);
            const Coda_messages_table = yield Coda_doc.getTable(coda_messages_key);
            const Coda_messages_rows = yield Coda_messages_table.listRows({ useColumnNames: true });
            let messages = Coda_messages_rows.map((row) => (row.values).number);
            const columns = yield Coda_messages_table.listColumns(null);
            console.log(`Ian included in Users: ${users.includes('+13104974985')}`);
            // console.log(columns.map((column) => (column as { name: string }).name))
            // =========Prisma=========
            // users = await prisma.users.findMany().then(users => users.map(user => user.number))
        }
        catch (e) {
            error_alert(e);
        }
    });
}
// ======================================================================================
// ========================================ROUTES========================================
// ======================================================================================
app.post('/fdorder', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = { name: (req.body.customer.first_name + ' ' + req.body.customer.last_name), email: req.body.customer.email, number: (0, phone_1.default)(req.body.shipping_address.phone).phoneNumber, order: '' };
        res.status(200).end();
        const order = req.body.line_items.map((item) => { `${item.quantity}x ${item.name}\n`; }).join(`\n`);
        let message_response = Object.assign(Object.assign({}, default_message), { type: 'order_placed', number: user.number });
        yield send_message(Object.assign(Object.assign({}, message_response), { content: `You've been framed 😎! Here's your order info (#${req.body.order_number})` }));
        yield send_message(Object.assign(Object.assign({}, message_response), { content: req.body.order_status_url, send_style: client_1.SendStyle.confetti }));
        yield send_message(Object.assign(Object.assign({}, message_response), { content: "Don’t forget to save my contact card for quick and easy ordering", media_url: contact_card }));
        yield log_message(Object.assign(Object.assign({}, message_response), { content: `<order_placed:\n${order}>` }));
        yield prisma.user.upsert({
            where: { number: user.number },
            update: { name: user.name, email: user.email, order: '' },
            create: { name: user.name, email: user.email, order: '', number: user.number }
        });
    }
    catch (e) {
        res.status(500).end();
        error_alert(e);
    }
}));
// TODO add this back, screen JSON for update==shipped?
app.post('/fdshipped', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // ? do we need this
}));
app.post('/message', (req, res) => {
    try {
        analyze_message(Object.assign(Object.assign({}, default_message), { content: req.body.content, media_url: req.body.media_url, number: req.body.number, was_downgraded: req.body.was_downgraded, is_outbound: false, date: new Date(req.body.date_sent), response_time: new Date(req.body.date_sent).valueOf() / 1000 }));
        res.status(200).end();
    }
    catch (e) {
        res.status(500).end();
        error_alert(e);
    }
});
app.post('/message-status', (req, res) => {
    try {
        const message_status = req.body;
        res.status(200).end();
    }
    catch (e) {
        res.status(500).end();
        error_alert(e);
    }
});
// ======================================================================================
// ========================================FUNCTIONS=====================================
// ======================================================================================
const help_prompt = fs_1.default.readFileSync('prompts/help_prompt.txt', 'utf8');
const job = new cron_1.default.CronJob('0 0 */4 * *', () => __awaiter(void 0, void 0, void 0, function* () { local_data(); }));
job.start();
const contact_card = `${link}/assets/FrameDaddy.vcf`;
function analyze_message(message) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let message_response = Object.assign(Object.assign({}, default_message), { number: message.number }), user;
            // intro message
            if (!users.includes(message.number) || (admin_numbers.includes(message.number) && ((_a = message.content) === null || _a === void 0 ? void 0 : _a.toLowerCase().startsWith('first')))) {
                user = yield log_user(Object.assign(Object.assign({}, default_user), { number: message.number }));
                // await send_message({ ...message_response, content: `Hey I'm TextFrameDaddy.com, the easiest way to frame a 5x7 photo for just $19.99! I'm powered by AI so feel free to speak naturally. Add my contact below.`, media_url: contact_card, type: MessageType.intro })
                // message.media_url ? await layer_image(message, user) : await send_message({ ...message_response, content: 'Send a photo to get started!', type: MessageType.intro })
                sendblue.sendGroupMessage({ content: `🚨 NEW USER 🚨 (${message.number})`, numbers: admin_numbers });
                // log_message(message)
                // return
            }
            else {
                user = yield prisma.user.findUnique({ where: { number: message.number } });
            }
            if (!user) {
                error_alert('NO USER ERROR');
            }
            if ((_b = message.content) === null || _b === void 0 ? void 0 : _b.toLowerCase().startsWith('reset')) {
                return;
            } // reset
            if (message.media_url) {
                yield layer_image(message);
                return;
            }
            else if (((_c = message.content) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes('admin:')) && admin_numbers.includes(message.number)) {
                console.log(`${log_time(message.response_time)} - admin`);
                yield send_message(Object.assign(Object.assign({}, default_message), { content: message.content.split(':').pop(), media_url: message.media_url, type: client_1.MessageType.announcement }), users_test);
                return;
                // await send_message({ ...default_message, content: message.content.split(':').pop()!, media_url: message.media_url, type: MessageType.announcement }, users); return
            }
            console.log(`${log_time(message.response_time)} - user`);
            const previous_messages = yield get_previous_messages(message, 8);
            let categories = [client_1.MessageType.help, client_1.MessageType.order_quantity, client_1.MessageType.customer_support, client_1.MessageType.unsubscribe];
            // if (local) categories.push(MessageType.checkout, MessageType.new_order)
            const categorize = yield openai.createCompletion({
                model: 'text-davinci-003',
                prompt: `
      Categorize the following text into one of the following: [${categories}]. The default is "help". "customer_support" is if they want to speak to a representative or you can't help them. If you are unsure, go with "help". Example:
      Text: I'll take 2 white frames and three black
      Category: order_quantity
      Text: how does this work and how much do the frames cost?
      Category: help
      Text: how many frames can I get?
      Category: help
      Text: dfjfasd5
      Category: help
      Text: I'd like to speak to a human
      Category: customer_support
      Text: black
      Category: order_quantity
      ###
      Previous Messages
      ${previous_messages}
      ###
      Text: ${message.content}
      Category:` /*  "checkout" is when for when the customer no longer wants to send photos and is checkout out. "new_order" is when they say they want to start a new order. */
            });
            const category = (_d = categorize.data.choices[0].text) === null || _d === void 0 ? void 0 : _d.toLowerCase().replace(/\s+/g, "");
            console.log(`${log_time(message.response_time)} - categorize (${category})`);
            // cateogrization error
            if (!category || !categories.includes(category)) {
                error_alert(` ! miscategorization (${message.number}): '${message.content}'\ncategory: ${category}`, message);
                yield send_message(Object.assign(Object.assign({}, message_response), { content: `Sorry bugged out. Try again, your message has been sent to support to fix the bug. Start framing by texting a photo!` }));
                return;
            }
            /* let openAIResponse: any = await openai.createCompletion({
              model: 'text-davinci-003', temperature: 0.5, max_tokens: 256,
              prompt: `A customer is ordering one or more framed photo.Extract the quantity of black and white frames desired from their message.Return the quantities in the following format:
              <image_url 1 >| <black quantities 1 >, <white quantities 1 >
              <image_url 2 >| <black quantities 2 >, <white quantities 2 >
              ...
              Current Order:
              ${user.order}
              ###
              ${previous_messages}
              Order:
              `
            }) */
            if (category == client_1.MessageType.order_quantity) {
                let openAIResponse = yield openai.createCompletion({
                    model: 'text-davinci-003', temperature: 0.5, max_tokens: 256,
                    prompt: `A customer is ordering one or more framed photo. Extract the quantity of black and white frames desired from their message. Return the quantities in the following format: <black quantities>,<white quantities>
        Examples:
        Text: I'll take both
        Values: 1,1
        Text: black
        Values: 1,0
        ###
        Current Order:
        Message: ${message.content}
        Values:`
                });
                // remove blank space from response, split into array
                const quantities = (_e = openAIResponse.data.choices[0].text) === null || _e === void 0 ? void 0 : _e.toString().trim().split(',');
                yield send_message(Object.assign(Object.assign({}, message_response), { content: `Nice choice, I’ll get this shipped out ASAP. Click the link to checkout: https://textframedaddy.com/cart/43286555033836:${quantities[0]},43480829198572:${quantities[1]}` }));
            }
            else if (category == client_1.MessageType.help) {
                const prompt = `${help_prompt}\n###${previous_messages}\nCustomer: ${message.content}\nFrameDaddy:`;
                let content, media_url;
                let openAIResponse = yield openai.createCompletion({ model: 'text-davinci-003', max_tokens: 512, temperature: .5, presence_penalty: .7, frequency_penalty: .7, prompt: prompt });
                openAIResponse = openAIResponse.data.choices[0].text;
                console.log(openAIResponse);
                if (openAIResponse.includes('media_url'))
                    content = openAIResponse.split('media_url:')[0], media_url = openAIResponse.split('media_url:')[1];
                else
                    content = openAIResponse;
                console.log(prompt + "CONTENT\n" + content + "\nMEDIA_URL\n" + media_url);
                yield send_message(Object.assign(Object.assign({}, message_response), { content: content, media_url: media_url }));
            }
            else if (category == client_1.MessageType.customer_support) {
                send_message(Object.assign(Object.assign({}, message_response), { content: `Connecting you with a human, sorry for the trouble.`, type: category }));
                sendblue.sendGroupMessage({ content: `SUPPORT (${message.number}\n${message.content}`, numbers: admin_numbers });
            }
            else if (category == client_1.MessageType.new_order) {
                yield send_message(Object.assign(Object.assign({}, message_response), { content: `Alright, new order started.`, type: category }));
            }
            else if (category == client_1.MessageType.checkout) {
                if (!user.order)
                    return;
                const order = user.order.trim().split('&&');
                const links = order.map((order) => order.split('|')[0]), quantities = order.map((order) => order.split('|')[1]);
                const black_quantities = order.map((quantities) => Number(quantities.split(',')[0]));
                const white_quantities = order.map((quantities) => Number(quantities.split(',')[1]));
                const white_total = white_quantities.reduce((total, current) => total + current, 0), black_total = black_quantities.reduce((total, current) => total + current, 0);
                yield send_message(Object.assign(Object.assign({}, message_response), { content: `Nice choice, I’ll get this shipped out ASAP. Click the link to checkout: https://textframedaddy.com/cart/43286555033836:${black_total},43480829198572:${white_total}` }));
            }
            else if (category == client_1.MessageType.unsubscribe) {
                const Coda_doc = yield coda.getDoc(coda_doc_key);
                const Coda_users_table = yield Coda_doc.getTable(coda_users_key);
                const Coda_user_rows = yield Coda_users_table.listRows({ useColumnNames: true });
                const Coda_user = Coda_user_rows.find(row => row.values.phone == message.number);
                if (Coda_user)
                    yield Coda_users_table.deleteRow(Coda_user.id);
                send_message(Object.assign(Object.assign({}, message_response), { content: `Sorry to see you go. Text this number again anytime if you wanna continue`, type: category }));
                yield prisma.user.delete({ where: { number: message.number } });
            }
            yield log_message(message);
        }
        catch (e) {
            error_alert(e);
        }
    });
}
function get_previous_messages(message, amount = 14) {
    return __awaiter(this, void 0, void 0, function* () {
        let reset_message = new Date();
        try {
            const reset_message_loc = yield prisma.message.findFirstOrThrow({
                where: {
                    number: message.number, OR: [
                        { content: { startsWith: 'reset', mode: 'insensitive' } },
                        { type: { equals: client_1.MessageType.order_placed } },
                        { type: { equals: client_1.MessageType.new_order } }
                    ]
                }, orderBy: { date: 'desc' }
            }); // TODO not ideal cuz parses EVERY message from that number lol
            reset_message = reset_message_loc.date;
        }
        catch (_a) {
            reset_message.setDate(new Date().getDate() - 30);
        }
        const previous_messages = yield prisma.message.findMany({
            where: { number: message.number, date: { gt: reset_message } }, orderBy: { date: 'desc' }, take: amount
        });
        // let previous_messages_string = previous_messages.map((message) => { return `\n[${message.date?.toLocaleString('en-US', message_date_format)}] ${message.is_outbound ? 'FrameDaddy:' : 'Human:'} ${message.content}` }).reverse().join('')
        const ignore_content_types = [client_1.MessageType.new_order, client_1.MessageType.order_placed, client_1.MessageType.customer_support];
        let previous_messages_string = previous_messages.map((message) => { return `\n${message.is_outbound ? 'FrameDaddy:' : 'Human:'} ${(message.type != null && ignore_content_types.includes(message.type)) ? `<${message.type}>` : message.content}`; }).reverse().join('');
        return previous_messages_string;
    });
}
function layer_image(message) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const t0 = Date.now();
        const joke = get_joke();
        const message_response = Object.assign(Object.assign({}, default_message), { number: message.number, type: client_1.MessageType.layered_image });
        yield send_message(Object.assign(Object.assign({}, message_response), { content: `Ready in a sec, in the meantime:\n${joke.joke}` }));
        send_message(Object.assign(Object.assign({}, message_response), { content: joke.punchline, send_style: client_1.SendStyle.invisible }));
        // setTimeout(() => {  }, 3000)
        let public_id = `${message.number.substring(2)}_${(_a = message.date) === null || _a === void 0 ? void 0 : _a.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[:,]/g, '').replace(/[/\s]/g, '-')}`;
        console.log(public_id); // ex: '3104974985_10-20-21_18-00-00'
        try {
            let data = yield cloudinary_1.v2.uploader.upload(message.media_url, {
                public_id: public_id, folder: '/FrameDaddy/submissions',
                fetch_format: "jpg", exif: true, // colors: true, media_metadata: true // ! 'exif' supposed to be deprecated for 'media_metadata', which isn't working
                /* [
                  { if: "ar_lt_1.0" },
                  { background: "auto", height: 300, width: 500, crop: "pad" },
                  { if: "end" }
                ] */
            });
            yield log_message(Object.assign(Object.assign({}, message), { media_url: data.url }));
            let orientation = data.exif.Orientation, width = data.width, height = data.height, ratio = data.width / data.height, path = `v${data.version}:${data.public_id.replace(/\//g, ':')}.${data.format}`;
            console.log(`path: ${path}`);
            if ((0.76 < ratio || ratio < 0.67) && (0.76 < 1 / ratio || 1 / ratio < .67)) {
                // TODO add a crop
                yield send_message(Object.assign(Object.assign({}, message_response), { content: `Looks like your photo's the wrong aspect ratio, follow the picture below (5:7 or 7:5 ratio) and send again.`, media_url: `${link}/assets/aspect_ratio_tutorial.png` }));
            }
            else {
                let setup, background_crop, ar, distort; // distort = [left, right]
                if (ratio < 1)
                    setup = 'vertical', background_crop = [4930, 3849], ar = '5:7', distort = ['1216:2054:2158:2138:2052:3482:1055:3316', '2957:2125:3881:2021:4119:3310:3158:3484'];
                else
                    setup = 'horizontal', background_crop = [2896, 2172], ar = '7:5', distort = ['285:534:918:534:913:1008:284:1010', '1926:517:2592:510:2593:1001:1927:1004'];
                const image = `https://res.cloudinary.com/dpxdjc7qy/image/upload/q_60/u_${path}/e_distort:${distort[0]}/fl_layer_apply,g_north_west,x_0,y_0/u_${path}/e_distort:${distort[1]}/fl_layer_apply,g_north_west/c_crop,g_north_west,w_${background_crop[0]},h_${background_crop[1]}/FrameDaddy/assets/double_${setup}.jpg`;
                // const image = `https://res.cloudinary.com/dpxdjc7qy/image/upload/q_60/u_${path}/c_fill,g_auto,ar_${ar}/e_distort:${distort[0]}/fl_layer_apply,g_north_west,x_0,y_0/u_${path}/c_fill,g_auto,ar_${ar}/e_distort:${distort[1]}/fl_layer_apply,g_north_west,x_0,y_0/c_crop,g_north_west,h_${background_crop[1]},w_${background_crop[0]}//FrameDaddy/assets/double_${setup}.jpg`
                console.log(`image: ${image}`);
                yield send_message(Object.assign(Object.assign({}, message_response), { media_url: image }));
                send_message(Object.assign(Object.assign({}, message_response), { content: `How many frames would you like, and in what color(s)? i.e. 2 black, 1 white` }));
                // if (user.order == '') send_message({ ...message_response, content: `If you want more photos framed keep em coming, otherwise let me know when you want to checkout` })
                const image_mod = yield cloudinary_1.v2.image(public_id, { gravity: "auto", aspect_ratio: ar, crop: "fill" });
                console.log(`image_mod: ${image_mod}`);
            }
            console.log(`${Date.now() - t0}ms - cloudinary_edit`);
        }
        catch (e) {
            error_alert(e);
        }
    });
}
function send_message(message, numbers) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            message.date = new Date(), message.is_outbound = true;
            if (message.response_time)
                message.response_time = Date.now() / 1000 - message.response_time;
            if (numbers) {
                for (const number of numbers) {
                    yield sendblue.sendMessage({ content: message.content ? message.content : undefined, number: number, send_style: message.send_style ? message.send_style : undefined, media_url: message.media_url ? message.media_url : undefined, status_callback: sendblue_callback });
                    yield log_message(Object.assign(Object.assign({}, message), { number: number }));
                }
            }
            else {
                yield sendblue.sendMessage({ content: message.content ? message.content : undefined, number: message.number, send_style: message.send_style ? message.send_style : undefined, media_url: message.media_url ? message.media_url : undefined, status_callback: sendblue_callback });
                yield log_message(message);
            }
            console.log(`${log_time(message.response_time)} - send_message (${message.number})`);
            yield log_message(message);
        }
        catch (e) {
            error_alert(e);
        }
    });
}
// blast()
function blast() {
    return __awaiter(this, void 0, void 0, function* () {
        // const numbers = ["+19548813730", "amanraj7319.ar@gmail.com", "+17073223922", "anniedwyer909@icloud.com", "+19313325480", "+918894574954", "+16178391564", "+18642769212"]
        const numbers = ["+13104974985", '+12132682683'];
        send_message(Object.assign(Object.assign({}, default_message), { content: "Hey, we experienced a bug yesterday that prevented responses to new users (fixed one thing broke another 🤦). Should be good to go now! If you're having any more trouble feel free to reach out to me personally at (310) 497-4985. Sorry again for the inconvenience, have a great day and thank you for using FrameDaddy!", number: AdminNumbers.Ian }));
    });
}
function log_message(message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.message.create({ data: message });
            const Coda_doc = yield coda.getDoc(coda_doc_key);
            const Coda_messages_table = yield Coda_doc.getTable(coda_messages_key);
            yield Coda_messages_table.insertRows([{ content: message.content ? message.content : undefined, picture: message.media_url ? message.media_url : undefined, media_url: message.media_url ? message.media_url : undefined, number: message.number, received_PST: message.date, is_outbound: message.is_outbound ? message.is_outbound : undefined, SMS: message.was_downgraded ? message.was_downgraded : undefined }]);
        }
        catch (e) {
            error_alert(e);
        }
    });
}
function log_user(user) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            users.push(user.number);
            const Coda_doc = yield coda.getDoc(coda_doc_key);
            const Coda_users_table = yield Coda_doc.getTable(coda_users_key);
            Coda_users_table.insertRows([{ number: user.number }]);
            const prisma_user = yield prisma.user.upsert({ where: { number: user.number }, update: {}, create: { number: user.number } });
            return prisma_user;
        }
        catch (e) {
            error_alert(e);
        }
    });
}
function error_alert(error, message) {
    return __awaiter(this, void 0, void 0, function* () { /* await send_message({ ...default_message, content: `ERROR\n${error}`, number: AdminNumbers.Ian }); */ console.error(`ERROR: ${error}`); });
}
const log_time = (time) => `${(Date.now() / 1000 - time).toFixed(1)}sec`;
// ======================================================================================
// ========================================TESTING=======================================
// ======================================================================================
// const shopify = shopifyApi({
// apiKey: process.env.SHOPIFY_API_KEY!, apiSecretKey: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!, apiVersion: LATEST_API_VERSION, isCustomStoreApp: true, scopes: ['read_products', 'read_orders', 'read_customers', 'read_order_edits',], isEmbeddedApp: true, hostName: hostname,
// })
// const session = shopify.session.customAppSession(process.env.SHOPIFY_SHOP_LINK!)
// const client = new shopify.clients.Graphql({ session })
/*
draftOrderCreate
draftOrderCreateMerchantCheckout: https://shopify.dev/docs/api/admin-graphql/2023-01/mutations/draftOrderCreateMerchantCheckout
*/
// product_update()
/* async function product_update() {
  const startTime = Date.now()
  const products: any = await client.query({ data: `query { products(first: 100, query: "tag:Sunday") { edges { node { id } } } }`, })
  Sunday_products = await products.body.data.products.edges.map((datum: any) => Number(datum.node.id.split("/").pop()))
  const endTime = Date.now()
  console.log(`product_update: ${Math.round(endTime - startTime)}ms`)
  console.log(`Sunday_products: ${Sunday_products}`)
} */
const sample_vertical = 'https://storage.googleapis.com/inbound-file-store/47yEEPvo_61175D25-640A-4EA4-A3A1-608BBBBD76DDIMG_2914.heic', sample_horizontal = 'https://storage.googleapis.com/inbound-file-store/1Nq7Sytl_01C13E5D-6496-4979-A236-EC2945A10D47.heic';
let test_message = Object.assign(Object.assign({}, default_message), { content: 'test_message', number: '+13104974985', date: new Date(), media_url: sample_vertical });
let test_user = { number: '+13104974985', email: 'ianwatts22@gmail.com', name: 'Ian Watts', order: '' };
// test(test_message)
function test(message, user, string) {
    return __awaiter(this, void 0, void 0, function* () {
        send_message(Object.assign(Object.assign({}, default_message), { content: ``, number: '+13104974985' }));
    });
}
// message wasn't working: Sure thing! Just text me a photo (portrait or landscape) you want framed and I'll take care of the rest. You can only send and order one photo at a time, however multiple photo ordering will be ready shortly. The photos are 5"x7" and come in ONLY black or white frames for $19.99. Adam and Alex lovingly handframe, package, and ship your photo from New York. Frames have a wall-hook and easel-back to hang or stand up. If you need help with the texting service, you can upload your photo at our website: textframedaddy.com
// data_sync()
function data_sync() {
    return __awaiter(this, void 0, void 0, function* () {
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            users.forEach((user) => __awaiter(this, void 0, void 0, function* () { yield prisma.user.upsert({ where: { number: user }, update: { number: user }, create: { number: user } }); }));
        }), 10000);
    });
}
const get_joke = () => jokes[Math.floor(Math.random() * jokes.length)];
const jokes = [
    { joke: "Why don't scientists trust atoms?", punchline: "Because they make up everything" },
    { joke: "Why did the tomato turn red?", punchline: "Because it saw the salad dressing" },
    { joke: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field" },
    { joke: "Why don't oysters donate to charity?", punchline: "Because they are shellfish" },
    { joke: "Why do we never tell secrets on a farm?", punchline: "Because the potatoes have eyes and the corn has ears" },
    { joke: "Why did the bicycle fall over?", punchline: "Because it was two-tired" },
    { joke: "How do you organize a space party?", punchline: "You planet" },
    { joke: "What do you call a fake noodle?", punchline: "An impasta" },
    { joke: "Why did the golfer bring an extra pair of pants?", punchline: "In case he got a hole in one" },
    { joke: "Why don't some couples go to the gym?", punchline: "Because some relationships don't work out" },
    { joke: "What do you call cheese that isn't yours?", punchline: "Nacho cheese" },
    { joke: "Why did the teddy bear say no to dessert?", punchline: "Because he was already stuffed" },
    { joke: "Why was the math book sad?", punchline: "Because it had too many problems" },
    { joke: "What do you get when you cross a snowman and a vampire?", punchline: "Frostbite" },
    { joke: "Why couldn't the bicycle stand up by itself?", punchline: "It was two-tired" },
    { joke: "What's orange and sounds like a parrot?", punchline: "A carrot" },
    { joke: "Why did the picture go to jail?", punchline: "Because it was framed" },
    { joke: "What do you call a dinosaur with an extensive vocabulary?", punchline: "A thesaurus" },
    { joke: "What do you get when you cross a sheep and a kangaroo?", punchline: "A woolly jumper" }
];
