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
import * as retry from 'ts-retry'
import { isTooManyTries, retryAsync } from 'ts-retry'
import cron from 'cron'

import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from "@shopify/shopify-api"

const app = express()

// configure hostname & port, middleware & static files (comes with express)
let hostname: string, link: string
if (os.hostname().split('.').pop() === 'local') {
  hostname = '127.0.0.1', link = process.env.NGROK!
} else { hostname = '0.0.0.0', link = 'https://framedaddy-backend.onrender.com' }
const PORT = Number(process.env.PORT)
app.listen(PORT, hostname, () => { console.log(`server at - http://${hostname}:${PORT}/`) })
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan('dev'))

const sendblue = new Sendblue(process.env.SENDBLUE_API_KEY!, process.env.SENDBLUE_API_SECRET!)
const coda = new Coda(process.env.CODA_API_KEY!)
const configuration = new Configuration({ organization: process.env.OPENAI_ORGANIZATION, apiKey: process.env.OPENAI_API_KEY })
const openai = new OpenAIApi(configuration)
// const shopify = shopifyApi({
//   apiKey: process.env.SHOPIFY_API_KEY!, apiSecretKey: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!, apiVersion: LATEST_API_VERSION, isCustomStoreApp: true, scopes: ['read_products', 'read_orders', 'read_customers', 'read_order_edits',], isEmbeddedApp: true, hostName: hostname,
// })
// const session = shopify.session.customAppSession(process.env.SHOPIFY_SHOP_LINK!)
// const client = new shopify.clients.Graphql({ session })

// ========================================================================================
// ========================================VARIABLES=======================================
// ========================================================================================

const admin_numbers = ['+13104974985', '+19165919394', '+19498702865']    // Ian, Adam, Corn
const coda_doc = 'Wkshedo2Sb', coda_table = 'grid-_v0sM6s7e1'
// const Coda_messages_table = coda.getTable(coda_doc, coda_table)
let send_style_options = new Set(["celebration", "shooting_star", "fireworks", "lasers", "love", "confetti", "balloons", "spotlight", "echo", "invisible", "gentle", "loud", "slam"])

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
  number: string;
  was_downgraded?: boolean;
  tokens?: number;
  send_style?: string;
  message_type?: string;
  group_id?: string;
}

// ======================================================================================
// ========================================ROUTES========================================
// ======================================================================================

app.post('/fdorder', async (req: express.Request, res: express.Response) => {
  try {
    const t0 = Date.now()
    const customer: Customer = { name: req.body.customer.first_name, email: req.body.customer.email, phone: e164(req.body.shipping_address.phone).phoneNumber!, order_number: req.body.order_number }
    res.status(200).end()

    await send_message({ content: `you've been framed 😎 here's your order status (#${req.body.order_number}) ${req.body.order_status_url}`, number: customer.phone })
    await send_message({ content: "don’t forget to save my contact card for easy ordering", number: customer.phone })

    console.log(`${Date.now() - t0}ms - /fdorder`)
  } catch (e) { res.status(500).end(); error_alert(e) }
})

app.post('/fdshipped', async (req: express.Request, res: express.Response) => {
  // ? do we need this
})

app.post('/message', (req: express.Request, res: express.Response) => {
  try {
    const t0 = Date.now()
    const message: Message = { content: req.body.content, media_url: req.body.media_url, number: req.body.number, was_downgraded: req.body.was_downgraded, is_outbound: false, date: req.body.date_sent }
    res.status(200).end()

    analyze_message(message)

    console.log(`${Date.now() - t0}ms - /message: (${message.number}) ${message.content}`)
  } catch (e) { res.status(500).end(); error_alert(e) }
})
app.post('/message-status', (req: express.Request, res: express.Response) => {
  try {
    const t0 = Date.now()
    const message_status = req.body
    res.status(200).end()
    console.log(`${Date.now() - t0}ms - /message-status`)
  } catch (e) { res.status(500).end(); error_alert(e) }
})

// ======================================================================================
// ========================================TESTING=======================================
// ======================================================================================

let abe = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg'

let test_message: Message = { content: 'test_message', media_url: abe, number: '+13104974985', date: new Date() }

let users: string[]
local_data()
async function local_data() {
  try {
    const t0 = Date.now()

    const Coda_doc = await coda.getDoc(coda_doc), Coda_users_table = await Coda_doc.getTable('grid-VBi-mmgrKi')
    const columns = await Coda_users_table.listColumns(null)
    const rows = await Coda_users_table.listRows({
      useColumnNames: true, // param to display column names rather than key
    })
    users = rows.map((row) => (((row as { values: Object }).values) as { phone: string }).phone)
    console.log(users)
    /* let add_message = await Coda_messages_table.insertRows([
      { content: message.content, picture: message.media_url, phone: message.number, "received (PST)": message.date }
    ]) */
    // console.log(JSON.stringify(add_message))
    console.log(`${Date.now() - t0}ms - local_data`)
  } catch (e) { console.log(e) }
}

// Shopify product info
let Sunday_products: number[]
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

const job = new cron.CronJob('0 0 */1 * *', async () => {
  local_data()
  await send_message({ content: `FrameDaddy CRON run`, number: '+13104974985' })
})
job.start()

async function analyze_message(message: Message) {
  add_row(message)
  if (!users.includes(message.number!)) {  // check for new user
    console.log('new user')
    await send_message({ content: `hey I'm TextFrameDaddy.com! the easiest way to put a 5x7 photo in a frame. this is an AI chatbot so feel free to speak naturally. my capabilities are limited now but I'm always adding more! add my contact below`, number: message.number!, media_url: 'http://message.textframedaddy.com/assets/FrameDaddy.vcf' })
    await send_message({ content: 'send a photo to get started!', number: message.number! })
    return
  }

  users.push(message.number!)
  console.log('existing user')
  if (message.media_url) {
    console.log('media message')

    // ? unsure if we still need this
    if (message.media_url.includes('heic')) {
      await send_message({ content: `looks like your photo's in the ☁️, follow the video below to save it to your phone and then resend. if that doesn't work use this converter! https://www.freeconvert.com/heic-to-jpg`, number: message.number!, media_url: 'http://message.textframedaddy.com/assets/heic_photo.mov' })
    } else {
      const layered_image = await layerImage(message, message.media_url)

      await send_message({ content: `here ya go ${layered_image}`, number: message.number!, media_url: layered_image! })
      await send_message({ content: `white or black? how many? (e.g., "1 black 1 white")`, number: message.number! })
    }
  }

  if (!message.content) { return }

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

  const category = async () => {
    try {
      const category = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: `Categorize the following text into one of the following: ["help", "order quantity"]\nText: ${message.content}\nCategory:`
      })
      return category.data.choices[0].text?.toLowerCase()
    } catch (e) { return null }
  }
  const category_lc = await category()
  console.log(`category_lc: ${category_lc}`)

  if (category_lc!.includes('order')) {
    let openAIResponse = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Extract the quantity of "black" and "white" desired from the text below. Return the quantities in the following format: <black quantities>,<white quantities>\nText: ${message.content}\nValues:`
    })
    const quantities = openAIResponse.data.choices[0].text?.toString().replace(/[^0-9,]/g, '').split(',')

    await send_message({ content: `nice choice. i’ll get this shipped out ASAP. click the link to checkout: https://textframedaddy.com/cart/43286555033836:${quantities![0]},43480829198572:${quantities![1]}`, number: message.number! })
  } else if (category_lc!.includes('help')) {
    let openAIResponse = await openai.createCompletion({
      model: 'text-davinci-003', max_tokens: 128,
      prompt: `You are a superintelligent customer support chatbot. Guide the customer along and answer any questions. You operate over text message so keep responses brief and casual. The following is a description of our product/service\n - users text a photo (portrait or landscape) they want framed to get started\n - photos are printed 5"x7" in black or white frames for $24.99\n - Adam and Alex lovingly handframe, package, and ship your photo from New York\n - frames have a wall-hook and easel-back to hang or stand up\n - if you prefer, or are having troubles with the texting service, you can upload your photo to textframedaddy.com\nIf you cannot help the customer or they want to speak to a representative, put "SUPPORT" as the response.\nThe customer has sent the following message:\n
      Text: ${message.content}\nResponse:`
    })
    await send_message({ content: openAIResponse.data.choices[0].text, number: message.number! })
  } else {
    await send_message({ content: `¿yo no comprendo 🤷‍♂️? Somebody will reach out shortly`, number: message.number! })
    await send_message({ content: `SUPPORT (${message.number})\n${message.content}`, number: message.number! })
  }
  /* else {
    send_message({ content: '¿yo no comprendo 🤷‍♂️? send a pic you want framed or ask the bot for more info. somebody from the team will reach out to.', number: message.number! })
    send_message({ content: `OTHER:\n${message.number}\n${message.content}`, number: admin_numbers.toString() })
  } */

  // send_message({ content: '\nto talk to a team member text "support" followed by your problem (include image if applicable) \n\nhow does this work?\n - text a photo you want framed\n - photos can be portrait or landscape\n - photos are 5"x7" in black or white frames for $19.99\n - Adam and Alex lovingly handframe, package, and ship your photo from New York\n - text "referral" to get your referral code & instructions \n - frames have a hook and easel back to hang or stand\n - if you prefer, you can upload your photo to textframedaddy.com', number: message.number! })

  // else if (message.content == 'reset') { content = 'reset' } // ! just for testing
}

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

  const height = metadata.data.height, width = metadata.data.width, ratio = metadata.data.width / metadata.data.height, orientation = metadata.data.orientation
  let DYNAPICTURES_UID
  const horizontalUID = '7c60ad7674', verticalUID = '8d587bae26'

  if ((width / height > 0.77 || width / height < 0.66) && (height / width > 0.77 || height / width < .66)) {
    send_message({ content: `looks like your photo's the wrong aspect ratio, follow the picture below (5:7 or 7:5 ratio) and send again`, number: message.number, media_url: 'http://message.textframedaddy.com/assets/aspect_ratio_tutorial.png' })
  } else if (width < height) {  // photo has been rotated
    orientation > 4 ? DYNAPICTURES_UID = horizontalUID : DYNAPICTURES_UID = verticalUID
  } else { orientation > 4 ? DYNAPICTURES_UID = verticalUID : DYNAPICTURES_UID = horizontalUID }

  // layer image with Dynapictures
  axios.post(`https://api.dynapictures.com/designs/${DYNAPICTURES_UID}`, { params: [{ url: abe }] }, { headers: { 'Authorization': `Bearer ${process.env.DYNAPICTURES_API_KEY}`, 'Content-Type': 'application/json' } })
    .then(response => {
      console.log(response.data)
      return response.data.url
    })
    .catch(error => { console.error(error) })
}

async function send_message(message: Message, test?: boolean) {
  const t0 = Date.now()
  message.date = new Date(), message.is_outbound = true
  await sendblue.sendMessage({ content: message.content, number: message.number!, send_style: message.send_style, media_url: message.media_url, status_callback: `${link}/message-status` })
  console.log(`${Date.now() - t0}ms - send_message: (${message.number}${message.content})`)
  await add_row(message)
}

async function add_row(message: Message) {
  try {
    const t0 = Date.now()
    if (!message) { return }
    const Coda_doc = await coda.getDoc(coda_doc), Coda_messages_table = await Coda_doc.getTable(coda_table)   // const Coda_messages_table = await coda.getTable('O7d9JvX0GY', 'grid-_14oaR8gdM')
    const columns = await Coda_messages_table.listColumns(null)
    // console.log(columns.map((column) => (column as {name: string}).name))

    let add_message = await Coda_messages_table.insertRows([
      { content: message.content, picture: message.media_url, phone: message.number, "received (PST)": message.date }
    ])
    // console.log(JSON.stringify(add_message))
    console.log(`${Date.now() - t0}ms - add_row`)
  } catch (e) { console.log(e) }
}

async function error_alert(error: any, message?: Message) {
  // await send_message({ content: `ERROR: ${error}`, number: admin_numbers.toString() })

  console.error(`ERROR: ${error}`)
}