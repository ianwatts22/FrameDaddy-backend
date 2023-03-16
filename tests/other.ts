
async function cloudinary() {
  // cloudinary.image("v1677563149/FrameDaddy/vertical_template.png", {effect: "distort:150:340:1500:10:1500:1550:50:1000"}, 'v1677563149/FrameDaddy/vertical_template.png', {})  // ! not sure how to pass in two jawns
}

/* async function log_message(message: Message) {
  const t0 = Date.now()
  if (!message) { return }
  const Coda_doc = await coda.getDoc(coda_doc), Coda_messages_table = await Coda_doc.getTable(coda_table)   // const Coda_messages_table = await coda.getTable('O7d9JvX0GY', 'grid-_14oaR8gdM')
  const columns = await Coda_messages_table.listColumns(null)
  // console.log(columns.map((column) => (column as {name: string}).name))
} */

/* async function layer_image(message: Message) {
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
} */