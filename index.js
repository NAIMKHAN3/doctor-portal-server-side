const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT | 5000;

app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
    })

    next();
}

app.get('/', (req, res) => {
    res.send({ status: true, message: "doctor portal server is runnig" });
});





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ujhfrio.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const appoinmentOption = client.db('doctor-portal').collection('appoinment-option')
const bookingCollection = client.db('doctor-portal').collection('booking')
const usersCollection = client.db('doctor-portal').collection('users')
const doctorCollection = client.db('doctor-portal').collection('doctor')
async function run() {
    try {
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                date: booking.date,
                email: booking.email,
                treetmentname: booking.treetmentname
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                return res.send({ acknowledged: false, message: `you already have a booking on ${booking.date}` })
            }
            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const email = user.email;
                const oldUser = usersCollection.find({ email: email }).toArray();
                if (!oldUser) {
                    const result = await usersCollection.insertOne(user);
                    res.send(result)
                }
                else {
                    res.send({ message: "User already added a mongodb database" })
                }
            }
            catch {
                res.send({ status: false, message: 'cold not data' })
            }
        })

        app.get('/allusers', async (req, res) => {
            try {
                const result = await usersCollection.find({}).toArray();
                res.send(result)
            }
            catch {
                res.send({ status: false, messege: 'conld not data' })
            }
        })
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const user = await usersCollection.findOne({ email: email })
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
                res.send({ token })
            }
            else {
                res.status(403).send({ token: '' })
            }
        })

        app.get('/myappoinment', verifyJWT, async (req, res) => {
            try {
                const decodedEmail = req.decoded?.email;
                const userEmail = req.query.email;
                if (userEmail !== decodedEmail) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                const result = await bookingCollection.find({ email: userEmail }).toArray();
                res.send(result)
            }
            catch {
                res.send({ status: false, messege: 'conld not data' })
            }
        })

        app.get('/appoinmentoption', async (req, res) => {
            const date = req.query.date;
            try {
                const options = await appoinmentOption.find({}).toArray();
                const alreadyBooked = await bookingCollection.find({ date: date }).toArray();
                options.map(option => {
                    const optionBooked = alreadyBooked.filter(book => book.treetmentname === option.name)
                    const bookedSlots = optionBooked.map(book => book.time)
                    const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                    option.slots = remainingSlots;
                })
                res.send(options)
            }
            catch {
                res.send({ status: false, message: 'coldnt data found' })
            }
        })
        app.get('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            res.send({ isAdmin: user?.role === 'admin' })
        })
        app.put('/user/admin/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const user = await usersCollection.findOne({ email: decodedEmail });
            if (user.role !== 'admin') {
                res.status(403).send({ message: 'forbidden access' })
            }
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const upDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, upDoc, options);
            res.send(result)
        })
        app.delete('/user/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.deleteOne({ email: email })
            res.send(result)
        })

        app.get('/adddoctor/title', async (req, res) => {
            const result = await appoinmentOption.find({}).project({ name: 1 }).toArray();
            res.send(result)
        })
        app.post('/adddoctor', verifyJWT, async (req, res) => {
            const body = req.body;
            const result = await doctorCollection.insertOne(body);
            res.send(result)
        })
        app.get('/doctors', verifyJWT, async (req, res) => {
            const result = await doctorCollection.find({}).toArray();
            res.send(result)
        })
        app.delete('/doctors/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const result = await doctorCollection.deleteOne({ _id: ObjectId(id) });
            res.send(result)
        })


    }
    finally {

    }
}
run().catch(e => console.log(e))


app.listen(port, () => {
    console.log('server is running', port);
});