import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

const sql = postgres(connectionString, {
  ssl: false,
  max: 10,
})

export default sql
