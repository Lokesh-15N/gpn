import mongoose from "mongoose";

const connectDB = async () => {

    mongoose.connection.on('connected', () => console.log("Database Connected"))

    mongoose.connection.on('error', (err) => {
        console.error("Database Connection Error:", err.message)
    })

    mongoose.connection.on('disconnected', () => {
        console.log("Database Disconnected - Retrying...")
        setTimeout(() => connectDB(), 5000)
    })

    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
    })

}

export default connectDB;
