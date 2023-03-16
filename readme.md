# FrameDaddy backend

[Render deploy webhook](https://api.render.com/deploy/srv-cfpfk314rebfdasmn1sg?key=gM1Gr7s4HAI)

## ChatGPT description

Project: chatbot that you can text to order framed photos. Somebody texts the phone number which initiates the conversation. They send the image they want framed, which is then cropped and layered with a photo to show what it would look like framed. They are then asked how many they want and sent a Shopify checkout link accordingly. There are a few other commands like "help" and "cancel" that are also supported.
Technology: Node.js app using Express and Axios, Sendblue API for texting, Coda for database, Shopify for purchasing, Dynapictures for photo layering.

## tools

[Dynapictures](https://dynapictures.com/docs/#introduction)

### image metadata

[Mallabe RapidAPI](https://rapidapi.com/mallabe1/api/mallabe): check how fast it's taking
[getting image metadata using Node.js](https://techsparx.com/nodejs/graphics/image-metadata.html)
[nodejs read image data](https://stackoverflow.com/questions/11357239/nodejs-read-image-data)
[node-exif](https://github.com/gomfunkel/node-exif)
image size: [StackOverflow](https://stackoverflow.com/questions/48889903/get-image-dimensions-in-zapier-with-javascript)

* [image orientation](https://eorvain-app.medium.com/image-orientation-on-ios-abaf8321820b)

### internal interface

[Coda API](https://coda.io/@oleg/getting-started-guide-coda-api/start-here-5)

* [docs](https://coda.io/developers/apis/v1)
* [coda-js](https://www.npmjs.com/package/coda-js)

### Sendblue

sendstyle: "celebration", "shooting_star", "fireworks", "lasers", "love", "confetti", "balloons", "spotlight", "echo", "invisible", "gentle", "loud", "slam"