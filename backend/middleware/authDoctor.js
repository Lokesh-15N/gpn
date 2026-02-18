import jwt from 'jsonwebtoken'

// doctor authentication middleware
const authDoctor = async (req, res, next) => {
    const { dtoken, dToken } = req.headers
    const token = dtoken || dToken
    if (!token) {
        return res.json({ success: false, message: 'Not Authorized Login Again' })
    }
    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET)
        req.body.docId = token_decode.id
        next()
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export default authDoctor;
