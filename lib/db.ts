import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

const sql = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
})

export default sql
