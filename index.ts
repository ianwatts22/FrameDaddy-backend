require('dotenv').config()
import axios, { AxiosRequestConfig } from 'axios'
import express from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import e164 from 'phone'
import os from 'os'
import fs from 'fs'
import { isTooManyTries, retryAsync } from 'ts-retry'
import cron from 'cron'

import Sendblue from 'sendblue'
import { v2 as cloudinary } from 'cloudinary'
import { Configuration, OpenAIApi } from "openai"
import { Coda } from 'coda-js'
import { Client, ClientConfig } from 'pg'
import { Prisma, PrismaClient, User, Message, MessageType } from '@prisma/client'
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from "@shopify/shopify-api"
import { Table } from 'coda-js/build/models'

let hostname: string, link: string
if (os.hostname().split('.').pop() === 'local') hostname = '127.0.0.1', link = process.env.NGROK!
else hostname = '0.0.0.0', link = 'https://framedaddy-backend.onrender.com'
const PORT = Number(process.env.PORT), app = express()
app.use(express.static('public')), app.use(express.urlencoded({ extended: true })), app.use(bodyParser.json()), app.use(morgan('dev')), app.use('/assets', express.static('assets'))
app.listen(PORT, hostname, () => { console.log(`server at - http://${hostname}:${PORT}/`) })

const sendblue = new Sendblue(process.env.SENDBLUE_API_KEY!, process.env.SENDBLUE_API_SECRET!)
const coda = new Coda(process.env.CODA_API_KEY!)
const configuration = new Configuration({ organization: process.env.OPENAI_ORGANIZATION, apiKey: process.env.OPENAI_API_KEY })
const openai = new OpenAIApi(configuration)
cloudinary.config({ cloud_name: 'dpxdjc7qy', api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })

let clientConfig: ClientConfig  // need to pass ssl: true for external access
process.env.PGHOST!.includes('render') ? clientConfig = { user: process.env.PGUSER, host: process.env.PGHOST, database: process.env.PGDATABASE, password: process.env.PGPASSWORD, port: Number(process.env.PGPORT), ssl: true } : clientConfig = { user: process.env.PGUSER, host: process.env.PGHOST, database: process.env.PGDATABASE, password: process.env.PGPASSWORD, port: Number(process.env.PGPORT) }
const client = new Client(clientConfig), prisma = new PrismaClient()
client.connect()

// ========================================================================================
// ========================================VARIABLES=======================================
// ========================================================================================

enum AdminNumbers { Ian = '+13104974985', Adam = '+19165919394', Corn = '+19498702865', Lubin = '+16143019108', Boser = '+17324035224', }
const admin_numbers: string[] = Object.values(AdminNumbers)

const message_default: Message = { content: null, number: '', type: null, is_outbound: null, date: new Date(), was_downgraded: null, media_url: null, send_style: null, response_time: null }

const coda_doc_key = 'Wkshedo2Sb', coda_messages_key = 'grid-_v0sM6s7e1', coda_users_key = 'grid-VBi-mmgrKi'

let users: string[]
local_data()
async function local_data() {
  try {
    const Coda_doc = await coda.getDoc(coda_doc_key); // const Coda_tables = await Coda_doc.listTables()
    const Coda_users_table = await Coda_doc.getTable(coda_users_key)
    const Coda_user_rows = await Coda_users_table.listRows({ useColumnNames: true })
    users = Coda_user_rows.map((row: any) => (((row as { values: Object }).values) as { phone: string }).phone)
    const Coda_messages_table = await Coda_doc.getTable(coda_messages_key)
    const Coda_messages_rows = await Coda_messages_table.listRows({ useColumnNames: true })
    let messages = Coda_messages_rows.map((row: any) => (((row as { values: Object }).values) as { phone: string }).phone)
    const columns = await Coda_messages_table.listColumns(null)
    // console.log(columns.map((column) => (column as { name: string }).name))

    // =========Prisma=========
    // users = await prisma.users.findMany().then(users => users.map(user => user.number))
  } catch (e) { console.log(e) }
}

// ======================================================================================
// ========================================ROUTES========================================
// ======================================================================================

app.post('/fdorder', async (req: express.Request, res: express.Response) => {
  try {
    const user: User = { name: (req.body.customer.first_name + ' ' + req.body.customer.last_name), email: req.body.customer.email, number: e164(req.body.shipping_address.phone).phoneNumber!, order: '' }
    res.status(200).end()

    let order = req.body.line_items.map((item: any) => { order += `${item.quantity}x ${item.name}\n` })
    let message_response: Message = { ...message_default, type: 'order_placed', number: user.number }
    await send_message({ ...message_response, content: `You've been framed 😎! Here's your order info (#${req.body.order_number}) ${req.body.order_status_url}`, send_style: 'confetti' })
    await send_message({ ...message_response, content: "Don’t forget to save my contact card for quick and easy ordering" })
    log_message({ ...message_response, content: `<order_placed:\n${order}>` })

    await prisma.user.upsert({
      where: { number: user.number },
      update: { name: user.name, email: user.email, order: '' },
      create: { name: user.name, email: user.email, order: '', number: user.number }
    })
  } catch (e) { res.status(500).end(); error_alert(e) }
})

// TODO add this back, screen JSON for update==shipped?
app.post('/fdshipped', async (req: express.Request, res: express.Response) => {
  // ? do we need this
})

app.post('/message', (req: express.Request, res: express.Response) => {
  try {
    analyze_message({ ...message_default, content: req.body.content, media_url: req.body.media_url, number: req.body.number, was_downgraded: req.body.was_downgraded, is_outbound: false, date: new Date(req.body.date_sent) })
    res.status(200).end()
  } catch (e) { res.status(500).end(); error_alert(e) }
})
app.post('/message-status', (req: express.Request, res: express.Response) => {
  try { const message_status = req.body; res.status(200).end() } catch (e) { res.status(500).end(); error_alert(e) }
})

// ======================================================================================
// ========================================FUNCTIONS=====================================
// ======================================================================================

let help_prompt = fs.readFileSync('prompts/help_prompt.txt', 'utf8')

const job = new cron.CronJob('0 0 */1 * *', async () => { local_data() })
job.start()

const contact_card = `${link}/assets/FrameDaddy.vcf`
async function analyze_message(message: Message) {
  try {
    const t0 = Date.now()
    let message_response: Message = { ...message_default, number: message.number }
    // intro message
    if (!users.includes(message.number) || (admin_numbers.includes(message.number) && message.content?.toLowerCase() == 'first')) {
      const user = await prisma.user.create({ data: { name: null, email: null, order: null, number: message.number } })
      users.push(message.number)

      await send_message({ ...message_response, content: `Hey I'm TextFrameDaddy.com, the easiest way to frame a 5x7 photo for just $19.99! I'm powered by ChatGPT so feel free to speak naturally. Add my contact below.`, media_url: contact_card, type: 'intro' })
      message.media_url ? await layer_image(message, user) : await send_message({ ...message_response, content: 'Send a photo to get started!' })

      return
    }
    if (message.content?.toLowerCase().startsWith('reset')) { return }  // reset
    const user = await prisma.user.findUnique({ where: { number: message.number } })
    if (!user) { error_alert('NO USER ERROR'); return }


    if (message.media_url) { await layer_image(message, user); return }

    console.log(`${Date.now() - t0}ms - analyze_message user`)
    const previous_messages = await get_previous_messages(message, 8)

    const categories = [
      "help", "order_quantity", "customer_support",
      // "checkout", "new_order",
    ]
    const categorize = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `
      Categorize the following text into one of the following: [${categories}]. "checkout" is when for when the customer no longer wants to send photos and is checkout ou. "new_order" is when they say they want to start a new order. "customer_support" if they want to speak to a representative or you can't help them. If you are unsure, go with help. Example:
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
      ###
      Previous Messages
      ${previous_messages}
      ###
      Text: ${message.content}
      Category:`
    })
    const category = categorize.data.choices[0].text?.replace(/\s+/g, "")

    console.log(`${Date.now() - t0}ms - /analyze_message - categorize (${category})`)

    // cateogrization error
    if (!category || !categories.includes(category)) {
      error_alert(` ! miscategorization (${message.number}): '${message.content}'\ncategory: ${category}`, message)
      await send_message({ ...message_response, content: `Sorry bugged out. Try again, your message has been sent to support to fix the bug.` })
      return
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

    if (category == 'order_quantity') {
      let openAIResponse = await openai.createCompletion({
        model: 'text-davinci-003', temperature: 0.5, max_tokens: 256,
        prompt: `A customer is ordering one or more framed photo. Extract the quantity of black and white frames desired from their message. Return the quantities in the following format: <black quantities>,<white quantities>
        Examples:
        Text: I'll take both
        Values: 1,1
        ###
        Current Order:
        Message: ${message.content}
        Values:`
      })
      // remove blank space from response, split into array
      const quantities = openAIResponse.data.choices[0].text?.toString().replace(/[^0-9,]/g, '').split(',')

      await send_message({ ...message_response, content: `Nice choice, I’ll get this shipped out ASAP. Click the link to checkout: https://textframedaddy.com/cart/43286555033836:${quantities![0]},43480829198572:${quantities![1]}` })
    } else if (category == 'help') {
      let prompt = `${help_prompt}\n###${previous_messages}\nCustomer: ${message.content}FrameDaddy:`, content, media_url

      let openAIResponse: any = await openai.createCompletion({ max_tokens: 512, model: 'text-davinci-003', prompt: prompt, temperature: .5, presence_penalty: 0.7, frequency_penalty: 0.7, })
      openAIResponse = openAIResponse.data.choices[0].text
      if (openAIResponse.includes('media_url')) content = openAIResponse.split('media_url:')[0], media_url = openAIResponse.split('media_url:')[1]
      else content = openAIResponse

      console.log(prompt + content)

      await send_message({ ...message_response, content: content, media_url: media_url })
    } else if (category == 'new_order') {
      await send_message({ ...message_response, content: `starting a new order.` })
      await log_message(message)
      message.date?.setSeconds(message.date.getSeconds() - 1)
      log_message({ ...message_response, content: 'new_order', number: message.number, date: message.date, type: 'new_order' })
    } else if (category == 'customer_support') {
      send_message({ ...message_response, content: `Connecting you with a human, sorry for the trouble.`, type: category })
      sendblue.sendGroupMessage({ content: `SUPPORT (${message.number}\n${message.content}`, numbers: admin_numbers })
    } else if (category == 'checkout') {

      if (!user.order) { return }
      const order = user.order.replace(/[^0-9,]/g, '').split('&&')
      const links = order.map((order: string) => order.split('|')[0]), quantities = order.map((order: string) => order.split('|')[1])
      const black_quantities = order.map((quantities: string) => quantities.split(',')[0])
      const white_quantities = order.map((quantities: string) => quantities.split(',')[1])
    }
    await log_message(message)
  } catch (e) { error_alert(e) }
}

const message_date_format: object = { weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: true }
async function get_previous_messages(message: Message, amount: number = 14) {
  let reset_message = new Date()
  try {
    const reset_message_loc = await prisma.message.findFirstOrThrow({
      where: {
        number: message.number, OR: [
          { content: { startsWith: 'reset', mode: 'insensitive' } },
          { type: { equals: MessageType.order_placed } },
          { type: { equals: MessageType.new_order } }
        ]
      }, orderBy: { date: 'desc' }
    })  // TODO not ideal cuz parses EVERY message from that number lol
    reset_message = reset_message_loc.date
  } catch { reset_message.setDate(new Date().getDate() - 30) }

  const previous_messages = await prisma.message.findMany({
    where: { number: message.number, date: { gt: reset_message } }, orderBy: { date: 'desc' }, take: amount
  })
  // let previous_messages_string = previous_messages.map((message) => { return `\n[${message.date?.toLocaleString('en-US', message_date_format)}] ${message.is_outbound ? 'FrameDaddy:' : 'Human:'} ${message.content}` }).reverse().join('')
  const ignore_content_types: MessageType[] = [MessageType.new_order, MessageType.order_placed, MessageType.customer_support]
  let previous_messages_string = previous_messages.map((message) => { return `\n${message.is_outbound ? 'FrameDaddy:' : 'Human:'} ${(message.type != null && ignore_content_types.includes(message.type)) ? `<${message.type}>` : message.content}` }).reverse().join('')
  return previous_messages_string
}

// sendblue.sendGroupMessage({ content: `testing Sendblue group message`, numbers: admin_numbers })

async function layer_image(message: Message, user: User) {
  const t0 = Date.now()

  let public_id = `${message.number.substring(2)}_${message.date?.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[:,]/g, '').replace(/[/\s]/g, '-')}`
  console.log(public_id)  // ex: '3104974985_10-20-21_18-00-00'
  try {
    let data: any = await cloudinary.uploader.upload(message.media_url!, {
      public_id: public_id, folder: '/FrameDaddy/submissions',
      fetch_format: "jpg", exif: true, // colors: true, media_metadata: true // ! 'exif' supposed to be deprecated for 'media_metadata', which isn't working
      /* [
        { if: "ar_lt_1.0" },
        { background: "auto", height: 300, width: 500, crop: "pad" },
        { if: "end" }
      ] */
    })
    let message_response: Message = { ...message_default, number: user.number, type: MessageType.layered_image }
    await log_message({ ...message, media_url: data.url })

    let orientation = data.exif.Orientation, width = data.width, height = data.height, ratio = data.width / data.height, path = `v${data.version}:${data.public_id.replace(/\//g, ':')}.${data.format}`
    console.log(`path: ${path}`)

    if ((0.76 < ratio || ratio < 0.67) && (0.76 < 1 / ratio || 1 / ratio < .67)) {
      // TODO add a crop
      await send_message({ ...message_response, content: `Looks like your photo's the wrong aspect ratio, follow the picture below (5:7 or 7:5 ratio) and send again.`, media_url: `${link}/assets/aspect_ratio_tutorial.png` })
    } else {
      let setup, background_crop, ar, distort  // distort = [left, right]
      if (ratio < 1) setup = 'vertical', background_crop = [4930, 3849], ar = '5:7', distort = ['1216:2054:2158:2138:2052:3482:1055:3316', '2957:2125:3881:2021:4119:3310:3158:3484']
      else setup = 'horizontal', background_crop = [2896, 2172], ar = '7:5', distort = ['285:534:918:534:913:1008:284:1010', '1926:517:2592:510:2593:1001:1927:1004']

      const image = `https://res.cloudinary.com/dpxdjc7qy/image/upload/q_60/u_${path}/e_distort:${distort[0]}/fl_layer_apply,g_north_west,x_0,y_0/u_${path}/e_distort:${distort[1]}/fl_layer_apply,g_north_west/c_crop,g_north_west,w_${background_crop[0]},h_${background_crop[1]}/FrameDaddy/assets/double_${setup}.jpg`

      // const image = `https://res.cloudinary.com/dpxdjc7qy/image/upload/q_60/u_${path}/c_fill,g_auto,ar_${ar}/e_distort:${distort[0]}/fl_layer_apply,g_north_west,x_0,y_0/u_${path}/c_fill,g_auto,ar_${ar}/e_distort:${distort[1]}/fl_layer_apply,g_north_west,x_0,y_0/c_crop,g_north_west,h_${background_crop[1]},w_${background_crop[0]}//FrameDaddy/assets/double_${setup}.jpg`
      console.log(`image: ${image}`)

      await send_message({ ...message_response, media_url: image })
      send_message({ ...message_response, content: `How many of each color frame do you want?` })
      if (user.order == '') send_message({ ...message_response, content: `If you want more photos framed keep em coming, otherwise let me know when you want to checkout` })

      const image_mod = await cloudinary.image(public_id, { gravity: "auto", aspect_ratio: ar, crop: "fill" })
      console.log(`image_mod: ${image_mod}`)
    }
    console.log(`${Date.now() - t0}ms - cloudinary_edit`)
  } catch (e) { error_alert(e) }
}

async function send_message(message?: Message) {
  try {
    const t0 = Date.now()
    if (message) {
      message.date = new Date(), message.is_outbound = true
      if (message.response_time) message.response_time = (new Date().valueOf() - message.response_time.valueOf()) / 1000
      await sendblue.sendMessage({ content: message.content ? message.content : undefined, number: message.number, send_style: message.send_style ? message.send_style : undefined, media_url: message.media_url ? message.media_url : undefined, status_callback: `${link}/message-status` })

      console.log(`${message.response_time}s - send_message: (${message.number}) ${message.content} (${message.media_url})`)
      await log_message(message)
    }
  } catch (e) { error_alert(e) }
}

async function log_message(message: Message) {
  try {
    await prisma.message.create({ data: message })
    const Coda_doc = await coda.getDoc(coda_doc_key)
    const Coda_messages_table = await Coda_doc.getTable(coda_messages_key)

  // 'content',      'picture',
  // 'received_PST', 'number',
  // 'customer',     'Row ID',
  // 'total',        'referral',
  // 'test',         'media_url',
  // 'is_outbound'

    await Coda_messages_table.insertRows([{ content: message.content ? message.content : undefined, picture: message.media_url ? message.media_url : undefined, media_url: message.media_url ? message.media_url : undefined, number: message.number, received_PST: message.date,is_outbound: message.is_outbound ? message.is_outbound : undefined }])
  } catch (e) { console.log(e) }
}

async function error_alert(error: any, message?: Message) { await send_message({ ...message_default, content: `ERROR\n${error}`, number: AdminNumbers.Ian }); console.error(`ERROR: ${error}`) }

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

const abe = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg', sample_vertical = 'https://storage.googleapis.com/inbound-file-store/47yEEPvo_61175D25-640A-4EA4-A3A1-608BBBBD76DDIMG_2914.heic', sample_horizontal = 'https://storage.googleapis.com/inbound-file-store/1Nq7Sytl_01C13E5D-6496-4979-A236-EC2945A10D47.heic'
let test_message: Message = { ...message_default, content: 'test_message', number: '+13104974985', date: new Date(), media_url: sample_vertical }

// test(test_message)
async function test(message: Message, user?: User) {
  // const message_default_coda = { content: undefined, number: '', type: undefined, is_outbound: undefined, date: new Date(), was_downgraded: undefined, media_url: undefined, send_style: undefined, response_time: undefined }

  const Coda_doc = await coda.getDoc(coda_doc_key)
  const Coda_messages_table = await Coda_doc.getTable(coda_messages_key)
  // await Coda_messages_table.insertRows([{ content: message.content, picture: message.media_url, media_url: message.media_url, number: message.number, received_PST: message.date, is_outbound: message.is_outbound }])

  const coda_message = await Coda_messages_table.insertRows([{ content: undefined, picture: undefined, media_url: undefined, number: undefined, received_PST: new Date(), is_outbound: undefined }])


  // 'content',      'picture',
  // 'received_PST', 'phone',
  // 'UUID',         'customer',
  // 'media',     
  // 'referral',     'test',
  // 'picture_url',  'is_outbound'
  // console.log(`coda_message: ${coda_message}`)
}