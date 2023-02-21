require('dotenv').config()
import Sendblue from 'sendblue'
import axios from 'axios'
import express from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import cloudinary from 'cloudinary'
import e164 from 'phone'
import { Configuration, OpenAIApi } from "openai"
import { Coda } from 'coda-js'
import os from 'os'

const app = express()
const sendblue = new Sendblue(process.env.SENDBLUE_API_KEY!, process.env.SENDBLUE_API_SECRET!)
const coda = new Coda(process.env.CODA_API_KEY!);
const configuration = new Configuration({ organization: process.env.OPENAI_ORGANIZATION, apiKey: process.env.OPENAI_API_KEY, basePath: "https://oai.hconeai.com/v1"  /* integration w/ Honeycone? usage service (changed name recently) */ })
const openai = new OpenAIApi(configuration)

// Configure hostname & port
let hostname: string
os.hostname().split('.').pop() === 'local' ? hostname = '127.0.0.1' : hostname = '0.0.0.0'
const PORT = Number(process.env.PORT)
app.listen(PORT, hostname, () => { console.log(`server at http://${hostname}:${PORT}/`) })

// middleware & static files, comes with express
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan('dev'))

// ========================================================================================
// ========================================VARIABLES=======================================
// ========================================================================================

const admin_numbers = ['+13104974985', '+19165919394', '+19498702865']    // Ian, Adam, Corn

// ========================================================================================
// ========================================DATABASE========================================
// ========================================================================================

// * CUSTOMER
interface Customer {
  name: string;
  email?: string;
  phone: string;
  order_number: string;
  image_url?: string;
}

// * MESSAGES
interface Message {
  // id: number;  // ? need this
  content?: string;
  media_url?: string;
  is_outbound?: boolean;
  date?: Date;
  number?: string;
  was_downgraded?: boolean;
  tokens?: number;
  send_style?: string;
  message_type?: string;
  group_id?: string;
}

/* class message {
  content?: string;
  media_url?: string;
  is_outbound?: boolean;
  date?: Date;
  number?: string;
  was_downgraded?: boolean;
  tokens?: number;
  send_style?: string;
  message_type?: string;
  group_id?: string;
  
  // ! do we need status_callback?
  async send() { await sendblue.sendMessage({ content: this.content, number: this.number!, send_style: this.send_style, media_url: this.media_url }) }
  
  async reply(content?: string, media_url?: string, send_style?: string,) { await sendblue.sendMessage({ content: content, number: this.number!, send_style: send_style, media_url: media_url }) }

  async log() {  }
} */

// ======================================================================================
// ========================================TESTING=======================================
// ======================================================================================

let abe = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg'

// send_message({ content: 'hello world', number: '+13104974985' })

/* test()
async function test() {
  const docs = await coda.listDocs();

  const firstDoc = docs[0];
  const firstDocTables = await firstDoc.listTables();
  console.log(firstDocTables);

  const columns = await firstDocTables[0].listColumns();
  console.log(columns.map((column) => column.name)); // list column names

  const table = docs.getTable('grid-**********'); // insert/inject table name or ID here

  // trick for using async in a script
  (async () => {
    const whoAmI = await coda.whoAmI();
    console.log(whoAmI);
  })().catch((error) => console.log(error));
} */

async function CodaAxios() {
  const docId = '<doc ID>';
  const tableId = '<table ID>';
  const columnId = '<column ID>';
  const payload = { 'rows': [{ 'cells': [
        { 'column': columnId, 'value': 'Feed Baker' },
      ], } ],
  };

  axios.post(`https://coda.io/apis/v1/docs/${docId}/tables/${tableId}/rows`, payload, {
    headers: { Authorization: `Bearer ${process.env.CODA_API_KEY}` } })
    .then((response) => { console.log(`Inserted ${response.data.insertedRowCount} row`) })
    .catch((error) => { console.error(error) })
}


// ======================================================================================
// ========================================ROUTES========================================
// ======================================================================================

app.post('/fdorder', async (req: express.Request, res: express.Response) => {
  
  
  res.status(200).end()
  const items = req.body.line_items
  console.log(JSON.stringify(req.body))
  console.log(new Date().toLocaleTimeString())

  const customer: Customer = { name: req.body.customer.first_name, email: req.body.customer.email, phone: e164(req.body.shipping_address.phone).phoneNumber!, order_number: req.body.order_number }

  await send_message({ content: `you've been framed 😎 here's your order status (#${req.body.order_number}) ${req.body.order_status_url}`, number: customer.phone })
  await send_message({ content: "don’t forget to save my contact card for easy ordering", number: customer.phone })
})

app.post('/fdshipped', async (req: express.Request, res: express.Response) => {
  // ? do we need this
})

app.post('/message', (req: express.Request, res: express.Response) => {
  const message: Message = { content: req.body.content, media_url: req.body.media_url, number: req.body.number, was_downgraded: req.body.was_downgraded, is_outbound: false, date: req.body.date_sent, group_id: req.body.group_id }
  if (req.body.error_code) { send_message({ content: `ERROR: ${req.body.error_code} ${req.body.error_message}`, number: admin_numbers.toString() }) }

  analyze_message(message, req.body.accountEmail)

  res.status(200).end()
  // console.log('message received ' + message.number + ': ' + message.content)
});

async function send_message(message: Message, test?: boolean) {
  // console.log(` ! message to ${message.number}: ${message.content}`)
  message.date = new Date()
  message.is_outbound = true
  await sendblue.sendMessage({ content: message.content, number: message.number!, send_style: message.send_style, media_url: message.media_url }) // ! do we need status_callback? 
}

// ==========================ANALYZE MESSAGE=========================

async function analyze_message(message: Message, accountEmail: string) {
  let first_message   // TODO: check for first message
  if (first_message) {
    send_message({ content: 'hey i’m TextFrameDaddy.com! the easiest way to put a 5x7 photo in a frame. add our contact below', number: message.number!, media_url: 'https://ianwatts.site/assets/FrameDaddy.vcf' })
    send_message({ content: 'feel free to text HELP at any time for more info', number: message.number! })
    send_message({ content: 'send a photo to get started!', number: message.number! })
    // TODO: log message to database
  }

  // ? unsure if we still need this
  if (message.media_url) {
    if (message.media_url.includes('heic')) {
      send_message({ content: 'looks like your photo\'s in the ☁️, follow the video below to save it to your phone and then resend. if that doesn\'t work use this converter! https://www.freeconvert.com/heic-to-jpg', number: message.number!, media_url: 'https://ianwatts.site/assets/heic_photo.mov' })
    } else {
      const layered_image = await layerImage(message, message.media_url)

      send_message({ content: `here ya go ${layered_image}`, number: message.number!, media_url: layered_image! })
      send_message({ content: `white or black? how many? (e.g., "1 black 1 white")`, number: message.number! })
    }
  }

  if (!message.content) { return }



  let content_parsed = message.content.replace(/[^\w\s]/g, "").split(/ /g)
  let white = message.content.includes('white')
  let black = message.content.includes('black')
  let whiteQuantity = Number(content_parsed[content_parsed.indexOf('white') - 1])
  let blackQuantity = Number(content_parsed[content_parsed.indexOf('black') - 1])

  if (message.content.match(/\d/g) || white || black) {
    let openAIResponse = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Extract the quantity of "black" and "white" desired from the text below. Return the quantities in the following format: <black quantities>,<white quantities>\nText: ${message.content}\nValues:`
    })
    let quantities = openAIResponse.data.choices[0].text?.toString().replace(/[^0-9,]/g, '').split(',')

    send_message({ content: `nice choice. i’ll get this shipped out ASAP. click the link to checkout: https://textframedaddy.com/cart/43286555033836:${quantities![0]},43480829198572:${quantities![1]}`, number: message.number! })
  } else if (message.content == 'help') {
    send_message({ content: '\nto talk to a team member text "support" followed by your problem (include image if applicable) \n\nhow does this work?\n - text a photo you want framed\n - photos can be portrait or landscape\n - photos are 5"x7" in black or white frames for $19.99\n - Adam and Alex lovingly handframe, package, and ship your photo from New York\n - text "referral" to get your referral code & instructions \n - frames have a hook and easel back to hang or stand\n - if you prefer, you can upload your photo to textframedaddy.com', number: message.number! })
  }
  else if (message.content.includes('support')) {
    send_message({ content: `your message has been passed on, a FrameDaddy human will be in contact shortly!`, number: message.number! })
    send_message({ content: `SUPPORT:\n${message.number}\n${message.content}`, number: admin_numbers.toString() })
  } else {
    send_message({ content: '¿yo no comprendo 🤷‍♂️? check spelling, send a pic you want framed, or text “help" for more info', number: message.number! })
    send_message({ content: `OTHER:\n${message.number}\n${message.content}`, number: admin_numbers.toString() })
  }
  // else if (message.content == 'reset') { content = 'reset' } // ! just for testing
  // else if (message.content == 'referral') { message = 'we both get 2 free photos with a purchase if you text ' + number + ' to ‭(650) 537-0786‬' } // TODO: unsure, do we still want this? what's system?
}

let send_style_options = new Set(["celebration", "shooting_star", "fireworks", "lasers", "love", "confetti", "balloons", "spotlight", "echo", "invisible", "gentle", "loud", "slam"])


// layerImage()
async function layerImage(message: Message, media_url: string) {
  // get metadata from Mallabe
  const options = {
    method: 'POST', url: 'https://mallabe.p.rapidapi.com/v1/images/metadata',
    headers: { 'content-type': 'application/json', 'Content-Type': 'application/json', 'X-RapidAPI-Key': process.env.MALLABE_API_KEY, 'X-RapidAPI-Host': 'mallabe.p.rapidapi.com' },
    data: `{"url": "${message.media_url}" }`
  }
  let metadata = await axios.request(options)
  if (metadata.data.error) { console.log(metadata.data.error) }

  let height = metadata.data.height
  let width = metadata.data.width
  let orientation = metadata.data.orientation
  let response

  if ((width / height > 0.77 || width / height < 0.66) && (height / width > 0.77 || height / width < .66)) {
    send_message({ content: `looks like your photo's the wrong aspect ratio, follow the picture below (5:7 or 7:5 ratio) and send again`, number: message.number, media_url: 'https://ianwatts.site/assets/aspect_ratio_tutorial.png' })
  } else if (width < height) {  // photo has been rotated
    orientation > 4 ? response = 'horizontal' : response = 'vertical'
  } else { orientation > 4 ? response = 'vertical' : response = 'horizontal' }

  // layer image with Dynapictures
  let DYNAPICTURES_UID
  const horizontalUID = '7c60ad7674'
  const verticalUID = '8d587bae26'
  response == 'horizontal' ? DYNAPICTURES_UID = horizontalUID : DYNAPICTURES_UID = verticalUID
  axios.post(`https://api.dynapictures.com/designs/${DYNAPICTURES_UID}`, { params: [{ url: abe }] }, { headers: { 'Authorization': `Bearer ${process.env.DYNAPICTURES_API_KEY}`, 'Content-Type': 'application/json' } })
    .then(response => {
      console.log(response.data)
      return response.data.url
    })
    .catch(error => { console.error(error) })
}