/* interface User {
  number: string
  name?: string
  email?: string
  order?: string
} */

interface Message {
  // id: number;  // ? need this
  content?: string
  media_url?: string
  is_outbound?: boolean
  date?: Date
  number: string
  was_downgraded?: boolean
  tokens?: number
  send_style?: string
  message_type?: string
  group_id?: string
  // our data
  response_time?: number
  type?: string
}

interface Order {
  id: number
  order: string
  number: string
  customer_id: number
  date: Date
  total: number
}

/* interface Photo {
  number: string
  description?: string
  cloudinary_link?: string
  cloudinary_path?: string
  sendblue_link: string
  date: Date
  ordered?: boolean
} */