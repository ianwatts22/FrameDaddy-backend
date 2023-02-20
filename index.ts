import Sendblue from 'sendblue'
import axios from 'axios'
import express from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import cloudinary from 'cloudinary'

const app = express()
const sendblue = new Sendblue(process.env.SENDBLUE_API_KEY!, process.env.SENDBLUE_API_SECRET!)
const sendblue_test = new Sendblue(process.env.SENDBLUE_TEST_API_KEY!, process.env.SENDBLUE_TEST_API_SECRET!)

const admin_numbers = ['+13104974985', '+19165919394', '+19498702865']    // Ian, Adam, Corn

// Configure hostname & port
const hostname = '127.0.0.1';
const PORT = Number(process.env.PORT) || 8000
app.listen(PORT, hostname, () => { console.log(`Server running at http://${hostname}:${PORT}/`) });

// middleware & static files, comes with express
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan('dev'))

// ========================================DATABASE========================================

// * USER
interface User {
  id?: number
  number: string
  name?: string
  gender?: string
  sexual?: string[]
  birthdate?: Date
  location?: string
  bio?: string
  subscription?: string
  // email?: string
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

// ======================================================================================
// ========================================TESTING=======================================
// ======================================================================================



// ======================================================================================
// ========================================ROUTES========================================
// ======================================================================================

app.post('/fdorder', async (req: express.Request, res: express.Response) => {
  const items = req.body.line_items
  console.log(req.body)
  console.log(new Date().toLocaleTimeString())

  const customer: Customer = { name: req.body.customer.first_name, email: req.body.customer.email, phone: e164(req.body.shipping_address.phone).phoneNumber!, order_number: req.body.order_number }
  
  send_message({ content: "don’t forget to save my contact card for easy ordering", number: customer.phone })
  res.status(200).end()
})

app.post('/message', (req: express.Request, res: express.Response) => {
  const message: Message = { content: req.body.content, media_url: req.body.media_url, number: req.body.number, was_downgraded: req.body.was_downgraded, is_outbound: false, date: req.body.date_sent, group_id: req.body.group_id }
  if (req.body.error_code) { send_message({ content: `ERROR: ${req.body.error_code} ${req.body.error_message}`, number: admin_numbers.toString() }) }


  analyze_message(message, req.body.accountEmail)

  res.status(200).end()
  console.log('message received ' + message.number + ': ' + message.content)
});

async function send_message(message: Message, test?: boolean) {
  // console.log(` ! message to ${message.number}: ${message.content}`)
  message.date = new Date()
  message.is_outbound = true
  let response
  if (test) {
    response = await sendblue_test.sendMessage({ content: message.content, number: message.number!, send_style: message.send_style, media_url: message.media_url })
  } else {
    response = await sendblue.sendMessage({ content: message.content, number: message.number!, send_style: message.send_style, media_url: message.media_url }) // ! do we need status_callback? 
  }
}

// ==========================ANALYZE MESSAGE=========================



async function analyze_message(message: Message, accountEmail: string) {

}

let send_style_options = new Set(["celebration", "shooting_star", "fireworks", "lasers", "love", "confetti", "balloons", "spotlight", "echo", "invisible", "gentle", "loud", "slam"])


async function layerImage(media_url: string) {
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

  let DYNAPICTURES_UID = "1716a84db6"
  axios.post(`https://api.dynapictures.com/designs/${DYNAPICTURES_UID}`, data, config)
    .then(response => { console.log(response.data) })
    .catch(error => { console.error(error) })
}

// https://rapidapi.com/mallabe1/api/mallabe
async function getMetadata(image: string) {
  const options = {
    method: 'POST',
    url: 'https://mallabe.p.rapidapi.com/v1/images/metadata',
    headers: {
      'content-type': 'application/json',
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': process.env.MALLABE_API_KEY,
      'X-RapidAPI-Host': 'mallabe.p.rapidapi.com'
    },
    data: `{"url": ${image} }`
  }

  await axios.request(options)
    .then(function(response) {
      console.log(response.data)
      return
    }).catch(function(error) {
      console.error(error);
    });
}

// ====================================TESTING==================================
