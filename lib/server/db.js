import { MongoClient } from 'mongodb'

let client
let db

export async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
  }
  if (!db) {
    db = client.db(process.env.DB_NAME || 'trustdraft')
  }
  return db
}
