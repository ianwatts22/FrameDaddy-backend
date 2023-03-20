# FrameDaddy backend

[Render deploy webhook](https://api.render.com/deploy/srv-cfpfk314rebfdasmn1sg?key=gM1Gr7s4HAI)

## ChatGPT description

Project: AI chatbot you can text to order framed photos. The first ever text initiates a conversation, which introduces itself and sends directions. They send the image they want framed, which is cropped and layered with a photo to show what it would look like framed. They are then asked how many they want and sent a Shopify checkout link accordingly. There are a few other commands like "help" and "cancel" that are also supported.
Technology: Node.js app using Express and Axios, Sendblue API for texting, Coda for database, Shopify for purchasing, Cloudinary for photo store, layering, and editing.

## tools

[Dynapictures](https://dynapictures.com/docs/#introduction)

EXIF

- ratio<1=normal, orientation<4 = landscape (1=left, 3=right), >4=portrait (6=up, 8=down)
- reg horz: rat = 1.33, ornt = 1/3 | rotated vert: rat = 1.33, ornt = 1/3 reg vert: rat = 0.75, ornt = 6/8

## Cloudinary

[transformations on upload](https://console.cloudinary.com/documentation/transformations_on_upload#incoming_transformations)
[Media Upload](https://console.cloudinary.com/settings/c-a626d863a6b6cac846592d54297f3b/upload_presets/4f9bfd573e14398d2b96b897b10815c6/edit?page=upload)
[collage](https://cloudinary.com/documentation/image_collage_generation)
[Postman for collage](https://www.postman.com/cloudinaryteam/workspace/programmable-media/folder/16080251-0dbbd35d-7dfa-4056-8796-7bcdb59eb785?ctx=documentation)

### internal interface

[Coda API](https://coda.io/@oleg/getting-started-guide-coda-api/start-here-5)

- [docs](https://coda.io/developers/apis/v1)
- [coda-js](https://www.npmjs.com/package/coda-js)