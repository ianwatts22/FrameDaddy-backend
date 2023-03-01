require('dotenv').config()
import Sendblue from 'sendblue'
import axios from 'axios'
import express from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import { v2 as cloudinary } from 'cloudinary'
import e164 from 'phone'
import { Configuration, OpenAIApi } from "openai"
import { Coda } from 'coda-js'
import os from 'os'
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
cloudinary.config({ cloud_name: 'dpxdjc7qy', api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })

// const shopify = shopifyApi({
//   apiKey: process.env.SHOPIFY_API_KEY!, apiSecretKey: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!, apiVersion: LATEST_API_VERSION, isCustomStoreApp: true, scopes: ['read_products', 'read_orders', 'read_customers', 'read_order_edits',], isEmbeddedApp: true, hostName: hostname,
// })
// const session = shopify.session.customAppSession(process.env.SHOPIFY_SHOP_LINK!)
// const client = new shopify.clients.Graphql({ session })

// ========================================================================================
// ========================================VARIABLES=======================================
// ========================================================================================

// TODO: setup group message
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
    send_message({content: `we're temporarily down as we implement AI and improved responses. we'll be back ASAP and let you know when we're back up. thanks for your patience!`, number: message.number })
    send_message({content: `message: ${message.number}`, number: '+13104974985' })
    return

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
let sample_photo = 'https://storage.googleapis.com/inbound-file-store/47yEEPvo_61175D25-640A-4EA4-A3A1-608BBBBD76DDIMG_2914.heic'

let test_message: Message = {
  content: 'test_message',
  media_url: sample_photo,
  // media_url: abe,
  number: '+13104974985', date: new Date()
}

test()
async function test() {
  // console.log(await layer_image(test_message))
  console.log(await cloudinary_edit(test_message))
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

let users: string[]
local_data()
async function local_data() {
  try {
    const t0 = Date.now()

    const Coda_doc = await coda.getDoc(coda_doc), Coda_users_table = await Coda_doc.getTable('grid-VBi-mmgrKi')
    const Coda_user_rows = await Coda_users_table.listRows({ useColumnNames: true })
    users = Coda_user_rows.map((row) => (((row as { values: Object }).values) as { phone: string }).phone)
    console.log(`${Date.now() - t0}ms - local_data - users: ${users.length}`)
  } catch (e) { console.log(e) }
}

const job = new cron.CronJob('0 0 */1 * *', async () => {
  local_data()
  await send_message({ content: `FrameDaddy CRON run`, number: '+13104974985' })
})
job.start()

async function analyze_message(message: Message) {
  const t0 = Date.now()
  add_row(message)
  if (!users.includes(message.number!)) {  // check for new user
    console.log('new user')
    await send_message({ content: `hey I'm TextFrameDaddy.com! the easiest way to put a 5x7 photo in a frame. this is an AI chatbot so feel free to speak naturally. my capabilities are limited now but I'm always adding more! add my contact below`, number: message.number!, media_url: 'http://message.textframedaddy.com/assets/FrameDaddy.vcf' })
    await send_message({ content: 'send a photo to get started!', number: message.number! })
    users.push(message.number!)
    return
  }
  console.log('existing user')

  if (message.media_url) {
    console.log('media message')
    const layered_image = await cloudinary_edit(message)
  }
  if (!message.content) { return }

  const categorize = async () => {
    try {
      const category = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: `Categorize the following text into one of the following: ["help", "order quantity"]\nText: ${message.content}\nCategory:`
      })
      return category.data.choices[0].text?.toLowerCase()
    } catch (e) { return null }
  }

  const category = await categorize()
  console.log(`category_lc: ${category}`)
  if (!category || (!category.includes('order') && !category.includes('order'))) {
    error_alert(` ! miscategorization (${message.number}): '${message.content}'\ncategory: ${category}`, message)
    await send_message({ content: `¿yo no comprendo 🤷‍♂️? Somebody will reach out shortly`, number: message.number })
    return
  }

  // TODO implement retry feature if response isn't one of two?
  /* try {
    await retryAsync( async () => {
  
      }, { delay: 100, maxTry: 3, } )
  } catch (err) {
    if (isTooManyTries(err)) { error_alert(err)
    } else { error_alert(err) }
  } */

  if (category.includes('order')) {
    let openAIResponse = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Extract the quantity of "black" and "white" desired from the text below. Return the quantities in the following format: <black quantities>,<white quantities>\nText: ${message.content}\nValues:`
    })
    // remove blank space from response, split into array
    const quantities = openAIResponse.data.choices[0].text?.toString().replace(/[^0-9,]/g, '').split(',')
    
    // TODO: check if quantities are valid
    await send_message({ content: `nice choice. i’ll get this shipped out ASAP. click the link to checkout: https://textframedaddy.com/cart/43286555033836:${quantities![0]},43480829198572:${quantities![1]}`, number: message.number })
  } else if (category.includes('help')) {
    let openAIResponse = await openai.createCompletion({
      model: 'text-davinci-003', max_tokens: 128,
      prompt: `You are a superintelligent customer support chatbot. Guide the customer along and answer any questions. You operate over text message so keep responses brief and casual. The following is a description of our product/service\n - users text a photo (portrait or landscape) they want framed to get started\n - photos are printed 5"x7" in black or white frames for $24.99\n - Adam and Alex lovingly handframe, package, and ship your photo from New York\n - frames have a wall-hook and easel-back to hang or stand up\n - if you prefer, or are having troubles with the texting service, you can upload your photo to textframedaddy.com\nIf you cannot help the customer or they want to speak to a representative, put "SUPPORT" as the response.\nThe customer has sent the following message:\n
      Text: ${message.content}\nResponse:`
    })
    await send_message({ content: openAIResponse.data.choices[0].text, number: message.number! })
  }
}

async function cloudinary_edit(message: Message, entryID?: string) {
  const t0 = Date.now()
  console.log(` ! cloudinary_edit called`)
  let public_id = `${message.number.substring(1)}_${message.date?.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[:,]/g, '').replace(/[/\s]/g, '-')}`
  console.log(public_id)
  try {
    let data: any = await cloudinary.uploader.upload(message.media_url!, {
      public_id: public_id, folder: '/FrameDaddy/submissions',   // colors: true, // TODO can add more humor here
      exif: true, // media_metadata: true, // ! 'exif' supposed to be deprecated for 'media_metadata', which isn't working
    })

    // ratio<1=normal, orientation<4 = landscape (1=left, 3=right), >4=portrait (6=up, 8=down)
    let orientation = data.exif.Orientation, width = data.width, height = data.height, ratio = data.width / data.height, image: string, path = `u_v${data.version}:${data.public_id.replace(/\//g, ':')}.${data.format}`
    console.log(`path: ${path}`)
    
    // return

    if ((ratio > 0.77 || ratio < 0.66) && (1 / ratio > 0.77 || 1 / ratio < .66)) {
      await send_message({ content: `looks like your photo's the wrong aspect ratio, follow the picture below (5:7 or 7:5 ratio) and send again`, number: message.number, media_url: 'http://message.textframedaddy.com/assets/aspect_ratio_tutorial.png' })
    } else {
      if ((ratio < 1 && orientation > 4) || (ratio > 1 && orientation < 4)) {  // vertical
        image = `https://res.cloudinary.com/dpxdjc7qy/image/upload/l_v1677563168:FrameDaddy:assets:double_vertical.png/fl_layer_apply,g_north_west/${path}/e_distort:362:680:1169:680:1162:1283:361:1285/fl_layer_apply,g_north_west,x_0,y_0/${path}/e_distort:2451:658:3300:649:3301:1274:2452:1277/fl_layer_apply,g_north_west/cld-sample.jpg`
      } else {  // horizontal ((ratio < 1 && orientation < 4) || (ratio > 1 && orientation > 4))
        image = `https://res.cloudinary.com/dpxdjc7qy/image/upload/l_v1677563168:FrameDaddy:assets:double_horizontal.png/fl_layer_apply,g_north_west/${path}/e_distort:1216:2054:2158:2138:2052:3482:1055:3316/fl_layer_apply,g_north_west,x_0,y_0/${path}/e_distort:2957:2125:3881:2021:4119:3310:3158:3484/fl_layer_apply,g_north_west/cld-sample.jpg`
      }
      console.log(`image: ${image}`)
      await send_message({ content: `here ya go`, media_url: image, number: message.number })
      send_message({ content: `how many of each frame do you want?`, number: message.number! })
    }
    setTimeout(async () => {

    }, 10000)
    console.log(`${Date.now() - t0}ms - cloudinary_edit`)
  } catch (error) { error_alert(error) }
}

async function send_message(message: Message, test?: boolean) {
  const t0 = Date.now()
  message.date = new Date(), message.is_outbound = true
  await sendblue.sendMessage({ content: message.content, number: message.number!, send_style: message.send_style, media_url: message.media_url, status_callback: `${link}/message-status` })
  console.log(`${Date.now() - t0}ms - send_message: (${message.number}) ${message.content}`)
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
  await send_message({ content: `ERROR\n${error}`, number: '+13104974985' })
  console.error(`ERROR: ${error}`)
}