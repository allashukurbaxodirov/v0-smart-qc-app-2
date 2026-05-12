import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
})

export default sql
